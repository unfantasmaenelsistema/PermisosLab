/* ==========================================================================
   PermisosLab — Windows Server NTFS & SMB Share Engine (js/windowsEngine.js)
   Creado para Un Fantasma en el Sistema (https://www.unfantasmaenelsistema.com/)
   ========================================================================== */

export const WIN_PRINCIPALS = [
  { id: 'system', name: 'SYSTEM', domain: 'NT AUTHORITY\\SYSTEM', type: 'system', memberOf: [] },
  { id: 'admins', name: 'Administrators (WIN-SRV01\\Administrators)', domain: 'WIN-SRV01\\Administrators', type: 'group', memberOf: [] },
  { id: 'users', name: 'Users (WIN-SRV01\\Users)', domain: 'WIN-SRV01\\Users', type: 'group', memberOf: [] },
  { id: 'auth_users', name: 'Authenticated Users', domain: 'NT AUTHORITY\\Authenticated Users', type: 'group', memberOf: [] },
  { id: 'ventas_group', name: 'Ventas_Group (EMPRESA\\Ventas_Group)', domain: 'EMPRESA\\Ventas_Group', type: 'group', memberOf: ['users', 'auth_users'] },
  { id: 'rrhh_group', name: 'RRHH_Group (EMPRESA\\RRHH_Group)', domain: 'EMPRESA\\RRHH_Group', type: 'group', memberOf: ['users', 'auth_users'] },
  { id: 'finanzas_group', name: 'Finanzas_Group (EMPRESA\\Finanzas_Group)', domain: 'EMPRESA\\Finanzas_Group', type: 'group', memberOf: ['users', 'auth_users'] },
  { id: 'devops_group', name: 'DevOps_Group (EMPRESA\\DevOps_Group)', domain: 'EMPRESA\\DevOps_Group', type: 'group', memberOf: ['users', 'auth_users'] },
  { id: 'mgarcia', name: 'mgarcia (María García - Dpto. Ventas)', domain: 'EMPRESA\\mgarcia', type: 'user', memberOf: ['ventas_group', 'users', 'auth_users'] },
  { id: 'jdoe', name: 'jdoe (Juan Doe - Analista Finanzas)', domain: 'EMPRESA\\jdoe', type: 'user', memberOf: ['finanzas_group', 'users', 'auth_users'] },
  { id: 'carlos_sre', name: 'carlos_sre (Carlos SRE - DevOps)', domain: 'EMPRESA\\carlos_sre', type: 'user', memberOf: ['devops_group', 'users', 'auth_users'] },
  { id: 'guest', name: 'Invitado (WIN-SRV01\\Guest)', domain: 'WIN-SRV01\\Guest', type: 'user', memberOf: [] },
];

export const NTFS_PERMS = [
  { id: 'full', label: 'Control total' },
  { id: 'modify', label: 'Modificar' },
  { id: 'read_exec', label: 'Lectura y ejecución' },
  { id: 'read', label: 'Lectura' },
  { id: 'write', label: 'Escritura' },
];

export const SHARE_PERMS = [
  { id: 'full', label: 'Control total' },
  { id: 'change', label: 'Cambiar' },
  { id: 'read', label: 'Leer' },
];

/**
 * Derechos atómicos en los que se descomponen los permisos básicos de NTFS y de Share.
 * Un permiso compuesto (Modificar, Control total…) solo es efectivo si lo son TODOS sus derechos,
 * y denegar uno de ellos (p. ej. Escritura) anula también los compuestos que lo contienen.
 */
