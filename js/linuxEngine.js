/* ==========================================================================
   PermisosLab — Ubuntu Server Bash, UGO, SUID/SGID/Sticky & POSIX ACL Engine
   (js/linuxEngine.js)
   ========================================================================== */

export const LINUX_USERS = {
  alumno: { uid: 1000, gid: 1000, primaryGroup: 'alumno', groups: ['alumno', 'sudo', 'www-data'] },
  root: { uid: 0, gid: 0, primaryGroup: 'root', groups: ['root'] },
  dev1: { uid: 1004, gid: 1004, primaryGroup: 'dev1', groups: ['dev1', 'devs'] },
  jdoe: { uid: 1002, gid: 1002, primaryGroup: 'jdoe', groups: ['jdoe', 'devs'] },
  auditor: { uid: 1003, gid: 1003, primaryGroup: 'auditor', groups: ['auditor'] },
  'www-data': { uid: 33, gid: 33, primaryGroup: 'www-data', groups: ['www-data'] },
};

export const LINUX_GROUPS = {
  root: 0,
  sudo: 27,
  'www-data': 33,
  alumno: 1000,
  devs: 1001,
  jdoe: 1002,
  auditor: 1003,
  dev1: 1004,
};

/**
 * Convierte un dígito octal (0-7) a cadena rwx (ej. 7 -> 'rwx', 5 -> 'r-x')
 */
export function bitsToRwx(bits) {
  const r = bits & 4 ? 'r' : '-';
  const w = bits & 2 ? 'w' : '-';
  const x = bits & 1 ? 'x' : '-';
  return `${r}${w}${x}`;
}

/**
 * Convierte una cadena de permisos ('rwx', 'r-x', 'rw', '7', '5', '-') a entero 0..7
 */
export function parseRwxSpec(spec) {
  if (/^[0-7]$/.test(spec)) {
    return parseInt(spec, 8);
  }
  let bits = 0;
  for (const ch of spec) {
    if (ch === 'r') bits |= 4;
    else if (ch === 'w') bits |= 2;
    else if (ch === 'x') bits |= 1;
    else if (ch === '-') continue;
    else return null;
  }
  return bits;
}

function createInitialFileSystem() {
  return {
    '/var/www': {
      path: '/var/www',
      name: '.',
      type: 'dir',
      mode: 0o0755,
      owner: 'root',
      group: 'www-data',
      size: 4096,
      links: 4,
      mtime: 'Nov 12 10:00',
      acl: { users: {}, groups: {}, mask: null },
    },
    '/var/www/html': {
      path: '/var/www/html',
      name: 'html',
      type: 'dir',
      mode: 0o0750, // drwxr-x--- dev1:dev1 (Apache www-data no puede entrar ni leer, y falta bit SGID 2000)
      owner: 'dev1',
      group: 'dev1',
      size: 4096,
      links: 2,
      mtime: 'Nov 12 10:00',
      acl: { users: {}, groups: {}, mask: null },
    },
    '/var/www/html/index.php': {
      path: '/var/www/html/index.php',
      name: 'index.php',
      type: 'file',
      mode: 0o0600, // -rw------- dev1:dev1 (Apache www-data no puede leer el código web)
      owner: 'dev1',
      group: 'dev1',
      size: 1420,
      links: 1,
      mtime: 'Nov 12 10:02',
      content: "<?php echo '<h1>Portal Corporativo en Producción</h1>'; ?>",
      acl: { users: {}, groups: {}, mask: null },
    },
    '/var/www/deploy.sh': {
      path: '/var/www/deploy.sh',
      name: 'deploy.sh',
      type: 'file',
      mode: 0o0666,
      owner: 'alumno',
      group: 'alumno',
      size: 2480,
      links: 1,
      mtime: 'Nov 12 09:45',
      content: '#!/usr/bin/env bash\necho "[OK] Despliegue en /var/www/html completado con éxito."',
      acl: { users: {}, groups: {}, mask: null },
    },
    '/var/www/config.php': {
      path: '/var/www/config.php',
      name: 'config.php',
      type: 'file',
      mode: 0o0640,
      owner: 'root',
      group: 'www-data',
      size: 1840,
      links: 1,
      mtime: 'Nov 12 09:30',
      content: "<?php\ndefine('DB_PASSWORD', 'Sup3rS3cr3t_2026');\n",
      acl: { users: {}, groups: {}, mask: null },
    },
    '/var/www/compartido': {
      path: '/var/www/compartido',
      name: 'compartido',
      type: 'dir',
      mode: 0o0777,
      owner: 'root',
      group: 'www-data',
      size: 4096,
      links: 2,
      mtime: 'Nov 12 09:50',
      acl: { users: {}, groups: {}, mask: null },
    },
    '/var/www/bin_healthcheck': {
      path: '/var/www/bin_healthcheck',
      name: 'bin_healthcheck',
      type: 'file',
      mode: 0o0755,
      owner: 'alumno',
      group: 'alumno',
      size: 16384,
      links: 1,
      mtime: 'Nov 12 11:10',
      content: 'ELF 64-bit LSB executable, x86-64 (Healthcheck Daemon)',
      acl: { users: {}, groups: {}, mask: null },
    },
  };
}

export class LinuxTerminalEngine {
  constructor(onStateChange) {
    this.onStateChange = onStateChange;
    this.reset();
  }

  reset() {
    this.fs = createInitialFileSystem();
    this.normalizeAcls();
    this.currentUser = 'alumno';
    this.hostname = 'ubuntu-server';
    this.cwd = '/var/www';
    this.umask = 0o022;
    this.theme = 'aubergine'; // 'aubergine' | 'black'
    this.selectedInspectPath = '/var/www/html';
    this.history = [];
    this.historyIndex = -1;
    this.lines = [
      {
        type: 'html',
        html: '<span class="term-muted">Welcome to Ubuntu 24.04.1 LTS (GNU/Linux 6.8.0-48-generic x86_64)</span>',
      },
      {
        type: 'html',
        html: '<span class="term-info">Soporte nativo: ls -l, getfacl, setfacl (-m, -x, -b), chmod (-R, octal/simbólico/SUID/SGID/Sticky), chown (-R), su - [usuario], touch, cat, rm, umask.</span>',
      },
    ];
    this.executeCommand('ls -l', false);
  }

  /**
   * Carga el estado inicial de inodos definido en el JSON de un Ticket de Help Desk
   */
  loadChallengeState(initialState) {
    if (!initialState) {
      this.reset();
      return;
    }
    this.fs = JSON.parse(JSON.stringify(initialState.fs || createInitialFileSystem()));
    this.normalizeAcls();
    this.currentUser = initialState.currentUser || 'alumno';
    this.cwd = initialState.cwd || '/var/www';
    this.selectedInspectPath = initialState.selectedInspectPath || '/var/www/html';
    this.lines = [
      {
        type: 'html',
        html: `<span class="term-info">[Help Desk] Estado inicial del ticket cargado en ${this.cwd}. Investiga con "ls -l" o "getfacl".</span>`,
      },
    ];
    this.executeCommand(initialState.initialCommand || 'ls -l', false);
  }

  setTheme(theme) {
    this.theme = theme;
    this.notify();
  }

