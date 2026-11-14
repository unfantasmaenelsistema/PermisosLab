/* ==========================================================================
   PermisosLab — Main UI Controller & OS Environment Switcher (js/main.js)
   Creado para Un Fantasma en el Sistema (https://www.unfantasmaenelsistema.com/)
   ========================================================================== */

import { CHALLENGES, verifyTicket } from './challenges.js';
import { WindowsPermissionsEngine, WIN_PRINCIPALS, NTFS_PERMS } from './windowsEngine.js';
import { LinuxTerminalEngine, LINUX_USERS, LINUX_GROUPS } from './linuxEngine.js';

const PROGRESS_KEY = 'permisoslab_progress_v1';

/** Escapa texto antes de insertarlo como HTML */
const escapeHtml = (str) =>
  String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

class PermisosLabApp {
  constructor() {
    this.activeEnv = 'selector'; // 'selector' | 'windows' | 'linux'
    this.activeChallengeIndex = {
      windows: 0,
      linux: 0,
    };
    this.loadedTicketId = {
      windows: null,
      linux: null,
    };
    this.resolvedTickets = this.loadProgress();
    this.lastVerification = null;
    this.showHint = false;

    this.winEngine = new WindowsPermissionsEngine(() => {
      if (this.activeEnv === 'windows') {
        this.renderWindowsStage();
        this.renderControlDeck();
      }
    });

    this.linuxEngine = new LinuxTerminalEngine(() => {
      if (this.activeEnv === 'linux') {
        this.renderLinuxStage();
        this.renderControlDeck();
      }
    });

    this.initEventListeners();
    this.updateClock();
    setInterval(() => this.updateClock(), 15000);
    this.switchEnvironment('selector');
  }

  initEventListeners() {
    // Topbar navigation
    document.getElementById('nav-brand')?.addEventListener('click', () => this.switchEnvironment('selector'));
    document.getElementById('nav-selector')?.addEventListener('click', () => this.switchEnvironment('selector'));
    document.getElementById('nav-windows')?.addEventListener('click', () => this.switchEnvironment('windows'));
    document.getElementById('nav-linux')?.addEventListener('click', () => this.switchEnvironment('linux'));

    // Guide & Cheat Sheet Modal
    document.getElementById('btn-open-guide')?.addEventListener('click', () => {
      document.getElementById('guide-modal-backdrop')?.classList.remove('hidden');
    });
    document.getElementById('btn-close-guide')?.addEventListener('click', () => {
      document.getElementById('guide-modal-backdrop')?.classList.add('hidden');
    });

    // Source Code & README Modal
    document.getElementById('btn-open-code')?.addEventListener('click', () => this.openSourceModal('README.md'));
    document.getElementById('btn-close-code')?.addEventListener('click', () => this.closeSourceModal());
    document.getElementById('btn-copy-code')?.addEventListener('click', () => this.copyCurrentSourceCode());

    // Dual-OS Login Selector triggers
    document.getElementById('btn-enter-windows')?.addEventListener('click', () => this.switchEnvironment('windows'));
    document.getElementById('btn-submit-win-pin')?.addEventListener('click', () => this.switchEnvironment('windows'));
    document.getElementById('win-pin-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.switchEnvironment('windows');
    });
    document.getElementById('btn-enter-linux')?.addEventListener('click', () => this.switchEnvironment('linux'));

    // Linux Terminal Input & Quick Actions
    const termInput = document.getElementById('linux-cmd-input');
    const termViewport = document.getElementById('ubuntu-term-viewport');

    termViewport?.addEventListener('click', () => {
      termInput?.focus();
    });

    termInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const val = termInput.value;
        termInput.value = '';
        this.linuxEngine.executeCommand(val, true);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (this.linuxEngine.historyIndex > 0) {
          this.linuxEngine.historyIndex--;
          termInput.value = this.linuxEngine.history[this.linuxEngine.historyIndex] || '';
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (this.linuxEngine.historyIndex < this.linuxEngine.history.length - 1) {
          this.linuxEngine.historyIndex++;
          termInput.value = this.linuxEngine.history[this.linuxEngine.historyIndex] || '';
        } else {
          this.linuxEngine.historyIndex = this.linuxEngine.history.length;
          termInput.value = '';
        }
      } else if (e.key === 'Tab') {
        e.preventDefault();
        this.autocompleteLinuxInput(termInput);
      }
    });

    // Quick Linux Toolbar buttons
    document.querySelectorAll('[data-linux-cmd]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const template = btn.getAttribute('data-linux-cmd');
        if (template) {
          // {sel} = elemento seleccionado en el inspector; {dir} = su directorio (para crear archivos de prueba)
          const eng = this.linuxEngine;
          const selNode = eng.fs[eng.selectedInspectPath];
          const sel = selNode ? selNode.path : eng.cwd;
          const dir = selNode && selNode.type === 'dir' ? selNode.path : eng.getParentPath(sel);
          const cmd = template.replace('{sel}', sel).replace('{dir}', dir);
          eng.executeCommand(cmd, true);
          termInput?.focus();
        }
      });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      const guide = document.getElementById('guide-modal-backdrop');
      const code = document.getElementById('code-modal-backdrop');
      if (code && !code.classList.contains('hidden')) {
        this.closeSourceModal();
      } else if (guide && !guide.classList.contains('hidden')) {
        guide.classList.add('hidden');
      } else if (this.activeEnv === 'windows' && this.winEngine.state.isAdvancedModalOpen) {
        this.winEngine.cancelAdvancedModal();
      }
    });

    document.getElementById('btn-toggle-ubuntu-theme')?.addEventListener('click', () => {
      const next = this.linuxEngine.theme === 'aubergine' ? 'black' : 'aubergine';
      this.linuxEngine.setTheme(next);
    });
  }

  /** Tickets cerrados con «Verificar Ticket» (se guardan en el navegador) */
  loadProgress() {
    try {
      const data = JSON.parse(window.localStorage.getItem(PROGRESS_KEY) || '{}');
      const valid = new Set([...CHALLENGES.windows, ...CHALLENGES.linux].map((t) => t.id));
      return new Set((data.resolved || []).filter((id) => valid.has(id)));
    } catch {
      return new Set();
    }
  }

  saveProgress() {
    try {
      window.localStorage.setItem(PROGRESS_KEY, JSON.stringify({ v: 1, resolved: [...this.resolvedTickets] }));
    } catch {
      /* almacenamiento no disponible: el progreso dura solo esta sesión */
    }
  }

  autocompleteLinuxInput(inputEl) {
    const val = inputEl.value;
    const parts = val.split(/\s+/);
    const last = parts[parts.length - 1] || '';
    const candidates = Object.values(this.linuxEngine.fs)
      .map((n) => n.name)
      .filter((n) => n !== '.');
    const match = candidates.find((c) => c.startsWith(last));
    if (match) {
      parts[parts.length - 1] = match;
      inputEl.value = parts.join(' ');
    }
  }

  updateClock() {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const timeStr = `${hh}:${mm}`;
    const winClock = document.getElementById('win-tray-clock');
    if (winClock) winClock.textContent = `${timeStr} · 12/11/2026`;
    const ubuClock = document.getElementById('ubuntu-panel-clock');
    if (ubuClock) ubuClock.textContent = `12 nov ${timeStr}`;
  }

  switchEnvironment(env) {
    this.activeEnv = env;
    this.showHint = false;

    const selectorEl = document.getElementById('view-selector');
    const workspaceEl = document.getElementById('view-workspace');
    const winStageEl = document.getElementById('stage-windows');
    const linStageEl = document.getElementById('stage-linux');

    document.getElementById('nav-selector')?.classList.toggle('active', env === 'selector');
    document.getElementById('nav-windows')?.classList.toggle('active', env === 'windows');
    document.getElementById('nav-linux')?.classList.toggle('active', env === 'linux');

    if (env === 'selector') {
      selectorEl?.classList.remove('hidden');
      workspaceEl?.classList.add('hidden');
      return;
    }

    selectorEl?.classList.add('hidden');
    workspaceEl?.classList.remove('hidden');

    if (env === 'windows') {
      winStageEl?.classList.remove('hidden');
      linStageEl?.classList.add('hidden');
      const currentTicket = CHALLENGES.windows[this.activeChallengeIndex.windows || 0];
      if (currentTicket && this.loadedTicketId.windows !== currentTicket.id) {
        this.loadedTicketId.windows = currentTicket.id;
        this.winEngine.loadChallengeState(currentTicket.initialState);
      }
      this.renderWindowsStage();
      this.renderControlDeck();
    } else if (env === 'linux') {
      winStageEl?.classList.add('hidden');
      linStageEl?.classList.remove('hidden');
      const currentTicket = CHALLENGES.linux[this.activeChallengeIndex.linux || 0];
      if (currentTicket && this.loadedTicketId.linux !== currentTicket.id) {
        this.loadedTicketId.linux = currentTicket.id;
        this.linuxEngine.loadChallengeState(currentTicket.initialState);
      }
      this.renderLinuxStage();
      this.renderControlDeck();
      setTimeout(() => document.getElementById('linux-cmd-input')?.focus(), 50);
    }
  }

  selectTicket(env, index, forceReloadState = false) {
    const list = CHALLENGES[env];
    const ticket = list?.[index];
    if (!ticket) return;

    this.activeChallengeIndex[env] = index;
    this.showHint = false;
    this.lastVerification = null;

    if (forceReloadState || this.loadedTicketId[env] !== ticket.id) {
      this.loadedTicketId[env] = ticket.id;
      if (env === 'windows') {
        this.winEngine.loadChallengeState(ticket.initialState);
      } else if (env === 'linux') {
        this.linuxEngine.loadChallengeState(ticket.initialState);
      }
    }
    this.renderControlDeck();
  }

  /* ========================================================================
     WINDOWS 10/11 WIN32 GUI RENDERER (Propiedades + Modal Seguridad Avanzada)
     ======================================================================== */
  renderWindowsStage() {
    const state = this.winEngine.state;
    const res = this.winEngine.getSelectedResource();

    // 1. Render Explorer Resource List
    const listContainer = document.getElementById('win-resource-list');
    if (listContainer) {
      listContainer.innerHTML = state.resources
        .map((item) => {
          const isSelected = item.id === res.id;
          const iconSvg =
            item.type === 'folder'
              ? '<svg width="16" height="16" viewBox="0 0 16 16" fill="#f8d775"><path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3.793a1.5 1.5 0 0 1 1.06.44l.94.94a.5.5 0 0 0 .354.146H13.5A1.5 1.5 0 0 1 15 4.026v8.474A1.5 1.5 0 0 1 13.5 14h-11A1.5 1.5 0 0 1 1 12.5v-10z" stroke="#c99c33" stroke-width="0.8"/></svg>'
              : '<svg width="16" height="16" viewBox="0 0 16 16" fill="#ffffff"><path d="M3 1h7l3 3v11H3V1z" stroke="#5b718a" stroke-width="1"/><path d="M9.5 1v3.5H13" fill="none" stroke="#5b718a" stroke-width="1"/></svg>';
          return `
            <div class="win-resource-item ${isSelected ? 'selected' : ''}" data-win-res="${item.id}">
              <div class="win-resource-left">
                ${iconSvg}
                <span class="win-resource-name">${item.name}</span>
              </div>
              <span class="win-resource-meta">${item.size}</span>
            </div>
          `;
        })
        .join('');

      listContainer.querySelectorAll('[data-win-res]').forEach((el) => {
        el.addEventListener('click', () => {
          const id = el.getAttribute('data-win-res');
          if (id) this.winEngine.selectResource(id);
        });
      });
    }

    const countEl = document.getElementById('win-explorer-count');
    if (countEl) {
      countEl.textContent = `${state.resources.length} objetos del servidor`;
    }

    // 1B. Render Live User Access Tester inside Explorer
    const testerEl = document.getElementById('win-live-access-tester');
    if (testerEl) {
      const testUsers = WIN_PRINCIPALS.filter((p) => p.type === 'user' || p.id === 'admins');
      const sim = state.lastSimulatedAction;
      testerEl.innerHTML = `
        <div style="font-weight:600;margin-bottom:4px;color:#005499;">
          Simulador de Acceso en Red (${res.shareName || res.path}):
        </div>
        <div style="display:flex;gap:4px;margin-bottom:6px;">
          <select id="win-sim-user-sel" class="win-select" style="flex:1;">
            ${testUsers
              .map(
                (u) =>
                  `<option value="${u.id}" ${u.id === state.effectiveTestUserId ? 'selected' : ''}>${u.name.split(' (')[0]} (${u.domain})</option>`
              )
              .join('')}
          </select>
        </div>
        <div style="display:flex;gap:5px;">
          <button type="button" id="win-sim-btn-read" class="win-btn" style="flex:1;min-width:0;">Probar Leer</button>
          <button type="button" id="win-sim-btn-write" class="win-btn" style="flex:1;min-width:0;">Probar Guardar</button>
        </div>
        ${
          sim
            ? `<div style="margin-top:6px;padding:5px 6px;border:1px solid ${sim.ok ? '#107c10' : '#c50f1f'};background:${sim.ok ? '#edf7ed' : '#fdecea'};color:${sim.ok ? '#0b5a0b' : '#a40c19'};font-size:11px;line-height:1.35;">
                ${sim.detail}
              </div>`
            : ''
        }
      `;

      const simSel = testerEl.querySelector('#win-sim-user-sel');
      testerEl.querySelector('#win-sim-btn-read')?.addEventListener('click', () => {
        if (simSel) this.winEngine.simulateUserAction(simSel.value, 'read');
      });
      testerEl.querySelector('#win-sim-btn-write')?.addEventListener('click', () => {
        if (simSel) this.winEngine.simulateUserAction(simSel.value, 'write');
      });
    }

    const addrBar = document.getElementById('win-explorer-address');
    if (addrBar) addrBar.textContent = res.parentPath;

    // 2. Update Primary Properties Dialog ("Propiedades de [Carpeta]")
    const dialogTitle = document.getElementById('win-dialog-title');
    if (dialogTitle) dialogTitle.textContent = `Propiedades de ${res.name}`;

    const taskbarPropTitle = document.getElementById('win-taskbar-prop-label');
    if (taskbarPropTitle) taskbarPropTitle.textContent = `Propiedades de ${res.name}`;

    document.querySelectorAll('[data-win-tab]').forEach((tabBtn) => {
      const tabId = tabBtn.getAttribute('data-win-tab');
      tabBtn.classList.toggle('active', tabId === state.activeTab);
      tabBtn.onclick = () => {
        if (tabId) this.winEngine.setTab(tabId);
      };
    });

    const sheetEl = document.getElementById('win-tab-sheet');
    if (sheetEl) {
      if (state.activeTab === 'sharing') {
        sheetEl.innerHTML = this.buildWinSharingTabHtml(res, state);
        this.bindWinSharingTabEvents(sheetEl);
      } else {
        sheetEl.innerHTML = this.buildWinSecurityTabHtml(res, state);
        this.bindWinSecurityTabEvents(sheetEl);
      }
    }

    // 3. Footer Apply / OK / Reset Buttons on Primary Modal
    const applyBtn = document.getElementById('win-btn-apply');
    if (applyBtn) {
      applyBtn.disabled = !state.dirty;
      applyBtn.onclick = () => this.winEngine.applyChanges();
    }
    const okBtn = document.getElementById('win-btn-ok');
    if (okBtn) {
      okBtn.onclick = () => this.winEngine.applyChanges();
    }
    const cancelBtn = document.getElementById('win-btn-cancel');
    if (cancelBtn) {
      cancelBtn.disabled = !state.dirty;
      cancelBtn.onclick = () => this.winEngine.cancelChanges();
    }

    // 4. Render Stacked Secondary Modal ("Configuración de seguridad avanzada")
    this.renderWinAdvancedModal(res, state);
  }

  buildWinSecurityTabHtml(res, state) {
    const selectedEntry = res.acl.find((e) => e.principalId === state.selectedPrincipalId) || res.acl[0];
    const selectedPrincipalObj = WIN_PRINCIPALS.find((p) => p.id === selectedEntry?.principalId);
    const availableToAdd = WIN_PRINCIPALS.filter((p) => !res.acl.some((a) => a.principalId === p.id));
    const icaclsCmd = this.winEngine.generateIcaclsCommand(res);

    const principalsHtml = res.acl
      .map((entry) => {
        const pObj = WIN_PRINCIPALS.find((p) => p.id === entry.principalId);
        const isSel = entry.principalId === selectedEntry?.principalId;
        const userIcon = pObj?.type === 'user' ? '<span>&#128100;</span>' : '<span>&#128101;</span>';
        return `
          <div class="win-listbox-row ${isSel ? 'selected' : ''}" data-acl-principal="${entry.principalId}">
            ${userIcon}
            <span>${pObj ? pObj.name : entry.principalId}</span>
            ${entry.inherited ? '<span style="margin-left:auto;font-size:10.5px;opacity:0.75;">(Heredado)</span>' : ''}
          </div>
        `;
      })
      .join('');

    const permsRowsHtml = NTFS_PERMS.map((perm) => {
      const isAllowed = selectedEntry ? selectedEntry.allow.includes(perm.id) : false;
      const isDenied = selectedEntry ? selectedEntry.deny.includes(perm.id) : false;
      const disabledAttr = !selectedEntry || selectedEntry.inherited ? 'disabled' : '';
      return `
        <div class="win-perm-row">
          <span>${perm.label}</span>
          <div class="win-perm-cell-check">
            <input type="checkbox" class="win-checkbox" data-perm-id="${perm.id}" data-perm-mode="allow" ${isAllowed ? 'checked' : ''} ${disabledAttr} />
          </div>
          <div class="win-perm-cell-check">
            <input type="checkbox" class="win-checkbox deny-box" data-perm-id="${perm.id}" data-perm-mode="deny" ${isDenied ? 'checked' : ''} ${disabledAttr} />
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="win-object-header">
        <span>Nombre de objeto:</span>
        <span class="win-object-path">${res.path}</span>
      </div>

      <span class="win-section-label">Nombres de grupos o usuarios:</span>
      <div class="win-listbox">
        ${principalsHtml}
      </div>

      <div class="win-inline-adder">
        <select id="win-add-principal-select" class="win-select" style="flex:1;">
          ${
            availableToAdd.length > 0
              ? availableToAdd.map((p) => `<option value="${p.id}">${p.name}</option>`).join('')
              : '<option value="">(Todos los principales están en la ACL)</option>'
          }
        </select>
        <button type="button" id="win-btn-add-principal" class="win-btn" ${availableToAdd.length === 0 ? 'disabled' : ''}>Agregar...</button>
        <button type="button" id="win-btn-remove-principal" class="win-btn" ${!selectedEntry || selectedEntry.inherited ? 'disabled' : ''}>Quitar</button>
      </div>

      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
        <span class="win-section-label" style="margin-bottom:0;">
          Permisos de ${selectedPrincipalObj ? selectedPrincipalObj.name.split(' ')[0] : 'usuario'}:
        </span>
        ${
          selectedEntry?.inherited
            ? '<span style="font-size:11px;color:#666666;">Heredado (deshabilita herencia en Opciones avanzadas para editar)</span>'
            : '<span style="font-size:11px;color:#005499;">ACE Explícita editable</span>'
        }
      </div>

      <div class="win-perm-box">
        <div class="win-perm-header">
          <span>Permisos NTFS</span>
          <span>Permitir</span>
          <span>Denegar</span>
        </div>
        <div class="win-perm-rows">
          ${permsRowsHtml}
        </div>
      </div>

      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
        <span style="font-size:11px;color:#333333;">
          Para ver permisos efectivos o configurar herencia, haz clic en Opciones avanzadas.
        </span>
        <button type="button" id="win-btn-open-advanced" class="win-btn win-btn-default">Opciones avanzadas</button>
      </div>

      <div class="win-icacls-preview" title="Comando equivalente en PowerShell / CMD">
        PS C:\\Users\\Administrator&gt; ${icaclsCmd}
      </div>
    `;
  }

  bindWinSecurityTabEvents(sheetEl) {
    sheetEl.querySelectorAll('[data-acl-principal]').forEach((row) => {
      row.addEventListener('click', () => {
        const pid = row.getAttribute('data-acl-principal');
        if (pid) this.winEngine.selectPrincipal(pid);
      });
    });

    sheetEl.querySelector('#win-btn-add-principal')?.addEventListener('click', () => {
      const sel = sheetEl.querySelector('#win-add-principal-select');
      if (sel && sel.value) {
        this.winEngine.addPrincipalToAcl(sel.value);
      }
    });

    sheetEl.querySelector('#win-btn-remove-principal')?.addEventListener('click', () => {
      this.winEngine.removeSelectedPrincipal();
    });

    sheetEl.querySelectorAll('[data-perm-id]').forEach((chk) => {
      chk.addEventListener('change', (e) => {
        const target = e.currentTarget;
        const permId = target.getAttribute('data-perm-id');
        const mode = target.getAttribute('data-perm-mode');
        this.winEngine.togglePermission(permId, mode, target.checked);
      });
    });

    sheetEl.querySelector('#win-btn-open-advanced')?.addEventListener('click', () => {
      this.winEngine.openAdvancedModal('adv_effective');
    });
  }

  buildWinSharingTabHtml(res, state) {
    const shareEntries = res.shareAcl || [];
    const selectedShareEntry =
      shareEntries.find((e) => e.principalId === state.selectedSharePrincipalId) || shareEntries[0];
    const selectedShareObj = WIN_PRINCIPALS.find((p) => p.id === selectedShareEntry?.principalId);

    const sharePermsMeta = [
      { id: 'full', label: 'Control total' },
      { id: 'change', label: 'Cambiar' },
      { id: 'read', label: 'Leer' },
    ];

    return `
      <div class="win-object-header">
        <span>Nombre de objeto:</span>
        <span class="win-object-path">${res.path}</span>
      </div>

      <fieldset class="win-groupbox">
        <legend>Uso compartido de carpetas en red (SMB Share)</legend>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
          <span>Ruta de acceso de red: <strong>${res.shareEnabled ? res.shareName || `\\\\WIN-SRV01\\${res.name}` : 'No compartido'}</strong></span>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
            <input type="checkbox" id="win-chk-share-enable" class="win-checkbox" ${res.shareEnabled ? 'checked' : ''} />
            <span>Compartir esta carpeta</span>
          </label>
        </div>

        <div style="margin-bottom:6px;font-weight:600;">Nivel rápido de uso compartido (Authenticated Users):</div>
        <div style="display:flex;gap:14px;padding-left:4px;margin-bottom:8px;">
          <label style="display:flex;align-items:center;gap:5px;cursor:pointer;">
            <input type="radio" name="win-smb-perm" value="read" ${res.sharePermission === 'read' ? 'checked' : ''} ${!res.shareEnabled ? 'disabled' : ''} />
            <span>Leer</span>
          </label>
          <label style="display:flex;align-items:center;gap:5px;cursor:pointer;">
            <input type="radio" name="win-smb-perm" value="change" ${res.sharePermission === 'change' ? 'checked' : ''} ${!res.shareEnabled ? 'disabled' : ''} />
            <span>Cambiar</span>
          </label>
          <label style="display:flex;align-items:center;gap:5px;cursor:pointer;">
            <input type="radio" name="win-smb-perm" value="full" ${res.sharePermission === 'full' ? 'checked' : ''} ${!res.shareEnabled ? 'disabled' : ''} />
            <span>Control total</span>
          </label>
        </div>
      </fieldset>

      <span class="win-section-label">Nombres de grupos o usuarios del recurso compartido:</span>
      <div class="win-listbox" style="height:68px;">
        ${shareEntries
          .map((e) => {
            const pObj = WIN_PRINCIPALS.find((p) => p.id === e.principalId);
            const isSel = e.principalId === selectedShareEntry?.principalId;
            return `
              <div class="win-listbox-row ${isSel ? 'selected' : ''}" data-share-principal="${e.principalId}">
                <span>&#128101;</span>
                <span>${pObj ? pObj.name : e.principalId}</span>
              </div>
            `;
          })
          .join('')}
      </div>

      <span class="win-section-label">
        Permisos de recurso compartido para ${selectedShareObj ? selectedShareObj.name.split(' ')[0] : 'grupo'}:
      </span>
      <div class="win-perm-box" style="height:105px;">
        <div class="win-perm-header">
          <span>Permiso de Share SMB</span>
          <span>Permitir</span>
          <span>Denegar</span>
        </div>
        <div class="win-perm-rows">
          ${sharePermsMeta
            .map((sp) => {
              const isAllow = selectedShareEntry ? selectedShareEntry.allow.includes(sp.id) : false;
              const isDeny = selectedShareEntry ? selectedShareEntry.deny.includes(sp.id) : false;
              return `
                <div class="win-perm-row">
                  <span>${sp.label}</span>
                  <div class="win-perm-cell-check">
                    <input type="checkbox" class="win-checkbox" data-share-perm="${sp.id}" data-share-mode="allow" ${isAllow ? 'checked' : ''} ${!res.shareEnabled ? 'disabled' : ''} />
                  </div>
                  <div class="win-perm-cell-check">
                    <input type="checkbox" class="win-checkbox deny-box" data-share-perm="${sp.id}" data-share-mode="deny" ${isDeny ? 'checked' : ''} ${!res.shareEnabled ? 'disabled' : ''} />
                  </div>
                </div>
              `;
            })
            .join('')}
        </div>
      </div>

      <div style="display:flex;align-items:center;justify-content:space-between;font-size:11px;color:#333333;">
        <span>El permiso efectivo final es el más restrictivo entre Share y NTFS.</span>
        <button type="button" id="win-share-goto-effective" class="win-btn">Ver Acceso efectivo...</button>
      </div>
    `;
  }

  bindWinSharingTabEvents(sheetEl) {
    const chk = sheetEl.querySelector('#win-chk-share-enable');
    const radios = sheetEl.querySelectorAll('input[name="win-smb-perm"]');

    chk?.addEventListener('change', () => {
      const currentPerm = this.winEngine.getSelectedResource().sharePermission;
      this.winEngine.updateShareConfig(chk.checked, currentPerm);
    });

    radios.forEach((radio) => {
      radio.addEventListener('change', () => {
        if (radio.checked) {
          this.winEngine.updateShareConfig(true, radio.value);
        }
      });
    });

    sheetEl.querySelectorAll('[data-share-principal]').forEach((row) => {
      row.addEventListener('click', () => {
        const pid = row.getAttribute('data-share-principal');
        if (pid) this.winEngine.selectSharePrincipal(pid);
      });
    });

    sheetEl.querySelectorAll('[data-share-perm]').forEach((box) => {
      box.addEventListener('change', (e) => {
        const target = e.currentTarget;
        const permId = target.getAttribute('data-share-perm');
        const mode = target.getAttribute('data-share-mode');
        this.winEngine.toggleSharePermissionCheckbox(permId, mode, target.checked);
      });
    });

    sheetEl.querySelector('#win-share-goto-effective')?.addEventListener('click', () => {
      this.winEngine.openAdvancedModal('adv_effective');
    });
  }

  /* ========================================================================
     SECOND STACKED MODAL: "Configuración de seguridad avanzada para [Carpeta]"
     ======================================================================== */
  renderWinAdvancedModal(res, state) {
    const overlay = document.getElementById('win-advanced-modal-overlay');
    if (!overlay) return;

    if (!state.isAdvancedModalOpen) {
      overlay.classList.add('hidden');
      return;
    }

    overlay.classList.remove('hidden');

    const advTitle = document.getElementById('win-adv-dialog-title');
    if (advTitle) {
      advTitle.textContent = `Configuración de seguridad avanzada para ${res.name}`;
    }

    const ownersList = [
      'Administrators (WIN-SRV01\\Administrators)',
      'SYSTEM',
      'RRHH_Group (EMPRESA\\RRHH_Group)',
      'Finanzas_Group (EMPRESA\\Finanzas_Group)',
      'jdoe (EMPRESA\\jdoe)',
    ];

    const headerMeta = document.getElementById('win-adv-header-meta');
    if (headerMeta) {
      headerMeta.innerHTML = `
        <span>Nombre:</span>
        <strong>${res.path}</strong>
        <span>Propietario:</span>
        <div style="display:flex;align-items:center;gap:8px;">
          <span>${res.owner}</span>
          <select id="win-adv-owner-select" class="win-select" style="height:21px;font-size:11.5px;">
            ${ownersList.map((o) => `<option value="${o}" ${res.owner === o ? 'selected' : ''}>Cambiar a: ${o.split(' ')[0]}</option>`).join('')}
          </select>
        </div>
      `;
      headerMeta.querySelector('#win-adv-owner-select')?.addEventListener('change', (e) => {
        this.winEngine.setOwner(e.currentTarget.value);
      });
    }

    document.querySelectorAll('[data-win-adv-tab]').forEach((btn) => {
      const tId = btn.getAttribute('data-win-adv-tab');
      btn.classList.toggle('active', tId === state.advancedActiveTab);
      btn.onclick = () => {
        if (tId) this.winEngine.setAdvancedTab(tId);
      };
    });

    const advSheet = document.getElementById('win-adv-tab-sheet');
    if (advSheet) {
      if (state.advancedActiveTab === 'adv_permissions') {
        advSheet.innerHTML = this.buildWinAdvPermissionsSheet(res);
        this.bindWinAdvPermissionsEvents(advSheet);
      } else {
        advSheet.innerHTML = this.buildWinAdvEffectiveSheet(res, state);
        this.bindWinAdvEffectiveEvents(advSheet);
      }
    }

    document.getElementById('win-adv-close-x').onclick = () => this.winEngine.cancelAdvancedModal();
    document.getElementById('win-adv-btn-cancel').onclick = () => this.winEngine.cancelAdvancedModal();
    document.getElementById('win-adv-btn-ok').onclick = () => {
      this.winEngine.applyChanges();
      this.winEngine.closeAdvancedModal();
    };
    document.getElementById('win-adv-btn-apply').onclick = () => {
      this.winEngine.applyChanges();
    };
  }

  buildWinAdvPermissionsSheet(res) {
    return `
      <div style="margin-bottom:6px;font-size:11.5px;color:#222222;">
        Para obtener información adicional acerca de los permisos especiales o la configuración avanzada, seleccione una entrada:
      </div>

      <span class="win-section-label">Entradas de permiso (ACEs ordenadas por precedencia):</span>
      <div class="win-ace-table-wrap">
        <table class="win-ace-table">
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Principal</th>
              <th>Acceso</th>
              <th>Heredado de</th>
              <th>Se aplica a</th>
            </tr>
          </thead>
          <tbody>
            ${res.acl
              .map((e) => {
                const p = WIN_PRINCIPALS.find((x) => x.id === e.principalId);
                const hasDeny = e.deny.length > 0;
                const accessSummary = hasDeny
                  ? `Denegar (${e.deny.join(', ')})`
                  : e.allow.includes('full')
                    ? 'Control total'
                    : e.allow.includes('modify')
                      ? 'Modificar'
                      : e.allow.includes('read_exec')
                        ? 'Lectura y ejecución'
                        : e.allow.join(', ');
                return `
                  <tr>
                    <td style="font-weight:600;color:${hasDeny ? '#c50f1f' : '#005499'};">
                      ${hasDeny ? 'Denegar' : 'Permitir'}
                    </td>
                    <td>${p ? p.name : e.principalId}</td>
                    <td>${accessSummary}</td>
                    <td>${e.inherited ? res.parentPath : 'Ninguno (Explícito)'}</td>
                    <td>${res.type === 'folder' ? 'Esta carpeta, subcarpetas y archivos' : 'Este objeto'}</td>
                  </tr>
                `;
              })
              .join('')}
          </tbody>
        </table>
      </div>

      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;padding-top:4px;">
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          ${
            !res.inheritanceDisabled
              ? `
                <button type="button" id="win-adv-disable-convert" class="win-btn win-btn-default">
                  Deshabilitar herencia (Convertir en explícitos)
                </button>
                <button type="button" id="win-adv-disable-remove" class="win-btn">
                  Deshabilitar herencia (Quitar heredados)
                </button>
              `
              : `
                <button type="button" id="win-adv-enable-inherit" class="win-btn win-btn-default">
                  Habilitar herencia
                </button>
              `
          }
        </div>
        <button type="button" id="win-adv-switch-to-effective" class="win-btn">
          Ir a pestaña Acceso efectivo &#10140;
        </button>
      </div>
    `;
  }

  bindWinAdvPermissionsEvents(sheetEl) {
    sheetEl.querySelector('#win-adv-disable-convert')?.addEventListener('click', () => {
      this.winEngine.toggleInheritance(true);
    });
    sheetEl.querySelector('#win-adv-disable-remove')?.addEventListener('click', () => {
      this.winEngine.toggleInheritance(false);
    });
    sheetEl.querySelector('#win-adv-enable-inherit')?.addEventListener('click', () => {
      this.winEngine.toggleInheritance(true);
    });
    sheetEl.querySelector('#win-adv-switch-to-effective')?.addEventListener('click', () => {
      this.winEngine.setAdvancedTab('adv_effective');
    });
  }

  buildWinAdvEffectiveSheet(res, state) {
    const evalResult = this.winEngine.evaluateEffectiveAccess(res, state.effectiveTestUserId, state.effectiveViaSmb);
    const meta = evalResult._meta;
    const groupsDisplay =
      meta.memberGroupNames.length > 0 ? meta.memberGroupNames.join(' + ') : 'Sin grupos adicionales';

    return `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap;">
        <span style="font-weight:600;">Usuario o grupo:</span>
        <select id="win-effective-user" class="win-select" style="flex:1;">
          ${WIN_PRINCIPALS.map(
            (p) => `<option value="${p.id}" ${p.id === state.effectiveTestUserId ? 'selected' : ''}>${p.name}</option>`
          ).join('')}
        </select>
        <label style="display:flex;align-items:center;gap:5px;cursor:pointer;background:#f5f6f7;border:1px solid #d9d9d9;padding:2px 8px;">
          <input type="checkbox" id="win-effective-smb" class="win-checkbox" ${state.effectiveViaSmb ? 'checked' : ''} />
          <span>Aplicar restricción de Recurso Compartido (Share SMB)</span>
        </label>
      </div>

      <!-- Tarjetas de las 3 Reglas de Evaluación de Windows -->
      <div class="win-formula-strip">
        <div class="win-formula-box">
          <span class="win-formula-title">1. Suma de Grupos (Unión)</span>
          <span>Principal + Grupos: <strong>${groupsDisplay}</strong></span>
        </div>
        <div class="win-formula-box">
          <span class="win-formula-title">2. Precedencia ACL</span>
          <span><strong>Deny Explícito</strong> prevalece siempre sobre Allow</span>
        </div>
        <div class="win-formula-box">
          <span class="win-formula-title">3. Share ∩ NTFS (Más restrictivo)</span>
          <span>Share actual: <strong>${meta.shareSummaryLabel}</strong></span>
        </div>
      </div>

      <div class="win-ace-table-wrap" style="height:205px;margin-bottom:0;">
        <table class="win-ace-table">
          <thead>
            <tr>
              <th>Permiso</th>
              <th style="text-align:center;">NTFS (Suma + Deny)</th>
              <th style="text-align:center;">Share SMB</th>
              <th style="text-align:center;">Permiso Efectivo Final</th>
              <th>Explicación del motor</th>
            </tr>
          </thead>
          <tbody>
            ${NTFS_PERMS.map((perm) => {
              const r = evalResult[perm.id];
              return `
                <tr>
                  <td style="font-weight:600;">${perm.label}</td>
                  <td style="text-align:center;color:${r.ntfsGranted ? '#107c10' : '#c50f1f'};font-weight:600;">
                    ${r.ntfsGranted ? '✓ Permitir' : '✕ Denegar'}
                  </td>
                  <td style="text-align:center;color:${r.shareGranted ? '#107c10' : '#c50f1f'};font-weight:600;">
                    ${state.effectiveViaSmb ? (r.shareGranted ? '✓ Permitir' : '✕ Restringido') : '— (Local)'}
                  </td>
                  <td style="text-align:center;background:${r.granted ? '#edf7ed' : '#fdecea'};color:${r.granted ? '#107c10' : '#c50f1f'};font-weight:700;">
                    ${r.granted ? '✓ CONCEDIDO' : '✕ DENEGADO'}
                  </td>
                  <td style="color:#444444;">${r.reason}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  bindWinAdvEffectiveEvents(sheetEl) {
    const userSel = sheetEl.querySelector('#win-effective-user');
    const smbChk = sheetEl.querySelector('#win-effective-smb');

    const update = () => {
      this.winEngine.setEffectiveTestParams(userSel.value, smbChk.checked);
    };
    userSel?.addEventListener('change', update);
    smbChk?.addEventListener('change', update);
  }

  /* ========================================================================
     UBUNTU 24.04 LTS TERMINAL & SYNCHRONIZED POSIX MATRIX + ACL RENDERER
     ======================================================================== */
  renderLinuxStage() {
    const eng = this.linuxEngine;
    const termViewport = document.getElementById('ubuntu-term-viewport');
    const headerTitle = document.getElementById('ubuntu-header-title');
    const promptSpan = document.getElementById('linux-active-prompt');

    if (headerTitle) {
      headerTitle.textContent = `${eng.currentUser}@ubuntu-server: ${eng.cwd}`;
    }

    if (termViewport) {
      termViewport.classList.toggle('theme-black', eng.theme === 'black');
    }

    const linesContainer = document.getElementById('linux-output-lines');
    if (linesContainer) {
      linesContainer.innerHTML = eng.lines
        .map((l) => `<div class="term-output-line">${l.html}</div>`)
        .join('');
    }

    if (promptSpan) {
      promptSpan.innerHTML = eng.getPromptHtml();
    }

    if (termViewport) {
      termViewport.scrollTop = termViewport.scrollHeight;
    }

    this.renderPosixBitMatrix();
  }

  renderPosixBitMatrix() {
    const eng = this.linuxEngine;
    const fileListEl = document.getElementById('linux-inspector-files');
    const matrixContainer = document.getElementById('linux-posix-matrix-content');
    if (!fileListEl || !matrixContainer) return;

    const nodes = Object.values(eng.fs).filter((n) => n.name !== '.');
    fileListEl.innerHTML = nodes
      .map((node) => {
        const isSel = node.path === eng.selectedInspectPath;
        const oct = eng.formatOctalMode(node.mode);
        const hasAcl = eng.hasExtendedAcl(node);
        const cls = eng.getLsColorClass(node);
        return `
          <div class="linux-file-item ${isSel ? 'selected' : ''}" data-lin-file="${escapeHtml(node.path)}" title="${escapeHtml(node.path)}">
            <span class="${cls}">${escapeHtml(node.path.replace('/var/www/', ''))}</span>
            <span style="color:#babdb6;font-size:11.5px;">${oct}${hasAcl ? '+' : ''}</span>
          </div>
        `;
      })
      .join('');

    fileListEl.querySelectorAll('[data-lin-file]').forEach((el) => {
      el.addEventListener('click', () => {
        const p = el.getAttribute('data-lin-file');
        if (p) eng.selectInspectFile(p);
      });
    });

    const activeNode = eng.fs[eng.selectedInspectPath] || nodes[0];
    if (!activeNode) return;

    const mode = activeNode.mode;
    const specialDigit = (mode >> 9) & 0o7;
    const userDigit = (mode >> 6) & 0o7;
    const groupDigit = (mode >> 3) & 0o7;
    const otherDigit = mode & 0o7;

    const octets = [
      {
        title: 'Especiales',
        digit: specialDigit,
        bits: [
          { mask: 0o4000, label: 'SUID (4)' },
          { mask: 0o2000, label: 'SGID (2)' },
          { mask: 0o1000, label: 'Sticky (1)' },
        ],
      },
      {
        title: 'Propietario (u)',
        digit: userDigit,
        bits: [
          { mask: 0o0400, label: 'Lectura r (4)' },
          { mask: 0o0200, label: 'Escritura w (2)' },
          { mask: 0o0100, label: 'Ejecución x (1)' },
        ],
      },
      {
        title: 'Grupo (g)',
        digit: groupDigit,
        bits: [
          { mask: 0o0040, label: 'Lectura r (4)' },
          { mask: 0o0020, label: 'Escritura w (2)' },
          { mask: 0o0010, label: 'Ejecución x (1)' },
        ],
      },
      {
        title: 'Otros (o)',
        digit: otherDigit,
        bits: [
          { mask: 0o0004, label: 'Lectura r (4)' },
          { mask: 0o0002, label: 'Escritura w (2)' },
          { mask: 0o0001, label: 'Ejecución x (1)' },
        ],
      },
    ];

    const octetsHtml = octets
      .map(
        (oct) => `
        <div class="posix-octet-card">
          <div class="posix-octet-header">
            <span>${oct.title}</span>
            <span class="posix-octet-digit tabular-nums">${oct.digit}</span>
          </div>
          <div class="posix-bit-toggles">
            ${oct.bits
              .map(
                (b) => `
                <label class="posix-bit-label">
                  <span>${b.label}</span>
                  <input type="checkbox" data-posix-mask="${b.mask}" ${(mode & b.mask) !== 0 ? 'checked' : ''} />
                </label>
              `
              )
              .join('')}
          </div>
        </div>
      `
      )
      .join('');

    const usersOptions = Object.keys(LINUX_USERS)
      .map((u) => `<option value="${u}" ${activeNode.owner === u ? 'selected' : ''}>${u}</option>`)
      .join('');
    const groupsOptions = Object.keys(LINUX_GROUPS)
      .map((g) => `<option value="${g}" ${activeNode.group === g ? 'selected' : ''}>${g}</option>`)
      .join('');

    const hasAcl = eng.hasExtendedAcl(activeNode);
    const maskVal = eng.getEffectiveAclMask(activeNode);
    const rwxStr = (b) => `${b & 4 ? 'r' : '-'}${b & 2 ? 'w' : '-'}${b & 1 ? 'x' : '-'}`;
    let aclSummaryHtml = '<span style="color:#babdb6;">Sin ACL extendida (UGO estándar)</span>';
    if (hasAcl) {
      const aclChips = [`group::${rwxStr(eng.getOwningGroupBits(activeNode))}`];
      Object.entries(activeNode.acl?.users || {}).forEach(([u, b]) => {
        const eff = b & maskVal;
        aclChips.push(`u:${u}:${rwxStr(b)}${eff !== b ? ` (#effective:${rwxStr(eff)})` : ''}`);
      });
      Object.entries(activeNode.acl?.groups || {}).forEach(([g, b]) => {
        const eff = b & maskVal;
        aclChips.push(`g:${g}:${rwxStr(b)}${eff !== b ? ` (#effective:${rwxStr(eff)})` : ''}`);
      });
      aclChips.push(`mask::${rwxStr(maskVal)}`);
      aclSummaryHtml = `<span style="color:#fce94f;">ACL (+): ${escapeHtml(aclChips.join(' · '))} <em style="color:#babdb6;">(con ACL, la columna Grupo de la matriz es la máscara)</em></span>`;
    }

    matrixContainer.innerHTML = `
      <div class="posix-matrix-grid">
        ${octetsHtml}
      </div>
      <div class="posix-summary-bar">
        <div>
          Simbólico: <strong style="color:#8ae234;">${eng.formatSymbolicMode(activeNode)}</strong>
          &nbsp;·&nbsp;
          Octal: <strong style="color:#e95420;">${eng.formatOctalMode(activeNode.mode)}</strong>
          &nbsp;·&nbsp;
          ${aclSummaryHtml}
        </div>
        <div style="display:flex;align-items:center;gap:6px;">
          <span>Propietario:</span>
          <select id="posix-owner-sel" style="background:#262626;color:#eeeeec;border:1px solid #484848;padding:2px 6px;font-family:inherit;">
            ${usersOptions}
          </select>
          <span>:</span>
          <select id="posix-group-sel" style="background:#262626;color:#eeeeec;border:1px solid #484848;padding:2px 6px;font-family:inherit;">
            ${groupsOptions}
          </select>
        </div>
      </div>
    `;

    // La matriz no salta los permisos: escribe en la terminal el comando equivalente y lo ejecuta
    // como el usuario activo (con sudo si es un administrador y el archivo no es suyo).
    const runAsCurrentUser = (cmd, needsRoot) => {
      const user = LINUX_USERS[eng.currentUser];
      const useSudo = needsRoot && eng.currentUser !== 'root' && user?.groups.includes('sudo');
      eng.executeCommand(`${useSudo ? 'sudo ' : ''}${cmd}`, true);
    };

    matrixContainer.querySelectorAll('[data-posix-mask]').forEach((chk) => {
      chk.addEventListener('change', () => {
        const bitMask = Number(chk.getAttribute('data-posix-mask'));
        const nextMode = chk.checked ? activeNode.mode | bitMask : activeNode.mode & ~bitMask;
        // 5 dígitos para que el octal fije exactamente los bits especiales también en directorios
        const oct = `0${nextMode.toString(8).padStart(4, '0')}`;
        runAsCurrentUser(`chmod ${oct} ${activeNode.path}`, eng.currentUser !== activeNode.owner);
      });
    });

    const ownerSel = matrixContainer.querySelector('#posix-owner-sel');
    const groupSel = matrixContainer.querySelector('#posix-group-sel');
    const updateOwnerGroup = () => {
      const ownerChanges = ownerSel.value !== activeNode.owner;
      const userGroups = LINUX_USERS[eng.currentUser]?.groups || [];
      const needsRoot = ownerChanges || eng.currentUser !== activeNode.owner || !userGroups.includes(groupSel.value);
      runAsCurrentUser(`chown ${ownerSel.value}:${groupSel.value} ${activeNode.path}`, needsRoot);
    };
    ownerSel?.addEventListener('change', updateOwnerGroup);
    groupSel?.addEventListener('change', updateOwnerGroup);
  }

  /* ========================================================================
     RIGHT-HAND HELP DESK / WEBMAIL TICKET CLIENT RENDERER
     ======================================================================== */
  renderControlDeck() {
    const deckEl = document.getElementById('lab-control-deck');
    if (!deckEl || (this.activeEnv !== 'windows' && this.activeEnv !== 'linux')) return;

    const list = CHALLENGES[this.activeEnv];
    const totalTicketsCount = CHALLENGES.windows.length + CHALLENGES.linux.length;
    const currentIdx = this.activeChallengeIndex[this.activeEnv] || 0;
    const ticket = list[currentIdx];

    const engineInstance = this.activeEnv === 'windows' ? this.winEngine : this.linuxEngine;
    const liveEval = verifyTicket(ticket, engineInstance);

    const inboxHtml = list
      .map((item, idx) => {
        const isCurrent = idx === currentIdx;
        const isDone = this.resolvedTickets.has(item.id);
        return `
          <button type="button" class="helpdesk-ticket-item ${isCurrent ? 'active' : ''}" data-ticket-idx="${idx}">
            <div class="helpdesk-ticket-top">
              <span class="tabular-nums">${item.ticketCode} · ${item.senderName}</span>
              <span>${isDone ? '✓ Resuelto' : item.timestamp}</span>
            </div>
            <div class="helpdesk-ticket-subj">${item.subject}</div>
          </button>
        `;
      })
      .join('');

    const objectivesHtml = liveEval.results
      .map(
        (r) => `
        <li class="objective-item ${r.passed ? 'completed' : ''}">
          <span class="objective-status-icon">${r.passed ? '✓' : '○'}</span>
          <span>${r.text}</span>
        </li>
      `
      )
      .join('');

    const showVerificationReply =
      this.lastVerification && this.lastVerification.ticketId === ticket.id;

    deckEl.innerHTML = `
      <div class="deck-section">
        <div class="helpdesk-header">
          <span class="helpdesk-brand">Help Desk · Bandeja de Tickets</span>
          <span class="helpdesk-meta-text tabular-nums">
            ${this.resolvedTickets.size} / ${totalTicketsCount} resueltos
            ${this.resolvedTickets.size ? '<button type="button" id="btn-reset-progress" class="helpdesk-reset-link" title="Borra el progreso guardado en este navegador">Reiniciar</button>' : ''}
          </span>
        </div>

        <div class="deck-kicker" style="margin:0.5rem 0 0.35rem;">
          <span>Cola de soporte (${list.length})</span>
          <span>·</span>
          <span>${this.activeEnv === 'windows' ? 'Windows Server (NTFS/SMB)' : 'Ubuntu Server (POSIX/ACL)'}</span>
        </div>

        <div class="helpdesk-inbox-list">
          ${inboxHtml}
        </div>
      </div>

      <div class="deck-section">
        <div class="helpdesk-mail-card">
          <div class="deck-kicker" style="margin-bottom:0;">
            <span class="tabular-nums">${ticket.ticketCode}</span>
            <span>·</span>
            <span>${ticket.priority}</span>
            <span>·</span>
            <span>${ticket.timestamp}</span>
          </div>

          <h2 class="helpdesk-mail-subject">Asunto: ${ticket.subject}</h2>

          <div class="helpdesk-mail-sender">
            <div>De: <strong>${ticket.senderName}</strong> &lt;${ticket.senderEmail}&gt;</div>
            <div>Área: ${ticket.senderDept}</div>
            <div style="margin-top:0.2rem;">
              Recurso: <span class="helpdesk-resource-line">${ticket.affectedResource}</span>
            </div>
          </div>

          <div class="helpdesk-mail-body">
            "${ticket.message}"
          </div>

          <div>
            <div class="deck-kicker" style="margin-bottom:0.35rem;">
              Diagnóstico Técnico del Ticket
            </div>
            <ul class="objective-list" style="margin-top:0;">
              ${objectivesHtml}
            </ul>
          </div>

          <div class="deck-btn-row" style="margin-top:0.25rem;">
            <button type="button" id="btn-verify-ticket" class="deck-btn verify">
              Verificar Ticket
            </button>
          </div>

          <div class="deck-btn-row" style="margin-top:0.15rem;">
            <button type="button" id="btn-toggle-hint" class="deck-btn">
              ${this.showHint ? 'Ocultar Pista' : 'Solicitar Pista'}
            </button>
            <button type="button" id="btn-reset-ticket" class="deck-btn">
              Recargar Ticket
            </button>
          </div>

          ${
            this.showHint
              ? `<div class="feedback-banner elevated" style="margin-top:0.25rem;"><strong>Nota de Nivel 2 (Pista):</strong> ${ticket.hint}</div>`
              : ''
          }

          ${
            showVerificationReply
              ? `
                <div class="feedback-banner ${this.lastVerification.resolved ? 'nominal' : 'elevated'}" style="margin-top:0.25rem;">
                  <div style="font-weight:700;margin-bottom:0.25rem;">
                    ${
                      this.lastVerification.resolved
                        ? `✓ TICKET ${ticket.ticketCode} CERRADO — Respuesta de ${ticket.senderName}:`
                        : `▲ TICKET ${ticket.ticketCode} REABIERTO — Diagnóstico del sistema:`
                    }
                  </div>
                  <div>"${this.lastVerification.replyMessage}"</div>
                </div>
              `
              : `
                <div class="feedback-banner ${liveEval.resolved ? 'nominal' : 'elevated'}" style="margin-top:0.25rem;">
                  ${
                    liveEval.resolved && this.activeEnv === 'windows' && this.winEngine.state.dirty
                      ? '● Corrección lista pero sin aplicar: pulsa «Aplicar» o «Aceptar» en Propiedades y después «Verificar Ticket».'
                      : liveEval.resolved
                      ? `● Estado listo: pulsa "Verificar Ticket" para confirmar con ${ticket.senderName} y cerrar la incidencia.`
                      : `○ Estado abierto: aplica la corrección en ${
                          this.activeEnv === 'windows' ? 'Propiedades de Windows' : 'la Terminal Bash'
                        } y pulsa "Verificar Ticket".`
                  }
                </div>
              `
          }
        </div>
      </div>

      <div class="deck-section">
        <div class="deck-author-footer">
          <a href="https://www.unfantasmaenelsistema.com/" target="_blank" rel="noopener noreferrer">
            <img
              src="./assets/aistudio/icono_81a3db5b.png"
              alt="Un Fantasma en el Sistema"
              class="deck-author-logo"
            />
            <span>Un Fantasma en el Sistema &#8599;</span>
          </a>
          <span>GitHub Ready</span>
        </div>
      </div>
    `;

    deckEl.querySelectorAll('[data-ticket-idx]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-ticket-idx'));
        this.selectTicket(this.activeEnv, idx, false);
      });
    });

    deckEl.querySelector('#btn-verify-ticket')?.addEventListener('click', () => {
      // En Windows, los cambios no cuentan hasta pulsar Aplicar o Aceptar (como en el diálogo real)
      if (this.activeEnv === 'windows' && this.winEngine.state.dirty) {
        this.lastVerification = {
          ticketId: ticket.id,
          resolved: false,
          replyMessage: 'Tienes cambios sin aplicar en las Propiedades. Pulsa «Aplicar» o «Aceptar» y vuelve a verificar.',
        };
        this.renderControlDeck();
        return;
      }
      const checkResult = verifyTicket(ticket, engineInstance);
      if (checkResult.resolved) {
        this.resolvedTickets.add(ticket.id);
        this.saveProgress();
      }
      this.lastVerification = {
        ticketId: ticket.id,
        resolved: checkResult.resolved,
        replyMessage: checkResult.replyMessage,
      };
      this.renderControlDeck();
    });

    deckEl.querySelector('#btn-reset-progress')?.addEventListener('click', () => {
      this.resolvedTickets.clear();
      this.saveProgress();
      this.lastVerification = null;
      this.renderControlDeck();
    });

    deckEl.querySelector('#btn-toggle-hint')?.addEventListener('click', () => {
      this.showHint = !this.showHint;
      this.renderControlDeck();
    });

    deckEl.querySelector('#btn-reset-ticket')?.addEventListener('click', () => {
      this.selectTicket(this.activeEnv, currentIdx, true);
    });
  }

  /* ========================================================================
     SOURCE CODE EXPORT MODAL (GitHub Pages Structure + README Inspector)
     ======================================================================== */
  async openSourceModal(filePath = 'README.md') {
    const modal = document.getElementById('code-modal-backdrop');
    const pre = document.getElementById('code-viewer-pre');
    const tabsContainer = document.getElementById('code-file-tabs');
    if (!modal || !pre || !tabsContainer) return;

    modal.classList.remove('hidden');
    const files = [
      'README.md',
      'index.html',
      'css/windows.css',
      'css/linux.css',
      'css/main.css',
      'js/main.js',
      'js/windowsEngine.js',
      'js/linuxEngine.js',
      'js/challenges.js',
    ];

    tabsContainer.innerHTML = files
      .map(
        (f) =>
          `<button type="button" class="code-file-tab ${f === filePath ? 'active' : ''}" data-src-file="${f}">${f}</button>`
      )
      .join('');

    tabsContainer.querySelectorAll('[data-src-file]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const f = btn.getAttribute('data-src-file');
        if (f) this.openSourceModal(f);
      });
    });

    pre.textContent = `Cargando /${filePath}...`;
    try {
      const resp = await fetch(`./${filePath}`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      pre.textContent = await resp.text();
    } catch {
      pre.textContent = `No se pudo cargar ./${filePath}`;
    }
  }

  closeSourceModal() {
    document.getElementById('code-modal-backdrop')?.classList.add('hidden');
  }

  async copyCurrentSourceCode() {
    const pre = document.getElementById('code-viewer-pre');
    const btn = document.getElementById('btn-copy-code');
    if (!pre || !btn) return;
    try {
      await navigator.clipboard.writeText(pre.textContent || '');
      btn.textContent = '¡Código Copiado!';
      setTimeout(() => {
        btn.textContent = 'Copiar Archivo';
      }, 1500);
    } catch {
      btn.textContent = 'Error al copiar';
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new PermisosLabApp();
});
