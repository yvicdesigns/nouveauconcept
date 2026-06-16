import React, { useState } from 'react';
import {
  LayoutDashboard, Users, CalendarDays, Car, Wrench, CreditCard,
  UserCheck, MapPin, History, ChevronDown, ChevronRight, CheckCircle,
  AlertTriangle, Lightbulb, BookOpen, ArrowRight, Star
} from 'lucide-react';

const sections = [
  {
    id: 'dashboard',
    icon: LayoutDashboard,
    color: 'blue',
    title: 'Tableau de bord',
    subtitle: 'Vue d\'ensemble de votre activité',
    steps: [
      { title: 'KPIs en temps réel', desc: 'Les 4 cartes en haut affichent : la taille de la flotte, le taux d\'occupation actuel, le revenu mensuel, et le nombre de véhicules en maintenance.' },
      { title: 'Graphique des revenus', desc: 'Le graphique montre l\'évolution des revenus sur les 6 derniers mois, basé uniquement sur les réservations confirmées, en cours ou terminées.' },
      { title: 'Top 3 Clients', desc: 'La section "Top Clients" affiche vos 3 meilleurs clients du moment avec leur chiffre d\'affaires total et le nombre de réservations.' },
      { title: 'Alertes', desc: 'La section Alertes signale les documents expirés ou expirant dans 30 jours (assurance, contrôle technique, patente) et les maintenances urgentes. Rouge = déjà expiré, Orange = expire bientôt.' },
    ],
    tips: ['Cliquez sur une carte KPI pour accéder directement au module correspondant.', 'Les réservations terminées sans facture apparaissent en orange en bas de page — pensez à les facturer.'],
  },
  {
    id: 'contacts',
    icon: Users,
    color: 'purple',
    title: 'Contacts & Clients',
    subtitle: 'Gérer votre base de clients',
    steps: [
      { title: 'Ajouter un client', desc: 'Cliquez sur "Ajouter un contact". Remplissez le nom (obligatoire), le téléphone au format +242 06..., l\'email et l\'adresse.' },
      { title: 'Statuts clients', desc: 'Trois statuts disponibles : Actif (client régulier), Prospect (en cours d\'acquisition), Inactif (plus de location récente).' },
      { title: 'Remarques & Satisfaction', desc: 'Dans chaque fiche client, une section "Remarques & Satisfaction" permet d\'enregistrer le niveau de satisfaction (de Très satisfait à Très insatisfait), le type de remarque (Félicitation, Réclamation, Suggestion) et une note détaillée.' },
      { title: 'Action requise', desc: 'Cochez "Action requise" pour marquer un client qui nécessite un suivi urgent. Un badge orange apparaît sur sa fiche.' },
      { title: 'Modifier / Supprimer', desc: 'Cliquez sur "Modifier" pour éditer la fiche, ou sur l\'icône poubelle rouge pour supprimer. Attention : la suppression est définitive.' },
    ],
    tips: ['Utilisez la barre de recherche pour trouver un client par nom, entreprise ou email.', 'Un badge coloré s\'affiche sur chaque carte si une remarque ou satisfaction a été enregistrée.'],
  },
  {
    id: 'reservations',
    icon: CalendarDays,
    color: 'green',
    title: 'Réservations',
    subtitle: 'Gérer les locations de véhicules',
    steps: [
      { title: 'Créer une réservation', desc: 'Cliquez sur "Nouvelle réservation". Sélectionnez le client, le véhicule (le prix se remplit automatiquement), les dates de début et fin, et l\'heure de retour.' },
      { title: 'Multi-véhicules', desc: 'Un client peut louer plusieurs véhicules en même temps. Cliquez sur "+ Ajouter un véhicule" pour ajouter des lignes. Un identifiant de groupe liera les réservations entre elles.' },
      { title: 'Statuts de réservation', desc: 'En attente → Confirmée → En cours → Terminée. Une réservation peut aussi être "Annulée" avec une pénalité optionnelle.' },
      { title: 'Mode de paiement', desc: '"Payé à l\'avance" = encaissé à la confirmation. "Fin de location" = encaissé au retour. Cette info apparaît dans les rapports.' },
      { title: 'Départ & Retour', desc: 'Renseignez les lieux de départ et de retour pour le suivi logistique de la flotte.' },
      { title: 'Annulation avec pénalité', desc: 'Si le statut est "Annulée", un champ "Pénalité retenue" apparaît. Ce montant est comptabilisé dans le CA du dashboard.' },
    ],
    tips: ['Le calendrier de disponibilité s\'affiche à droite pour chaque véhicule sélectionné.', 'Les jours verts = disponibles, rouges = déjà réservés.'],
  },
  {
    id: 'vehicles',
    icon: Car,
    color: 'indigo',
    title: 'Véhicules',
    subtitle: 'Gérer votre flotte',
    steps: [
      { title: 'Ajouter un véhicule', desc: 'Cliquez sur "Ajouter un véhicule". Renseignez la marque, le modèle, la plaque d\'immatriculation, le tarif journalier et le statut.' },
      { title: 'Dates d\'expiration', desc: 'Renseignez les dates d\'expiration de l\'assurance, du contrôle technique et de la patente. Le dashboard vous alertera automatiquement 30 jours avant.' },
      { title: 'Statuts véhicule', desc: 'Disponible, Loué, En maintenance, Réservé. Le statut se met à jour manuellement ou lors de la création d\'une réservation.' },
      { title: 'Tarif journalier', desc: 'Le prix journalier saisi ici est utilisé comme valeur par défaut dans les nouvelles réservations — il se remplit automatiquement à la sélection du véhicule.' },
    ],
    tips: ['Maintenez les dates d\'expiration à jour pour que les alertes du dashboard soient fiables.'],
  },
  {
    id: 'maintenance',
    icon: Wrench,
    color: 'red',
    title: 'Maintenance',
    subtitle: 'Suivi des interventions',
    steps: [
      { title: 'Créer une intervention', desc: 'Cliquez sur "Nouvelle maintenance". Sélectionnez le véhicule concerné, décrivez le problème, choisissez la priorité (urgent, haut, moyen, bas) et le statut.' },
      { title: 'Priorités', desc: 'Urgent et Haut → apparaissent en alerte rouge sur le dashboard. Moyen et Bas → suivis normalement.' },
      { title: 'Clôturer une intervention', desc: 'Passez le statut à "Terminé" une fois l\'intervention faite. Cela retire l\'alerte du dashboard.' },
    ],
    tips: ['Un véhicule en maintenance peut toujours être réservé — pensez à changer son statut dans le module Véhicules si ce n\'est pas le cas.'],
  },
  {
    id: 'billing',
    icon: CreditCard,
    color: 'yellow',
    title: 'Facturation',
    subtitle: 'Créer et gérer les factures',
    steps: [
      { title: 'Créer une facture', desc: 'Cliquez sur "Nouvelle facture". Liez-la à une réservation existante — les informations (client, véhicule, dates, tarif) se remplissent automatiquement.' },
      { title: 'Commission apporteur', desc: 'Si un apporteur d\'affaires est impliqué, saisissez son taux de commission (%). Le montant est calculé automatiquement et apparaît sur la facture à la place de la TVA.' },
      { title: 'Chauffeur assigné', desc: 'Sélectionnez le chauffeur concerné dans le menu déroulant — cette information est enregistrée avec la facture.' },
      { title: 'Statuts facture', desc: 'Brouillon → Envoyé → Payé. Le statut "En retard" peut être appliqué si la date d\'échéance est dépassée.' },
      { title: 'Imprimer / Exporter', desc: 'Cliquez sur l\'icône de vue (œil) pour afficher la facture, puis sur "Imprimer" pour la générer en PDF ou l\'imprimer directement.' },
    ],
    tips: ['Les réservations terminées sans facture sont signalées sur le dashboard — accédez-y directement depuis le bouton "Créer la facture".'],
  },
  {
    id: 'drivers',
    icon: UserCheck,
    color: 'teal',
    title: 'Chauffeurs',
    subtitle: 'Gérer les profils chauffeurs',
    steps: [
      { title: 'Ajouter un chauffeur', desc: 'Cliquez sur "Ajouter un chauffeur". Renseignez le nom, le téléphone, le numéro de permis et sa date d\'expiration.' },
      { title: 'Véhicule assigné', desc: 'Chaque chauffeur peut être associé à un véhicule de la flotte. Sélectionnez-le dans le menu déroulant.' },
      { title: 'Commission', desc: 'Si le chauffeur reçoit une commission sur les locations, indiquez son taux en %. Cette info est consultable sur sa fiche.' },
      { title: 'Statuts', desc: 'Actif = disponible, Inactif = ne travaille plus, En congé = temporairement absent.' },
      { title: 'Alerte permis expiré', desc: 'Si la date d\'expiration du permis est passée, un badge rouge "expiré" apparaît directement sur la fiche du chauffeur.' },
    ],
    tips: ['Un chauffeur peut être assigné à une facture dans le module Facturation.'],
  },
  {
    id: 'routes',
    icon: MapPin,
    color: 'orange',
    title: 'Destinations',
    subtitle: 'Tarifs par trajet',
    steps: [
      { title: 'Ajouter un tarif', desc: 'Cliquez sur "Ajouter un trajet". Renseignez le lieu de départ, la destination et le prix forfaitaire en FCFA.' },
      { title: 'Utilisation', desc: 'Ces tarifs sont une référence pour l\'équipe lors de la création de réservations. Ex : Brazzaville Centre → Aéroport Maya-Maya = 50 000 FCFA.' },
      { title: 'Modifier / Supprimer', desc: 'Cliquez sur l\'icône crayon pour modifier un tarif, ou sur la poubelle pour le supprimer.' },
    ],
    tips: ['Maintenez cette liste à jour — elle sert de grille tarifaire de référence pour les agents.'],
  },
  {
    id: 'history',
    icon: History,
    color: 'slate',
    title: 'Historique',
    subtitle: 'Journal d\'activité',
    steps: [
      { title: 'Traçabilité complète', desc: 'Chaque action importante dans le CRM est enregistrée automatiquement : création/modification de contact, réservation, facture, véhicule, etc.' },
      { title: 'Filtrer les événements', desc: 'Utilisez les filtres pour afficher uniquement certains types d\'événements (réservations, contacts, factures…) ou chercher par mot-clé.' },
    ],
    tips: ['L\'historique ne peut pas être supprimé — c\'est un journal de traçabilité permanent.'],
  },
];