  selectInspectFile(path) {
    if (this.fs[path]) {
      this.selectedInspectPath = path;
      this.notify();
    }
  }

  /**
   * Determina si un nodo tiene entradas de ACL extendida activas (muestra '+' al final en ls -l)
   */
  hasExtendedAcl(node) {
    if (!node.acl) return false;
    const hasUsers = Object.keys(node.acl.users || {}).length > 0;
    const hasGroups = Object.keys(node.acl.groups || {}).length > 0;
    return hasUsers || hasGroups || (node.acl.mask !== null && node.acl.mask !== undefined);
  }

  /**
   * Permisos de la entrada group:: (grupo propietario).
   * Sin ACL extendida coinciden con los bits de grupo del modo. Con ACL extendida se guardan aparte
   * (acl.groupObj), porque en Linux los bits de grupo del modo pasan a ser la máscara (mask::).
   */
  getOwningGroupBits(node) {
    if (this.hasExtendedAcl(node) && node.acl.groupObj !== undefined && node.acl.groupObj !== null) {
      return node.acl.groupObj & 0o7;
    }
    return (node.mode >> 3) & 0o7;
  }

  /**
   * Máscara efectiva POSIX ACL (mask::). Sin ACL extendida equivale a los bits de grupo del modo.
   */
  getEffectiveAclMask(node) {
    const groupBits = (node.mode >> 3) & 0o7;
    if (!this.hasExtendedAcl(node)) return groupBits;
    if (node.acl.mask !== null && node.acl.mask !== undefined) {
      return node.acl.mask & 0o7;
    }
    return this.computeMaskUnion(node);
  }

  /**
   * Unión del grupo propietario (group::) y todas las entradas nombradas: es la máscara que calcula setfacl.
   */
  computeMaskUnion(node) {
    let union = this.getOwningGroupBits(node);
    Object.values(node.acl?.users || {}).forEach((b) => {
      union |= b;
    });
    Object.values(node.acl?.groups || {}).forEach((b) => {
      union |= b;
    });
    return union & 0o7;
  }

  /**
   * Recalcula la máscara POSIX ACL al añadir entradas con setfacl -m (estándar IEEE 1003.1e)
   */
  recalculateMask(node) {
    node.acl.mask = this.computeMaskUnion(node);
    this.syncModeWithMask(node);
  }

  /**
   * Con ACL extendida, los bits de grupo que muestran ls -l y stat son los de la máscara.
   */
  syncModeWithMask(node) {
    if (this.hasExtendedAcl(node) && node.acl.mask !== null && node.acl.mask !== undefined) {
      node.mode = (node.mode & ~0o070) | ((node.acl.mask & 0o7) << 3);
    }
  }

  /**
   * Ajusta los inodos cargados (sandbox o tickets): con ACL extendida, group:: se toma de los bits
   * de grupo originales y el modo pasa a reflejar la máscara, como en un sistema real.
   */
  normalizeAcls() {
    for (const node of Object.values(this.fs)) {
      if (!node.acl) node.acl = { users: {}, groups: {}, mask: null };
      if (!node.acl.users) node.acl.users = {};
      if (!node.acl.groups) node.acl.groups = {};
      if (node.acl.mask === undefined) node.acl.mask = null;
      if (this.hasExtendedAcl(node)) {
        if (node.acl.groupObj === undefined || node.acl.groupObj === null) {
          node.acl.groupObj = (node.mode >> 3) & 0o7;
        }
        if (node.acl.mask === null) node.acl.mask = this.computeMaskUnion(node);
        this.syncModeWithMask(node);
      } else {
        delete node.acl.groupObj;
      }
    }
  }

  /**
   * Comprueba el permiso de búsqueda (x) en cada directorio de la ruta, como hace el kernel al resolverla.
   * Los directorios por encima de /var/www no se modelan y se consideran accesibles.
   */
  canTraverseTo(fullPath) {
    const user = LINUX_USERS[this.currentUser];
    if (user && user.uid === 0) return true;
    const parts = fullPath.split('/').filter(Boolean);
    let cur = '';
    for (let i = 0; i < parts.length - 1; i++) {
      cur += `/${parts[i]}`;
      const dir = this.fs[cur];
      if (dir && dir.type === 'dir' && !this.hasPermission(dir, 1)) return false;
    }
    return true;
  }

  /**
   * Formatea el modo numérico (ej. 0o2775) en la cadena exacta de 10 o 11 caracteres de ls -l (ej. drwxrwsr-x+)
   */
  formatSymbolicMode(node) {
    const mode = node.mode;
    let typeChar = '-';
    if (node.type === 'dir') typeChar = 'd';
    else if (node.type === 'symlink') typeChar = 'l';

    const suid = (mode & 0o4000) !== 0;
    const sgid = (mode & 0o2000) !== 0;
    const sticky = (mode & 0o1000) !== 0;

    const ur = mode & 0o400 ? 'r' : '-';
    const uw = mode & 0o200 ? 'w' : '-';
    let ux = mode & 0o100 ? 'x' : '-';
    if (suid) ux = ux === 'x' ? 's' : 'S';

    // Con ACL extendida, los bits de grupo del modo son la máscara (mask::), igual que en ls -l real
    const gr = mode & 0o040 ? 'r' : '-';
    const gw = mode & 0o020 ? 'w' : '-';
    let gx = mode & 0o010 ? 'x' : '-';
    if (sgid) gx = gx === 'x' ? 's' : 'S';

    const or = mode & 0o004 ? 'r' : '-';
    const ow = mode & 0o002 ? 'w' : '-';
    let ox = mode & 0o001 ? 'x' : '-';
    if (sticky) ox = ox === 'x' ? 't' : 'T';

    const aclSuffix = this.hasExtendedAcl(node) ? '+' : '';
    return `${typeChar}${ur}${uw}${ux}${gr}${gw}${gx}${or}${ow}${ox}${aclSuffix}`;
  }

  formatOctalMode(mode) {
    return mode.toString(8).padStart(4, '0');
  }

  getLsColorClass(node) {
    const mode = node.mode;
    if (node.type === 'symlink') return 'ls-symlink';
    if (node.type === 'dir') {
      if (mode & 0o1000 && mode & 0o002) return 'ls-sticky';
      if (mode & 0o1000) return 'ls-sticky-only';
      if (mode & 0o2000) return 'ls-sgid';
      return 'ls-dir';
    }
    if (mode & 0o4000) return 'ls-suid';
    if (mode & 0o2000) return 'ls-sgid';
    if (mode & 0o111) return 'ls-exec';
    return 'ls-file';
  }

  resolvePath(inputPath) {
    if (!inputPath || inputPath === '.') return this.cwd;
    const abs = inputPath.startsWith('/') ? inputPath : `${this.cwd}/${inputPath}`;
    const out = [];
    for (const seg of abs.split('/')) {
      if (!seg || seg === '.') continue;
      if (seg === '..') {
        out.pop();
        continue;
      }
      out.push(seg);
    }
    return `/${out.join('/')}`;
  }

  getParentPath(fullPath) {
    const idx = fullPath.lastIndexOf('/');
    if (idx <= 0) return '/var/www';
    return fullPath.slice(0, idx);
  }