export const ATOMIC_RIGHTS = ['R', 'X', 'W', 'D', 'C'];
export const ATOMIC_LABELS = {
  R: 'leer datos',
  X: 'ejecutar / recorrer',
  W: 'escribir datos',
  D: 'eliminar',
  C: 'cambiar permisos y tomar posesión',
};
export const NTFS_ATOMS = {
  read: ['R'],
  write: ['W'],
  read_exec: ['R', 'X'],
  modify: ['R', 'X', 'W', 'D'],
  full: ['R', 'X', 'W', 'D', 'C'],
};
export const SHARE_ATOMS = {
  read: ['R', 'X'],
  change: ['R', 'X', 'W', 'D'],
  full: ['R', 'X', 'W', 'D', 'C'],
};
/** Casillas que se marcan junto a cada permiso (como en el diálogo de Windows) */
const NTFS_COMPONENTS = {
  full: ['full', 'modify', 'read_exec', 'read', 'write'],
  modify: ['modify', 'read_exec', 'read', 'write'],
  read_exec: ['read_exec', 'read'],
  read: ['read'],
  write: ['write'],
};
const SHARE_COMPONENTS = {
  full: ['full', 'change', 'read'],
  change: ['change', 'read'],
  read: ['read'],
};

/** ACL de la carpeta contenedora que se hereda al (re)habilitar la herencia */
export const DEFAULT_PARENT_ACL = [
  { principalId: 'system', allow: ['full', 'modify', 'read_exec', 'read', 'write'], deny: [] },
  { principalId: 'admins', allow: ['full', 'modify', 'read_exec', 'read', 'write'], deny: [] },
  { principalId: 'users', allow: ['read_exec', 'read'], deny: [] },
];

const clone = (obj) => JSON.parse(JSON.stringify(obj));

