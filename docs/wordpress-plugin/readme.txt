=== Hubs Authentication Integration ===
Contributors: spacemall-team
Tags: authentication, jwt, iframe, hubs, spacemall
Requires at least: 5.0
Tested up to: 6.4
Requires PHP: 7.4
Stable tag: 1.0.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Integración de autenticación entre WordPress y aplicaciones Hubs SpaceMall mediante JWT tokens y comunicación iframe.

== Description ==

**Hubs Authentication Integration** permite una integración segura entre tu sitio WordPress y aplicaciones Hubs de SpaceMall. Los usuarios pueden autenticarse en Hubs y acceder automáticamente a su cuenta WordPress sin necesidad de login manual.

### Características Principales

* **Auto-login automático**: Los usuarios logueados en Hubs acceden automáticamente a WordPress
* **JWT Token Security**: Autenticación segura mediante tokens JWT firmados
* **API REST completa**: Endpoints para login, verificación y gestión de tokens
* **Comunicación iframe**: Bridge JavaScript para comunicación bidireccional
* **Panel de administración**: Interface completa para configuración y testing
* **Logs detallados**: Sistema de logging para debugging y monitoreo
* **CORS configurado**: Headers de seguridad apropiados para iframe cross-domain

### Casos de Uso

* Tienda online con experiencia VR/AR en Hubs
* Portal de usuario unificado entre web y metaverso
* Sistema de cuentas integrado para aplicaciones híbridas

### Endpoints API

* `POST /wp-json/hubs/v1/login` - Autenticación con credenciales
* `POST /wp-json/hubs/v1/verify` - Verificación de token JWT
* `POST /wp-json/hubs/v1/generate-token` - Generar token para usuario actual
* `POST /wp-json/hubs/v1/logout` - Cerrar sesión

== Installation ==

### Instalación Automática

1. Ve a `Plugins > Añadir nuevo` en tu admin de WordPress
2. Busca "Hubs Authentication Integration"
3. Haz click en "Instalar ahora"
4. Activa el plugin

### Instalación Manual

1. Descarga el archivo zip del plugin
2. Ve a `Plugins > Añadir nuevo > Subir plugin`
3. Selecciona el archivo zip y haz click en "Instalar ahora"
4. Activa el plugin

### Configuración Inicial

1. Ve a `Ajustes > Hubs Auth` en tu panel de WordPress
2. Configura los **Orígenes permitidos** (URLs de tus aplicaciones Hubs)
3. Ajusta la **Duración del token** según tus necesidades
4. Habilita **Auto-login** si deseas login automático
5. Guarda la configuración

== Frequently Asked Questions ==

= ¿Cómo funciona la integración? =

Cuando un usuario se autentica en tu aplicación Hubs, el sistema genera un JWT token firmado. Al cargar WordPress en un iframe, este token se pasa via URL y el plugin verifica automáticamente al usuario, logueándolo sin intervención manual.

= ¿Es seguro pasar tokens en la URL? =

Los tokens JWT tienen una duración limitada (configurable) y se limpian de la URL automáticamente después del procesamiento. Además, solo funcionan con orígenes autorizados configurados en el plugin.

= ¿Qué pasa si el token expira? =

Los tokens expirados son rechazados automáticamente. El usuario deberá autenticarse nuevamente en la aplicación Hubs para generar un nuevo token válido.

= ¿Puedo personalizar la duración de los tokens? =

Sí, en la configuración del plugin puedes ajustar la duración desde 1 hora hasta 7 días (168 horas).

= ¿Funciona con cualquier tema de WordPress? =

El plugin es compatible con cualquier tema estándar de WordPress. La detección de login funciona mediante clases CSS estándar y la admin bar de WordPress.

= ¿Puedo usar esto para SSO (Single Sign-On)? =

Sí, este plugin implementa efectivamente un sistema SSO entre tu aplicación Hubs y WordPress mediante JWT tokens.

== Screenshots ==

1. Panel de configuración general
2. Configuración de seguridad y JWT
3. Herramientas de testing y debugging
4. Logs del sistema y estadísticas

== Changelog ==

= 1.0.0 =
* Versión inicial del plugin
* Implementación completa de JWT authentication
* API REST con endpoints de login/verify/logout
* Bridge JavaScript para comunicación iframe
* Panel de administración con testing tools
* Sistema de logging y debugging
* Configuración de CORS y seguridad
* Documentación completa

== Upgrade Notice ==

= 1.0.0 =
Primera versión del plugin. Instalación nueva recomendada.

== Technical Details ==

### Requisitos del Sistema

* WordPress 5.0 o superior
* PHP 7.4 o superior
* HTTPS recomendado para producción
* Aplicación Hubs compatible con JWT

### Estructura de JWT Token

```json
{
  "iss": "https://tu-sitio.com",
  "iat": 1640995200,
  "exp": 1641081600,
  "user_id": 123,
  "email": "usuario@ejemplo.com",
  "username": "usuario",
  "display_name": "Nombre Usuario",
  "roles": ["subscriber"]
}
```

### Headers CORS Configurados

* `Access-Control-Allow-Origin`: Orígenes autorizados
* `Access-Control-Allow-Credentials`: true
* `Content-Security-Policy`: frame-ancestors configurados
* `X-Frame-Options`: SAMEORIGIN para iframes autorizados

### Hooks y Filtros Disponibles

* `hubs_auth_before_login` - Ejecutado antes del login automático
* `hubs_auth_after_login` - Ejecutado después del login exitoso
* `hubs_auth_token_generated` - Ejecutado al generar un token
* `hubs_auth_token_verified` - Ejecutado al verificar un token

### Eventos JavaScript

* `HUBS_IFRAME_READY` - iframe listo para comunicación
* `HUBS_WORDPRESS_LOGIN_STATUS` - cambio de estado de login
* `HUBS_USER_DATA_RESPONSE` - datos del usuario actual

== Support ==

Para soporte técnico, reportar bugs o solicitar nuevas características:

* Email: soporte@spacemall.es
* Documentación: https://docs.spacemall.es/hubs-auth
* GitHub: https://github.com/spacemall/hubs-auth-integration

== Privacy Policy ==

Este plugin:
* No recolecta datos personales adicionales
* No envía información a servicios externos
* Solo procesa datos de autenticación localmente
* Respeta las políticas de privacidad de WordPress

== License ==

Este plugin está licenciado bajo GPL v2 o posterior.
Puedes redistribuir y/o modificar bajo los términos de la GNU General Public License.