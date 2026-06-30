import React, { useState, useEffect, useMemo } from 'react';
import {
  LayoutDashboard, Users, CalendarDays, Car, Wrench, CreditCard,
  UserCheck, MapPin, History, ChevronDown, ChevronRight, CheckCircle,
  AlertTriangle, Lightbulb, BookOpen, ArrowRight, Star, Search,
  ChevronsUpDown, ChevronsDownUp, CircleDot, X
} from 'lucide-react';

const sections = [
  {
    id: 'dashboard',
    icon: LayoutDashboard,
    color: 'blue',
    title: 'Tableau de bord',
    subtitle: 'Vue d\'ensemble de votre activité',
    steps: [
      { title: 'KPIs en temps réel', desc: 'Les 4 cartes en haut affichent : la taille de la flotte, le taux d\'occupation actuel, le revenu mensuel (réservations confirmées/en cours/terminées uniquement), et le nombre de véhicules en maintenance.' },
      { title: 'Graphique des revenus', desc: 'Le graphique montre l\'évolution des revenus sur les 6 derniers mois. Survolez les barres pour voir le détail mensuel. Seules les réservations confirmées, en cours ou terminées sont comptabilisées.' },
      { title: 'Top 3 Clients', desc: 'La section "Top Clients" affiche vos 3 meilleurs clients du moment avec leur chiffre d\'affaires total et le nombre de réservations. Cliquez sur un client pour accéder à sa fiche.' },
      { title: 'Alertes automatiques', desc: 'La section Alertes signale les documents expirés ou expirant dans 30 jours (assurance, contrôle technique, patente) et les maintenances urgentes. Rouge = déjà expiré, Orange = expire bientôt.' },
      { title: 'Réservations sans facture', desc: 'En bas du tableau de bord, les réservations terminées sans facture apparaissent en orange. Cliquez sur "Créer la facture" pour les traiter directement depuis le dashboard.' },
    ],
    tips: [
      'Cliquez sur une carte KPI pour accéder directement au module correspondant.',
      'Maintenez les dates d\'expiration à jour dans les fiches véhicules pour que les alertes restent fiables.',
      'Une annulation avec pénalité est comptabilisée dans le revenu mensuel.',
    ],
  },
  {
    id: 'contacts',
    icon: Users,
    color: 'purple',
    title: 'Contacts & Clients',
    subtitle: 'Gérer votre base de clients',
    steps: [
      { title: 'Ajouter un client', desc: 'Cliquez sur "Ajouter un contact". Le nom est obligatoire. Le téléphone doit être au format +242 suivi de 8 ou 9 chiffres (ex: +242061234567). L\'email et l\'adresse sont optionnels.' },
      { title: 'Statuts clients', desc: 'Trois statuts : Actif (client régulier), Prospect (en cours d\'acquisition), Inactif (plus de location récente). Le statut est visible sur la carte client.' },
      { title: 'Remarques & Satisfaction', desc: 'Dans chaque fiche client, enregistrez le niveau de satisfaction (de Très satisfait à Très insatisfait), le type de remarque (Félicitation, Réclamation, Suggestion) et une note détaillée. Un badge coloré apparaît sur la carte.' },
      { title: 'Action requise', desc: 'Cochez "Action requise" pour marquer un client qui nécessite un suivi urgent. Un badge orange apparaît sur sa fiche et le client remonte dans la liste.' },
      { title: 'Modifier / Supprimer', desc: 'Cliquez sur "Modifier" pour éditer la fiche, ou sur l\'icône poubelle rouge pour supprimer. Attention : la suppression est définitive et impossible si des réservations actives sont liées à ce contact.' },
    ],
    tips: [
      'Utilisez la barre de recherche pour trouver un client par nom, entreprise ou email.',
      'Renseignez toujours le téléphone du client — il se remplit automatiquement dans les factures.',
      'Le bouton "Clients à relancer" affiche les clients inactifs depuis plus de 60 jours.',
    ],
  },
  {
    id: 'reservations',
    icon: CalendarDays,
    color: 'green',
    title: 'Réservations',
    subtitle: 'Gérer les locations de véhicules',
    steps: [
      { title: 'Créer une réservation', desc: 'Cliquez sur "Ajouter une réservation". Sélectionnez le client (liste déroulante), le véhicule (le tarif journalier se remplit automatiquement), la date de début, la date de fin et l\'heure de retour.' },
      { title: 'Assigner un chauffeur', desc: 'Dans le formulaire de réservation, sélectionnez un chauffeur dans la liste déroulante. Tous les chauffeurs sont disponibles (actifs, en congé, inactifs). Ce chauffeur sera automatiquement repris dans la facture générée depuis cette réservation.' },
      { title: 'Multi-véhicules', desc: 'Un client peut louer plusieurs véhicules en même temps. Cliquez sur "+ Ajouter un véhicule" pour ajouter des lignes supplémentaires. Les réservations créées sont liées par un identifiant de groupe.' },
      { title: 'Statuts de réservation', desc: 'En attente → Confirmée → En cours → Terminée. Une réservation peut aussi être "Annulée" avec une pénalité optionnelle (montant retenu comptabilisé dans le CA).' },
      { title: 'Mode de paiement', desc: '"Payé à l\'avance" = encaissé à la confirmation. "Fin de location" = encaissé au retour. Cette info apparaît dans les rapports de trésorerie.' },
      { title: 'Créer la facture', desc: 'Une fois la réservation au statut "Terminée", l\'icône 🧾 apparaît dans la colonne Actions. Cliquez dessus pour ouvrir la facture pré-remplie avec le client, le véhicule, les dates et le chauffeur assigné.' },
    ],
    tips: [
      'Si une validation échoue (date manquante, etc.), un message toast apparaît en bas de l\'écran — le formulaire reste ouvert.',
      'Les dates bloquées dans le calendrier = ce véhicule est déjà réservé. Choisissez un autre véhicule ou ajustez les dates.',
    ],
  },
  {
    id: 'vehicles',
    icon: Car,
    color: 'indigo',
    title: 'Véhicules',
    subtitle: 'Gérer votre flotte',
    steps: [
      { title: 'Ajouter un véhicule', desc: 'Cliquez sur "Ajouter un véhicule". Renseignez la marque, le modèle, la plaque d\'immatriculation, le tarif journalier et le statut (Disponible, Loué, En maintenance, Réservé).' },
      { title: 'Dates d\'expiration', desc: 'Renseignez les dates d\'expiration de l\'assurance, du contrôle technique et de la patente. Le dashboard vous alertera automatiquement 30 jours avant l\'expiration.' },
      { title: 'Tarif journalier', desc: 'Le prix saisi ici est la valeur par défaut dans les nouvelles réservations — il se remplit automatiquement à la sélection du véhicule. Il peut être modifié manuellement dans la réservation.' },
      { title: 'Visualiseur & interventions', desc: 'Sur la fiche d\'un véhicule, le diagramme 2D top-down permet de cliquer sur une zone précise (capot, porte, pare-brise...) pour voir les interventions de maintenance associées à cette zone.' },
      { title: 'Statut du véhicule', desc: 'Le statut se met à jour manuellement. Pensez à passer un véhicule en "Disponible" après la fin d\'une maintenance ou d\'une location, sinon il peut rester bloqué.' },
    ],
    tips: [
      'Maintenez les dates d\'expiration à jour pour que les alertes du dashboard soient fiables.',
      'Si le visualiseur 3D ne charge pas, cliquez sur "Rafraîchir la page" — c\'est une mise à jour du cache résolu automatiquement.',
    ],
  },
  {
    id: 'maintenance',
    icon: Wrench,
    color: 'red',
    title: 'Maintenance',
    subtitle: 'Suivi des interventions',
    steps: [
      { title: 'Créer une intervention', desc: 'Cliquez sur "Nouvelle maintenance". Sélectionnez le véhicule, la zone touchée (moteur, porte, pneu...), décrivez le problème, choisissez la priorité et le statut.' },
      { title: 'Priorités', desc: 'Urgent et Haut → apparaissent en alerte rouge sur le dashboard et sur la fiche du véhicule. Moyen et Bas → suivis normalement dans la liste.' },
      { title: 'Zone sur le diagramme', desc: 'Chaque intervention est liée à une zone précise du véhicule. Ces zones sont visualisables sur le diagramme top-down dans la fiche véhicule — pratique pour l\'historique de carrosserie.' },
      { title: 'Clôturer une intervention', desc: 'Passez le statut à "Terminé" une fois l\'intervention faite. Cela retire l\'alerte du dashboard et met à jour le diagramme de la fiche véhicule.' },
    ],
    tips: [
      'Un véhicule en maintenance peut toujours être réservé — pensez à changer son statut manuellement si nécessaire.',
      'Utilisez les priorités de façon cohérente : "Urgent" = le véhicule ne peut pas rouler.',
    ],
  },
  {
    id: 'billing',
    icon: CreditCard,
    color: 'yellow',
    title: 'Facturation',
    subtitle: 'Créer et gérer les factures',
    steps: [
      { title: 'Créer depuis une réservation', desc: 'Cliquez sur "Nouvelle facture" puis liez-la à une réservation via le menu déroulant. Le client, le véhicule, les dates, le tarif et le chauffeur assigné se remplissent automatiquement.' },
      { title: 'Téléphone & CNI client', desc: 'Le téléphone du client est pré-rempli depuis la fiche contact. Si le champ est vide, vérifiez que le client a un numéro de téléphone dans sa fiche Contacts.' },
      { title: 'Chauffeur assigné', desc: 'Si un chauffeur a été sélectionné dans la réservation, il est automatiquement sélectionné dans le champ "Chauffeur assigné" de la facture. Vous pouvez le modifier manuellement si besoin.' },
      { title: 'Commission apporteur', desc: 'Si un apporteur d\'affaires est impliqué, saisissez son taux (%). Le montant est calculé automatiquement. Indiquez aussi le type de commission dans le champ dédié.' },
      { title: 'Caution & Acompte', desc: 'Cochez "Caution" et saisissez le montant si une caution a été versée. L\'acompte s\'affiche séparément dans le résumé financier de la facture.' },
      { title: 'Statuts facture', desc: 'Brouillon → Envoyé → Payé. Le statut "En retard" peut être appliqué si la date d\'échéance est dépassée et le paiement non reçu.' },
      { title: 'Imprimer / Exporter', desc: 'Cliquez sur l\'icône œil pour prévisualiser la facture, puis sur "Imprimer" pour la générer en PDF ou l\'imprimer directement. Le format est optimisé pour impression A4.' },
    ],
    tips: [
      'Les réservations terminées sans facture sont signalées en orange sur le dashboard — accédez-y depuis le bouton "Créer la facture".',
      'Passez la facture au statut "Payé" dès que le paiement est reçu pour que le CA du dashboard soit à jour.',
    ],
  },
  {
    id: 'drivers',
    icon: UserCheck,
    color: 'teal',
    title: 'Chauffeurs',
    subtitle: 'Gérer les profils chauffeurs',
    steps: [
      { title: 'Ajouter un chauffeur', desc: 'Cliquez sur "Ajouter un chauffeur". Renseignez le nom, le téléphone, le numéro de permis et sa date d\'expiration. Ces informations sont visibles dans les factures.' },
      { title: 'Véhicule assigné', desc: 'Chaque chauffeur peut être associé à un véhicule de la flotte. Sélectionnez-le dans le menu déroulant. Cette association est indicative et n\'empêche pas de l\'assigner à une autre réservation.' },
      { title: 'Commission chauffeur', desc: 'Si le chauffeur reçoit une commission sur les locations, indiquez son taux en %. Cette info est consultable sur sa fiche et peut être référencée dans les notes de facture.' },
      { title: 'Statuts', desc: 'Actif = disponible, En congé = temporairement absent (visible dans les réservations avec la mention "congé"), Inactif = ne travaille plus (toujours sélectionnable pour l\'historique).' },
      { title: 'Alerte permis expiré', desc: 'Si la date d\'expiration du permis est passée, un badge rouge "expiré" apparaît directement sur la fiche du chauffeur. Mettez à jour la date après renouvellement.' },
    ],
    tips: [
      'Tous les chauffeurs (actifs, en congé, inactifs) apparaissent dans la liste de sélection des réservations — utile pour l\'historique.',
      'Le chauffeur sélectionné dans une réservation est automatiquement repris dans la facture associée.',
    ],
  },
  {
    id: 'routes',
    icon: MapPin,
    color: 'orange',
    title: 'Destinations',
    subtitle: 'Tarifs par trajet',
    steps: [
      { title: 'Ajouter un tarif', desc: 'Cliquez sur "Ajouter un trajet". Renseignez le lieu de départ, la destination et le prix forfaitaire en FCFA. Exemple : Brazzaville Centre → Aéroport Maya-Maya = 50 000 FCFA.' },
      { title: 'Utilisation', desc: 'Cette liste sert de grille tarifaire de référence pour les agents lors de la création de réservations ou devis. Elle n\'est pas liée automatiquement aux réservations.' },
      { title: 'Modifier / Supprimer', desc: 'Cliquez sur l\'icône crayon pour modifier un tarif existant, ou sur la poubelle pour le supprimer définitivement.' },
    ],
    tips: [
      'Maintenez cette liste à jour — elle sert de référence tarifaire officielle pour tous les agents.',
      'Pensez à ajouter les deux sens d\'un trajet si les prix sont différents (aller vs retour).',
    ],
  },
  {
    id: 'history',
    icon: History,
    color: 'slate',
    title: 'Historique',
    subtitle: 'Journal d\'activité complet',
    steps: [
      { title: 'Traçabilité automatique', desc: 'Chaque action importante dans le CRM est enregistrée automatiquement : création, modification et suppression de contact, réservation, facture, véhicule, maintenance, etc.' },
      { title: 'Filtrer les événements', desc: 'Utilisez les filtres pour afficher uniquement certains types d\'événements (réservations, contacts, factures…). La barre de recherche permet de chercher par mot-clé dans les descriptions.' },
      { title: 'Données non modifiables', desc: 'Les entrées de l\'historique ne peuvent pas être modifiées ni supprimées. C\'est un journal de traçabilité permanent et immuable, utile en cas de litige.' },
    ],
    tips: [
      'En cas de doute sur une modification, consultez l\'historique — chaque changement de statut est tracé.',
      'L\'historique est visible par tous les utilisateurs ayant accès au CRM.',
    ],
  },
];