export function createInitialResources() {
  return [
    {
      id: 'contabilidad_excel',
      name: 'Presupuesto_Ventas.xlsx',
      path: 'C:\\Empresa\\Contabilidad\\Presupuesto_Ventas.xlsx',
      parentPath: 'C:\\Empresa\\Contabilidad',
      type: 'file',
      size: '612 KB',
      owner: 'Administrators (WIN-SRV01\\Administrators)',
      inheritanceDisabled: true,
      shareEnabled: true,
      shareName: '\\\\WIN-SRV01\\Contabilidad',
      sharePermission: 'read',
      shareAcl: [
        { principalId: 'admins', allow: ['full', 'change', 'read'], deny: [] },
        { principalId: 'auth_users', allow: ['read'], deny: [] },
      ],
      acl: [
        { principalId: 'system', inherited: false, allow: ['full', 'modify', 'read_exec', 'read', 'write'], deny: [] },
        { principalId: 'admins', inherited: false, allow: ['full', 'modify', 'read_exec', 'read', 'write'], deny: [] },
        { principalId: 'ventas_group', inherited: false, allow: ['read_exec', 'read'], deny: [] },
      ],
    },
    {
      id: 'finanzas_dir',
      name: 'Finanzas',
      path: 'C:\\Empresa\\Finanzas',
      parentPath: 'C:\\Empresa',
      type: 'folder',
      size: 'Carpeta de archivos',
      owner: 'Administrators (WIN-SRV01\\Administrators)',
      inheritanceDisabled: true,
      shareEnabled: true,
      shareName: '\\\\WIN-SRV01\\Finanzas$',
      sharePermission: 'full',
      shareAcl: [
        { principalId: 'admins', allow: ['full', 'change', 'read'], deny: [] },
        { principalId: 'auth_users', allow: ['full', 'change', 'read'], deny: [] },
      ],
      acl: [
        { principalId: 'system', inherited: false, allow: ['full', 'modify', 'read_exec', 'read', 'write'], deny: [] },
        { principalId: 'admins', inherited: false, allow: ['full', 'modify', 'read_exec', 'read', 'write'], deny: [] },
        { principalId: 'finanzas_group', inherited: false, allow: ['modify', 'read_exec', 'read', 'write'], deny: [] },
        { principalId: 'users', inherited: false, allow: ['read_exec', 'read'], deny: ['write'] },
      ],
    },
    {
      id: 'rrhh_nominas',
      name: 'Nominas_2026.xlsx',
      path: 'C:\\Empresa\\RRHH\\Nominas_2026.xlsx',
      parentPath: 'C:\\Empresa\\RRHH',
      type: 'file',
      size: '482 KB',
      owner: 'Administrators (WIN-SRV01\\Administrators)',
      inheritanceDisabled: false,
      shareEnabled: true,
      shareName: '\\\\WIN-SRV01\\RRHH$',
      sharePermission: 'change',
      shareAcl: [
        { principalId: 'admins', allow: ['full', 'change', 'read'], deny: [] },
        { principalId: 'auth_users', allow: ['change', 'read'], deny: [] },
      ],
      acl: [
        { principalId: 'system', inherited: true, allow: ['full', 'modify', 'read_exec', 'read', 'write'], deny: [] },
        { principalId: 'admins', inherited: true, allow: ['full', 'modify', 'read_exec', 'read', 'write'], deny: [] },
        { principalId: 'users', inherited: true, allow: ['read_exec', 'read'], deny: [] },
      ],
    },
    {
      id: 'script_deploy',
      name: 'Deploy-Prod.ps1',
      path: 'C:\\Empresa\\Scripts\\Deploy-Prod.ps1',
      parentPath: 'C:\\Empresa\\Scripts',
      type: 'file',
      size: '28 KB',
      owner: 'Administrators (WIN-SRV01\\Administrators)',
      inheritanceDisabled: true,
      shareEnabled: true,
      shareName: '\\\\WIN-SRV01\\Scripts$',
      sharePermission: 'change',
      shareAcl: [
        { principalId: 'admins', allow: ['full', 'change', 'read'], deny: [] },
        { principalId: 'auth_users', allow: ['change', 'read'], deny: [] },
      ],
      acl: [
        { principalId: 'system', inherited: false, allow: ['full', 'modify', 'read_exec', 'read', 'write'], deny: [] },
        { principalId: 'admins', inherited: false, allow: ['full', 'modify', 'read_exec', 'read', 'write'], deny: [] },
        { principalId: 'devops_group', inherited: false, allow: ['modify', 'read_exec', 'read', 'write'], deny: [] },
      ],
    },
    {
      id: 'proyectos_dir',
      name: 'Proyectos_2026',
      path: 'C:\\Empresa\\Proyectos_2026',
      parentPath: 'C:\\Empresa',
      type: 'folder',
      size: 'Carpeta de archivos',
      owner: 'Administrators (WIN-SRV01\\Administrators)',
      inheritanceDisabled: true,
      shareEnabled: false,
      shareName: '\\\\WIN-SRV01\\Proyectos',
      sharePermission: 'read',
      shareAcl: [
        { principalId: 'admins', allow: ['full', 'change', 'read'], deny: [] },
        { principalId: 'auth_users', allow: ['read'], deny: [] },
      ],
      acl: [
        { principalId: 'system', inherited: false, allow: ['full', 'modify', 'read_exec', 'read', 'write'], deny: [] },
        { principalId: 'admins', inherited: false, allow: ['full', 'modify', 'read_exec', 'read', 'write'], deny: [] },
      ],
    },
  ];
}

export class WindowsPermissionsEngine {
  constructor(onStateChange) {
    this.onStateChange = onStateChange;
    this.reset();
  }

  reset() {
    this.state = {
      resources: createInitialResources(),
      selectedResourceId: 'contabilidad_excel',
      activeTab: 'security',
      selectedPrincipalId: 'ventas_group',
      selectedSharePrincipalId: 'auth_users',
      isAdvancedModalOpen: false,
      advancedActiveTab: 'adv_effective',
      effectiveTestUserId: 'mgarcia',
      effectiveViaSmb: true,
      dirty: false,
      lastSimulatedAction: null,
      statusMessage: 'Estado inicial del ticket cargado. Investiga las pestañas Compartir y Seguridad.',
    };
    this.savedResources = clone(this.state.resources);
    this.notify();
  }