const colorMap = {
  blue:   { bg: 'bg-blue-50',   border: 'border-blue-200',   icon: 'bg-blue-100 text-blue-600',   badge: 'bg-blue-600',   text: 'text-blue-700' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', icon: 'bg-purple-100 text-purple-600', badge: 'bg-purple-600', text: 'text-purple-700' },
  green:  { bg: 'bg-green-50',  border: 'border-green-200',  icon: 'bg-green-100 text-green-600',  badge: 'bg-green-600',  text: 'text-green-700' },
  indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', icon: 'bg-indigo-100 text-indigo-600', badge: 'bg-indigo-600', text: 'text-indigo-700' },
  red:    { bg: 'bg-red-50',    border: 'border-red-200',    icon: 'bg-red-100 text-red-600',    badge: 'bg-red-600',    text: 'text-red-700' },
  yellow: { bg: 'bg-yellow-50', border: 'border-yellow-200', icon: 'bg-yellow-100 text-yellow-600', badge: 'bg-yellow-600', text: 'text-yellow-700' },
  teal:   { bg: 'bg-teal-50',   border: 'border-teal-200',   icon: 'bg-teal-100 text-teal-600',   badge: 'bg-teal-600',   text: 'text-teal-700' },
  orange: { bg: 'bg-orange-50', border: 'border-orange-200', icon: 'bg-orange-100 text-orange-600', badge: 'bg-orange-600', text: 'text-orange-700' },
  slate:  { bg: 'bg-slate-50',  border: 'border-slate-200',  icon: 'bg-slate-100 text-slate-600',  badge: 'bg-slate-600',  text: 'text-slate-700' },
};

const SectionCard = ({ section, index }) => {
  const [open, setOpen] = useState(false);
  const c = colorMap[section.color];
  const Icon = section.icon;

  return (
    <div className={`rounded-2xl border ${c.border} overflow-hidden shadow-sm`}>
      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-4 p-5 ${c.bg} hover:brightness-95 transition-all`}
      >
        <div className={`p-3 rounded-xl ${c.icon} shrink-0`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full text-white ${c.badge}`}>
              Module {index + 1}
            </span>
          </div>
          <p className="font-bold text-slate-900 text-base mt-0.5">{section.title}</p>
          <p className="text-sm text-slate-500">{section.subtitle}</p>
        </div>
        <div className="shrink-0 text-slate-400">
          {open ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
        </div>
      </button>

      {/* Body */}
      {open && (
        <div className="p-6 bg-white space-y-6">
          {/* Steps */}
          <div className="space-y-4">
            {section.steps.map((step, i) => (
              <div key={i} className="flex gap-4">
                <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ${c.badge}`}>
                  {i + 1}
                </div>
                <div>
                  <p className="font-semibold text-slate-800">{step.title}</p>
                  <p className="text-sm text-slate-600 mt-0.5 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Tips */}
          {section.tips?.length > 0 && (
            <div className={`rounded-xl p-4 ${c.bg} border ${c.border}`}>
              <p className={`text-xs font-bold uppercase tracking-wide ${c.text} mb-2 flex items-center gap-1.5`}>
                <Lightbulb className="h-3.5 w-3.5" /> Conseils
              </p>
              <ul className="space-y-1.5">
                {section.tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <ArrowRight className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${c.text}`} />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const Tutorial = () => {
  const [allOpen, setAllOpen] = useState(false);

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-8">
      {/* Hero */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-8 text-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-white/20 rounded-xl">
            <BookOpen className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Guide d'utilisation</h1>
            <p className="text-blue-200 text-sm">Nouveau Concept CRM — Location de véhicules</p>
          </div>
        </div>
        <p className="text-blue-100 leading-relaxed">
          Ce guide explique comment utiliser chaque module du CRM. Cliquez sur un module pour afficher
          les instructions détaillées étape par étape.
        </p>
        <div className="flex flex-wrap gap-3 mt-5">
          <div className="flex items-center gap-2 bg-white/15 rounded-lg px-3 py-1.5 text-sm">
            <CheckCircle className="h-4 w-4 text-green-300" />
            {sections.length} modules documentés
          </div>
          <div className="flex items-center gap-2 bg-white/15 rounded-lg px-3 py-1.5 text-sm">
            <Star className="h-4 w-4 text-yellow-300" />
            Conseils et astuces inclus
          </div>
        </div>
      </div>

      {/* Quick nav */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Navigation rapide</p>
        <div className="flex flex-wrap gap-2">
          {sections.map(s => {
            const Icon = s.icon;
            const c = colorMap[s.color];
            return (
              <button
                key={s.id}
                onClick={() => document.getElementById(`section-${s.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border ${c.bg} ${c.border} ${c.text} hover:brightness-95 transition-all`}
              >
                <Icon className="h-3.5 w-3.5" />
                {s.title}
              </button>
            );
          })}
        </div>
      </div>

      {/* Important note */}
      <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-amber-900">À retenir avant de commencer</p>
          <p className="text-sm text-amber-800 mt-1">
            Toutes les suppressions sont <strong>définitives</strong>. Avant de supprimer un contact, véhicule ou chauffeur,
            vérifiez qu'il n'a pas de réservations ou factures actives associées.
          </p>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {sections.map((section, i) => (
          <div key={section.id} id={`section-${section.id}`}>
            <SectionCard section={section} index={i} />
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="text-center py-6 border-t border-slate-200">
        <p className="text-sm text-slate-500">
          Nouveau Concept CRM · Pour toute question, contactez l'administrateur du système.
        </p>
      </div>
    </div>
  );
};

export default Tutorial;
