import React from 'react';
import { Car, Clock, CheckCircle, CalendarCheck, Wrench } from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';

const stateConfig = {
  available:   { label: 'Disponible',  bg: 'bg-green-50',  border: 'border-green-200',  dot: 'bg-green-500',  text: 'text-green-700',  icon: CheckCircle },
  rented:      { label: 'En location', bg: 'bg-blue-50',   border: 'border-blue-200',   dot: 'bg-blue-500',   text: 'text-blue-700',   icon: Car },
  reserved:    { label: 'Réservé',     bg: 'bg-yellow-50', border: 'border-yellow-200', dot: 'bg-yellow-500', text: 'text-yellow-700', icon: CalendarCheck },
  maintenance: { label: 'Maintenance', bg: 'bg-orange-50', border: 'border-orange-200', dot: 'bg-orange-500', text: 'text-orange-700', icon: Wrench },
  overdue:     { label: 'En retard',   bg: 'bg-red-50',    border: 'border-red-400',    dot: 'bg-red-500',    text: 'text-red-700',    icon: Clock },
};

const FleetOverview = ({ fleet = [] }) => {
  if (fleet.length === 0) return null;

  const counts = fleet.reduce((acc, v) => {
    acc[v.state] = (acc[v.state] || 0) + 1;
    return acc;
  }, {});

  const order = ['overdue', 'rented', 'reserved', 'maintenance', 'available'];
  const sorted = [...fleet].sort((a, b) => order.indexOf(a.state) - order.indexOf(b.state));

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Car className="h-5 w-5 text-blue-600" /> Flotte en temps réel
          <span className="text-sm font-normal text-gray-500 ml-1">— {fleet.length} véhicules</span>
        </h2>
        {/* Légende compteurs */}
        <div className="hidden md:flex items-center gap-3 flex-wrap">
          {order.filter(s => counts[s]).map(s => (
            <span key={s} className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${stateConfig[s].bg} ${stateConfig[s].border} ${stateConfig[s].text}`}>
              <span className={`w-2 h-2 rounded-full ${stateConfig[s].dot}`} />
              {counts[s]} {stateConfig[s].label}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {sorted.map(vehicle => {
          const cfg = stateConfig[vehicle.state] || stateConfig.available;
          const Icon = cfg.icon;
          const rental = vehicle.rental;
          const daysOverdue = vehicle.state === 'overdue' && rental?.end_date
            ? differenceInDays(new Date(), parseISO(rental.end_date))
            : null;
          const daysLeft = vehicle.state === 'rented' && rental?.end_date
            ? differenceInDays(parseISO(rental.end_date), new Date())
            : null;

          return (
            <div
              key={vehicle.id}
              className={`rounded-xl border p-3 flex flex-col gap-2 transition-shadow hover:shadow-md ${cfg.bg} ${cfg.border} ${vehicle.state === 'overdue' ? 'ring-1 ring-red-400' : ''}`}
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className={`p-1.5 rounded-lg ${vehicle.state === 'overdue' ? 'bg-red-500' : 'bg-white/70'}`}>
                  <Icon className={`h-3.5 w-3.5 ${vehicle.state === 'overdue' ? 'text-white' : cfg.text}`} />
                </div>
                <span className={`text-xs font-bold ${cfg.text}`}>{cfg.label}</span>
              </div>

              {/* Véhicule */}
              <div>
                <p className="text-xs font-bold text-gray-900 leading-tight truncate">
                  {vehicle.brand} {vehicle.model}
                </p>
                <p className="text-xs text-gray-500 truncate">{vehicle.license_plate}</p>
              </div>

              {/* Info contextuelle */}
              {rental && (
                <div className="border-t border-white/50 pt-2 mt-1">
                  <p className="text-xs font-semibold text-gray-700 truncate">
                    {rental.contacts?.name || '—'}
                  </p>
                  {vehicle.state === 'overdue' && daysOverdue !== null && (
                    <p className="text-xs font-bold text-red-600">
                      🚨 Retard {daysOverdue}j
                    </p>
                  )}
                  {vehicle.state === 'rented' && daysLeft !== null && (
                    <p className={`text-xs font-semibold ${daysLeft <= 1 ? 'text-orange-600' : 'text-blue-600'}`}>
                      Retour {daysLeft <= 0 ? "aujourd'hui" : `dans ${daysLeft}j`}
                    </p>
                  )}
                  {rental.end_date && (
                    <p className="text-xs text-gray-400">
                      {format(parseISO(rental.end_date), 'd MMM', { locale: fr })}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FleetOverview;