  /**
   * Carga el estado inicial definido por el JSON de un Ticket de Help Desk
   */
  loadChallengeState(initialState) {
    if (!initialState) {
      this.reset();
      return;
    }
    const clonedResources = JSON.parse(JSON.stringify(initialState.resources || createInitialResources()));
    const targetResId = initialState.selectedResourceId || clonedResources[0]?.id || 'contabilidad_excel';
    const targetRes = clonedResources.find((r) => r.id === targetResId) || clonedResources[0];

    this.state = {
      resources: clonedResources,
      selectedResourceId: targetResId,
      activeTab: initialState.activeTab || 'security',
      selectedPrincipalId: initialState.selectedPrincipalId || targetRes?.acl[0]?.principalId || 'system',
      selectedSharePrincipalId: 'auth_users',
      isAdvancedModalOpen: false,
      advancedActiveTab: 'adv_effective',
      effectiveTestUserId: initialState.effectiveTestUserId || 'mgarcia',
      effectiveViaSmb: true,
      dirty: false,
      lastSimulatedAction: null,
      statusMessage: `Ticket cargado: inspeccionando ${targetRes?.path || ''}`,
    };
    this.savedResources = clone(this.state.resources);
    this.notify();
  }

  getSelectedResource() {
    return this.state.resources.find((r) => r.id === this.state.selectedResourceId) || this.state.resources[0];
  }

  selectResource(resourceId) {
    const res = this.state.resources.find((r) => r.id === resourceId);
    if (!res) return;
    this.state.selectedResourceId = resourceId;
    this.state.selectedPrincipalId = res.acl[0]?.principalId || 'system';
    this.state.selectedSharePrincipalId = res.shareAcl[0]?.principalId || 'auth_users';
    this.state.lastSimulatedAction = null;
    this.state.statusMessage = `Propiedades cargadas para ${res.path}`;
    this.notify();
  }

  /**
   * Simula que un usuario intenta Abrir/Leer o Guardar/Sobreescribir el recurso seleccionado por Red SMB
   */
  simulateUserAction(userId, actionType) {
    const res = this.getSelectedResource();
    const userObj = WIN_PRINCIPALS.find((p) => p.id === userId) || WIN_PRINCIPALS[0];
    const eff = this.evaluateEffectiveAccess(res, userId, true);

    if (actionType === 'read') {
      const ok = Boolean(eff.read?.granted);
      this.state.lastSimulatedAction = {
        ok,
        user: userObj.domain,
        actionLabel: 'Leer / Abrir recurso',
        detail: ok
          ? `[Win32 OK] ${userObj.domain} abrió "${res.name}" correctamente (${eff.read.reason}).`
          : `[Error 0x80070005: Acceso denegado] ${userObj.domain} no puede leer "${res.name}" (${eff.read.reason}).`,
      };
    } else if (actionType === 'write') {
      const ok = Boolean(eff.write?.granted);
      this.state.lastSimulatedAction = {
        ok,
        user: userObj.domain,
        actionLabel: 'Guardar / Sobreescribir',
        detail: ok
          ? `[Win32 OK] ${userObj.domain} guardó cambios en "${res.name}" (${eff.write.reason}).`
          : `[Error 0x80070005: Acceso denegado] ${userObj.domain} no puede escribir en "${res.name}" (${eff.write.reason}).`,
      };
    }

    this.state.effectiveTestUserId = userId;
    this.notify();
  }

  setTab(tabId) {
    if (tabId === 'advanced' || tabId === 'effective') {
      this.state.isAdvancedModalOpen = true;
      this.state.advancedActiveTab = tabId === 'effective' ? 'adv_effective' : 'adv_permissions';
    } else {
      this.state.activeTab = tabId;
    }
    this.notify();
  }

  openAdvancedModal(initialTab = 'adv_permissions') {
    // Cancelar en el diálogo avanzado descarta solo lo que se cambie dentro de él
    this.advSnapshot = { resources: clone(this.state.resources), dirty: this.state.dirty };
    this.state.isAdvancedModalOpen = true;
    this.state.advancedActiveTab = initialTab;
    this.notify();
  }

  closeAdvancedModal() {
    this.state.isAdvancedModalOpen = false;
    this.notify();
  }

  cancelAdvancedModal() {
    if (this.advSnapshot) {
      this.state.resources = clone(this.advSnapshot.resources);
      this.state.dirty = this.advSnapshot.dirty;
      this.fixSelections();
      this.state.statusMessage = 'Cambios de la configuración avanzada descartados.';
    }
    this.state.isAdvancedModalOpen = false;
    this.notify();
  }

