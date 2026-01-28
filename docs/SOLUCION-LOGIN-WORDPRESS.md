# Solución: Login WordPress con Token Directo

**Fecha:** 2026-01-12
**Problema:** El iframe se loguea pero Hubs muestra error de autenticación

## 🎯 Problema Identificado

El flujo original tenía dos intentos de generar el token:
1. ✅ WordPress generaba el token **dentro del iframe** (funcionaba)
2. ❌ Hubs intentaba generar **otro token** desde su dominio (fallaba por cookies)

Además, la detección de login dependía de `window.hubsUserData` que se inyectaba al cargar la página y nunca se actualizaba después del login.

## ✅ Solución Implementada: Opción 1 - Token Directo

### Cambios Realizados

#### 1. **Frontend Hubs: `WordPressIframeLoginModal.js`**

**Antes:**
```javascript
// Intentaba dos métodos:
if (token) {
  // Usar token del PostMessage
} else {
  // Intentar generar desde Hubs (FALLABA)
  const result = await wpAuthChannel.generateTokenFromWordPress();
}
```

**Después:**
```javascript
// Solo usa el token del PostMessage (DEBE venir)
if (!data.token) {
  throw new Error('Token no recibido. Por favor intenta de nuevo.');
}
await wpAuthChannel.handleAuthCredentials(data.user.email, data.token);
```

**Mejoras:**
- ✅ Eliminado fallback que causaba el error
- ✅ Requiere que el token venga en PostMessage
- ✅ Logging mejorado con emojis para debugging
- ✅ Mensajes de error más claros

#### 2. **WordPress Plugin: `iframe-postmessage.js`**

**Cambio Principal: Detección Dinámica de Login**

**Antes:**
```javascript
// Solo verificaba window.hubsUserData (estático)
const currentUser = getCurrentUserInfo();
const currentLoginState = currentUser?.logged_in || false;
```

**Después:**
```javascript
// Cada 2.5 segundos verifica con el servidor
if (checkCount % 5 === 0) {
  const serverStatus = await checkCurrentLoginStatus();
  currentLoginState = serverStatus.logged_in;
  // Actualiza window.hubsUserData con info fresca
}
```

**Nueva Función: `checkCurrentLoginStatus()`**
```javascript
async function checkCurrentLoginStatus() {
  // Llama a /wp-json/hubs/v1/generate-token
  // Si responde OK, el usuario está logueado
  // Actualiza window.hubsUserData con la info más reciente
}
```

**Mejoras:**
- ✅ Detecta login incluso sin recarga de página
- ✅ Actualiza `hubsUserData` dinámicamente
- ✅ Logging exhaustivo con emojis
- ✅ Manejo de errores con opción de retry
- ✅ Validación de token no vacío

## 📋 Flujo Actualizado

1. Usuario hace click en "Iniciar Sesión" en Hubs
2. Se abre modal con iframe de WordPress
3. Usuario ingresa credenciales
4. WordPress procesa el login
5. **Script detecta el login consultando API cada 2.5s**
6. Script actualiza `window.hubsUserData` con info fresca
7. Script genera token JWT vía `/wp-json/hubs/v1/generate-token`
8. **Valida que el token no esté vacío**
9. Envía PostMessage a Hubs con `{ user, token }`
10. **Hubs recibe y valida que el token existe**
11. Hubs guarda credenciales vía `handleAuthCredentials()`
12. Modal se cierra y usuario queda autenticado ✅

## 🔍 Debugging

### En la Consola del Navegador (Hubs)
Buscar estos logs:
```
[WP Iframe] Login exitoso recibido: {...}
[WP Iframe] Token presente: true
[WP Iframe] ✅ Token recibido correctamente
[WP Iframe] ✅ Credenciales guardadas en store
[WP Iframe] ✅ Login completado exitosamente
```

### En la Consola del Iframe (WordPress)
Buscar estos logs:
```
[WP PostMessage] ✅ Usuario logueado detectado: {...}
[WP PostMessage] 🔄 Generando token JWT...
[WP PostMessage] 🔗 Llamando a: https://spacemall.es/wp-json/hubs/v1/generate-token
[WP PostMessage] 📡 Response status: 200
[WP PostMessage] ✅ Token generado exitosamente: eyJ0eXAiOiJKV1Qi...
[WP PostMessage] 📤 Enviando login success con token a Hubs
```

