<div align="center">

<a href="https://www.unfantasmaenelsistema.com/" target="_blank" rel="noopener noreferrer">
  <img src="./assets/aistudio/icono_81a3db5b.png" alt="Un Fantasma en el Sistema" width="125" style="height:auto;aspect-ratio:1/1;object-fit:contain;" />
</a>

# PermisosLab — Simulador Nativo de Permisos Windows Server & Ubuntu Server

**Laboratorio interactivo "Pixel-Perfect" para el aprendizaje práctico de permisos NTFS, Recursos Compartidos SMB, permisos UGO tradicionales, bits especiales (SUID/SGID/Sticky) y listas de control de acceso POSIX ACL (`getfacl` / `setfacl`).**

Desarrollado para **[Un Fantasma en el Sistema](https://www.unfantasmaenelsistema.com/)** · 100 % estático · Sin instalación

[**▶ Abrir PermisosLab en vivo**](https://unfantasmaenelsistema.github.io/PermisosLab/)

[![En vivo](https://img.shields.io/badge/En_vivo-GitHub_Pages-0f172a?style=for-the-badge)](https://unfantasmaenelsistema.github.io/PermisosLab/)
[![Licencia MIT](https://img.shields.io/badge/Licencia-MIT-64748b?style=for-the-badge)](LICENSE)
[![Sitio Web Oficial](https://img.shields.io/badge/Web_Oficial-unfantasmaenelsistema.com-0284c7?style=for-the-badge)](https://www.unfantasmaenelsistema.com/)
[![Windows Server 2022](https://img.shields.io/badge/Windows_Server_2022-NTFS_%E2%88%A9_SMB_Share-0078d7?style=for-the-badge)](#1-entorno-windows-server-ntfs-y-smb-share)
[![Ubuntu Server 24.04 LTS](https://img.shields.io/badge/Ubuntu_24.04_LTS-Bash_%C2%B7_UGO_%C2%B7_POSIX_ACL-e95420?style=for-the-badge)](#2-entorno-ubuntu-server-bash-ugo-y-posix-acl)
[![Help Desk 10 Retos](https://img.shields.io/badge/Help_Desk-10_Tickets_Reales-059669?style=for-the-badge)](#3-modo-retos-sistema-de-tickets-help-desk)

</div>

---

## Tabla de Contenidos

1. [Descripción del Proyecto](#descripción-del-proyecto)
2. [Capturas del Laboratorio](#capturas-del-laboratorio)
3. [Instrucciones de Instalación y Despliegue](#instrucciones-de-instalación-y-despliegue)
4. [Guía de Uso del Laboratorio (Windows y Linux)](#guía-de-uso-del-laboratorio-windows-y-linux)
   - [1. Entorno Windows Server (NTFS y SMB Share)](#1-entorno-windows-server-ntfs-y-smb-share)
   - [2. Entorno Ubuntu Server (Bash, UGO y POSIX ACL)](#2-entorno-ubuntu-server-bash-ugo-y-posix-acl)
   - [3. Modo Retos: Sistema de Tickets Help Desk](#3-modo-retos-sistema-de-tickets-help-desk)
5. [Fidelidad técnica de los motores](#fidelidad-técnica-de-los-motores)
6. [Novedades de la versión 2](#novedades-de-la-versión-2)
7. [Tecnologías Utilizadas](#tecnologías-utilizadas)
8. [Licencia](#licencia)
9. [Enlaces y Créditos — Un Fantasma en el Sistema](#enlaces-y-créditos--un-fantasma-en-el-sistema)

---

## Descripción del Proyecto

**PermisosLab** es un simulador educativo de administración de sistemas y ciberseguridad diseñado con fidelidad visual **Pixel-Perfect** para que estudiantes y profesionales de TI practiquen la resolución de incidencias reales de control de acceso sin necesidad de levantar máquinas virtuales pesadas.

El proyecto aborda los dos estándares de permisos más utilizados en infraestructuras empresariales:

- **Microsoft Windows Server (NTFS + SMB Share)**: Réplica exacta de los cuadros de diálogo nativos Win32 de Windows 10/11 y Windows Server 2022 (*Propiedades de carpeta*, pestañas *Compartir* y *Seguridad*, modal de *Configuración de seguridad avanzada*, gestión de *Herencia* y cálculo de *Acceso efectivo*).
- **GNU/Linux Ubuntu Server 24.04 LTS (UGO + SUID/SGID/Sticky + POSIX ACL)**: Réplica de una consola **GNOME Terminal** interactiva (`alumno@ubuntu-server:/var/www$`) combinada con una matriz visual de 12 bits POSIX sincronizada en tiempo real.
- **Aprendizaje Basado en Problemas Reales (Help Desk)**: Incluye una bandeja de entrada con **10 tickets de soporte técnico** (5 de Windows y 5 de Linux) enviados por usuarios de distintos departamentos (*Ventas*, *Finanzas*, *RRHH*, *DevOps*, *Desarrollo Web*, *Auditoría PCI-DSS* y *NOC*).

---

## Capturas del Laboratorio

Capturas reales de la aplicación.

### Selector de entorno inicial (pantalla de login doble)
![Selector de entorno Windows Server / Ubuntu Server](./docs/screenshots/01-selector.png)

### Windows Server: Propiedades, Compartir y Seguridad (ticket INC-4085)
![Propiedades NTFS y simulador de acceso en red](./docs/screenshots/02-windows-ntfs-smb.png)

### Windows Server: Configuración de seguridad avanzada → Acceso efectivo
La denegación de *Escritura* a `Users` anula también *Modificar* y *Control total* para `jdoe`, aunque `Finanzas_Group` los tenga permitidos.

![Acceso efectivo con permisos compuestos](./docs/screenshots/03-windows-acceso-efectivo.png)

### Ubuntu Server: terminal Bash, `getfacl` y matriz de 12 bits POSIX (ticket INC-5108)
![Terminal Ubuntu con máscara ACL y matriz POSIX](./docs/screenshots/04-ubuntu-acl-mascara.png)

### Help Desk: ticket verificado y cerrado
<img src="./docs/screenshots/06-helpdesk-ticket-cerrado.png" alt="Ticket del Help Desk cerrado" width="420" />

### Versión móvil
<img src="./docs/screenshots/07-movil-ubuntu.png" alt="PermisosLab en un móvil" width="300" />

---

## Instrucciones de Instalación y Despliegue

El proyecto es **100 % estático** (HTML5 + CSS3 + módulos ES nativos), sin dependencias ni paso de compilación.

### 1. Usarlo en línea

Abre **[unfantasmaenelsistema.github.io/PermisosLab](https://unfantasmaenelsistema.github.io/PermisosLab/)**. El progreso de los tickets se guarda en tu navegador.

### 2. Ejecutar en local

```bash
git clone https://github.com/unfantasmaenelsistema/PermisosLab.git
cd PermisosLab
python3 -m http.server 8080
```

Abre `http://localhost:8080`. Hace falta un servidor HTTP (aunque sea el de Python o la extensión *Live Server* de VS Code) porque el navegador no carga módulos JavaScript desde `file://`.

### 3. Publicar tu propia copia en GitHub Pages

El repositorio incluye el workflow [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml), que publica solo los archivos de la aplicación (`index.html`, `README.md`, `css/`, `js/` y `assets/`):

1. Haz un *fork* del repositorio.
2. En **Settings → Pages → Build and deployment → Source**, elige **GitHub Actions**.
3. Cada `push` a `main` desplegará la web en `https://<tu-usuario>.github.io/PermisosLab/`.

---

## Guía de Uso del Laboratorio (Windows y Linux)

Al iniciar **PermisosLab**, verás la pantalla de login doble que te permite entrar a **Windows Server** o a **Ubuntu Server**, además de la barra superior desde la que puedes cambiar de sistema en cualquier momento o abrir el modal **Guía & Chuleta**.

---

### 1. Entorno Windows Server (NTFS y SMB Share)

En el escritorio de Windows Server dispones de tres componentes interactivos:

1. **Explorador de Archivos y Simulador de Acceso en Vivo**:
   - Selecciona cualquiera de los 5 recursos del servidor (`Presupuesto_Ventas.xlsx`, `Finanzas`, `Nominas_2026.xlsx`, `Deploy-Prod.ps1` o `Proyectos_2026`).
   - En el recuadro inferior **Simulador de Acceso en Red**, elige un usuario del dominio (`mgarcia`, `jdoe`, `carlos_sre`, `admins`, `guest`) y pulsa **Probar Leer** o **Probar Guardar** para comprobar si el sistema devuelve `[Win32 OK]` o `[Error 0x80070005: Acceso denegado]`.
2. **Ventana `"Propiedades de [Recurso]"`**:
   - **Pestaña Compartir**: Activa o desactiva el recurso compartido SMB (`\\WIN-SRV01\...`) y define los permisos de red (*Leer*, *Cambiar*, *Control total*).
   - **Pestaña Seguridad**: Agrega o quita usuarios/grupos en la ACL NTFS y marca las casillas **Permitir** o **Denegar** (*Control total*, *Modificar*, *Lectura y ejecución*, *Lectura*, *Escritura*).
   - En la parte inferior verás actualizado en tiempo real el comando **`icacls`** equivalente (válido en CMD y en PowerShell: `/grant "EMPRESA\Ventas_Group:(M)"`).
   - Como en Windows, los cambios quedan **pendientes hasta pulsar *Aplicar* o *Aceptar***; *Cancelar* descarta lo que no hayas aplicado. El Help Desk no cierra un ticket con cambios sin aplicar.
3. **Ventana `"Configuración de seguridad avanzada"` (Botón *Opciones avanzadas*)**:
   - **Pestaña Permisos**: Permite **Deshabilitar herencia** (*Convertir los permisos heredados en permisos explícitos* o *Quitar todos los permisos heredados*) o volver a habilitarla, lo que restaura las ACE de la carpeta contenedora.
   - **Pestaña Acceso efectivo**: Calcula paso a paso el permiso final aplicando las 3 reglas de oro de Windows:
     $$\text{Permiso Efectivo} = \left(\bigcup \text{Grupos del Usuario} \setminus \text{Denegaciones Explícitas}\right)_{\text{NTFS}} \cap \text{Permiso Share}_{\text{SMB}}$$

---

### 2. Entorno Ubuntu Server (Bash, UGO y POSIX ACL)

En el escritorio de Ubuntu Server dispones de una consola **GNOME Terminal** interactiva situada en `/var/www` y un panel inferior con la **Matriz de 12 bits POSIX**:

#### Comandos soportados en la terminal Bash
| Comando | Ejemplos de uso en el simulador | Descripción |
| :--- | :--- | :--- |
| `ls` | `ls -l`, `ls -la /var/www/html`, `ls -ld html` | Lista permisos UGO, bits SUID/SGID/Sticky y el sufijo `+` cuando existen ACLs extendidas. |
| `getfacl` | `getfacl html`, `getfacl config.php` | Muestra propietario, `# flags:` (`s`/`t`), entradas `user:`, `group:`, `mask::` y el cálculo `#effective:`. |
| `setfacl` | `sudo setfacl -m u:jdoe:rwx html`<br>`sudo setfacl -m m::rwx html`<br>`sudo setfacl -x u:jdoe html`<br>`sudo setfacl -b html` | Añade/modifica entradas ACL (`-m`), actualiza la máscara (`m::`), elimina una entrada (`-x`) o borra toda la ACL (`-b`). |
| `chmod` | `sudo chmod 2775 html`<br>`sudo chmod 1777 compartido`<br>`sudo chmod 4755 bin_healthcheck`<br>`sudo chmod u+s,g+s,o-rwx archivo` | Cambia permisos en modo octal (3 o 4 dígitos) o simbólico (`u`, `g`, `o`, `a`, `+`, `-`, `=`, `r`, `w`, `x`, `X`, `s`, `t`), con soporte recursivo `-R`. |
| `chown` / `chgrp` | `sudo chown -R :www-data /var/www/html`<br>`sudo chown root:www-data deploy.sh` | Modifica el propietario y/o grupo del inodo (soporta `-R`). |
| `su` | `su - jdoe`, `su - www-data`, `su - auditor`, `su - alumno` | Cambia de usuario activo en la sesión de terminal para poner a prueba los permisos reales. |
| `touch` / `mkdir` | `touch /var/www/html/release.txt`<br>`mkdir /var/www/html/uploads` | Crea archivos o carpetas evaluando permisos reales de escritura/ejecución y heredando el grupo si el directorio padre tiene activo el bit **SGID (`2000`)**. |
| `rm` / `cat` | `rm /var/www/compartido/fichero`<br>`rm -r /var/www/html/uploads`<br>`cat /var/www/config.php` | Prueba la lectura de archivos o el borrado verificando la protección del **Sticky Bit (`1000`)**. Los directorios solo se borran con `-r`. |
| `&&` / `\|\|` / `;` | `su - www-data && cat html/index.php`<br>`cat noexiste \|\| whoami` | Encadena comandos con la lógica de bash: `&&` solo continúa si el anterior funciona. |
| `./binario` | `./bin_healthcheck` | Ejecuta un archivo comprobando permisos `x` y mostrando `[EUID=... EGID=...]` según los bits **SUID/SGID**. |
| `id` / `whoami` / `umask` | `id`, `groups`, `whoami`, `umask 027` | Consulta la identidad del usuario actual, sus grupos o la máscara de creación `umask`. |

---

### 3. Modo Retos: Sistema de Tickets Help Desk

En el panel lateral derecho se encuentra el cliente **Help Desk** con **10 tickets reales** (5 para Windows Server y 5 para Ubuntu Server):

| Código | Sistema | Usuario Remitente | Resumen del Problema | Solución Técnica Esperada |
| :--- | :--- | :--- | :--- | :--- |
| **INC-4081** | Windows | María García (`Ventas_Group`) | Puede leer `Presupuesto_Ventas.xlsx` por red, pero le da *Acceso Denegado* al guardar. | Subir Share SMB a **Cambiar** y conceder **Modificar** a `Ventas_Group` en NTFS. |
| **INC-4085** | Windows | Juan Doe (`Finanzas_Group`) | Tiene permiso *Modificar* en `Finanzas_Group`, pero no puede escribir en `C:\Empresa\Finanzas`. | Eliminar la casilla **Denegar Escritura** asignada al grupo `Users`. |
| **INC-4090** | Windows | Dirección RRHH (`RRHH_Group`) | Cualquier empleado del dominio puede abrir y leer `Nominas_2026.xlsx`. | **Deshabilitar herencia NTFS**, quitar a `Users` y dar **Modificar** a `RRHH_Group`. |
| **INC-4094** | Windows | Carlos SRE (`DevOps_Group`) | Blindar `Deploy-Prod.ps1` para que DevOps pueda ejecutarlo pero nunca modificarlo. | Dejar a `DevOps_Group` solo con **Lectura y ejecución** (desmarcando *Modificar* y *Escritura*). |
| **INC-4099** | Windows | PMO Corporativa | Compartir `Proyectos_2026` en red para los departamentos de Ventas y Finanzas. | Activar **Compartir SMB (Cambiar)** y dar **Modificar** en NTFS a `Ventas_Group` y `Finanzas_Group`. |
| **INC-5102** | Linux | Carlos Dev (`dev1`) | Apache (`www-data`) no puede leer `/var/www/html/index.php` ni heredar grupo. | `sudo chown -R :www-data /var/www/html && sudo chmod 2775 /var/www/html && sudo chmod 640 /var/www/html/index.php` |
| **INC-5108** | Linux | Juan Doe (`jdoe`) | Tiene `user:jdoe:rwx` en la ACL de `/var/www/html`, pero `touch` devuelve *Permission denied*. | Desbloquear la máscara ACL: `sudo setfacl -m m::rwx /var/www/html` |
| **INC-5115** | Linux | Auditoría Interna | Usuarios borran archivos de otros en `/var/www/compartido` y `deploy.sh` tiene modo `0666`. | `sudo chmod 1777 /var/www/compartido && sudo chown root:www-data /var/www/deploy.sh && sudo chmod 750 /var/www/deploy.sh` |
| **INC-5120** | Linux | Operador NOC (`alumno`) | El binario `/var/www/bin_healthcheck` debe correr con `EUID=root` sin usar `sudo`. | `sudo chown root:root /var/www/bin_healthcheck && sudo chmod 4755 /var/www/bin_healthcheck` (en este orden: `chown` borra el bit SUID) |
| **INC-5125** | Linux | Elena Auditora (`auditor`) | Ocultar `/var/www/config.php` a `other` y dar lectura puntual a `auditor` con ACL. | `sudo chown root:www-data /var/www/config.php && sudo chmod 640 /var/www/config.php && sudo setfacl -m u:auditor:r-- /var/www/config.php` |

---

## Fidelidad técnica de los motores

Los motores reproducen las reglas reales de cada sistema para que lo que se aprende en el simulador valga en un servidor de verdad.

**Windows (`js/windowsEngine.js`)**
- Los permisos básicos se descomponen en derechos atómicos (leer, ejecutar, escribir, eliminar, cambiar permisos). *Modificar* o *Control total* solo son efectivos si lo son todos sus derechos, así que **denegar *Escritura* anula también *Modificar* y *Control total***.
- Precedencia: Deny explícito > Allow explícito > Deny heredado > Allow heredado.
- El recurso compartido se evalúa con las entradas reales de la ACL del Share (incluidas las denegaciones) y se intersecta con NTFS.

**Linux (`js/linuxEngine.js`)**
- Con ACL extendida, `group::` y `mask::` son entradas distintas: **los bits de grupo que muestran `ls -l` y la matriz son la máscara**, y `chmod g…` cambia la máscara, no `group::`.
- `chmod` octal sigue a GNU coreutils: en archivos fija el modo exacto; en directorios conserva SUID/SGID salvo con 5 dígitos (`00755`).
- `chown` y `chgrp` borran SUID/SGID en archivos, como el kernel. Solo `root` cambia el propietario, y el dueño solo puede pasar el archivo a uno de sus grupos.
- Para acceder a una ruta hace falta permiso de búsqueda (`x`) en cada directorio intermedio.
- La matriz POSIX no se salta los permisos: escribe en la terminal el `chmod`/`chown` equivalente y lo ejecuta como el usuario activo (con `sudo` si es administrador).

---

## Novedades de la versión 2

- **Publicada en GitHub Pages** dentro de la organización, con workflow que despliega solo la aplicación y licencia MIT.
- **Windows:** permisos compuestos coherentes con las denegaciones; *Deny Cambiar* en el recurso compartido ya no se ignora; rehabilitar la herencia restaura las ACE heredadas; comando `icacls` corregido (*Denegar Lectura* ya no sale como `(F)` y *Permitir solo Escritura* ya no sale como `(R)`); *Aplicar*/*Cancelar* funcionan como en Windows.
- **Linux:** modelo `group::`/`mask::` separado; `ls -l <archivo>` muestra el nombre; reglas GNU de `chmod`; `chown` limpia SUID/SGID; comprobación de recorrido de directorios; `rm` de directorios solo con `-r`; `&&`, `||`, `;` y rutas con `..`.
- **Help Desk:** un ticket cuenta como resuelto al verificarlo y el progreso se guarda en el navegador (con opción de reiniciarlo).
- **Interfaz:** diseño adaptable a móvil, botones rápidos que actúan sobre el elemento seleccionado, cierre de ventanas con Escape y capturas reales en este README.
- Eliminados los restos de la plantilla de Google AI Studio (React, Vite, Gemini), que la aplicación no usaba.

---

## Tecnologías Utilizadas

- **HTML5 semántico**: estructura accesible con diálogos, pestañas y consola interactiva.
- **CSS3 nativo (sin dependencias externas)**:
  - `css/windows.css`: réplica visual de controles Win32 (Windows 10/11 / Server 2022), tablas ACE y casillas nativas.
  - `css/linux.css`: estética **Ubuntu Yaru Dark** y **GNOME Terminal** (`#300a24` / `#0c0c0c`), tipografía `Ubuntu Mono` y colores GNU `LS_COLORS`.
  - `css/main.css`: selector de sistema, cliente Help Desk, guía teórica y diseño adaptable.
- **JavaScript ES6+ (módulos nativos, sin frameworks)**:
  - `js/windowsEngine.js`: motor NTFS + SMB con derechos atómicos, herencia, precedencia de ACE y generación de `icacls`.
  - `js/linuxEngine.js`: sistema de archivos en memoria e intérprete Bash con UGO, SUID/SGID/Sticky y POSIX.1e ACL (`mask::` y `#effective`).
  - `js/challenges.js`: los 10 tickets y sus comprobaciones en vivo.
  - `js/main.js`: interfaz, Help Desk y progreso guardado.
- **GitHub Actions + GitHub Pages** para el despliegue.

---

## Licencia

Distribuido bajo licencia **MIT**. Consulta el archivo [LICENSE](LICENSE).

---

## Enlaces y Créditos — Un Fantasma en el Sistema

<div align="center">

<a href="https://www.unfantasmaenelsistema.com/" target="_blank" rel="noopener noreferrer">
  <img src="./assets/aistudio/icono_81a3db5b.png" alt="Logo Un Fantasma en el Sistema" width="96" style="height:auto;aspect-ratio:1/1;object-fit:contain;" />
</a>

### [Un Fantasma en el Sistema](https://www.unfantasmaenelsistema.com/)
**Blog y plataforma de recursos sobre Administración de Sistemas, Ciberseguridad, Redes, Windows Server y GNU/Linux.**

🔗 **Web Oficial:** [https://www.unfantasmaenelsistema.com/](https://www.unfantasmaenelsistema.com/)

</div>