  /** Descarta lo que no se haya aplicado (botón Cancelar del diálogo Propiedades) */
  cancelChanges() {
    this.state.resources = clone(this.savedResources);
    this.state.dirty = false;
    this.state.isAdvancedModalOpen = false;
    this.state.lastSimulatedAction = null;
    this.fixSelections();
    this.state.statusMessage = 'Cambios sin aplicar descartados.';
    this.notify();
  }

  fixSelections() {
    const res = this.getSelectedResource();
    if (!res) return;
    if (!res.acl.some((e) => e.principalId === this.state.selectedPrincipalId)) {
      this.state.selectedPrincipalId = res.acl[0]?.principalId || '';
    }
    if (!res.shareAcl.some((e) => e.principalId === this.state.selectedSharePrincipalId)) {
      this.state.selectedSharePrincipalId = res.shareAcl[0]?.principalId || 'auth_users';
    }
  }

  setAdvancedTab(advTabId) {
    this.state.advancedActiveTab = advTabId;
    this.notify();
  }

  selectPrincipal(principalId) {
    this.state.selectedPrincipalId = principalId;
    this.notify();
  }

  selectSharePrincipal(principalId) {
    this.state.selectedSharePrincipalId = principalId;
    this.notify();
  }

  addPrincipalToAcl(principalId) {
    const res = this.getSelectedResource();
    if (!res) return;
    const exists = res.acl.find((e) => e.principalId === principalId);
    if (!exists) {
      res.acl.push({
        principalId,
        inherited: false,
        allow: ['read_exec', 'read'],
        deny: [],
      });
    }
    this.state.selectedPrincipalId = principalId;
    this.state.dirty = true;
    const pObj = WIN_PRINCIPALS.find((p) => p.id === principalId);
    this.state.statusMessage = `Principal "${pObj?.name || principalId}" añadido a la ACL NTFS.`;
    this.notify();
  }

  removeSelectedPrincipal() {
    const res = this.getSelectedResource();
    if (!res) return;
    const entry = res.acl.find((e) => e.principalId === this.state.selectedPrincipalId);
    if (!entry) return;
    if (entry.inherited) {
      this.state.statusMessage =
        'No se puede quitar un permiso heredado. Abre "Opciones avanzadas" y pulsa "Deshabilitar herencia".';
      this.notify();
      return;
    }
    res.acl = res.acl.filter((e) => e.principalId !== this.state.selectedPrincipalId);
    this.state.selectedPrincipalId = res.acl[0]?.principalId || '';
    this.state.dirty = true;
    this.state.statusMessage = 'Entrada de control de acceso (ACE) eliminada.';
    this.notify();
  }

  /**
   * Gestiona clics en los checkboxes de Permitir / Denegar de la pestaña Seguridad (NTFS)
   */
  togglePermission(permId, mode, checked) {
    const res = this.getSelectedResource();
    if (!res) return;
    const entry = res.acl.find((e) => e.principalId === this.state.selectedPrincipalId);
    if (!entry || entry.inherited) return;
    this.applyCheckbox(entry, permId, mode, checked, NTFS_COMPONENTS);
    this.state.dirty = true;
    this.state.statusMessage = 'Permisos NTFS modificados. Pulsa "Aplicar" para guardar.';
    this.notify();
  }

  /**
   * Marcar una casilla marca sus componentes (Modificar ⇒ Lectura y ejecución, Lectura, Escritura) y
   * desmarca la columna contraria; desmarcarla desmarca también los compuestos que la contienen.
   */
  applyCheckbox(entry, permId, mode, checked, components) {
    const target = mode === 'allow' ? entry.allow : entry.deny;
    const opposite = mode === 'allow' ? entry.deny : entry.allow;
    const add = (list, p) => {
      if (!list.includes(p)) list.push(p);
    };
    const remove = (list, p) => {
      const idx = list.indexOf(p);
      if (idx !== -1) list.splice(idx, 1);
    };
    if (checked) {
      (components[permId] || [permId]).forEach((p) => {
        add(target, p);
        remove(opposite, p);
      });
    } else {
      Object.entries(components).forEach(([composite, parts]) => {
        if (parts.includes(permId)) remove(target, composite);
      });
    }
  }