const colorMap = {
  blue:   { bg: 'bg-blue-50',   border: 'border-blue-200',   icon: 'bg-blue-100 text-blue-600',    badge: 'bg-nc-navy',    text: 'text-blue-700'   },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', icon: 'bg-purple-100 text-purple-600', badge: 'bg-purple-600',  text: 'text-purple-700' },
  green:  { bg: 'bg-green-50',  border: 'border-green-200',  icon: 'bg-green-100 text-green-600',   badge: 'bg-green-600',   text: 'text-green-700'  },
  indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', icon: 'bg-indigo-100 text-indigo-600', badge: 'bg-indigo-600',  text: 'text-indigo-700' },
  red:    { bg: 'bg-red-50',    border: 'border-red-200',    icon: 'bg-red-100 text-red-600',       badge: 'bg-red-600',     text: 'text-red-700'    },
  yellow: { bg: 'bg-yellow-50', border: 'border-yellow-200', icon: 'bg-yellow-100 text-yellow-600', badge: 'bg-yellow-600',  text: 'text-yellow-700' },
  teal:   { bg: 'bg-teal-50',   border: 'border-teal-200',   icon: 'bg-teal-100 text-teal-600',     badge: 'bg-teal-600',    text: 'text-teal-700'   },
  orange: { bg: 'bg-orange-50', border: 'border-orange-200', icon: 'bg-orange-100 text-orange-600', badge: 'bg-orange-600',  text: 'text-orange-700' },
  slate:  { bg: 'bg-slate-50',  border: 'border-slate-200',  icon: 'bg-slate-100 text-slate-600',   badge: 'bg-slate-600',   text: 'text-slate-700'  },
};

