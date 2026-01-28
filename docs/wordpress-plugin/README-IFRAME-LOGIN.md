# WordPress Iframe Login - Implementación Completa

## 📋 Resumen

Esta implementación permite que los usuarios hagan login en Hubs usando el sistema nativo de WordPress a través de un iframe, sin problemas de CORS o CSP.

## 🎯 Cómo Funciona

```
┌─────────────────────────────────────────┐
│         Hubs Client (React)             │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │  WordPressIframeLoginModal        │ │
│  │                                   │ │
│  │  ┌─────────────────────────────┐ │ │
│  │  │  <iframe>                   │ │ │
│  │  │  WordPress Login Page       │ │ │
│  │  │  (wp-login.php)             │ │ │
│  │  └─────────────────────────────┘ │ │
│  │                                   │ │
│  │  Listener PostMessage ◄───────────┼─┼────┐
│  └───────────────────────────────────┘ │    │
│                                         │    │
└─────────────────────────────────────────┘    │
                                               │
                    PostMessage                │
                                               │
┌─────────────────────────────────────────┐    │
│         WordPress (PHP + JS)            │    │
│                                         │    │
│  Plugin: hubs-auth-integration.php      │    │
│  Script: iframe-postmessage.js ─────────┼────┘
│                                         │
│  - Detecta login/logout                 │
│  - Envía mensajes PostMessage           │
│  - Genera JWT token                     │
└─────────────────────────────────────────┘
```

## 📁 Archivos Modificados/Creados

### Frontend (Hubs Client)

1. **`src/react-components/auth/WordPressIframeLoginModal.js`** ✅
   - Nuevo componente modal con iframe
   - Listener de PostMessage
   - Manejo de estado de loading

2. **`src/react-components/auth/WordPressLoginModal.scss`** ✅
   - Estilos para iframe container
   - Loading spinner
   - Footer del iframe

3. **`src/react-components/ui-root.js`** ✅
   - Usa `WordPressIframeLoginModal` en lugar del modal anterior
   - Renderiza a través de `this.state.dialog`

### Backend (WordPress Plugin)

1. **`iframe-postmessage.js`** ✅
   - Detecta si está en iframe
   - Escucha cambios de login/logout
   - Envía mensajes PostMessage al parent
   - Polling cada 500ms para detectar cambios

2. **`hubs-auth-integration.php`** ✅
   - Carga `iframe-postmessage.js`
   - Inyecta `window.hubsUserData` con info del usuario
   - Configuración de origenes permitidos

## 🔧 Instalación y Configuración

### Paso 1: Subir archivos del plugin a WordPress

```bash
# Copiar archivos al directorio del plugin
wp-content/plugins/hubs-auth-integration/
├── hubs-auth-integration.php  (modificado)
├── iframe-postmessage.js      (nuevo)
├── admin-page.php
├── readme.txt
└── test-endpoints.php
```

### Paso 2: Activar el plugin

1. Ve a **WordPress Admin → Plugins**
2. Activa **"Hubs Authentication Integration"**

### Paso 3: Configurar orígenes permitidos

1. Ve a **Ajustes → Hubs Auth**
2. En **"Orígenes Permitidos"**, agrega (uno por línea):
   ```
   https://myspacemall.com
   https://hubs.myspacemall.com
   http://localhost:8080
   ```

### Paso 4: Build del cliente Hubs

```bash
cd /path/to/hubs-client/hubs
npm run build
```

### Paso 5: Probar

1. Abre Hubs en tu navegador
2. Click en **"Iniciar Sesión"**
3. Debería abrir un modal con el login de WordPress
4. Inicia sesión con tus credenciales de WordPress
5. El modal debería detectar el login y cerrar automáticamente

## 🔍 Debugging

### En el navegador (Consola de Hubs)

Busca estos logs:
```javascript
[WP Iframe] Modal montado, configurando listener
[WP Iframe] Iframe cargado
[WP Iframe] Mensaje recibido: { type: 'HUBS_IFRAME_READY', ... }
[WP Iframe] Login exitoso recibido: { user: {...} }
[WP Iframe] Token generado: { token: '...', user: {...} }
```

### En WordPress (Consola del iframe)

Busca estos logs:
```javascript
[WP PostMessage] Inicializando PostMessage bridge
[WP PostMessage] En iframe: true
[WP PostMessage] Datos de usuario: { logged_in: true, ... }
[WP PostMessage] Enviando mensaje a parent: HUBS_WORDPRESS_LOGIN_SUCCESS
```

## 🚨 Troubleshooting

### El iframe no carga

**Problema:** CSP bloqueando
**Solución:** Verificar que `frame-src spacemall.es` esté en el CSP de Reticulum

### El modal no se puede interactuar

**Problema:** z-index o posicionamiento
**Solución:** Ya corregido - ahora usa `this.state.dialog`

### No se detecta el login

**Problema:** PostMessage no funciona
**Solución:**
1. Verificar consola de ambos lados (Hubs e iframe)
2. Confirmar que `window.hubsUserData` existe en WordPress
3. Verificar que el script `iframe-postmessage.js` se cargó

### El token no se genera

**Problema:** Endpoint de WordPress no responde
**Solución:**
1. Probar endpoint manualmente: `https://spacemall.es/wp-json/hubs/v1/generate-token`
2. Verificar que el plugin esté activado
3. Revisar logs de PHP en WordPress

## 🎉 Ventajas de este Enfoque

✅ **Sin problemas CORS** - El iframe ya está permitido en CSP
✅ **UX familiar** - Usuario ve el login nativo de WordPress
✅ **Seguro** - Credenciales nunca pasan por Hubs
✅ **Simple** - No requiere modificar Reticulum
✅ **Confiable** - PostMessage es estándar del navegador

## 📊 Flujo Completo

1. Usuario click "Iniciar Sesión" en Hubs
2. Hubs abre `WordPressIframeLoginModal`
3. Modal carga `https://spacemall.es/wp-login.php?hubs_iframe=1`
4. WordPress carga página de login + `iframe-postmessage.js`
5. Script detecta que está en iframe
6. Envía mensaje `HUBS_IFRAME_READY` a Hubs
7. Usuario ingresa credenciales en WordPress
8. WordPress hace login normalmente
9. Script detecta cambio de estado (polling cada 500ms)
10. Script envía `HUBS_WORDPRESS_LOGIN_SUCCESS` con datos del usuario
11. Hubs recibe mensaje
12. Hubs llama `wpAuthChannel.generateTokenFromWordPress()`
13. WordPress genera y retorna JWT token
14. Hubs guarda token y cierra modal
15. Usuario queda logueado ✅

## 📝 Próximas Mejoras

- [ ] Agregar soporte para "Remember Me"
- [ ] Mejorar UI del loading spinner
- [ ] Agregar retry automático si falla
- [ ] Cachear token en localStorage
- [ ] Agregar timeout para login (ej: 5 minutos)

## 🆘 Soporte

Si tienes problemas:
1. Revisa los logs en consola (navegador y WordPress)
2. Verifica que CSP incluye `frame-src spacemall.es`
3. Confirma que el plugin está activado
4. Prueba el endpoint manualmente
5. Revisa que los orígenes permitidos estén configurados

---

**Última actualización:** 2026-01-11
**Versión:** 1.0.0