  /**
   * Gestiona clics en los checkboxes de Permisos de Recurso Compartido (Share: Leer, Cambiar, Control Total)
   */
  toggleSharePermissionCheckbox(permId, mode, checked) {
    const res = this.getSelectedResource();
    if (!res || !res.shareEnabled) return;
    let entry = res.shareAcl.find((e) => e.principalId === this.state.selectedSharePrincipalId);
    if (!entry) {
      entry = { principalId: this.state.selectedSharePrincipalId, allow: ['read'], deny: [] };
      res.shareAcl.push(entry);
    }
    this.applyCheckbox(entry, permId, mode, checked, SHARE_COMPONENTS);
    res.sharePermission = this.shareLevelOf(res.shareAcl.find((e) => e.principalId === 'auth_users'));

    this.state.dirty = true;
    this.state.statusMessage = `Permisos del recurso compartido actualizados (Authenticated Users: ${res.sharePermission.toUpperCase()}).`;
    this.notify();
  }

  /** Nivel neto (none | read | change | full) de una entrada de Share, restando lo denegado */
  shareLevelOf(entry) {
    if (!entry) return 'none';
    const allowed = new Set(entry.allow.flatMap((p) => SHARE_ATOMS[p] || []));
    entry.deny.flatMap((p) => SHARE_ATOMS[p] || []).forEach((a) => allowed.delete(a));
    if (allowed.has('C') && allowed.has('W') && allowed.has('R')) return 'full';
    if (allowed.has('W') && allowed.has('R')) return 'change';
    if (allowed.has('R')) return 'read';
    return 'none';
  }

  updateShareConfig(shareEnabled, sharePermission) {
    const res = this.getSelectedResource();
    if (!res) return;
    res.shareEnabled = shareEnabled;
    if (shareEnabled && !res.shareName) {
      res.shareName = `\\\\WIN-SRV01\\${res.name}`;
    }
    res.sharePermission = sharePermission;

    let authEntry = res.shareAcl.find((e) => e.principalId === 'auth_users');
    if (!authEntry) {
      authEntry = { principalId: 'auth_users', allow: [], deny: [] };
      res.shareAcl.push(authEntry);
    }
    authEntry.deny = [];
    if (sharePermission === 'full') authEntry.allow = ['full', 'change', 'read'];
    else if (sharePermission === 'change') authEntry.allow = ['change', 'read'];
    else authEntry.allow = ['read'];

    this.state.dirty = true;
    this.state.statusMessage = `Configuración de recurso compartido SMB actualizada (${res.sharePermission.toUpperCase()}).`;
    this.notify();
  }

  toggleInheritance(convertExisting = true) {
    const res = this.getSelectedResource();
    if (!res) return;
    if (!res.inheritanceDisabled) {
      res.inheritanceDisabled = true;
      res.inheritanceMode = convertExisting ? 'd' : 'r';
      if (convertExisting) {
        res.acl.forEach((e) => {
          e.inherited = false;
        });
        this.state.statusMessage =
          'Herencia deshabilitada: los permisos heredados se han convertido en permisos explícitos.';
      } else {
        res.acl = res.acl.filter((e) => !e.inherited);
        this.state.selectedPrincipalId = res.acl[0]?.principalId || '';
        this.state.statusMessage = 'Herencia deshabilitada: se han quitado todos los permisos heredados.';
      }
    } else {
      // Rehabilitar: vuelven las ACE de la carpeta contenedora (las explícitas se conservan)
      res.inheritanceDisabled = false;
      res.inheritanceMode = 'e';
      (res.parentAcl || DEFAULT_PARENT_ACL).forEach((pe) => {
        if (!res.acl.some((e) => e.principalId === pe.principalId)) {
          res.acl.push({ ...clone(pe), inherited: true });
        }
      });
      this.state.statusMessage = `Herencia NTFS rehabilitada: se vuelven a aplicar los permisos de ${res.parentPath}.`;
    }
    this.state.dirty = true;
    this.notify();
  }