  getPromptHtml() {
    const isRoot = this.currentUser === 'root';
    const userCls = isRoot ? 'term-prompt-user root-user' : 'term-prompt-user';
    const sym = isRoot ? '#' : '$';
    return `<span class="${userCls}">${this.escapeHtml(this.currentUser)}@${this.hostname}</span><span class="term-prompt-sep">:</span><span class="term-prompt-path">${this.escapeHtml(this.cwd)}</span><span class="term-prompt-sep">${sym} </span>`;
  }

  /**
   * ALGORITMO DE EVALUACIÓN DE PERMISOS DEL KERNEL LINUX (UGO + POSIX ACL + MASK):
   * Evalúa si `this.currentUser` tiene el permiso `permBit` (4 = r, 2 = w, 1 = x) sobre `node`.
   * Reglas POSIX 1003.1e:
   *  1. root (uid 0): siempre tiene r y w; para x en archivos regulares requiere que algún bit x esté activo.
   *  2. Si el usuario es el propietario (user::): se usan exclusivamente los bits de propietario (la máscara ACL NO limita al propietario).
   *  3. Si el usuario figura como usuario nombrado en la ACL (user:nombre:): se aplican sus bits ACL INTERSECADOS con la máscara (bits & mask).
   *  4. Si el usuario pertenece al grupo propietario (group::) o a cualquier grupo nombrado en la ACL (group:nombre:):
   *     se hace la unión de todos los grupos coincidentes y se INTERSECA con la máscara (unionBits & mask).
   *  5. En caso contrario: se aplican los bits de Otros (other::).
   */
  evaluateNodeAccess(node, permBit) {
    const userObj = LINUX_USERS[this.currentUser] || LINUX_USERS.alumno;

    // 1. Superusuario root
    if (userObj.uid === 0) {
      if (permBit === 1 && node.type !== 'dir') {
        // El kernel concede x a root si cualquiera de los bits x del modo está activo
        const anyExec = (node.mode & 0o111) !== 0;
        return { granted: anyExec, step: 'root (uid=0)' };
      }
      return { granted: true, step: 'root (uid=0)' };
    }

    const ownerBits = (node.mode >> 6) & 0o7;
    const groupBits = this.getOwningGroupBits(node);
    const otherBits = node.mode & 0o7;
    const maskBits = this.getEffectiveAclMask(node);
    const hasAcl = this.hasExtendedAcl(node);

    // 2. Propietario del inodo (user::)
    if (node.owner === this.currentUser) {
      const ok = (ownerBits & permBit) !== 0;
      return {
        granted: ok,
        step: `Propietario UGO (user::${bitsToRwx(ownerBits)})`,
      };
    }

    // 3. Usuario nombrado en la ACL (user:<username>:) — limitado por mask::
    if (node.acl?.users && node.acl.users[this.currentUser] !== undefined) {
      const rawBits = node.acl.users[this.currentUser];
      const effectiveBits = rawBits & maskBits;
      const ok = (effectiveBits & permBit) !== 0;
      return {
        granted: ok,
        step: `ACL user:${this.currentUser}:${bitsToRwx(rawBits)} ∩ mask::${bitsToRwx(maskBits)} -> effective:${bitsToRwx(effectiveBits)}`,
      };
    }

    // 4. Pertenencia al grupo propietario (group::) o grupos nombrados en la ACL (group:<gname>:) — limitados por mask::
    let matchedAnyGroup = false;
    let combinedGroupBits = 0;

    if (userObj.groups.includes(node.group)) {
      matchedAnyGroup = true;
      combinedGroupBits |= groupBits;
    }

    if (node.acl?.groups) {
      for (const [grpName, grpBits] of Object.entries(node.acl.groups)) {
        if (userObj.groups.includes(grpName)) {
          matchedAnyGroup = true;
          combinedGroupBits |= grpBits;
        }
      }
    }

    if (matchedAnyGroup) {
      const effectiveGroupBits = hasAcl ? combinedGroupBits & maskBits : combinedGroupBits;
      const ok = (effectiveGroupBits & permBit) !== 0;
      return {
        granted: ok,
        step: hasAcl
          ? `Grupo (${bitsToRwx(combinedGroupBits)}) ∩ mask::${bitsToRwx(maskBits)} -> effective:${bitsToRwx(effectiveGroupBits)}`
          : `Grupo UGO (group::${bitsToRwx(groupBits)})`,
      };
    }

    // 5. Otros (other::)
    const ok = (otherBits & permBit) !== 0;
    return {
      granted: ok,
      step: `Otros UGO (other::${bitsToRwx(otherBits)})`,
    };
  }

  hasPermission(node, permBit) {
    return this.evaluateNodeAccess(node, permBit).granted;
  }

  executeCommand(rawCmd, recordHistory = true) {
    const cmdLine = rawCmd.trim();
    if (recordHistory) {
      this.lines.push({
        type: 'html',
        html: `${this.getPromptHtml()}${this.escapeHtml(cmdLine)}`,
      });
      if (cmdLine) {
        this.history.push(cmdLine);
        this.historyIndex = this.history.length;
      }
    }

    if (!cmdLine) {
      this.notify();
      return;
    }

    // Operadores de control de bash: ; (siempre), && (solo si el anterior tuvo éxito) y || (solo si falló)
    const segments = cmdLine.split(/\s*(&&|\|\||;)\s*/);
    let ok = segments[0] ? this.runSingleCommand(segments[0]) : true;
    for (let i = 1; i < segments.length; i += 2) {
      const op = segments[i];
      const sub = (segments[i + 1] || '').trim();
      if (!sub) continue;
      if (op === '&&' && !ok) continue;
      if (op === '||' && ok) continue;
      ok = this.runSingleCommand(sub);
    }
    this.notify();
  }

  /**
   * Ejecuta un comando simple y devuelve true si terminó sin error (código de salida 0).
   */
  runSingleCommand(cmdLine) {
    this.cmdFailed = false;
    const tokens = cmdLine.trim().split(/\s+/);
    let cmd = tokens[0];
    let args = tokens.slice(1);

    let asSudo = false;
    if (cmd === 'sudo') {
      const u = LINUX_USERS[this.currentUser];
      if (this.currentUser !== 'root' && !u?.groups.includes('sudo')) {
        this.appendOutput(`${this.currentUser} is not in the sudoers file. This incident will be reported.`, 'term-error');
        return false;
      }
      if (args.length === 0) {
        this.appendOutput('usage: sudo command [args...]', 'term-error');
        return false;
      }
      asSudo = true;
      cmd = args[0];
      args = args.slice(1);
    }

    const prevUser = this.currentUser;
    if (asSudo) this.currentUser = 'root';

    try {
      this.dispatchCommand(cmd, args);
    } finally {
      if (asSudo && cmd !== 'su') {
        this.currentUser = prevUser;
      }
    }
    return !this.cmdFailed;
  }

