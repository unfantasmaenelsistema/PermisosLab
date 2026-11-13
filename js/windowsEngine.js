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
 * Maps a Share permission level ('read' | 'change' | 'full') to the NTFS capabilities it permits
 */
export const SHARE_TO_NTFS_CAPABILITIES = {
  none: [],
  read: ['read_exec', 'read'],
  change: ['modify', 'read_exec', 'read', 'write'],
  full: ['full', 'modify', 'read_exec', 'read', 'write'],
};

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
    this.state.dirty = false;
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
    this.state.isAdvancedModalOpen = true;
    this.state.advancedActiveTab = initialTab;
    this.notify();
  }

  closeAdvancedModal() {
    this.state.isAdvancedModalOpen = false;
    this.notify();
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

    const targetList = mode === 'allow' ? entry.allow : entry.deny;
    const oppositeList = mode === 'allow' ? entry.deny : entry.allow;

    const addPerm = (list, p) => {
      if (!list.includes(p)) list.push(p);
    };
    const removePerm = (list, p) => {
      const idx = list.indexOf(p);
      if (idx !== -1) list.splice(idx, 1);
    };

    if (checked) {
      addPerm(targetList, permId);
      removePerm(oppositeList, permId);

      if (mode === 'allow') {
        if (permId === 'full') {
          ['modify', 'read_exec', 'read', 'write'].forEach((p) => {
            addPerm(targetList, p);
            removePerm(oppositeList, p);
          });
        } else if (permId === 'modify') {
          ['read_exec', 'read', 'write'].forEach((p) => {
            addPerm(targetList, p);
            removePerm(oppositeList, p);
          });
        } else if (permId === 'read_exec') {
          addPerm(targetList, 'read');
          removePerm(oppositeList, 'read');
        }
      } else {
        if (permId === 'full') {
          ['modify', 'read_exec', 'read', 'write'].forEach((p) => {
            addPerm(targetList, p);
            removePerm(oppositeList, p);
          });
        } else if (permId === 'modify') {
          addPerm(targetList, 'write');
          removePerm(oppositeList, 'write');
          removePerm(oppositeList, 'full');
        } else if (permId === 'read') {
          addPerm(targetList, 'read_exec');
          addPerm(targetList, 'modify');
          addPerm(targetList, 'full');
        } else if (permId === 'write') {
          removePerm(oppositeList, 'modify');
          removePerm(oppositeList, 'full');
        }
      }
    } else {
      removePerm(targetList, permId);
      if (mode === 'allow') {
        if (permId !== 'full') removePerm(targetList, 'full');
        if (['read', 'write', 'read_exec'].includes(permId)) removePerm(targetList, 'modify');
        if (permId === 'read') removePerm(targetList, 'read_exec');
      }
    }

    this.state.dirty = true;
    this.state.statusMessage = 'Permisos NTFS modificados. Pulsa "Aplicar" para guardar.';
    this.notify();
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

    const targetList = mode === 'allow' ? entry.allow : entry.deny;
    const oppositeList = mode === 'allow' ? entry.deny : entry.allow;

    const addP = (list, p) => {
      if (!list.includes(p)) list.push(p);
    };
    const remP = (list, p) => {
      const idx = list.indexOf(p);
      if (idx !== -1) list.splice(idx, 1);
    };

    if (checked) {
      addP(targetList, permId);
      remP(oppositeList, permId);
      if (mode === 'allow') {
        if (permId === 'full') {
          addP(targetList, 'change');
          addP(targetList, 'read');
          remP(oppositeList, 'change');
          remP(oppositeList, 'read');
        } else if (permId === 'change') {
          addP(targetList, 'read');
          remP(oppositeList, 'read');
        }
      } else {
        if (permId === 'full') {
          addP(targetList, 'change');
          addP(targetList, 'read');
          remP(oppositeList, 'change');
          remP(oppositeList, 'read');
        } else if (permId === 'read') {
          addP(targetList, 'change');
          addP(targetList, 'full');
        }
      }
    } else {
      remP(targetList, permId);
      if (mode === 'allow') {
        if (permId !== 'full') remP(targetList, 'full');
        if (permId === 'read') remP(targetList, 'change');
      }
    }

    const authEntry = res.shareAcl.find((e) => e.principalId === 'auth_users') || entry;
    if (authEntry.allow.includes('full') && !authEntry.deny.includes('full')) {
      res.sharePermission = 'full';
    } else if (authEntry.allow.includes('change') && !authEntry.deny.includes('change')) {
      res.sharePermission = 'change';
    } else {
      res.sharePermission = 'read';
    }

    this.state.dirty = true;
    this.state.statusMessage = `Permiso Share SMB actualizado (${res.sharePermission.toUpperCase()}).`;
    this.notify();
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
      res.inheritanceDisabled = false;
      res.acl.forEach((e) => {
        if (['system', 'admins', 'users'].includes(e.principalId)) {
          e.inherited = true;
        }
      });
      this.state.statusMessage = 'Herencia NTFS rehabilitada desde la carpeta contenedora.';
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

    const matchingNtfsEntries = resource.acl.filter((e) => effectivePrincipals.has(e.principalId));
    const matchingShareEntries = (resource.shareAcl || []).filter((e) => effectivePrincipals.has(e.principalId));

    let shareAllowedCaps = new Set();
    let shareSummaryLabel = 'Sin acceso de red';

    if (!viaSmb) {
      SHARE_TO_NTFS_CAPABILITIES.full.forEach((c) => shareAllowedCaps.add(c));
      shareSummaryLabel = 'Acceso Local (Omitiendo filtro SMB)';
    } else if (!resource.shareEnabled) {
      shareSummaryLabel = 'No compartido (Bloqueado en red)';
    } else {
      const shareDenyFull = matchingShareEntries.some((e) => e.deny.includes('full'));
      const shareDenyChange = matchingShareEntries.some((e) => e.deny.includes('change'));
      const shareDenyRead = matchingShareEntries.some((e) => e.deny.includes('read'));

      const shareAllowFull = matchingShareEntries.some((e) => e.allow.includes('full'));
      const shareAllowChange = matchingShareEntries.some((e) => e.allow.includes('change'));
      const shareAllowRead = matchingShareEntries.some((e) => e.allow.includes('read'));

      let effectiveShareLevel = 'none';
      if (shareDenyRead) {
        effectiveShareLevel = 'none';
        shareSummaryLabel = 'Denegado explícitamente en Share';
      } else if (shareAllowFull && !shareDenyFull && !shareDenyChange) {
        effectiveShareLevel = 'full';
        shareSummaryLabel = 'Control total (Share)';
      } else if ((shareAllowChange || shareAllowFull) && !shareDenyChange) {
        effectiveShareLevel = 'change';
        shareSummaryLabel = 'Cambiar (Lectura + Escritura)';
      } else if (shareAllowRead || resource.sharePermission === 'read') {
        effectiveShareLevel =
          effectivePrincipals.has('auth_users') || effectivePrincipals.has('admins')
            ? resource.sharePermission
            : 'none';
        shareSummaryLabel =
          effectiveShareLevel === 'full'
            ? 'Control total (Share)'
            : effectiveShareLevel === 'change'
              ? 'Cambiar (Share)'
              : effectiveShareLevel === 'read'
                ? 'Solo Lectura (Share)'
                : 'Sin permisos en Share';
      }

      (SHARE_TO_NTFS_CAPABILITIES[effectiveShareLevel] || []).forEach((c) => shareAllowedCaps.add(c));
    }

    const permissions = {};
    NTFS_PERMS.forEach((perm) => {
      const explicitDenyEntries = matchingNtfsEntries.filter((e) => !e.inherited && e.deny.includes(perm.id));
      const explicitAllowEntries = matchingNtfsEntries.filter((e) => !e.inherited && e.allow.includes(perm.id));
      const inheritedDenyEntries = matchingNtfsEntries.filter((e) => e.inherited && e.deny.includes(perm.id));
      const inheritedAllowEntries = matchingNtfsEntries.filter((e) => e.inherited && e.allow.includes(perm.id));

      let ntfsGranted = false;
      let ntfsRule = 'Denegación implícita (ningún grupo lo concede)';

      if (explicitDenyEntries.length > 0) {
        ntfsGranted = false;
        const pName = WIN_PRINCIPALS.find((p) => p.id === explicitDenyEntries[0].principalId)?.name.split(' ')[0];
        ntfsRule = `Denegado explícito en NTFS (${pName})`;
      } else if (explicitAllowEntries.length > 0) {
        ntfsGranted = true;
        const pNames = explicitAllowEntries
          .map((e) => WIN_PRINCIPALS.find((p) => p.id === e.principalId)?.name.split(' ')[0])
          .join(' + ');
        ntfsRule = `Permitido explícito en NTFS (${pNames})`;
      } else if (inheritedDenyEntries.length > 0) {
        ntfsGranted = false;
        ntfsRule = 'Denegado heredado en NTFS';
      } else if (inheritedAllowEntries.length > 0) {
        ntfsGranted = true;
        const pNames = inheritedAllowEntries
          .map((e) => WIN_PRINCIPALS.find((p) => p.id === e.principalId)?.name.split(' ')[0])
          .join(' + ');
        ntfsRule = `Permitido heredado en NTFS (${pNames})`;
      }

      const shareGranted = shareAllowedCaps.has(perm.id);
      const finalGranted = viaSmb ? ntfsGranted && shareGranted : ntfsGranted;

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
      memberGroupNames: (user.memberOf || []).map(
        (gid) => WIN_PRINCIPALS.find((p) => p.id === gid)?.name.split(' ')[0] || gid
      ),
      shareSummaryLabel,
    };

    return permissions;
  }

  generateIcaclsCommand(resource) {
    const parts = [`icacls "${resource.path}"`];
    parts.push(resource.inheritanceDisabled ? '/inheritance:d' : '/inheritance:e');

    resource.acl.forEach((entry) => {
      if (entry.inherited) return;
      const pObj = WIN_PRINCIPALS.find((p) => p.id === entry.principalId);
      const shortName = pObj ? pObj.domain : entry.principalId;

      if (entry.allow.length > 0) {
        let code = '(R)';
        if (entry.allow.includes('full')) code = '(F)';
        else if (entry.allow.includes('modify')) code = '(M)';
        else if (entry.allow.includes('read_exec') && entry.allow.includes('write')) code = '(RX,W)';
        else if (entry.allow.includes('read_exec')) code = '(RX)';
        parts.push(`/grant "${shortName}":${code}`);
      }
      if (entry.deny.length > 0) {
        let dCode = '(W)';
        if (entry.deny.includes('full')) dCode = '(F)';
        else if (entry.deny.includes('modify') && entry.deny.includes('write')) dCode = '(M,W)';
        else if (entry.deny.includes('read')) dCode = '(R)';
        parts.push(`/deny "${shortName}":${dCode}`);
      }
    });

    return parts.join(' ');
  }

  notify() {
    if (typeof this.onStateChange === 'function') {
      this.onStateChange(this.state);
    }
  }
}