  setOwner(ownerName) {
    const res = this.getSelectedResource();
    if (!res) return;
    res.owner = ownerName;
    this.state.dirty = true;
    this.state.statusMessage = `Propietario cambiado a ${ownerName}.`;
    this.notify();
  }

  setEffectiveTestParams(userId, viaSmb) {
    this.state.effectiveTestUserId = userId;
    this.state.effectiveViaSmb = viaSmb;
    this.notify();
  }

  applyChanges() {
    this.savedResources = clone(this.state.resources);
    this.state.dirty = false;
    const res = this.getSelectedResource();
    this.state.statusMessage = `Cambios aplicados correctamente en ${res.path}`;
    this.notify();
  }

  /**
   * MOTOR DE EVALUACIÓN DE PERMISOS EFECTIVOS (Share ∩ NTFS):
   * 1. Suma acumulativa según pertenencia a grupos del usuario (user.id ∪ user.memberOf).
   * 2. Las denegaciones explícitas (Deny) prevalecen sobre las concesiones (Allow).
   * 3. Cuando se accede por red (SMB Share), el permiso final es el MÁS RESTRICTIVO entre Share y NTFS.
   */
  evaluateEffectiveAccess(resource, userId, viaSmb = true) {
    const user = WIN_PRINCIPALS.find((p) => p.id === userId) || WIN_PRINCIPALS[0];
    const effectivePrincipals = new Set([user.id, ...(user.memberOf || [])]);
    const shortName = (pid) => WIN_PRINCIPALS.find((p) => p.id === pid)?.name.split(' ')[0] || pid;
    const atomsOf = (list, map) => new Set((list || []).flatMap((p) => map[p] || []));

    const matchingNtfsEntries = resource.acl.filter((e) => effectivePrincipals.has(e.principalId));
    const matchingShareEntries = (resource.shareAcl || []).filter((e) => effectivePrincipals.has(e.principalId));

    // 1-2. NTFS por derecho atómico: Deny explícito > Allow explícito > Deny heredado > Allow heredado
    const ntfsAtoms = {};
    ATOMIC_RIGHTS.forEach((atom) => {
      const pick = (inherited, field) =>
        matchingNtfsEntries.filter((e) => Boolean(e.inherited) === inherited && atomsOf(e[field], NTFS_ATOMS).has(atom));
      const explicitDeny = pick(false, 'deny');
      const explicitAllow = pick(false, 'allow');
      const inheritedDeny = pick(true, 'deny');
      const inheritedAllow = pick(true, 'allow');
      if (explicitDeny.length) {
        ntfsAtoms[atom] = { granted: false, rule: `Denegado explícito en NTFS (${shortName(explicitDeny[0].principalId)})` };
      } else if (explicitAllow.length) {
        ntfsAtoms[atom] = { granted: true, rule: `Permitido explícito en NTFS (${explicitAllow.map((e) => shortName(e.principalId)).join(' + ')})` };
      } else if (inheritedDeny.length) {
        ntfsAtoms[atom] = { granted: false, rule: `Denegado heredado en NTFS (${shortName(inheritedDeny[0].principalId)})` };
      } else if (inheritedAllow.length) {
        ntfsAtoms[atom] = { granted: true, rule: `Permitido heredado en NTFS (${inheritedAllow.map((e) => shortName(e.principalId)).join(' + ')})` };
      } else {
        ntfsAtoms[atom] = { granted: false, rule: 'Denegación implícita (ningún grupo lo concede)' };
      }
    });

    // 3. Share: unión de lo permitido a los grupos del usuario menos lo denegado
    let shareAtoms = new Set();
    let shareSummaryLabel;
    if (!viaSmb) {
      shareAtoms = new Set(ATOMIC_RIGHTS);
      shareSummaryLabel = 'Acceso Local (Omitiendo filtro SMB)';
    } else if (!resource.shareEnabled) {
      shareSummaryLabel = 'No compartido (Bloqueado en red)';
    } else {
      matchingShareEntries.forEach((e) => atomsOf(e.allow, SHARE_ATOMS).forEach((a) => shareAtoms.add(a)));
      const denied = new Set();
      matchingShareEntries.forEach((e) => atomsOf(e.deny, SHARE_ATOMS).forEach((a) => denied.add(a)));
      denied.forEach((a) => shareAtoms.delete(a));
      if (shareAtoms.has('C') && shareAtoms.has('W')) shareSummaryLabel = 'Control total (Share)';
      else if (shareAtoms.has('W') && shareAtoms.has('R')) shareSummaryLabel = 'Cambiar (Share)';
      else if (shareAtoms.has('R')) shareSummaryLabel = denied.size ? 'Solo Lectura (Share, con denegaciones)' : 'Solo Lectura (Share)';
      else shareSummaryLabel = denied.size ? 'Denegado explícitamente en Share' : 'Sin permisos en Share';
    }

    const permissions = {};
    NTFS_PERMS.forEach((perm) => {
      const atoms = NTFS_ATOMS[perm.id];
      const missingNtfs = atoms.find((a) => !ntfsAtoms[a].granted);
      const ntfsGranted = !missingNtfs;
      const shareGranted = atoms.every((a) => shareAtoms.has(a));
      const finalGranted = viaSmb ? ntfsGranted && shareGranted : ntfsGranted;

      let ntfsRule;
      if (missingNtfs) {
        ntfsRule = atoms.length > 1
          ? `${ntfsAtoms[missingNtfs].rule} sobre «${ATOMIC_LABELS[missingNtfs]}»`
          : ntfsAtoms[missingNtfs].rule;
      } else {
        ntfsRule = [...new Set(atoms.map((a) => ntfsAtoms[a].rule))].join(' · ');
      }

      let reason = ntfsRule;
      if (viaSmb && ntfsGranted && !shareGranted) {
        reason = `${ntfsRule}, pero restringido por Share SMB (${shareSummaryLabel})`;
      } else if (viaSmb && ntfsGranted && shareGranted) {
        reason = `${ntfsRule} ∩ Permitido en Share SMB`;
      }

      permissions[perm.id] = {
        ntfsGranted,
        shareGranted,
        granted: finalGranted,
        reason,
      };
    });

    permissions._meta = {
      user,
      memberGroupNames: (user.memberOf || []).map(shortName),
      shareSummaryLabel,
    };

    return permissions;
  }