  dispatchCommand(cmd, args) {
    if (cmd === 'clear') {
      this.lines = [];
      return;
    }

    if (cmd === 'help') {
      this.appendOutput(
        [
          'Comandos soportados en PermisosLab (Ubuntu Server /var/www):',
          '  ls -l [ruta]                       Lista permisos UGO, bits SUID/SGID/Sticky y el indicador ACL (+)',
          '  getfacl <archivo>                  Muestra la tabla de control de acceso POSIX ACL y permisos #effective',
          '  setfacl -m u:<user>:<rwx> <arch>   Añade o modifica usuario en la ACL (ej. setfacl -m u:jdoe:rwx html)',
          '  setfacl -m g:<grupo>:<rwx> <arch>  Añade o modifica grupo en la ACL (ej. setfacl -m g:devs:rwx html)',
          '  setfacl -m m::<rwx> <archivo>      Define la máscara ACL que limita a usuarios/grupos nombrados',
          '  setfacl -x u:<user> <arch> | -b    Elimina una entrada ACL (-x) o limpia toda la ACL extendida (-b)',
          '  chmod <modo> <archivo>             Modo octal (750, 2775, 4755, 1777) o simbólico (u+s, g+s, +t, g-w)',
          '  chown <user>[:<grupo>] <archivo>   Cambia propietario y/o grupo del inodo',
          '  su - <usuario>                     Cambia de sesión (usuarios: alumno, jdoe, dev1, auditor, www-data, root)',
          '  touch <archivo>                    Prueba permisos reales de escritura en el directorio destino',
          '  rm [-r] <ruta> | cat <archivo>     Elimina (directorios con -r) o lee evaluando permisos y Sticky Bit',
          '  cmd1 && cmd2 · cmd1 || cmd2 · ;   Encadena comandos con la lógica de bash (&& solo si el anterior funciona)',
          '  umask [octal]                      Muestra o cambia la máscara de creación de archivos (por defecto 0022)',
        ].join('\n'),
        'term-info'
      );
      return;
    }

    if (cmd === 'umask') {
      if (!args[0]) {
        this.appendOutput(this.umask.toString(8).padStart(4, '0'));
        return;
      }
      if (/^[0-7]{3,4}$/.test(args[0])) {
        this.umask = parseInt(args[0], 8) & 0o777;
        return;
      }
      this.appendOutput(`-bash: umask: ${args[0]}: octal number out of range`, 'term-error');
      return;
    }

    if (cmd === 'pwd') {
      this.appendOutput(this.cwd);
      return;
    }

    if (cmd === 'whoami') {
      this.appendOutput(this.currentUser);
      return;
    }

    if (cmd === 'groups') {
      const u = LINUX_USERS[this.currentUser];
      this.appendOutput(u.groups.join(' '));
      return;
    }

    if (cmd === 'id') {
      const targetUser = args[0] && LINUX_USERS[args[0]] ? args[0] : this.currentUser;
      const u = LINUX_USERS[targetUser];
      const grpStr = u.groups.map((g) => `${LINUX_GROUPS[g]}(${g})`).join(',');
      this.appendOutput(`uid=${u.uid}(${targetUser}) gid=${u.gid}(${u.primaryGroup}) groups=${grpStr}`);
      return;
    }

    if (cmd === 'su') {
      const target = args.find((a) => a !== '-' && a !== '-l') || 'root';
      if (!LINUX_USERS[target]) {
        this.appendOutput(
          `su: user ${target} does not exist or the user entry does not contain all the required fields`,
          'term-error'
        );
        return;
      }
      this.currentUser = target;
      return;
    }

    if (cmd === 'cd') {
      const targetArg = args[0] || '/var/www';
      const resolved = this.resolvePath(targetArg);
      if (!this.canTraverseTo(resolved)) {
        this.appendOutput(`-bash: cd: ${targetArg}: Permission denied`, 'term-error');
        return;
      }
      const node = this.fs[resolved];
      if (!node) {
        this.appendOutput(`-bash: cd: ${targetArg}: No such file or directory`, 'term-error');
        return;
      }
      if (node.type !== 'dir') {
        this.appendOutput(`-bash: cd: ${targetArg}: Not a directory`, 'term-error');
        return;
      }
      if (!this.hasPermission(node, 1)) {
        this.appendOutput(`-bash: cd: ${targetArg}: Permission denied`, 'term-error');
        return;
      }
      this.cwd = resolved;
      return;
    }

    if (cmd === 'ls') {
      this.handleLs(args);
      return;
    }

    if (cmd === 'getfacl') {
      this.handleGetfacl(args);
      return;
    }

    if (cmd === 'setfacl') {
      this.handleSetfacl(args);
      return;
    }

    if (cmd === 'chmod') {
      this.handleChmod(args);
      return;
    }

    if (cmd === 'chown') {
      this.handleChown(args);
      return;
    }

    if (cmd === 'chgrp') {
      this.handleChgrp(args);
      return;
    }

    if (cmd === 'stat') {
      this.handleStat(args);
      return;
    }

    if (cmd === 'touch' || cmd === 'mkdir') {
      this.handleTouchOrMkdir(cmd, args);
      return;
    }

    if (cmd === 'rm') {
      this.handleRm(args);
      return;
    }

    if (cmd === 'cat') {
      this.handleCat(args);
      return;
    }

    if (cmd.startsWith('./') || cmd.startsWith('/var/www/')) {
      this.handleExecuteFile(cmd);
      return;
    }

    this.appendOutput(`${cmd}: command not found`, 'term-error');
  }

  /**
   * Lista el contenido de un directorio o archivo en formato exacto GNU coreutils ls -l
   * Ejemplo: drwxrwsr-x+ 2 root www-data 4096 Nov 12 10:00 html
   */
  handleLs(args) {
    const flagArgs = args.filter((a) => a.startsWith('-'));
    const pathArgs = args.filter((a) => !a.startsWith('-'));
    const flags = flagArgs.join('');
    const showLong = flags.includes('l');
    const showAll = flags.includes('a');
    const dirItself = flags.includes('d');
    const shownArg = pathArgs[0] || '.';

    const targetDir = pathArgs[0] ? this.resolvePath(pathArgs[0]) : this.cwd;
    if (!this.canTraverseTo(targetDir)) {
      this.appendOutput(`ls: cannot access '${shownArg}': Permission denied`, 'term-error');
      return;
    }
    const targetNode = this.fs[targetDir];

    if (!targetNode) {
      this.appendOutput(`ls: cannot access '${shownArg}': No such file or directory`, 'term-error');
      return;
    }

    const listsDirectory = targetNode.type === 'dir' && !dirItself;
    if (listsDirectory && !this.hasPermission(targetNode, 4)) {
      this.appendOutput(`ls: cannot open directory '${shownArg}': Permission denied`, 'term-error');
      return;
    }

    let entries = [];
    if (!listsDirectory) {
      entries = [targetNode];
    } else {
      entries = Object.values(this.fs).filter((node) => {
        if (node.path === targetDir) return showAll;
        const parent = this.getParentPath(node.path);
        if (parent !== targetDir) return false;
        if (!showAll && node.name.startsWith('.')) return false;
        return true;
      });
    }

    // ls muestra el argumento tal cual cuando lista un archivo (o un directorio con -d)
    const nameFor = (node) => {
      if (!listsDirectory) return shownArg;
      return node.path === targetDir ? '.' : node.name;
    };

    if (!showLong) {
      const itemsHtml = entries
        .map((node) => `<span class="${this.getLsColorClass(node)}">${this.escapeHtml(nameFor(node))}</span>`)
        .join('  ');
      this.lines.push({ type: 'html', html: itemsHtml });
      return;
    }

    if (listsDirectory) {
      this.lines.push({ type: 'html', html: `<span class="term-muted">total ${entries.length * 4}</span>` });
    }

    entries.forEach((node) => {
      const sym = this.formatSymbolicMode(node).padEnd(11, ' ');
      const links = String(node.links || (node.type === 'dir' ? 2 : 1));
      const ownerPad = this.escapeHtml(node.owner.padEnd(8, ' '));
      const groupPad = this.escapeHtml(node.group.padEnd(8, ' '));
      const sizePad = String(node.size).padStart(5, ' ');
      const cls = this.getLsColorClass(node);
      const lineHtml = `${sym} ${links} ${ownerPad} ${groupPad} ${sizePad} ${node.mtime} <span class="${cls}">${this.escapeHtml(nameFor(node))}</span>`;
      this.lines.push({ type: 'html', html: lineHtml });
    });
  }

