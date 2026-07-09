// Matrice des accès par rôle
// modules: liste des IDs de modules accessibles
// canWrite: false = lecture seule (readonly)

export const PERMISSIONS = {
  admin: {
    modules: ['dashboard','contacts','reservations','vehicles','maintenance','billing','drivers','routes','fidelisation','surveys','history','support','users','settings'],
    canWrite: true,
  },
  manager: {
    modules: ['dashboard','contacts','reservations','vehicles','maintenance','billing','drivers','routes','fidelisation','surveys','history','support'],
    canWrite: true,
  },
  agent: {
    modules: ['dashboard','contacts','reservations','vehicles','billing','routes','fidelisation','surveys','support'],
    canWrite: true,
  },
  fleet: {
    modules: ['dashboard','vehicles','maintenance','drivers','support'],
    canWrite: true,
  },
  accountant: {
    modules: ['dashboard','billing','fidelisation','support'],
    canWrite: true,
  },
  readonly: {
    modules: ['dashboard','contacts','reservations','vehicles','maintenance','billing','drivers','routes','fidelisation','surveys','history','support'],
    canWrite: false,
  },
  // anciens rôles conservés
  staff: {
    modules: ['dashboard','contacts','reservations','vehicles','billing','routes','fidelisation','surveys','support'],
    canWrite: true,
  },
  viewer: {
    modules: ['dashboard','contacts','reservations','vehicles','fidelisation','support'],
    canWrite: false,
  },
};

export const getPermissions = (role) => {
  return PERMISSIONS[role] || PERMISSIONS.viewer;
};

export const canAccessModule = (role, moduleId) => {
  const perms = getPermissions(role);
  return perms.modules.includes(moduleId);
};