  /**
   * Comando icacls equivalente. El permiso va dentro de las comillas ("DOMINIO\\Grupo:(M)") para que
   * funcione igual en CMD y en PowerShell.
   */
  generateIcaclsCommand(resource) {
    const code = (list) => {
      if (list.includes('full')) return 'F';
      if (list.includes('modify')) return 'M';
      const parts = [];
      if (list.includes('read_exec')) parts.push('RX');
      else if (list.includes('read')) parts.push('R');
      if (list.includes('write')) parts.push('W');
      return parts.join(',');
    };

    const parts = [`icacls "${resource.path}"`];
    if (resource.inheritanceDisabled) {
      parts.push(resource.inheritanceMode === 'r' ? '/inheritance:r' : '/inheritance:d');
    } else {
      parts.push('/inheritance:e');
    }

    resource.acl.forEach((entry) => {
      if (entry.inherited) return;
      const pObj = WIN_PRINCIPALS.find((p) => p.id === entry.principalId);
      const name = pObj ? pObj.domain : entry.principalId;
      const allowCode = code(entry.allow);
      const denyCode = code(entry.deny);
      if (allowCode) parts.push(`/grant "${name}:(${allowCode})"`);
      if (denyCode) parts.push(`/deny "${name}:(${denyCode})"`);
    });

    return parts.join(' ');
  }

  notify() {
    if (typeof this.onStateChange === 'function') {
      this.onStateChange(this.state);
    }
  }
}