  /**
   * Devuelve la salida auténtica de getfacl mostrando # flags y #effective cuando la máscara limita permisos
   */
  handleGetfacl(args) {
    const targetArg = args.find((a) => !a.startsWith('-'));
    if (!targetArg) {
      this.appendOutput('Usage: getfacl [-aceEsRLPtpndvh] file ...', 'term-error');
      return;
    }
    const fullPath = this.resolvePath(targetArg);
    if (!this.canTraverseTo(fullPath)) {
      this.appendOutput(`getfacl: ${targetArg}: Permission denied`, 'term-error');
      return;
    }
    const node = this.fs[fullPath];
    if (!node) {
      this.appendOutput(`getfacl: ${targetArg}: No such file or directory`, 'term-error');
      return;
    }

    const relName = targetArg.startsWith('/') ? targetArg.slice(1) : targetArg;
    const out = [`# file: ${relName}`, `# owner: ${node.owner}`, `# group: ${node.group}`];

    // Flags SUID / SGID / Sticky (ej. # flags: -s- o --t)
    const suid = node.mode & 0o4000 ? 's' : '-';
    const sgid = node.mode & 0o2000 ? 's' : '-';
    const sticky = node.mode & 0o1000 ? 't' : '-';
    if (suid !== '-' || sgid !== '-' || sticky !== '-') {
      out.push(`# flags: ${suid}${sgid}${sticky}`);
    }

    const ownerBits = (node.mode >> 6) & 0o7;
    const groupBits = this.getOwningGroupBits(node);
    const otherBits = node.mode & 0o7;
    const hasAcl = this.hasExtendedAcl(node);
    const maskBits = this.getEffectiveAclMask(node);
    const effComment = (bits) => {
      const eff = bits & maskBits;
      return hasAcl && eff !== bits ? `\t\t\t#effective:${bitsToRwx(eff)}` : '';
    };

    out.push(`user::${bitsToRwx(ownerBits)}`);
    for (const [uName, uBits] of Object.entries(node.acl?.users || {})) {
      out.push(`user:${uName}:${bitsToRwx(uBits)}${effComment(uBits)}`);
    }
    out.push(`group::${bitsToRwx(groupBits)}${effComment(groupBits)}`);
    for (const [gName, gBits] of Object.entries(node.acl?.groups || {})) {
      out.push(`group:${gName}:${bitsToRwx(gBits)}${effComment(gBits)}`);
    }
    if (hasAcl) {
      out.push(`mask::${bitsToRwx(maskBits)}`);
    }
    out.push(`other::${bitsToRwx(otherBits)}`);
    this.appendOutput(out.join('\n'));
  }

  /**
   * Localiza el inodo de un comando de administración comprobando ruta y existencia.
   * Devuelve null (tras imprimir el error) si no se puede acceder.
   */
  locateForAdmin(cmd, targetArg, verb) {
    const fullPath = this.resolvePath(targetArg);
    if (!this.canTraverseTo(fullPath)) {
      this.appendOutput(
        cmd === 'setfacl' ? `setfacl: ${targetArg}: Permission denied` : `${cmd}: cannot access '${targetArg}': Permission denied`,
        'term-error'
      );
      return null;
    }
    const node = this.fs[fullPath];
    if (!node) {
      this.appendOutput(
        cmd === 'setfacl' ? `setfacl: ${targetArg}: No such file or directory` : `${cmd}: cannot ${verb} '${targetArg}': No such file or directory`,
        'term-error'
      );
      return null;
    }
    return { fullPath, node };
  }