const STORAGE_KEY = 'nc_guide_completed';

const SectionCard = ({ section, index, forceOpen, completed, onToggleComplete }) => {
  const [open, setOpen] = useState(false);
  const c = colorMap[section.color];
  const Icon = section.icon;
  const isOpen = forceOpen !== null ? forceOpen : open;

  const handleToggle = () => {
    if (forceOpen !== null) return;
    setOpen(o => !o);
  };

  return (
    <div className={`rounded-2xl border-2 overflow-hidden shadow-sm transition-all ${completed ? 'border-green-300' : c.border}`}>
      {/* Header */}
      <button
        onClick={handleToggle}
        className={`w-full flex items-center gap-4 p-5 transition-all ${completed ? 'bg-green-50 hover:bg-green-100' : `${c.bg} hover:brightness-95`}`}
      >
        <div className={`p-3 rounded-xl shrink-0 ${completed ? 'bg-green-100 text-green-600' : c.icon}`}>
          {completed ? <CheckCircle className="h-6 w-6" /> : <Icon className="h-6 w-6" />}
        </div>
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full text-white ${completed ? 'bg-green-500' : c.badge}`}>
              Module {index + 1}
            </span>
            {completed && (
              <span className="text-xs font-semibold text-green-600 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" /> Lu
              </span>
            )}
          </div>
          <p className="font-bold text-slate-900 text-base mt-0.5">{section.title}</p>
          <p className="text-sm text-slate-500">{section.subtitle}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-slate-400 hidden sm:block">{section.steps.length} étapes</span>
          <div className="text-slate-400">
            {isOpen ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
          </div>
        </div>
      </button>

      {/* Body */}
      {isOpen && (
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
                <Lightbulb className="h-3.5 w-3.5" /> Conseils pratiques
              </p>
              <ul className="space-y-2">
                {section.tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <ArrowRight className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${c.text}`} />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Mark as read */}
          <div className="flex justify-end pt-2 border-t border-slate-100">
            <button
              onClick={() => onToggleComplete(section.id)}
              className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg transition-all ${
                completed
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <CheckCircle className="h-4 w-4" />
              {completed ? 'Marquer comme non lu' : 'Marquer comme lu'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const WorkflowStep = ({ icon: Icon, label, color, arrow }) => (
  <div className="flex items-center gap-2">
    <div className={`flex flex-col items-center gap-1.5`}>
      <div className={`p-2.5 rounded-xl ${color} shadow-sm`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <span className="text-xs font-semibold text-slate-700 text-center leading-tight max-w-[60px]">{label}</span>
    </div>
    {arrow && <ArrowRight className="h-5 w-5 text-slate-300 shrink-0 mb-4" />}
  </div>
);

const Tutorial = ({ embedded = false }) => {
  const [search, setSearch] = useState('');
  const [forceOpen, setForceOpen] = useState(null);
  const [completed, setCompleted] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    catch { return []; }
  });

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(completed)); }
    catch { /* ignore */ }
  }, [completed]);

  const toggleComplete = (id) => {
    setCompleted(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const filteredSections = useMemo(() => {
    if (!search.trim()) return sections;
    const q = search.toLowerCase();
    return sections.filter(s =>
      s.title.toLowerCase().includes(q) ||
      s.subtitle.toLowerCase().includes(q) ||
      s.steps.some(st => st.title.toLowerCase().includes(q) || st.desc.toLowerCase().includes(q)) ||
      s.tips?.some(t => t.toLowerCase().includes(q))
    );
  }, [search]);

  const completedCount = completed.length;
  const progress = Math.round((completedCount / sections.length) * 100);

  const toggleAll = () => {
    if (forceOpen === true) {
      setForceOpen(false);
    } else {
      setForceOpen(true);
    }
  };

  return (
    <div className={embedded ? 'space-y-6' : 'p-6 lg:p-8 max-w-4xl mx-auto space-y-6'}>

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
        <p className="text-blue-100 leading-relaxed mb-5">
          Ce guide explique comment utiliser chaque module du CRM. Cliquez sur un module pour afficher
          les instructions détaillées, étape par étape.
        </p>
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 bg-white/15 rounded-lg px-3 py-1.5 text-sm">
            <CheckCircle className="h-4 w-4 text-green-300" />
            {sections.length} modules documentés
          </div>
          <div className="flex items-center gap-2 bg-white/15 rounded-lg px-3 py-1.5 text-sm">
            <Star className="h-4 w-4 text-yellow-300" />
            Conseils pratiques inclus
          </div>
          {completedCount > 0 && (
            <div className="flex items-center gap-2 bg-white/15 rounded-lg px-3 py-1.5 text-sm">
              <CircleDot className="h-4 w-4 text-green-300" />
              {completedCount}/{sections.length} modules lus
            </div>
          )}
        </div>
      </div>

      {/* Progression */}
      {completedCount > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex justify-between items-center mb-2">
            <p className="text-sm font-semibold text-slate-700">Progression</p>
            <span className="text-sm font-bold text-blue-600">{progress}%</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-2 bg-gradient-to-r from-blue-500 to-green-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {completedCount === sections.length
              ? '🎉 Vous avez lu tout le guide !'
              : `${sections.length - completedCount} module(s) restants à lire`}
          </p>
        </div>
      )}

      {/* Flux de travail */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-4">Flux de travail typique</p>
        <div className="flex items-start gap-1 flex-wrap justify-center sm:justify-start">
          <WorkflowStep icon={Users} label="Contact" color="bg-purple-500" arrow />
          <WorkflowStep icon={CalendarDays} label="Réservation" color="bg-green-500" arrow />
          <WorkflowStep icon={UserCheck} label="Chauffeur" color="bg-teal-500" arrow />
          <WorkflowStep icon={CreditCard} label="Facture" color="bg-yellow-500" arrow />
          <WorkflowStep icon={History} label="Historique" color="bg-slate-500" />
        </div>
        <p className="text-xs text-slate-400 mt-3">
          Créez le client → Créez la réservation avec le chauffeur → Terminez la réservation → Générez la facture
        </p>
      </div>

      {/* Search + Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher dans le guide..."
            value={search}
            onChange={e => { setSearch(e.target.value); setForceOpen(null); }}
            className="w-full pl-10 pr-10 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-nc-navy"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 justify-between">
          <div className="flex flex-wrap gap-2">
            {sections.map(s => {
              const Icon = s.icon;
              const c = colorMap[s.color];
              const isCompleted = completed.includes(s.id);
              return (
                <button
                  key={s.id}
                  onClick={() => { setSearch(''); setForceOpen(null); document.getElementById(`section-${s.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                    isCompleted ? 'bg-green-50 border-green-200 text-green-700' : `${c.bg} ${c.border} ${c.text}`
                  }`}
                >
                  {isCompleted ? <CheckCircle className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
                  {s.title}
                </button>
              );
            })}
          </div>
          <button
            onClick={toggleAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all shrink-0"
          >
            {forceOpen === true
              ? <><ChevronsDownUp className="h-3.5 w-3.5" /> Tout fermer</>
              : <><ChevronsUpDown className="h-3.5 w-3.5" /> Tout ouvrir</>
            }
          </button>
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
      {filteredSections.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Search className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">Aucun résultat pour "{search}"</p>
          <button onClick={() => setSearch('')} className="text-sm text-blue-500 hover:underline mt-1">Effacer la recherche</button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSections.map((section, i) => (
            <div key={section.id} id={`section-${section.id}`}>
              <SectionCard
                section={section}
                index={sections.indexOf(section)}
                forceOpen={forceOpen}
                completed={completed.includes(section.id)}
                onToggleComplete={toggleComplete}
              />
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="text-center py-6 border-t border-slate-200">
        <p className="text-sm text-slate-500">
          Nouveau Concept CRM · Pour toute question, contactez l'administrateur du système.
        </p>
        {completedCount > 0 && (
          <button
            onClick={() => setCompleted([])}
            className="text-xs text-slate-400 hover:text-slate-600 underline mt-2 block mx-auto"
          >
            Réinitialiser la progression
          </button>
        )}
      </div>
    </div>
  );
};

export default Tutorial;