### Si el Token NO Viene
```
[WP Iframe] ❌ Error: Token no recibido en PostMessage
Error al procesar el login: Token no recibido. Por favor intenta de nuevo.
```

### Si Falla la Generación en WordPress
```
[WP PostMessage] ❌ Error crítico generando token: Error HTTP 401: ...
[Popup] No se pudo generar el token de autenticación.
¿Deseas intentar de nuevo?
```

## 🚀 Implementación

### Paso 1: Actualizar Archivos de WordPress

Copiar estos archivos al plugin en el servidor:

```bash
wp-content/plugins/hubs-auth-integration/
├── iframe-postmessage.js  # ← Actualizar este archivo
└── hubs-auth-integration.php
```

### Paso 2: Rebuild Frontend Hubs

```bash
cd /path/to/hubs-client/hubs
npm run build
```

### Paso 3: Deploy

1. Deploy del build de Hubs al servidor
2. Verificar que el plugin WordPress esté activado
3. Verificar configuración de orígenes permitidos en WordPress

### Paso 4: Testing

1. Abrir Hubs
2. Click en "Iniciar Sesión"
3. Ingresar credenciales de WordPress
4. **Abrir consola del navegador (F12)**
5. **Abrir consola del iframe** (click derecho en iframe → Inspeccionar)
6. Verificar logs en ambas consolas
7. Login debe completarse exitosamente

## ⚠️ Troubleshooting

### Problema: "Token no recibido en PostMessage"

**Causa:** El script de WordPress no está generando el token

**Solución:**
1. Verificar que el endpoint `/wp-json/hubs/v1/generate-token` responde
2. Verificar en consola del iframe los logs de `generateJWTToken()`
3. Verificar que el plugin WordPress esté activado
4. Verificar que el usuario está realmente logueado en WordPress

### Problema: Script no detecta el login

**Causa:** La página se recarga o hay problema con el polling

**Solución:**
1. Verificar en consola del iframe: `🔄 Verificación con servidor`
2. Debería aparecer cada 2.5 segundos
3. Verificar que `window.hubsUserData` existe

### Problema: Error 401 al generar token

**Causa:** Usuario no está autenticado en WordPress

**Solución:**
1. Verificar que el login de WordPress fue exitoso
2. Verificar cookies de WordPress en DevTools → Application → Cookies
3. Probar llamar manualmente al endpoint:
   ```javascript
   fetch('https://spacemall.es/wp-json/hubs/v1/generate-token', {
     method: 'POST',
     credentials: 'same-origin'
   }).then(r => r.json()).then(console.log)
   ```

## 📊 Otros Enfoques Disponibles

### Opción 2: CORS + Third-Party Cookies
- Configurar WordPress para aceptar cookies de terceros
- Más complejo, puede fallar en navegadores modernos
- **No recomendado**

### Opción 3: Proxy a través de Reticulum
- Reticulum hace el request a WordPress
- Requiere modificar backend de Reticulum
- **Solo si Opción 1 no funciona**

## 📝 Archivos Modificados

### Frontend Hubs:
- ✅ `src/react-components/auth/WordPressIframeLoginModal.js`

### WordPress Plugin:
- ✅ `docs/wordpress-plugin/iframe-postmessage.js`

### Archivos NO modificados (ya estaban correctos):
- `src/utils/wordpress-auth-channel.js`
- `docs/wordpress-plugin/hubs-auth-integration.php`

## ✨ Beneficios de Esta Solución

1. **Simple:** Solo usa el token que ya viene del PostMessage
2. **Confiable:** Detección dinámica de login vía API
3. **Sin CORS:** Todo el proceso de generación ocurre en el mismo dominio
4. **Debugging fácil:** Logs exhaustivos en ambos lados
5. **Error handling:** Mensajes claros y opción de retry

---

**Estado:** ✅ Implementado y listo para testing
**Próximo paso:** Deploy y testing en ambiente real