  /**
   * Parsea y ejecuta setfacl (-m, -x, -b, -n)
   * Ejemplos:
   *   setfacl -m u:jdoe:rwx html
   *   setfacl -m m::r-x html
   *   setfacl -x u:jdoe html
   *   setfacl -b html
   */
  handleSetfacl(args) {
    if (args.length < 2) {
      this.appendOutput('setfacl: missing arguments (ejemplo: setfacl -m u:jdoe:rwx html)', 'term-error');
      return;
    }

    const noMaskRecalc = args.includes('-n');
    const targetArg = args[args.length - 1];
    const found = this.locateForAdmin('setfacl', targetArg, 'access');
    if (!found) return;
    const { fullPath, node } = found;
    if (this.currentUser !== 'root' && this.currentUser !== node.owner) {
      this.appendOutput(`setfacl: ${targetArg}: Operation not permitted`, 'term-error');
      return;
    }
    if (!node.acl) node.acl = { users: {}, groups: {}, mask: null };

    // Limpiar todas las entradas extendidas: el grupo vuelve a mostrar group::
    if (args.includes('-b')) {
      const groupObj = this.getOwningGroupBits(node);
      node.acl = { users: {}, groups: {}, mask: null };
      node.mode = (node.mode & ~0o070) | (groupObj << 3);
      this.selectedInspectPath = fullPath;
      return;
    }

    // Eliminar una entrada ACL: setfacl -x u:jdoe <archivo>
    const xIdx = args.indexOf('-x');
    if (xIdx !== -1) {
      const spec = args[xIdx + 1] || '';
      const [type, name] = spec.split(':');
      const wasExtended = this.hasExtendedAcl(node);
      const groupObj = this.getOwningGroupBits(node);
      if ((type === 'u' || type === 'user') && name) {
        delete node.acl.users[name];
      } else if ((type === 'g' || type === 'group') && name) {
        delete node.acl.groups[name];
      } else if (type === 'm' || type === 'mask') {
        if (Object.keys(node.acl.users).length || Object.keys(node.acl.groups).length) {
          this.appendOutput(`setfacl: ${targetArg}: Malformed access ACL: la máscara es obligatoria mientras haya entradas nombradas`, 'term-error');
          return;
        }
        node.acl.mask = null;
      } else {
        this.appendOutput(`setfacl: Option -x: Invalid argument near character 1`, 'term-error');
        return;
      }
      if (this.hasExtendedAcl(node)) {
        if (!noMaskRecalc) this.recalculateMask(node);
      } else if (wasExtended) {
        node.mode = (node.mode & ~0o070) | (groupObj << 3);
        delete node.acl.groupObj;
      }
      this.selectedInspectPath = fullPath;
      return;
    }

    // Modificar o añadir entradas ACL: setfacl -m <especificación> <archivo>
    const mIdx = args.indexOf('-m');
    const specListStr = mIdx !== -1 ? args[mIdx + 1] : args[0];
    if (!specListStr || specListStr === targetArg) {
      this.appendOutput('setfacl: Option -m: falta la especificación (ejemplo: u:jdoe:rwx)', 'term-error');
      return;
    }

    // Mientras no haya ACL extendida, group:: vive en los bits de grupo del modo
    if (!this.hasExtendedAcl(node)) {
      node.acl.groupObj = (node.mode >> 3) & 0o7;
    }

    let explicitMaskSet = false;
    for (const rawSpec of specListStr.split(',')) {
      const parts = rawSpec.split(':');
      if (parts.length < 2) {
        this.appendOutput(`setfacl: Option -m: Invalid argument near character 1`, 'term-error');
        return;
      }

      const type = parts[0];
      // Soportar tanto m::r-x (3 partes) como m:r-x (2 partes)
      const name = parts.length === 3 ? parts[1] : '';
      const permStr = parts[parts.length - 1];
      const bits = parseRwxSpec(permStr);

      if (bits === null) {
        this.appendOutput(`setfacl: Invalid permission specification "${permStr}"`, 'term-error');
        return;
      }

      if (type === 'u' || type === 'user') {
        if (!name) {
          node.mode = (node.mode & ~0o700) | (bits << 6);
        } else {
          if (!LINUX_USERS[name]) {
            this.appendOutput(`setfacl: Option -m: Invalid user "${name}"`, 'term-error');
            return;
          }
          node.acl.users[name] = bits;
        }
      } else if (type === 'g' || type === 'group') {
        if (!name) {
          node.acl.groupObj = bits;
        } else {
          if (LINUX_GROUPS[name] === undefined) {
            this.appendOutput(`setfacl: Option -m: Invalid group "${name}"`, 'term-error');
            return;
          }
          node.acl.groups[name] = bits;
        }
      } else if (type === 'm' || type === 'mask') {
        node.acl.mask = bits;
        explicitMaskSet = true;
      } else if (type === 'o' || type === 'other') {
        node.mode = (node.mode & ~0o007) | bits;
      } else {
        this.appendOutput(`setfacl: Option -m: Invalid ACL entry type "${type}"`, 'term-error');
        return;
      }
    }

    if (this.hasExtendedAcl(node)) {
      if ((!explicitMaskSet && !noMaskRecalc) || node.acl.mask === null) {
        node.acl.mask = this.computeMaskUnion(node);
      }
      this.syncModeWithMask(node);
    } else {
      // ACL mínima: group:: vuelve a los bits de grupo del modo
      node.mode = (node.mode & ~0o070) | ((node.acl.groupObj & 0o7) << 3);
      delete node.acl.groupObj;
    }

    this.selectedInspectPath = fullPath;
  }

  getTargetNodes(fullPath, recursive = false) {
    const rootNode = this.fs[fullPath];
    if (!rootNode) return [];
    if (!recursive || rootNode.type !== 'dir') return [rootNode];
    return Object.values(this.fs).filter(
      (n) => n.path === fullPath || n.path.startsWith(`${fullPath}/`)
    );
  }

  /**
   * Ejecuta chmod soportando octal (750, 2775, 4755, 1777) y simbólico (u+s, g+s, +t, u=rwx,g=rx,o=)
   * Semántica GNU: en archivos el octal fija el modo exacto; en directorios conserva SUID/SGID salvo
   * que se indiquen 5 dígitos (p. ej. 00755). Con ACL extendida, los bits de grupo cambian la máscara.
   */
  handleChmod(args) {
    const isRecursive = args.some((a) => /^-[a-zA-Z]*R/.test(a));
    const cleanArgs = args.filter((a) => !a.startsWith('-') || /^-[rwxXst]+$/.test(a));
    if (cleanArgs.length < 2) {
      this.appendOutput('chmod: missing operand', 'term-error');
      return;
    }
    const modeSpec = cleanArgs[0];
    const isNumeric = /^[0-7]{1,5}$/.test(modeSpec);
    if (!isNumeric && !modeSpec.split(',').every((c) => /^[ugoa]*[+\-=][rwxXst]*$/.test(c))) {
      this.appendOutput(`chmod: invalid mode: ‘${modeSpec}’`, 'term-error');
      return;
    }

    for (const tArg of cleanArgs.slice(1)) {
      const found = this.locateForAdmin('chmod', tArg, 'access');
      if (!found) continue;
      const { fullPath } = found;

      for (const node of this.getTargetNodes(fullPath, isRecursive)) {
        if (this.currentUser !== 'root' && this.currentUser !== node.owner) {
          this.appendOutput(`chmod: changing permissions of '${tArg}': Operation not permitted`, 'term-error');
          break;
        }

        if (isNumeric) {
          const parsed = parseInt(modeSpec, 8) & 0o7777;
          node.mode = node.type === 'dir' && modeSpec.length < 5 ? parsed | (node.mode & 0o6000) : parsed;
        } else {
          let currentMode = node.mode;
          for (const clause of modeSpec.split(',')) {
            const [, whoRaw, op, perms] = clause.match(/^([ugoa]*)([+\-=])([rwxXst]*)$/);
            const who = whoRaw || 'a';
            const applyU = who.includes('u') || who.includes('a');
            const applyG = who.includes('g') || who.includes('a');
            const applyO = who.includes('o') || who.includes('a');

            let mask = 0;
            if (perms.includes('r')) {
              if (applyU) mask |= 0o400;
              if (applyG) mask |= 0o040;
              if (applyO) mask |= 0o004;
            }
            if (perms.includes('w')) {
              if (applyU) mask |= 0o200;
              if (applyG) mask |= 0o020;
              if (applyO) mask |= 0o002;
            }
            if (perms.includes('x') || (perms.includes('X') && (node.type === 'dir' || (currentMode & 0o111) !== 0))) {
              if (applyU) mask |= 0o100;
              if (applyG) mask |= 0o010;
              if (applyO) mask |= 0o001;
            }
            if (perms.includes('s')) {
              if (applyU) mask |= 0o4000;
              if (applyG) mask |= 0o2000;
            }
            if (perms.includes('t') && applyO) {
              mask |= 0o1000;
            }

            if (op === '+') {
              currentMode |= mask;
            } else if (op === '-') {
              currentMode &= ~mask;
            } else {
              // '=': en directorios, GNU conserva SUID/SGID salvo que se nombre 's'
              const keepSpecial = node.type === 'dir' && !perms.includes('s');
              let clearMask = 0;
              if (applyU) clearMask |= keepSpecial ? 0o700 : 0o4700;
              if (applyG) clearMask |= keepSpecial ? 0o070 : 0o2070;
              if (applyO) clearMask |= 0o1007;
              currentMode = (currentMode & ~clearMask) | mask;
            }
          }
          node.mode = currentMode & 0o7777;
        }

        if (this.hasExtendedAcl(node)) {
          node.acl.mask = (node.mode >> 3) & 0o7;
        }
      }

      this.selectedInspectPath = fullPath;
    }
  }

