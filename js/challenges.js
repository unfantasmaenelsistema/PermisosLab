/* ==========================================================================
   PermisosLab — Help Desk Ticket System & Verification Engine (js/challenges.js)
   10 Casos Reales (5 Windows Server + 5 Ubuntu Server)
   Creado para Un Fantasma en el Sistema (https://www.unfantasmaenelsistema.com/)
   ========================================================================== */

import { createInitialResources } from './windowsEngine.js';

/**
 * Genera una copia fresca de los 5 recursos Windows y permite sobreescribir el recurso afectado
 */
function buildWinResourcesWithOverride(overrideMap = {}) {
  const base = createInitialResources();
  return base.map((item) => {
    if (overrideMap[item.id]) {
      return { ...item, ...overrideMap[item.id] };
    }
    return item;
  });
}

export const TICKETS_JSON = {
  windows: [
    {
      id: 'win-tkt-1',
      ticketCode: 'INC-4081',
      os: 'windows',
      priority: 'Prioridad Alta',
      senderName: 'María García',
      senderEmail: 'mgarcia@empresa.local',
      senderDept: 'Dpto. Ventas (Grupo: Ventas_Group)',
      timestamp: 'Hoy, 09:14',
      subject: 'No puedo guardar el Excel de contabilidad',
      affectedResource: 'C:\\Empresa\\Contabilidad\\Presupuesto_Ventas.xlsx (\\\\WIN-SRV01\\Contabilidad)',
      targetResourceId: 'contabilidad_excel',
      message:
        'Hola, soy María del departamento de Ventas. Intento sobreescribir el archivo Presupuesto_Ventas.xlsx en la carpeta compartida \\\\WIN-SRV01\\Contabilidad y me da Acceso Denegado, pero puedo leerlo perfectamente. ¿Podéis darme permisos para guardar cambios?',
      hint:
        'Revisa ambas capas en las Propiedades de Presupuesto_Ventas.xlsx: 1) En la pestaña "Compartir", cambia el permiso SMB de "Leer" a "Cambiar" (o Control total). 2) En la pestaña "Seguridad", selecciona "Ventas_Group" y marca "Modificar" (Permitir) → Aplicar.',
      successReply:
        '¡Muchas gracias! Acabo de darle a Guardar en Excel desde la carpeta de red \\\\WIN-SRV01\\Contabilidad y se ha guardado a la primera. Cierro el ticket.',
      initialState: {
        selectedResourceId: 'contabilidad_excel',
        activeTab: 'security',
        selectedPrincipalId: 'ventas_group',
        effectiveTestUserId: 'mgarcia',
        resources: buildWinResourcesWithOverride(),
      },
      objectives: [
        {
          id: 'w1-share',
          text: 'Habilitar permiso SMB "Cambiar" o "Control total" en la pestaña Compartir de Presupuesto_Ventas.xlsx',
          check: (winEngine) => {
            const res = winEngine.state.resources.find((r) => r.id === 'contabilidad_excel');
            if (!res) return false;
            const eff = winEngine.evaluateEffectiveAccess(res, 'mgarcia', true);
            return Boolean(eff.write?.shareGranted);
          },
        },
        {
          id: 'w1-ntfs',
          text: 'Conceder permiso efectivo de Escritura/Modificar en NTFS a María (mgarcia / Ventas_Group)',
          check: (winEngine) => {
            const res = winEngine.state.resources.find((r) => r.id === 'contabilidad_excel');
            if (!res) return false;
            const eff = winEngine.evaluateEffectiveAccess(res, 'mgarcia', true);
            return Boolean(eff.write?.granted && eff.read?.granted);
          },
        },
      ],
    },
    {
      id: 'win-tkt-2',
      ticketCode: 'INC-4085',
      os: 'windows',
      priority: 'Prioridad Media',
      senderName: 'Juan Doe',
      senderEmail: 'jdoe@empresa.local',
      senderDept: 'Dpto. Finanzas (Grupos: Finanzas_Group, Users)',
      timestamp: 'Hoy, 10:02',
      subject: 'Bloqueo extraño al crear informes en C:\\Empresa\\Finanzas',
      affectedResource: 'C:\\Empresa\\Finanzas (\\\\WIN-SRV01\\Finanzas$)',
      targetResourceId: 'finanzas_dir',
      message:
        'Buenos días. Estoy en el grupo Finanzas_Group que tiene permiso de Modificar sobre C:\\Empresa\\Finanzas, pero aun así Windows me bloquea al intentar crear o guardar cualquier archivo. Alguien tocó los permisos del grupo Users ayer.',
      hint:
        'Juan pertenece tanto a "Finanzas_Group" como a "Users". En la pestaña Seguridad de Finanzas, selecciona el grupo "Users": verás que tiene una casilla "Denegar" marcada en Escritura. Como Denegar prevalece sobre Permitir (y anula también "Modificar", que incluye escribir), desmarca Denegar en "Users" o quita a "Users" de la carpeta Finanzas. Pulsa Aplicar.',
      successReply:
        '¡Solucionado! Era esa denegación en el grupo Users la que me pisaba los permisos de Finanzas_Group. Ya puedo crear archivos sin problema.',
      initialState: {
        selectedResourceId: 'finanzas_dir',
        activeTab: 'security',
        selectedPrincipalId: 'users',
        effectiveTestUserId: 'jdoe',
        resources: buildWinResourcesWithOverride(),
      },
      objectives: [
        {
          id: 'w2-deny',
          text: 'Eliminar la denegación explícita de Escritura que afecta a "jdoe" a través del grupo "Users"',
          check: (winEngine) => {
            const res = winEngine.state.resources.find((r) => r.id === 'finanzas_dir');
            if (!res) return false;
            const eff = winEngine.evaluateEffectiveAccess(res, 'jdoe', true);
            return Boolean(eff.write?.granted && eff.modify?.granted);
          },
        },
      ],
    },
    {
      id: 'win-tkt-3',
      ticketCode: 'INC-4090',
      os: 'windows',
      priority: 'Prioridad Crítica · Auditoría',
      senderName: 'Dirección de RRHH',
      senderEmail: 'auditoria@empresa.local',
      senderDept: 'Recursos Humanos (Grupo: RRHH_Group)',
      timestamp: 'Hoy, 10:35',
      subject: 'URGENTE: Cualquier empleado puede abrir Nominas_2026.xlsx',
      affectedResource: 'C:\\Empresa\\RRHH\\Nominas_2026.xlsx',
      targetResourceId: 'rrhh_nominas',
      message:
        '¡Alerta de confidencialidad! Hemos detectado que cualquier usuario del dominio (como Juan de Finanzas o María de Ventas) puede abrir y leer Nominas_2026.xlsx porque está heredando permisos de "Users". Cortad la herencia, quitad a "Users" y dad permiso de Modificar únicamente a "RRHH_Group".',
      hint:
        'En Nominas_2026.xlsx, pulsa "Opciones avanzadas" → pestaña "Permisos" → "Deshabilitar herencia (Convertir en explícitos)" → Aceptar. Luego en "Seguridad" selecciona "Users" y pulsa "Quitar", y agrega a "RRHH_Group" con permiso "Modificar". Pulsa Aplicar.',
      successReply:
        'Verificado desde Auditoría: los usuarios fuera de RRHH_Group reciben Acceso Denegado y el equipo de RRHH puede editar el fichero.',
      initialState: {
        selectedResourceId: 'rrhh_nominas',
        activeTab: 'security',
        selectedPrincipalId: 'users',
        effectiveTestUserId: 'jdoe',
        resources: buildWinResourcesWithOverride(),
      },
      objectives: [
        {
          id: 'w3-inh',
          text: 'Deshabilitar la herencia NTFS en Nominas_2026.xlsx y revocar el acceso de lectura a "Users" (jdoe)',
          check: (winEngine) => {
            const res = winEngine.state.resources.find((r) => r.id === 'rrhh_nominas');
            if (!res || !res.inheritanceDisabled) return false;
            const effJdoe = winEngine.evaluateEffectiveAccess(res, 'jdoe', true);
            return !effJdoe.read?.granted;
          },
        },
        {
          id: 'w3-rrhh',
          text: 'Conceder permiso "Modificar" al grupo "RRHH_Group" sobre Nominas_2026.xlsx',
          check: (winEngine) => {
            const res = winEngine.state.resources.find((r) => r.id === 'rrhh_nominas');
            const rrhh = res?.acl.find((e) => e.principalId === 'rrhh_group');
            return Boolean(rrhh && rrhh.allow.includes('modify') && !rrhh.deny.includes('modify'));
          },
        },
      ],
    },
    {
      id: 'win-tkt-4',
      ticketCode: 'INC-4094',
      os: 'windows',
      priority: 'Prioridad Alta · SecOps',
      senderName: 'Carlos SRE (DevOps)',
      senderEmail: 'carlos_sre@empresa.local',
      senderDept: 'Plataforma & SRE (Grupo: DevOps_Group)',
      timestamp: 'Hoy, 11:20',
      subject: 'Blindar script Deploy-Prod.ps1 contra modificaciones accidentales',
      affectedResource: 'C:\\Empresa\\Scripts\\Deploy-Prod.ps1 (\\\\WIN-SRV01\\Scripts$)',
      targetResourceId: 'script_deploy',
      message:
        'Hola compañeros. En la auditoría de despliegue hemos visto que nuestro grupo DevOps_Group tiene permisos de "Modificar/Escritura" sobre Deploy-Prod.ps1. Por normativa ISO 27001, DevOps_Group debe poder leer y ejecutar el script (Lectura y ejecución), pero NO debe tener permiso de Escritura ni Modificar (solo Administrators puede editarlo).',
      hint:
        'Selecciona Deploy-Prod.ps1 en el Explorador. En la pestaña "Seguridad", selecciona "DevOps_Group" y desmarca las casillas "Modificar" y "Escritura" en la columna Permitir (dejando únicamente "Lectura y ejecución" y "Lectura"). Pulsa Aplicar.',
      successReply:
        '¡Perfecto! Hemos probado con carlos_sre: podemos ejecutar Deploy-Prod.ps1 perfectamente pero si intentamos modificar su código nos devuelve Acceso Denegado. Cumplimiento ISO verificado.',
      initialState: {
        selectedResourceId: 'script_deploy',
        activeTab: 'security',
        selectedPrincipalId: 'devops_group',
        effectiveTestUserId: 'carlos_sre',
        resources: buildWinResourcesWithOverride(),
      },
      objectives: [
        {
          id: 'w4-rx',
          text: 'Mantener permiso efectivo de "Lectura y ejecución" para DevOps_Group (carlos_sre) en Deploy-Prod.ps1',
          check: (winEngine) => {
            const res = winEngine.state.resources.find((r) => r.id === 'script_deploy');
            if (!res) return false;
            const eff = winEngine.evaluateEffectiveAccess(res, 'carlos_sre', true);
            return Boolean(eff.read_exec?.granted && eff.read?.granted);
          },
        },
        {
          id: 'w4-nowrite',
          text: 'Revocar el permiso de "Escritura" y "Modificar" para DevOps_Group (carlos_sre) sobre Deploy-Prod.ps1',
          check: (winEngine) => {
            const res = winEngine.state.resources.find((r) => r.id === 'script_deploy');
            if (!res) return false;
            const eff = winEngine.evaluateEffectiveAccess(res, 'carlos_sre', true);
            return !eff.write?.granted && !eff.modify?.granted;
          },
        },
      ],
    },
    {
      id: 'win-tkt-5',
      ticketCode: 'INC-4099',
      os: 'windows',
      priority: 'Prioridad Media',
      senderName: 'PMO Corporativa',
      senderEmail: 'pmo@empresa.local',
      senderDept: 'Oficina de Proyectos (Ventas_Group + Finanzas_Group)',
      timestamp: 'Hoy, 12:05',
      subject: 'Habilitar carpeta compartida Proyectos_2026 para Ventas y Finanzas',
      affectedResource: 'C:\\Empresa\\Proyectos_2026 (\\\\WIN-SRV01\\Proyectos)',
      targetResourceId: 'proyectos_dir',
      message:
        'Hemos creado la carpeta C:\\Empresa\\Proyectos_2026 en el servidor, pero ni María (Ventas_Group) ni Juan (Finanzas_Group) pueden entrar por red ni guardar documentos. Necesitamos compartirla en red con permiso SMB "Cambiar" y dar permiso NTFS "Modificar" tanto a Ventas_Group como a Finanzas_Group.',
      hint:
        '1) En Proyectos_2026 abre la pestaña "Compartir", marca "Compartir esta carpeta" y selecciona "Cambiar". 2) En la pestaña "Seguridad", agrega a "Ventas_Group" y marca "Modificar", y luego agrega a "Finanzas_Group" y marca "Modificar". Pulsa Aplicar.',
      successReply:
        '¡Genial! Tanto el departamento de Ventas como el de Finanzas ya ven \\\\WIN-SRV01\\Proyectos y pueden subir documentación colaborativa.',
      initialState: {
        selectedResourceId: 'proyectos_dir',
        activeTab: 'sharing',
        selectedPrincipalId: 'admins',
        effectiveTestUserId: 'mgarcia',
        resources: buildWinResourcesWithOverride(),
      },
      objectives: [
        {
          id: 'w5-smb',
          text: 'Compartir C:\\Empresa\\Proyectos_2026 en red con permiso SMB "Cambiar" o "Control total"',
          check: (winEngine) => {
            const res = winEngine.state.resources.find((r) => r.id === 'proyectos_dir');
            return Boolean(res && res.shareEnabled && ['change', 'full'].includes(res.sharePermission));
          },
        },
        {
          id: 'w5-both-groups',
          text: 'Conceder acceso efectivo de Escritura/Modificar en Proyectos_2026 a María (Ventas) y Juan (Finanzas)',
          check: (winEngine) => {
            const res = winEngine.state.resources.find((r) => r.id === 'proyectos_dir');
            if (!res) return false;
            const effMaria = winEngine.evaluateEffectiveAccess(res, 'mgarcia', true);
            const effJuan = winEngine.evaluateEffectiveAccess(res, 'jdoe', true);
            return Boolean(effMaria.modify?.granted && effJuan.modify?.granted);
          },
        },
      ],
    },
  ],

  linux: [
    {
      id: 'lin-tkt-1',
      ticketCode: 'INC-5102',
      os: 'linux',
      priority: 'Prioridad Alta',
      senderName: 'Carlos Dev (dev1)',
      senderEmail: 'dev1@ubuntu-server',
      senderDept: 'Equipo Desarrollo Web',
      timestamp: 'Hoy, 09:42',
      subject: 'Problema con servidor web',
      affectedResource: '/var/www/html y /var/www/html/index.php',
      targetPath: '/var/www/html',
      message:
        "He subido los archivos como usuario 'dev1', pero el servidor Apache (www-data) no puede leerlos en /var/www/html. ¿Puedes arreglar los permisos y asegurar que los futuros archivos hereden el grupo correcto?",
      hint:
        'En la terminal ejecuta: sudo chown -R :www-data /var/www/html && sudo chmod 2775 /var/www/html && sudo chmod 640 /var/www/html/index.php (puedes comprobarlo cambiando a Apache con: su - www-data && cat /var/www/html/index.php).',
      successReply:
        '¡Perfecto! Apache (www-data) ya sirve index.php con HTTP 200 OK y cualquier archivo nuevo que subimos en /var/www/html hereda automáticamente el grupo www-data gracias al bit SGID.',
      initialState: {
        currentUser: 'alumno',
        cwd: '/var/www',
        selectedInspectPath: '/var/www/html',
        initialCommand: 'ls -la /var/www/html',
        fs: {
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
            mode: 0o0750,
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
            mode: 0o0600,
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
            content: '#!/usr/bin/env bash\necho "[OK] Despliegue completado."',
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
        },
      },
      objectives: [
        {
          id: 'l1-apache-read',
          text: 'Permitir que el usuario "www-data" (Apache) pueda atravesar /var/www/html y leer /var/www/html/index.php',
          check: (linuxEngine) => {
            const dirNode = linuxEngine.fs['/var/www/html'];
            const fileNode = linuxEngine.fs['/var/www/html/index.php'];
            if (!dirNode || !fileNode) return false;
            const prevUser = linuxEngine.currentUser;
            linuxEngine.currentUser = 'www-data';
            const canTraverse = linuxEngine.hasPermission(dirNode, 1) && linuxEngine.hasPermission(dirNode, 4);
            const canReadFile = linuxEngine.hasPermission(fileNode, 4);
            linuxEngine.currentUser = prevUser;
            return canTraverse && canReadFile;
          },
        },
        {
          id: 'l1-sgid',
          text: 'Configurar el grupo "www-data" y activar el bit SGID (g+s / 2000) en /var/www/html para heredar el grupo',
          check: (linuxEngine) => {
            const dirNode = linuxEngine.fs['/var/www/html'];
            return Boolean(dirNode && dirNode.group === 'www-data' && (dirNode.mode & 0o2000) !== 0);
          },
        },
      ],
    },
    {
      id: 'lin-tkt-2',
      ticketCode: 'INC-5108',
      os: 'linux',
      priority: 'Prioridad Alta',
      senderName: 'Juan Doe (jdoe)',
      senderEmail: 'jdoe@ubuntu-server',
      senderDept: 'Ingeniería de Releases',
      timestamp: 'Hoy, 10:18',
      subject: 'La ACL dice que tengo rwx en /var/www/html pero me da Permission denied',
      affectedResource: '/var/www/html (POSIX ACL mask)',
      targetPath: '/var/www/html',
      message:
        'Hola equipo de Sistemas. Me añadisteis en la ACL de /var/www/html con "user:jdoe:rwx", pero cuando hago "su - jdoe" e intento crear un archivo con "touch /var/www/html/release.txt" me sale Permission denied. Mirad qué pasa con getfacl.',
      hint:
        'Ejecuta: getfacl /var/www/html. Verás que aunque user:jdoe:rwx está definido, la máscara actual es mask::r-x (#effective:r-x). Actualiza la máscara ejecutando: sudo setfacl -m m::rwx /var/www/html',
      successReply:
        '¡Era la máscara de la ACL! Acabo de ejecutar touch /var/www/html/release.txt con mi usuario jdoe y ya me deja escribir sin errores.',
      initialState: {
        currentUser: 'alumno',
        cwd: '/var/www',
        selectedInspectPath: '/var/www/html',
        initialCommand: 'getfacl html',
        fs: {
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
            mode: 0o2775,
            owner: 'root',
            group: 'www-data',
            size: 4096,
            links: 2,
            mtime: 'Nov 12 10:00',
            acl: {
              users: { jdoe: 0o7 },
              groups: { devs: 0o7 },
              mask: 0o5,
            },
          },
          '/var/www/deploy.sh': {
            path: '/var/www/deploy.sh',
            name: 'deploy.sh',
            type: 'file',
            mode: 0o0750,
            owner: 'root',
            group: 'www-data',
            size: 2480,
            links: 1,
            mtime: 'Nov 12 09:45',
            content: '#!/usr/bin/env bash\necho "[OK] Despliegue completado."',
            acl: { users: {}, groups: {}, mask: null },
          },
        },
      },
      objectives: [
        {
          id: 'l2-mask',
          text: 'Actualizar la máscara POSIX ACL (mask::rwx) en /var/www/html para que "jdoe" tenga permiso efectivo de escritura',
          check: (linuxEngine) => {
            const dirNode = linuxEngine.fs['/var/www/html'];
            if (!dirNode) return false;
            const prevUser = linuxEngine.currentUser;
            linuxEngine.currentUser = 'jdoe';
            const canWrite = linuxEngine.hasPermission(dirNode, 2) && linuxEngine.hasPermission(dirNode, 1);
            linuxEngine.currentUser = prevUser;
            return canWrite;
          },
        },
      ],
    },
    {
      id: 'lin-tkt-3',
      ticketCode: 'INC-5115',
      os: 'linux',
      priority: 'Prioridad Media · Seguridad',
      senderName: 'Auditoría Interna',
      senderEmail: 'secops@ubuntu-server',
      senderDept: 'Ciberseguridad Linux',
      timestamp: 'Hoy, 11:05',
      subject: 'Usuarios borran archivos de otros en /var/www/compartido y script 0666',
      affectedResource: '/var/www/compartido y /var/www/deploy.sh',
      targetPath: '/var/www/compartido',
      message:
        'En la carpeta compartida /var/www/compartido (actualmente 0777) unos desarrolladores están borrando por accidente los archivos de otros compañeros. Además, el script /var/www/deploy.sh tiene permisos 0666. Protege /var/www/compartido con Sticky Bit (1777) y cierra deploy.sh a 0750 con propietario root:www-data.',
      hint:
        'Ejecuta: sudo chmod 1777 /var/www/compartido && sudo chown root:www-data /var/www/deploy.sh && sudo chmod 750 /var/www/deploy.sh',
      successReply:
        'Auditoría superada: el Sticky Bit (drwxrwxrwt) impide que un usuario elimine ficheros ajenos en /var/www/compartido y deploy.sh está blindado (0750).',
      initialState: {
        currentUser: 'alumno',
        cwd: '/var/www',
        selectedInspectPath: '/var/www/compartido',
        initialCommand: 'ls -l',
        fs: {
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
            content: '#!/usr/bin/env bash\necho "[OK] Despliegue completado."',
            acl: { users: {}, groups: {}, mask: null },
          },
        },
      },
      objectives: [
        {
          id: 'l3-sticky',
          text: 'Activar el Sticky Bit (modo 1777 / drwxrwxrwt) en /var/www/compartido',
          check: (linuxEngine) => {
            const node = linuxEngine.fs['/var/www/compartido'];
            return Boolean(node && node.mode === 0o1777);
          },
        },
        {
          id: 'l3-deploy',
          text: 'Asignar root:www-data y modo octal 0750 (-rwxr-x---) a /var/www/deploy.sh',
          check: (linuxEngine) => {
            const node = linuxEngine.fs['/var/www/deploy.sh'];
            return Boolean(node && node.owner === 'root' && node.group === 'www-data' && node.mode === 0o0750);
          },
        },
      ],
    },
    {
      id: 'lin-tkt-4',
      ticketCode: 'INC-5120',
      os: 'linux',
      priority: 'Prioridad Media · Operaciones NOC',
      senderName: 'Operador NOC (alumno)',
      senderEmail: 'noc@ubuntu-server',
      senderDept: 'Monitorización 24x7',
      timestamp: 'Hoy, 11:40',
      subject: 'Binario /var/www/bin_healthcheck requiere ejecutarse con EUID=root (SUID)',
      affectedResource: '/var/www/bin_healthcheck',
      targetPath: '/var/www/bin_healthcheck',
      message:
        'Hola. Necesitamos que cualquier operador pueda ejecutar el binario de diagnóstico /var/www/bin_healthcheck sin sudo, pero el binario debe correr con privilegios efectivos de root (EUID=root) para comprobar puertos privilegiados. Ahora mismo tiene modo 0755 y pertenece a alumno. Asígnalo a root:root y activa el bit SUID (4755).',
      hint:
        'Ejecuta: sudo chown root:root /var/www/bin_healthcheck && sudo chmod 4755 /var/www/bin_healthcheck (y pruébalo ejecutando: ./bin_healthcheck). El orden importa: chown borra el bit SUID, como hace el kernel, así que el chmod va después.',
      successReply:
        '¡Comprobado! Al lanzar ./bin_healthcheck ahora se ejecuta con [EUID=root] gracias al bit SUID (-rwsr-xr-x).',
      initialState: {
        currentUser: 'alumno',
        cwd: '/var/www',
        selectedInspectPath: '/var/www/bin_healthcheck',
        initialCommand: 'ls -l bin_healthcheck',
        fs: {
          '/var/www': {
            path: '/var/www',
            name: '.',
            type: 'dir',
            mode: 0o0755,
            owner: 'root',
            group: 'www-data',
            size: 4096,
            links: 3,
            mtime: 'Nov 12 10:00',
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
        },
      },
      objectives: [
        {
          id: 'l4-owner',
          text: 'Cambiar el propietario y grupo de /var/www/bin_healthcheck a root:root',
          check: (linuxEngine) => {
            const node = linuxEngine.fs['/var/www/bin_healthcheck'];
            return Boolean(node && node.owner === 'root' && node.group === 'root');
          },
        },
        {
          id: 'l4-suid',
          text: 'Activar el bit SUID (modo 4755 / -rwsr-xr-x) en /var/www/bin_healthcheck',
          check: (linuxEngine) => {
            const node = linuxEngine.fs['/var/www/bin_healthcheck'];
            return Boolean(node && node.mode === 0o4755);
          },
        },
      ],
    },
    {
      id: 'lin-tkt-5',
      ticketCode: 'INC-5125',
      os: 'linux',
      priority: 'Prioridad Crítica · Compliance',
      senderName: 'Elena Auditora (auditor)',
      senderEmail: 'auditor@ubuntu-server',
      senderDept: 'Auditoría Externa PCI-DSS',
      timestamp: 'Hoy, 12:15',
      subject: 'Exposición de credenciales en /var/www/config.php y acceso de auditoría ACL',
      affectedResource: '/var/www/config.php',
      targetPath: '/var/www/config.php',
      message:
        'El archivo /var/www/config.php contiene la contraseña de producción y tiene permisos 0644 (cualquier usuario en "other" puede leerlo). Debéis quitar todos los permisos a "other" (modo 0640 con propietario root:www-data) y conceder permiso de solo lectura exclusivamente a mi usuario "auditor" mediante una entrada ACL.',
      hint:
        'Ejecuta: sudo chown root:www-data /var/www/config.php && sudo chmod 640 /var/www/config.php && sudo setfacl -m u:auditor:r-- /var/www/config.php',
      successReply:
        '¡Excelente trabajo! Los usuarios normales como dev1 reciben Permission denied al hacer cat config.php, pero mi cuenta auditor y Apache (www-data) podemos leerlo gracias a la ACL.',
      initialState: {
        currentUser: 'alumno',
        cwd: '/var/www',
        selectedInspectPath: '/var/www/config.php',
        initialCommand: 'ls -l config.php',
        fs: {
          '/var/www': {
            path: '/var/www',
            name: '.',
            type: 'dir',
            mode: 0o0755,
            owner: 'root',
            group: 'www-data',
            size: 4096,
            links: 3,
            mtime: 'Nov 12 10:00',
            acl: { users: {}, groups: {}, mask: null },
          },
          '/var/www/config.php': {
            path: '/var/www/config.php',
            name: 'config.php',
            type: 'file',
            mode: 0o0644,
            owner: 'root',
            group: 'www-data',
            size: 1840,
            links: 1,
            mtime: 'Nov 12 09:30',
            content: "<?php\ndefine('DB_PASSWORD', 'Sup3rS3cr3t_2026');\n",
            acl: { users: {}, groups: {}, mask: null },
          },
        },
      },
      objectives: [
        {
          id: 'l5-no-other',
          text: 'Bloquear lectura para "otros" (other::---) asegurando que dev1 no pueda leer /var/www/config.php',
          check: (linuxEngine) => {
            const node = linuxEngine.fs['/var/www/config.php'];
            if (!node) return false;
            const prev = linuxEngine.currentUser;
            linuxEngine.currentUser = 'dev1';
            const devCanRead = linuxEngine.hasPermission(node, 4);
            linuxEngine.currentUser = prev;
            return !devCanRead && (node.mode & 0o007) === 0;
          },
        },
        {
          id: 'l5-auditor-acl',
          text: 'Conceder lectura efectiva a "auditor" (u:auditor:r--) y a "www-data" sin dar permiso de escritura',
          check: (linuxEngine) => {
            const node = linuxEngine.fs['/var/www/config.php'];
            if (!node) return false;
            const prev = linuxEngine.currentUser;
            linuxEngine.currentUser = 'auditor';
            const audRead = linuxEngine.hasPermission(node, 4);
            const audWrite = linuxEngine.hasPermission(node, 2);
            linuxEngine.currentUser = 'www-data';
            const wwwRead = linuxEngine.hasPermission(node, 4);
            linuxEngine.currentUser = prev;
            return audRead && !audWrite && wwwRead;
          },
        },
      ],
    },
  ],
};

export const CHALLENGES = TICKETS_JSON;

/**
 * Comprueba si el estado actual del motor Windows o Linux resuelve todos los objetivos del ticket
 */
export function verifyTicket(ticket, engineInstance) {
  const results = ticket.objectives.map((obj) => ({
    id: obj.id,
    text: obj.text,
    passed: Boolean(obj.check(engineInstance)),
  }));
  const resolved = results.every((r) => r.passed);
  return {
    resolved,
    results,
    replyMessage: resolved
      ? ticket.successReply
      : 'El usuario informa que la incidencia persiste. Revisa los requisitos técnicos pendientes abajo.',
  };
}
