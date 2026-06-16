import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Car, Calendar, Banknote, AlertTriangle, Loader2, TrendingUp, Clock, Receipt, XCircle, Trophy, Users } from 'lucide-react';
import StatCard from '@/components/dashboard/StatCard';
import RevenueChart from '@/components/dashboard/RevenueChart';
import VehicleStatus from '@/components/dashboard/VehicleStatus';
import AlertsSection from '@/components/dashboard/AlertsSection';
import { supabase } from '@/lib/customSupabaseClient';
import { format, startOfMonth, endOfMonth, subMonths, parseISO, isWithinInterval, differenceInDays } from 'date-fns';
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
  const [revenueBreakdown, setRevenueBreakdown] = useState({ confirmed: 0, pending: 0, penalties: 0 });
  const [unbilledReservations, setUnbilledReservations] = useState([]);
  const [topClients, setTopClients] = useState([]);

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
        { data: vehicles,     error: eVeh },
        { data: reservations, error: eRes },
        { data: maintenance,  error: eMnt },
        { data: allResCA },
        { data: cancelledRes },
        { data: resTerminees },
        { data: invoicedResIds },
      ] = await Promise.all([
        supabase.from('vehicles').select('id, status, brand, model, license_plate, insurance_expiry_date, technical_check_expiry_date, patente_expiry_date'),
        supabase.from('reservations').select('id, start_date, end_date, status').neq('status', 'Annulée'),
        supabase.from('maintenance_records').select('id, priority, status, vehicle_id, description, vehicles(brand, model, license_plate)').neq('status', 'completed'),
        // CA réel : toutes les réservations confirmées/actives/terminées
        supabase.from('reservations').select('id, total_price, start_date, status, contact_id, contacts(name)').in('status', ['Confirmée', 'En cours', 'Terminée']),
        // Annulées avec pénalité
        supabase.from('reservations').select('id, cancellation_penalty').eq('status', 'Annulée'),
        // Terminées sans facture
        supabase.from('reservations').select('id, total_price, contacts(name), vehicles(name)').eq('status', 'Terminée'),
        supabase.from('invoices').select('reservation_id').not('reservation_id', 'is', null),
      ]);

      if (eVeh || eRes || eMnt) throw eVeh || eRes || eMnt;

      // Taux d'occupation : réservations En cours ou Confirmée actives maintenant
      const totalVehicles = vehicles.length;
      const activeRentals = reservations.filter(r =>
        ['En cours', 'Confirmée'].includes(r.status) &&
        isWithinInterval(now, { start: parseISO(r.start_date), end: parseISO(r.end_date) })
      ).length;
      const occupancyRate = totalVehicles > 0 ? Math.round((activeRentals / totalVehicles) * 100) : 0;

      // Revenu mensuel : réservations confirmées/actives/terminées ce mois
      const confirmedRes = allResCA || [];
      const currentMonthRevenue = confirmedRes
        .filter(r => r.start_date >= monthStart && r.start_date <= monthEnd)
        .reduce((sum, r) => sum + (Number(r.total_price) || 0), 0);

      // Revenue breakdown
      const confirmedTotal  = confirmedRes.reduce((s, r) => s + (Number(r.total_price) || 0), 0);
      const pendingRes      = reservations.filter(r => r.status === 'En attente');
      const pendingTotal    = pendingRes.reduce((s, r) => s + (Number(r.total_price) || 0), 0);
      const penaltiesTotal  = (cancelledRes || []).reduce((s, r) => s + (Number(r.cancellation_penalty) || 0), 0);
      setRevenueBreakdown({ confirmed: confirmedTotal, pending: pendingTotal, penalties: penaltiesTotal });

      // Top 3 clients (total dépensé tous statuts confondus)
      const clientMap = {};
      confirmedRes.forEach(r => {
        const name = r.contacts?.name || 'Client inconnu';
        if (!clientMap[name]) clientMap[name] = { name, total: 0, count: 0 };
        clientMap[name].total += Number(r.total_price) || 0;
        clientMap[name].count += 1;
      });
      const sorted = Object.values(clientMap).sort((a, b) => b.total - a.total);
      setTopClients(sorted.slice(0, 3));

      // Réservations Terminées sans facture
      const invoicedIds = new Set((invoicedResIds || []).map(r => r.reservation_id));
      const unbilled = (resTerminees || []).filter(r => !invoicedIds.has(r.id));
      setUnbilledReservations(unbilled.slice(0, 5));

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

      // Graphique revenus 6 mois (réservations confirmées/actives/terminées)
      const revenueHistory = Array.from({ length: 6 }, (_, i) => {
        const date  = subMonths(now, 5 - i);
        const start = startOfMonth(date).toISOString();
        const end   = endOfMonth(date).toISOString();
        const total = confirmedRes
          .filter(r => r.start_date >= start && r.start_date <= end)
          .reduce((sum, r) => sum + (Number(r.total_price) || 0), 0);
        return { month: format(date, 'MMM', { locale: fr }), value: total };
      });
      setRevenueData(revenueHistory);

      // Alertes
      const expiredAlerts = [];
      const expiryAlerts = [];
      const maintenanceAlerts = [];

      // Expirations documents (assurance, CT, patente)
      const checkExpiry = (vehicle, dateStr, docName) => {
        if (!dateStr) return;
        const expDate = parseISO(dateStr);
        const daysLeft = differenceInDays(expDate, now);
        const label = `${vehicle.brand || ''} ${vehicle.model || ''} (${vehicle.license_plate || ''})`;
        if (daysLeft < 0) {
          expiredAlerts.push({
            type: 'expired',
            title: `${docName} expirée`,
            message: `${label} — expirée depuis ${Math.abs(daysLeft)} jour${Math.abs(daysLeft) > 1 ? 's' : ''}.`,
          });
        } else if (daysLeft <= 30) {
          expiryAlerts.push({
            type: 'expiry',
            title: `${docName} — expiration proche`,
            message: `${label} — expire dans ${daysLeft} jour${daysLeft !== 1 ? 's' : ''}.`,
          });
        }
      };

      vehicles.forEach(v => {
        checkExpiry(v, v.insurance_expiry_date, 'Assurance');
        checkExpiry(v, v.technical_check_expiry_date, 'Contrôle technique');
        checkExpiry(v, v.patente_expiry_date, 'Patente');
      });

      // Maintenances urgentes
      maintenance
        .filter(m => m.priority === 'urgent' || m.priority === 'high')
        .forEach(m => maintenanceAlerts.push({
          type: 'maintenance',
          title: 'Maintenance requise',
          message: `${m.vehicles?.brand || ''} ${m.vehicles?.model || ''} (${m.vehicles?.license_plate || ''}) nécessite une intervention.`,
        }));

      setAlerts([...expiredAlerts, ...expiryAlerts, ...maintenanceAlerts].slice(0, 8));

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

      {/* Revenue Breakdown */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-600" /> Vue d'ensemble des revenus
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-4 p-4 bg-green-50 rounded-xl border border-green-100">
            <div className="p-2.5 bg-green-100 rounded-lg"><Receipt className="h-5 w-5 text-green-600" /></div>
            <div>
              <p className="text-xs font-medium text-green-700 uppercase tracking-wide">CA Réservations</p>
              <p className="text-xl font-bold text-green-800">{revenueBreakdown.confirmed.toLocaleString()} FCFA</p>
              <p className="text-xs text-green-600">Confirmées · En cours · Terminées</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
            <div className="p-2.5 bg-blue-100 rounded-lg"><Clock className="h-5 w-5 text-blue-600" /></div>
            <div>
              <p className="text-xs font-medium text-blue-700 uppercase tracking-wide">En attente</p>
              <p className="text-xl font-bold text-blue-800">{revenueBreakdown.pending.toLocaleString()} FCFA</p>
              <p className="text-xs text-blue-600">Réservations non encore confirmées</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 bg-orange-50 rounded-xl border border-orange-100">
            <div className="p-2.5 bg-orange-100 rounded-lg"><XCircle className="h-5 w-5 text-orange-600" /></div>
            <div>
              <p className="text-xs font-medium text-orange-700 uppercase tracking-wide">Pénalités retenues</p>
              <p className="text-xl font-bold text-orange-800">{revenueBreakdown.penalties.toLocaleString()} FCFA</p>
              <p className="text-xs text-orange-600">Sur annulations</p>
            </div>
          </div>
        </div>
      </div>

      {/* Réservations sans facture */}
      {unbilledReservations.length > 0 && (
        <div className="bg-white rounded-xl border border-orange-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
            <Receipt className="h-5 w-5 text-orange-500" /> Réservations terminées sans facture
            <span className="ml-2 bg-orange-100 text-orange-700 text-xs font-bold px-2 py-0.5 rounded-full">{unbilledReservations.length}</span>
          </h2>
          <p className="text-sm text-gray-500 mb-4">Ces locations sont terminées mais aucune facture n'a été créée.</p>
          <div className="space-y-2">
            {unbilledReservations.map(r => (
              <div key={r.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-100">
                <div>
                  <p className="text-sm font-semibold text-gray-800">{r.contacts?.name || 'Client inconnu'}</p>
                  <p className="text-xs text-gray-500">{r.vehicles?.name || '—'} · {r.total_price ? `${Number(r.total_price).toLocaleString()} FCFA` : 'Prix non défini'}</p>
                </div>
                <button
                  onClick={() => navigate('/reservations')}
                  className="text-xs font-semibold text-orange-600 hover:text-orange-800 hover:underline"
                >
                  Créer la facture →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top 3 Clients */}
      {topClients.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" /> Top Clients
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {topClients.map((client, i) => {
              const medals = ['🥇', '🥈', '🥉'];
              const colors = [
                'bg-yellow-50 border-yellow-200',
                'bg-slate-50 border-slate-200',
                'bg-orange-50 border-orange-200',
              ];
              const textColors = ['text-yellow-700', 'text-slate-600', 'text-orange-700'];
              return (
                <div key={i} className={`flex items-center gap-4 p-4 rounded-xl border ${colors[i]}`}>
                  <span className="text-2xl">{medals[i]}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{client.name}</p>
                    <p className={`text-xs font-semibold ${textColors[i]}`}>
                      {client.total.toLocaleString()} FCFA
                    </p>
                    <p className="text-xs text-gray-400">
                      {client.count} réservation{client.count > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Alerts Section */}
      <AlertsSection alerts={alerts} />
    </div>
  );
};

export default Dashboard;