  /**
   * Como el kernel: al cambiar propietario o grupo de un archivo regular se pierden SUID y SGID
   * (el SGID solo si el grupo tiene x). Así no se puede "regalar" un binario SUID a root por accidente.
   */
  clearSetIdOnChown(node) {
    if (node.type === 'dir') return;
    node.mode &= ~0o4000;
    if (node.mode & 0o010) node.mode &= ~0o2000;
  }

  handleChown(args) {
    const isRecursive = args.some((a) => /^-[a-zA-Z]*R/.test(a));
    const cleanArgs = args.filter((a) => !a.startsWith('-'));
    if (cleanArgs.length < 2) {
      this.appendOutput('chown: missing operand', 'term-error');
      return;
    }
    const spec = cleanArgs[0];

    let newOwner = null;
    let newGroup = null;
    if (spec.includes(':')) {
      const [o, g] = spec.split(':');
      if (o) newOwner = o;
      if (g) newGroup = g;
    } else {
      newOwner = spec;
    }

    if (newOwner && !LINUX_USERS[newOwner]) {
      this.appendOutput(`chown: invalid user: ‘${spec}’`, 'term-error');
      return;
    }
    if (newGroup && LINUX_GROUPS[newGroup] === undefined) {
      this.appendOutput(`chown: invalid group: ‘${spec}’`, 'term-error');
      return;
    }

    this.applyOwnership('chown', cleanArgs.slice(1), newOwner, newGroup, isRecursive);
  }

  handleChgrp(args) {
    const isRecursive = args.some((a) => /^-[a-zA-Z]*R/.test(a));
    const cleanArgs = args.filter((a) => !a.startsWith('-'));
    if (cleanArgs.length < 2) {
      this.appendOutput('chgrp: missing operand', 'term-error');
      return;
    }
    const groupName = cleanArgs[0];
    if (LINUX_GROUPS[groupName] === undefined) {
      this.appendOutput(`chgrp: invalid group: ‘${groupName}’`, 'term-error');
      return;
    }
    this.applyOwnership('chgrp', cleanArgs.slice(1), null, groupName, isRecursive);
  }

  /**
   * Reglas de chown/chgrp: solo root cambia el propietario; el propietario puede cambiar el grupo
   * únicamente a uno de sus grupos.
   */
  applyOwnership(cmd, targets, newOwner, newGroup, isRecursive) {
    const user = LINUX_USERS[this.currentUser];
    const isRoot = this.currentUser === 'root';
    for (const tArg of targets) {
      const found = this.locateForAdmin(cmd, tArg, 'access');
      if (!found) continue;
      const { fullPath } = found;
      for (const node of this.getTargetNodes(fullPath, isRecursive)) {
        const allowed =
          isRoot ||
          (!newOwner || newOwner === node.owner) &&
            this.currentUser === node.owner &&
            (!newGroup || user.groups.includes(newGroup));
        if (!allowed) {
          const what = cmd === 'chgrp' ? 'group' : 'ownership';
          this.appendOutput(`${cmd}: changing ${what} of '${tArg}': Operation not permitted`, 'term-error');
          break;
        }
        if (newOwner) node.owner = newOwner;
        if (newGroup) node.group = newGroup;
        this.clearSetIdOnChown(node);
      }
      this.selectedInspectPath = fullPath;
    }
  }

  /**
   * Evalúa permisos reales de escritura/ejecución cuando el alumno intenta ejecutar touch o mkdir.
   * Si no tiene permiso efectivo en el directorio o archivo, devuelve "Permission denied".
   * Si tiene éxito, devuelve el prompt normal y aplica herencia SGID si el directorio padre tiene 02000.
   */
  handleTouchOrMkdir(cmd, args) {
    const targetArg = args.find((a) => !a.startsWith('-'));
    if (!targetArg) {
      this.appendOutput(`${cmd}: missing file operand`, 'term-error');
      return;
    }

    const fullPath = this.resolvePath(targetArg);
    const deniedMsg =
      cmd === 'mkdir'
        ? `mkdir: cannot create directory ‘${targetArg}’: Permission denied`
        : `touch: cannot touch '${targetArg}': Permission denied`;
    if (!this.canTraverseTo(fullPath)) {
      this.appendOutput(deniedMsg, 'term-error');
      return;
    }
    const existingNode = this.fs[fullPath];

    if (existingNode) {
      if (cmd === 'mkdir') {
        this.appendOutput(`mkdir: cannot create directory ‘${targetArg}’: File exists`, 'term-error');
        return;
      }
      // touch sobre un archivo existente: basta con ser propietario o tener escritura (utimensat)
      if (existingNode.owner !== this.currentUser && !this.hasPermission(existingNode, 2)) {
        this.appendOutput(deniedMsg, 'term-error');
        return;
      }
      existingNode.mtime = 'Nov 12 10:15';
      return;
    }

    const parentPath = this.getParentPath(fullPath);
    const parentNode = this.fs[parentPath];

    if (!parentNode || parentNode.type !== 'dir') {
      this.appendOutput(
        cmd === 'mkdir'
          ? `mkdir: cannot create directory ‘${targetArg}’: No such file or directory`
          : `touch: cannot touch '${targetArg}': No such file or directory`,
        'term-error'
      );
      return;
    }

    // Crear un archivo en un directorio en Linux exige permiso de Escritura (w = 2) Y Ejecución/Búsqueda (x = 1) en el directorio padre
    if (!this.hasPermission(parentNode, 1) || !this.hasPermission(parentNode, 2)) {
      this.appendOutput(deniedMsg, 'term-error');
      return;
    }

    const isDir = cmd === 'mkdir';
    const baseMode = (isDir ? 0o777 : 0o666) & ~this.umask;
    // Si el directorio padre tiene el bit SGID (02000) activo, el nuevo inodo hereda el grupo del directorio padre
    const parentHasSgid = (parentNode.mode & 0o2000) !== 0;
    const inheritedGroup = parentHasSgid ? parentNode.group : LINUX_USERS[this.currentUser].primaryGroup;
    const finalMode = isDir && parentHasSgid ? baseMode | 0o2000 : baseMode;

    const fileName = fullPath.split('/').pop();
    this.fs[fullPath] = {
      path: fullPath,
      name: fileName,
      type: isDir ? 'dir' : 'file',
      mode: finalMode,
      owner: this.currentUser,
      group: inheritedGroup,
      size: isDir ? 4096 : 0,
      links: isDir ? 2 : 1,
      mtime: 'Nov 12 10:15',
      content: '',
      acl: { users: {}, groups: {}, mask: null },
    };

    this.selectedInspectPath = fullPath;
  }

  /**
   * Comprueba si el usuario actual puede borrar `entry` del directorio `parent`
   * (escritura + búsqueda en el padre y Sticky Bit). Devuelve el error o null.
   */
  deletionError(parent, entry) {
    if (this.currentUser === 'root' || !parent) return null;
    if (!this.hasPermission(parent, 2) || !this.hasPermission(parent, 1)) return 'Permission denied';
    if (
      parent.mode & 0o1000 &&
      entry.owner !== this.currentUser &&
      parent.owner !== this.currentUser
    ) {
      return 'Operation not permitted';
    }
    return null;
  }

