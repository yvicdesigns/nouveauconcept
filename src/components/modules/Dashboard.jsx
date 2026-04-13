import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Car, Calendar, Banknote, AlertTriangle, Loader2 } from 'lucide-react';
import StatCard from '@/components/dashboard/StatCard';
import RevenueChart from '@/components/dashboard/RevenueChart';
import VehicleStatus from '@/components/dashboard/VehicleStatus';
import AlertsSection from '@/components/dashboard/AlertsSection';
import { supabase } from '@/lib/customSupabaseClient';
import { format, startOfMonth, endOfMonth, subMonths, parseISO, isWithinInterval } from 'date-fns';
import { fr } from 'date-fns/locale';

const Dashboard = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    fleetSize: 0,
    occupancyRate: 0,
    monthlyRevenue: 0,
    maintenanceCount: 0
  });
  const [revenueData, setRevenueData] = useState([]);
  const [vehicleStatusData, setVehicleStatusData] = useState([]);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const now = new Date();
      const startOfCurrentMonth = startOfMonth(now).toISOString();
      const endOfCurrentMonth = endOfMonth(now).toISOString();

      // 1. Fetch Fleet Size & Status
      const { data: vehicles, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('id, status, brand, model, license_plate');
      
      if (vehiclesError) throw vehiclesError;

      // 2. Fetch Reservations for Revenue & Occupancy
      // We grab reservations and include vehicle data to calculate fallback price if missing
      const { data: reservations, error: reservationsError } = await supabase
        .from('reservations')
        .select('id, total_price, start_date, end_date, status, created_at, vehicles(daily_rate)')
        .neq('status', 'cancelled');

      if (reservationsError) throw reservationsError;

      // 3. Fetch Maintenance Records (Active)
      const { data: maintenance, error: maintenanceError } = await supabase
        .from('maintenance_records')
        .select('id, priority, status, vehicle_id, description, vehicles(brand, model, license_plate)')
        .neq('status', 'completed')
        .neq('status', 'cancelled');

      if (maintenanceError) throw maintenanceError;

      // 4. Fetch Overdue Invoices
      const { data: invoices, error: invoicesError } = await supabase
        .from('invoices')
        .select('id, invoice_number, total_amount, due_date, client_name, status')
        .eq('status', 'unpaid') // Assuming 'unpaid' is the status for pending
        .lt('due_date', now.toISOString())
        .limit(5);
        
      if (invoicesError) throw invoicesError;

      // --- Calculations ---

      // Fleet Stats
      const totalVehicles = vehicles.length;
      
      // Active Rentals (Right Now)
      const activeRentals = reservations.filter(r => 
        isWithinInterval(now, { 
          start: parseISO(r.start_date), 
          end: parseISO(r.end_date) 
        }) && r.status === 'confirmed'
      ).length;

      const occupancyRate = totalVehicles > 0 
        ? Math.round((activeRentals / totalVehicles) * 100) 
        : 0;

      // Monthly Revenue (Current Month)
      // Sum total_price of reservations starting in this month
      // Includes robust fallback if total_price is missing in DB
      const currentMonthRevenue = reservations
        .filter(r => r.start_date >= startOfCurrentMonth && r.start_date <= endOfCurrentMonth)
        .reduce((sum, r) => {
          let price = Number(r.total_price);
          // Fallback: If price is missing, calculate from daily rate * days
          if (!price && r.vehicles?.daily_rate) {
            const start = new Date(r.start_date);
            const end = new Date(r.end_date);
            // Calculate difference in days, default to 1 minimum
            const diffTime = Math.abs(end - start);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
            const days = diffDays > 0 ? diffDays : 1;
            price = Number(r.vehicles.daily_rate) * days;
          }
          return sum + (price || 0);
        }, 0);

      // Maintenance Count
      const activeMaintenanceCount = maintenance.length;

      setStats({
        fleetSize: totalVehicles,
        occupancyRate,
        monthlyRevenue: currentMonthRevenue,
        maintenanceCount: activeMaintenanceCount
      });

      // Vehicle Status Distribution
      const statusCounts = vehicles.reduce((acc, vehicle) => {
        const status = vehicle.status?.toLowerCase() || 'available';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});

      const statusMapping = {
        'available': { label: 'Dispo', color: '#2563eb' }, // blue
        'rented': { label: 'Loué', color: '#16a34a' }, // green
        'maintenance': { label: 'Maint.', color: '#dc2626' }, // red
        'reserved': { label: 'Réservé', color: '#ca8a04' }, // yellow
        // Fallback mapping for exact DB strings if case differs
        'disponible': { label: 'Dispo', color: '#2563eb' },
        'loué': { label: 'Loué', color: '#16a34a' },
      };

      const chartData = Object.keys(statusCounts).map(key => ({
        label: statusMapping[key]?.label || key,
        value: statusCounts[key],
        color: statusMapping[key]?.color || '#94a3b8' // slate default
      }));

      setVehicleStatusData(chartData);

      // Revenue Chart Data (Last 6 Months)
      const revenueHistory = [];
      for (let i = 5; i >= 0; i--) {
        const date = subMonths(now, i);
        const monthStart = startOfMonth(date).toISOString();
        const monthEnd = endOfMonth(date).toISOString();
        const monthLabel = format(date, 'MMM', { locale: fr }); // Jan, Fév...

        // Use same robust logic for history
        const monthTotal = reservations
          .filter(r => r.start_date >= monthStart && r.start_date <= monthEnd)
          .reduce((sum, r) => {
            let price = Number(r.total_price);
            if (!price && r.vehicles?.daily_rate) {
              const start = new Date(r.start_date);
              const end = new Date(r.end_date);
              const diffDays = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)); 
              price = Number(r.vehicles.daily_rate) * (diffDays > 0 ? diffDays : 1);
            }
            return sum + (price || 0);
          }, 0);

        revenueHistory.push({ month: monthLabel, value: monthTotal });
      }
      setRevenueData(revenueHistory);

      // Alerts
      const newAlerts = [];
      
      // Urgent/High Maintenance Alerts
      maintenance
        .filter(m => m.priority === 'urgent' || m.priority === 'high')
        .forEach(m => {
          newAlerts.push({
            type: 'maintenance',
            title: 'Maintenance Requise',
            message: `Le véhicule ${m.vehicles?.brand} ${m.vehicles?.model} (${m.vehicles?.license_plate}) nécessite une attention immédiate.`
          });
        });

      // Overdue Invoices Alerts
      invoices.forEach(inv => {
        newAlerts.push({
          type: 'invoice',
          title: 'Facture En Retard',
          message: `Facture ${inv.invoice_number} de ${inv.client_name} (${Number(inv.total_amount).toLocaleString()} €) est en retard.`
        });
      });

      setAlerts(newAlerts.slice(0, 4)); // Limit to 4 alerts

    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Flotte Totale',
      value: stats.fleetSize.toString(),
      subtext: 'Véhicules enregistrés',
      subtextColor: 'text-slate-600',
      icon: Car,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-50',
      onClick: () => navigate('/vehicles')
    },
    {
      title: "Taux d'Occupation",
      value: `${stats.occupancyRate}%`,
      subtext: 'En ce moment',
      subtextColor: stats.occupancyRate > 50 ? 'text-green-700' : 'text-slate-600',
      icon: Calendar,
      iconColor: 'text-green-600',
      iconBg: 'bg-green-50',
      onClick: () => navigate('/reservations')
    },
    {
      title: 'Revenu Mensuel',
      value: `${stats.monthlyRevenue.toLocaleString()} FCFA`,
      subtext: 'Ce mois-ci',
      subtextColor: 'text-purple-700',
      icon: Banknote,
      iconColor: 'text-purple-600',
      iconBg: 'bg-purple-50',
      onClick: () => navigate('/billing')
    },
    {
      title: 'En Maintenance',
      value: stats.maintenanceCount.toString(),
      subtext: 'Interventions actives',
      subtextColor: stats.maintenanceCount > 0 ? 'text-orange-700' : 'text-green-700',
      icon: AlertTriangle,
      iconColor: 'text-red-600',
      iconBg: 'bg-red-50',
      onClick: () => navigate('/maintenance')
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
          <p className="text-slate-500 font-medium">Chargement du tableau de bord...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 space-y-8 max-w-[1600px] mx-auto bg-gray-50 min-h-screen">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Tableau de bord</h1>
          <p className="text-sm text-gray-500 font-medium mt-1">
            Aperçu de votre activité pour le {format(new Date(), 'EEEE d MMMM yyyy', { locale: fr })}
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <StatCard key={index} {...stat} index={index} />
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RevenueChart data={revenueData} />
        </div>
        <div>
          <VehicleStatus data={vehicleStatusData} />
        </div>
      </div>

      {/* Alerts Section */}
      <AlertsSection alerts={alerts} />
    </div>
  );
};

export default Dashboard;