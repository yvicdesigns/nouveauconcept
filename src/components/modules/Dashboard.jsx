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
      const monthStart = startOfMonth(now).toISOString();
      const monthEnd   = endOfMonth(now).toISOString();

      const [
        { data: vehicles,    error: eVeh },
        { data: reservations,error: eRes },
        { data: maintenance, error: eMnt },
        { data: allInvoices, error: eInv },
        { data: overdueInv,  error: eOvd },
      ] = await Promise.all([
        supabase.from('vehicles').select('id, status, brand, model, license_plate'),
        supabase.from('reservations').select('id, start_date, end_date, status').neq('status', 'Annulée'),
        supabase.from('maintenance_records').select('id, priority, status, vehicle_id, description, vehicles(brand, model, license_plate)').neq('status', 'completed'),
        supabase.from('invoices').select('id, total_amount, issue_date').eq('status', 'Payé'),
        supabase.from('invoices').select('id, invoice_number, total_amount, due_date, client_name').eq('status', 'En retard').limit(5),
      ]);

      if (eVeh || eRes || eMnt || eInv || eOvd) throw eVeh || eRes || eMnt || eInv || eOvd;

      // Taux d'occupation : réservations En cours ou Confirmée actives maintenant
      const totalVehicles = vehicles.length;
      const activeRentals = reservations.filter(r =>
        ['En cours', 'Confirmée'].includes(r.status) &&
        isWithinInterval(now, { start: parseISO(r.start_date), end: parseISO(r.end_date) })
      ).length;
      const occupancyRate = totalVehicles > 0 ? Math.round((activeRentals / totalVehicles) * 100) : 0;

      // Revenu mensuel : factures Payées ce mois
      const currentMonthRevenue = allInvoices
        .filter(i => i.issue_date >= monthStart && i.issue_date <= monthEnd)
        .reduce((sum, i) => sum + (Number(i.total_amount) || 0), 0);

      setStats({
        fleetSize: totalVehicles,
        occupancyRate,
        monthlyRevenue: currentMonthRevenue,
        maintenanceCount: maintenance.length,
      });

      // Statuts véhicules
      const statusMapping = {
        'available':   { label: 'Disponible', color: '#2563eb' },
        'rented':      { label: 'Loué',       color: '#16a34a' },
        'maintenance': { label: 'Maint.',     color: '#dc2626' },
        'reserved':    { label: 'Réservé',    color: '#ca8a04' },
        'disponible':  { label: 'Disponible', color: '#2563eb' },
      };
      const statusCounts = vehicles.reduce((acc, v) => {
        const key = v.status?.toLowerCase() || 'available';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});
      setVehicleStatusData(Object.keys(statusCounts).map(key => ({
        label: statusMapping[key]?.label || key,
        value: statusCounts[key],
        color: statusMapping[key]?.color || '#94a3b8',
      })));

      // Graphique revenus 6 mois (factures Payées)
      const revenueHistory = Array.from({ length: 6 }, (_, i) => {
        const date  = subMonths(now, 5 - i);
        const start = startOfMonth(date).toISOString();
        const end   = endOfMonth(date).toISOString();
        const total = allInvoices
          .filter(inv => inv.issue_date >= start && inv.issue_date <= end)
          .reduce((sum, inv) => sum + (Number(inv.total_amount) || 0), 0);
        return { month: format(date, 'MMM', { locale: fr }), value: total };
      });
      setRevenueData(revenueHistory);

      // Alertes
      const newAlerts = [];
      maintenance
        .filter(m => m.priority === 'urgent' || m.priority === 'high')
        .forEach(m => newAlerts.push({
          type: 'maintenance',
          title: 'Maintenance requise',
          message: `${m.vehicles?.brand || ''} ${m.vehicles?.model || ''} (${m.vehicles?.license_plate || ''}) nécessite une intervention.`,
        }));
      overdueInv.forEach(inv => newAlerts.push({
        type: 'invoice',
        title: 'Facture en retard',
        message: `Facture ${inv.invoice_number} — ${inv.client_name} — ${Number(inv.total_amount).toLocaleString()} FCFA`,
      }));
      setAlerts(newAlerts.slice(0, 4));

    } catch (error) {
      console.error('Dashboard error:', error);
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