  /**
   * Evalúa borrado de archivos incluyendo comprobación de Sticky Bit (1000 / +t) en el directorio contenedor.
   * Los directorios solo se borran con -r (como rm real).
   */
  handleRm(args) {
    const recursive = args.some((a) => /^-[a-zA-Z]*[rR]/.test(a));
    const targets = args.filter((a) => !a.startsWith('-'));
    if (!targets.length) {
      this.appendOutput('rm: missing operand', 'term-error');
      return;
    }

    for (const targetArg of targets) {
      const fullPath = this.resolvePath(targetArg);
      if (!this.canTraverseTo(fullPath)) {
        this.appendOutput(`rm: cannot remove '${targetArg}': Permission denied`, 'term-error');
        continue;
      }
      const node = this.fs[fullPath];
      if (!node) {
        this.appendOutput(`rm: cannot remove '${targetArg}': No such file or directory`, 'term-error');
        continue;
      }
      if (fullPath === '/var/www') {
        this.appendOutput(`rm: no se permite borrar /var/www en este laboratorio (usa «Recargar Ticket» para empezar de cero)`, 'term-error');
        continue;
      }
      if (node.type === 'dir' && !recursive) {
        this.appendOutput(`rm: cannot remove '${targetArg}': Is a directory`, 'term-error');
        continue;
      }

      // Borrado de la hoja a la raíz: cada entrada necesita permiso en su directorio padre
      const victims = this.getTargetNodes(fullPath, node.type === 'dir').sort((a, b) => b.path.length - a.path.length);
      let blocked = null;
      for (const victim of victims) {
        if (victim.type === 'dir' && victim !== node && this.currentUser !== 'root' && !this.hasPermission(victim, 4)) {
          blocked = { path: victim.path, err: 'Permission denied' };
          break;
        }
        const err = this.deletionError(this.fs[this.getParentPath(victim.path)], victim);
        if (err) {
          blocked = { path: victim.path, err };
          break;
        }
      }
      if (blocked) {
        const shown = blocked.path === fullPath ? targetArg : blocked.path;
        this.appendOutput(`rm: cannot remove '${shown}': ${blocked.err}`, 'term-error');
        continue;
      }

      victims.forEach((v) => delete this.fs[v.path]);
      if (this.cwd === fullPath || this.cwd.startsWith(`${fullPath}/`)) {
        this.cwd = this.getParentPath(fullPath);
      }
      if (!this.fs[this.selectedInspectPath]) this.selectedInspectPath = this.cwd;
    }
  }

  handleCat(args) {
    const targetArg = args.find((a) => !a.startsWith('-'));
    if (!targetArg) {
      this.appendOutput('cat: missing file operand', 'term-error');
      return;
    }
    const fullPath = this.resolvePath(targetArg);
    if (!this.canTraverseTo(fullPath)) {
      this.appendOutput(`cat: ${targetArg}: Permission denied`, 'term-error');
      return;
    }
    const node = this.fs[fullPath];
    if (!node) {
      this.appendOutput(`cat: ${targetArg}: No such file or directory`, 'term-error');
      return;
    }
    if (node.type === 'dir') {
      this.appendOutput(`cat: ${targetArg}: Is a directory`, 'term-error');
      return;
    }
    if (!this.hasPermission(node, 4)) {
      this.appendOutput(`cat: ${targetArg}: Permission denied`, 'term-error');
      return;
    }
    this.appendOutput(node.content || '');
  }

  handleStat(args) {
    const targetArg = args.find((a) => !a.startsWith('-'));
    if (!targetArg) {
      this.appendOutput('stat: missing operand', 'term-error');
      return;
    }
    const fullPath = this.resolvePath(targetArg);
    if (!this.canTraverseTo(fullPath)) {
      this.appendOutput(`stat: cannot statx '${targetArg}': Permission denied`, 'term-error');
      return;
    }
    const node = this.fs[fullPath];
    if (!node) {
      this.appendOutput(`stat: cannot statx '${targetArg}': No such file or directory`, 'term-error');
      return;
    }
    const uid = LINUX_USERS[node.owner]?.uid ?? 1000;
    const gid = LINUX_GROUPS[node.group] ?? 1000;
    const oct = this.formatOctalMode(node.mode);
    const sym = this.formatSymbolicMode(node).replace(/\+$/, '');
    const typeLabel = node.type === 'dir' ? 'directory' : 'regular file';

    this.appendOutput(
      [
        `  File: ${targetArg}`,
        `  Size: ${node.size}\tBlocks: 8          IO Block: 4096   ${typeLabel}`,
        `Access: (${oct}/${sym})  Uid: ( ${String(uid).padStart(4, ' ')}/   ${node.owner})   Gid: ( ${String(gid).padStart(4, ' ')}/   ${node.group})`,
      ].join('\n')
    );
  }

  handleExecuteFile(cmdPath) {
    const fullPath = this.resolvePath(cmdPath);
    if (!this.canTraverseTo(fullPath)) {
      this.appendOutput(`-bash: ${cmdPath}: Permission denied`, 'term-error');
      return;
    }
    const node = this.fs[fullPath];
    if (!node) {
      this.appendOutput(`-bash: ${cmdPath}: No such file or directory`, 'term-error');
      return;
    }
    if (node.type === 'dir') {
      this.appendOutput(`-bash: ${cmdPath}: Is a directory`, 'term-error');
      return;
    }
    if (!this.hasPermission(node, 1)) {
      this.appendOutput(`-bash: ${cmdPath}: Permission denied`, 'term-error');
      return;
    }
    // Un script (#!) además necesita lectura: el intérprete tiene que poder abrirlo
    const isScript = String(node.content || '').startsWith('#!');
    if (isScript && !this.hasPermission(node, 4)) {
      this.appendOutput(`/usr/bin/bash: ${cmdPath}: Permission denied`, 'term-error');
      return;
    }
    // El kernel ignora SUID/SGID en scripts con #!
    const honorsSetId = !isScript;
    const effectiveUser = honorsSetId && node.mode & 0o4000 ? node.owner : this.currentUser;
    const effectiveGroup = honorsSetId && node.mode & 0o2000 ? node.group : LINUX_USERS[this.currentUser].primaryGroup;
    this.appendOutput(
      `[EUID=${effectiveUser} EGID=${effectiveGroup}] Executing ${node.path}...\n[OK] Proceso finalizado con código 0.`,
      'term-success'
    );
  }

  appendOutput(text, cls = '') {
    if (cls === 'term-error') this.cmdFailed = true;
    const escaped = this.escapeHtml(text);
    const html = cls ? `<span class="${cls}">${escaped}</span>` : escaped;
    this.lines.push({ type: 'html', html });
  }

  escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  notify() {
    if (typeof this.onStateChange === 'function') {
      this.onStateChange({
        fs: this.fs,
        currentUser: this.currentUser,
        cwd: this.cwd,
        umask: this.umask,
        theme: this.theme,
        selectedInspectPath: this.selectedInspectPath,
        lines: this.lines,
      });
    }
  }
}
