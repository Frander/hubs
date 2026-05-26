# Integración WordPress ↔ Hubs Client — Especificación del lado WordPress

> **Audiencia:** desarrolladores de WordPress / plugin developers.
> **Objetivo:** documentar exactamente qué tiene que implementar el servidor WordPress (`spacemall.es`) para que el cliente Hubs (React, dominio externo) pueda autenticar usuarios contra WordPress de forma fluida.
> **Lado cliente (Hubs):** ya implementado. Archivos relevantes:
> - `src/react-components/auth/WordPressIframeLoginModal.js` — el iframe + listener postMessage.
> - `src/utils/wordpress-auth-channel.js` — la capa de auth con REST API.

---

## 1. Arquitectura general

```
┌─────────────────────────────────────┐     ┌──────────────────────────┐
│  Hubs (React, otro origen)          │     │  WordPress (spacemall.es)│
│                                     │     │                          │
│  - Abre iframe → spacemall.es       │     │  - Detecta hubs_iframe=1 │
│  - Escucha postMessage              │◄────│  - Login normal de WP    │
│  - Recibe { user, token } por msg   │     │  - Emite postMessage     │
│  - Guarda token en su AuthChannel   │     │  - Sirve REST API JWT    │
│  - Llama REST API con el token      │────►│  - Valida JWT, devuelve  │
│                                     │     │    info de usuario       │
└─────────────────────────────────────┘     └──────────────────────────┘
```

Dos canales:
1. **Iframe + PostMessage:** flujo de UI para que el usuario haga login con su cuenta WP sin salir de Hubs.
2. **REST API + JWT:** Hubs llama endpoints `/wp-json/hubs/v1/*` con el token para verificar, regenerar o cerrar sesión.

---

## 2. Cabeceras HTTP requeridas

Esto se configura en Apache, en `.htaccess`, en un mu-plugin, o en un plugin de seguridad.

### 2.1 `frame-ancestors` (CSP)

Hubs necesita poder embeber WordPress en un iframe. Por defecto WordPress y muchos plugins de seguridad bloquean esto. La política debe ser:

```
Content-Security-Policy: frame-ancestors 'self' https://*.myspacemall.com https://myspacemall.com https://spacemall.es
```

**Importante:**
- La regla debe aplicar **a todas las rutas que el iframe pueda cargar**, no solo al root. Particularmente: el root (`/`), la página de cuenta (`/mi-cuenta/`), y cualquier página intermedia tras login.
- **No** debe haber un segundo CSP más estricto inyectado por plugin (Wordfence, iThemes Security, etc.) que sobrescriba esto.

### 2.2 `X-Frame-Options`

Esta cabecera vieja también bloquea iframes. Debe estar **ausente** (o ser `ALLOWALL`) en las páginas que el iframe cargue.

```
# NO debe enviar:
X-Frame-Options: SAMEORIGIN
X-Frame-Options: DENY
```

Si algún plugin de seguridad la añade automáticamente, hay que desactivarla para las rutas relevantes.

### 2.3 CORS (para REST API)

Los endpoints `/wp-json/hubs/v1/*` son llamados por Hubs desde otro origen con `credentials: 'include'`. Necesitan estas cabeceras en la respuesta:

```
Access-Control-Allow-Origin: <origen-de-hubs>           # ej: https://chat.myspacemall.com
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

**Crucial:** con `credentials: 'include'`, `Access-Control-Allow-Origin` **NO puede ser `*`**. Debe ser el origen específico de Hubs (o lista dinámica según `Origin` del request). Si hay varios dominios Hubs permitidos, el plugin debe leer la cabecera `Origin` del request y devolverla en la respuesta si coincide con un whitelist.

Implementación recomendada en PHP:

```php
add_action('rest_api_init', function() {
    remove_filter('rest_pre_serve_request', 'rest_send_cors_headers');
    add_filter('rest_pre_serve_request', function($value) {
        $allowed_origins = [
            'https://chat.myspacemall.com',
            'https://app.myspacemall.com',
            'https://spacemall.es'
        ];
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        if (in_array($origin, $allowed_origins, true)) {
            header("Access-Control-Allow-Origin: $origin");
            header("Access-Control-Allow-Credentials: true");
            header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
            header("Access-Control-Allow-Headers: Content-Type, Authorization");
        }
        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            exit(0);
        }
        return $value;
    });
});
```

---

## 3. Comportamiento del iframe

### 3.1 URL que carga Hubs

```
https://spacemall.es/?hubs_iframe=1&redirect_to=https%3A%2F%2Fspacemall.es
```

- **`hubs_iframe=1`**: flag custom. WordPress debe detectarlo y comportarse en modo iframe.
- **`redirect_to`**: a dónde debe redirigir tras login exitoso. Hubs lo setea al base URL para evitar que WordPress te mande a `/mi-cuenta/` (que tiene CSP estricta).

### 3.2 Modo iframe (qué debe hacer WP cuando ve `hubs_iframe=1`)

Cuando WordPress detecta `$_GET['hubs_iframe'] === '1'`:

1. **Renderiza un formulario de login limpio**:
   - Sin header/footer del theme.
   - Sin menús, sidebar, ads.
   - Solo el formulario: usuario, contraseña, "iniciar sesión".
   - Opcional: link a registro/recuperar contraseña.

2. **No redirige al usuario fuera del iframe**. Si tras login el usuario ya está autenticado, en lugar de redirigir, **emite un postMessage al parent** (ver §3.3).

3. **Respeta el `redirect_to`**. Por defecto WooCommerce ignora este parámetro y manda a `/mi-cuenta/`. Hay que sobrescribir con un filter:

```php
add_filter('woocommerce_login_redirect', function($redirect, $user) {
    if (isset($_REQUEST['hubs_iframe']) && $_REQUEST['hubs_iframe'] === '1') {
        // En modo iframe, no redirigir — el JS se encarga vía postMessage
        if (!empty($_REQUEST['redirect_to'])) {
            return esc_url_raw($_REQUEST['redirect_to']);
        }
        return home_url('/');
    }
    return $redirect;
}, 10, 2);
```

4. **Mantiene cookies de sesión normales**. WP debe poder loguear normalmente vía cookies; Hubs luego usará esa sesión para llamar a `/wp-json/hubs/v1/generate-token`.

### 3.3 Protocolo PostMessage

WordPress debe inyectar un script (solo cuando `hubs_iframe=1`) que se comunica con la ventana padre.

#### Mensajes que WP envía a Hubs (parent)

##### `HUBS_IFRAME_READY` — al cargar la página

```js
window.parent.postMessage({
  type: 'HUBS_IFRAME_READY',
  data: {
    url: window.location.href,
    title: document.title
  }
}, '*'); // o el origen específico de Hubs si lo conoces
```

Hubs oculta el spinner al recibirlo.

##### `HUBS_WORDPRESS_LOGIN_SUCCESS` — al login exitoso

Cuando el usuario se autentica correctamente, WP debe:

1. Generar un **JWT** (ver §5) firmado con la clave secreta del plugin.
2. Obtener los datos del usuario.
3. Emitir:

```js
window.parent.postMessage({
  type: 'HUBS_WORDPRESS_LOGIN_SUCCESS',
  data: {
    token: '<JWT>',
    user: {
      id: 42,
      email: 'usuario@ejemplo.com',
      display_name: 'Pepe Pérez',
      username: 'pepe',
      roles: ['customer']
      // opcionales: first_name, last_name, avatar_url, etc.
    }
  }
}, '*');
```

**Crítico:** Hubs valida `event.origin === wpBaseUrl` antes de aceptar el mensaje (ver `WordPressIframeLoginModal.js:35`). El targetOrigin del `postMessage` debe ser el origen de Hubs o `*` (menos seguro pero más simple para desarrollo).

Cómo detectar "login exitoso" desde WP:
- Si el usuario está autenticado al cargar la página (cookie WP válida) Y `hubs_iframe=1` → emitir el mensaje inmediatamente.
- Si el usuario se autentica con el formulario → al recargar la página tras submit, vuelve a aplicar la misma lógica.

##### `HUBS_WORDPRESS_LOGOUT` — al logout (opcional)

```js
window.parent.postMessage({
  type: 'HUBS_WORDPRESS_LOGOUT',
  data: {}
}, '*');
```

#### Mensajes que Hubs envía a WP (no requeridos para funcionar, pero el cliente los manda)

##### `HUBS_PARENT_READY` — Hubs avisa que está listo

Hubs lo emite tras `iframe.onload`. Puedes usarlo o ignorarlo.

```js
{ type: 'HUBS_PARENT_READY', source: 'hubs-client' }
```

### 3.4 Implementación sugerida (mu-plugin)

```php
<?php
/**
 * Plugin Name: Hubs Iframe Bridge
 * Description: Permite que Hubs embeba WP como iframe y reciba tokens vía postMessage.
 */

if (!defined('ABSPATH')) exit;

// 1. Detectar modo iframe
function hubs_is_iframe_mode() {
    return isset($_GET['hubs_iframe']) && $_GET['hubs_iframe'] === '1';
}

// 2. Ocultar UI del theme cuando estamos en modo iframe
add_action('init', function() {
    if (!hubs_is_iframe_mode()) return;

    // Desactivar admin bar
    add_filter('show_admin_bar', '__return_false');

    // Theme limpio
    add_action('wp_enqueue_scripts', function() {
        wp_dequeue_style('your-theme-style');
        // etc, según theme
    }, 100);
});

// 3. Inyectar JS de postMessage solo en modo iframe
add_action('wp_footer', function() {
    if (!hubs_is_iframe_mode()) return;
    ?>
    <script>
    (function() {
        // Notificar que estamos listos
        window.parent.postMessage({
            type: 'HUBS_IFRAME_READY',
            data: { url: window.location.href, title: document.title }
        }, '*');

        <?php if (is_user_logged_in()): ?>
        // Usuario ya autenticado: emitir token
        <?php
        $user = wp_get_current_user();
        $token = hubs_generate_jwt($user);
        ?>
        window.parent.postMessage({
            type: 'HUBS_WORDPRESS_LOGIN_SUCCESS',
            data: {
                token: <?php echo wp_json_encode($token); ?>,
                user: <?php echo wp_json_encode([
                    'id' => $user->ID,
                    'email' => $user->user_email,
                    'display_name' => $user->display_name,
                    'username' => $user->user_login,
                    'roles' => $user->roles
                ]); ?>
            }
        }, '*');
        <?php endif; ?>
    })();
    </script>
    <?php
});

// 4. Sobrescribir redirect post-login para iframe
add_filter('woocommerce_login_redirect', function($redirect, $user) {
    if (hubs_is_iframe_mode()) {
        return !empty($_REQUEST['redirect_to'])
            ? esc_url_raw($_REQUEST['redirect_to'])
            : home_url('/?hubs_iframe=1');
    }
    return $redirect;
}, 10, 2);

add_filter('login_redirect', function($redirect_to, $requested, $user) {
    if (hubs_is_iframe_mode() && !is_wp_error($user)) {
        return !empty($_REQUEST['redirect_to'])
            ? esc_url_raw($_REQUEST['redirect_to'])
            : home_url('/?hubs_iframe=1');
    }
    return $redirect_to;
}, 10, 3);
```

---

## 4. Endpoints REST API

Todos viven bajo `/wp-json/hubs/v1/`. Implementación típica via `register_rest_route`.

### 4.1 `POST /wp-json/hubs/v1/login`

**Login con username/password (sin iframe).** Hubs puede ofrecer este flujo como fallback.

**Request:**
```json
{
  "username": "pepe",
  "password": "secret123"
}
```

**Response 200:**
```json
{
  "success": true,
  "user": {
    "id": 42,
    "email": "pepe@ejemplo.com",
    "display_name": "Pepe Pérez",
    "username": "pepe",
    "roles": ["customer"]
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response 401:**
```json
{
  "success": false,
  "message": "Credenciales inválidas"
}
```

### 4.2 `POST /wp-json/hubs/v1/verify`

**Verifica un JWT.**

**Request:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response 200 (válido):**
```json
{
  "success": true,
  "user": {
    "id": 42,
    "email": "pepe@ejemplo.com",
    "display_name": "Pepe Pérez"
  },
  "expires_at": 1717459200
}
```

**Response 200 (inválido):**
```json
{
  "success": false,
  "message": "Token expirado"
}
```

### 4.3 `POST /wp-json/hubs/v1/generate-token`

**Genera JWT para el usuario autenticado actualmente vía cookie WP.** Este es el endpoint clave para el flujo iframe: tras login, Hubs llama a este endpoint con `credentials: 'include'` para que viajen las cookies de sesión WP.

**Request:** (sin body, requiere cookie de sesión WP)

**Response 200:**
```json
{
  "success": true,
  "user": { ... },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response 401:**
```json
{
  "success": false,
  "message": "No autenticado en WordPress"
}
```

**Implementación:** debe validar `is_user_logged_in()` y `wp_get_current_user()`.

### 4.4 `POST /wp-json/hubs/v1/logout`

**Cierra sesión de WordPress.**

**Request:** (sin body, con cookie)

**Response 200:**
```json
{ "success": true }
```

**Implementación:** llamar `wp_logout()`.

---

## 5. Formato del JWT

- **Algoritmo:** `HS256` (firma simétrica con secret compartido del plugin).
- **TTL:** 24 horas recomendado.
- **Claims requeridos:**
  - `sub`: ID del usuario WP (entero).
  - `email`: email del usuario.
  - `iat`: timestamp de emisión.
  - `exp`: timestamp de expiración.
  - `iss`: `spacemall.es` (o el dominio WP).
- **Claims opcionales:**
  - `roles`: array de roles WP.
  - `display_name`.

**Ejemplo de payload decodificado:**

```json
{
  "sub": 42,
  "email": "pepe@ejemplo.com",
  "display_name": "Pepe Pérez",
  "roles": ["customer"],
  "iat": 1716796800,
  "exp": 1716883200,
  "iss": "spacemall.es"
}
```

**Secret:** una variable de entorno o constante en `wp-config.php` tipo `define('HUBS_JWT_SECRET', '...');`. **Nunca** hardcoded en código que viaje al cliente.

**Librería sugerida:** `firebase/php-jwt` via Composer.

---

## 6. Esquema del objeto `user`

El objeto que va dentro de `data.user` en el postMessage y en las responses REST debe tener al menos:

```typescript
{
  id: number;            // requerido (WP user ID)
  email: string;         // requerido
  display_name: string;  // requerido (usado para mostrar)
  username?: string;     // recomendado
  roles?: string[];      // recomendado
  // libres:
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  meta?: object;         // metadatos custom (ej: spacemall_customer_id)
}
```

---

## 7. Lo que NO debe hacer WordPress

- ❌ **No redirigir** a `/mi-cuenta/` o cualquier ruta con CSP estricta cuando viene `hubs_iframe=1`.
- ❌ **No requerir nonce** WP en los endpoints REST si Hubs no está logueado en WP cookie-wise (los nonces son cookie-bound; un origen externo no los tiene). Para llamadas con JWT, autentica vía JWT solamente.
- ❌ **No mandar `Set-Cookie: ...; SameSite=Strict`** en las páginas que el iframe carga — `Strict` rompe el flujo cross-origin. Usar `SameSite=None; Secure` para cookies que deban persistir en el iframe.
- ❌ **No bloquear `OPTIONS`** preflight CORS con WAF/firewall.
- ❌ **No invalidar el JWT** cada vez que el usuario navega; el JWT vive 24h en el cliente Hubs.

---

## 8. Checklist de verificación

Marca cada uno cuando esté implementado y probado.

### Cabeceras HTTP

- [ ] `curl -sI https://spacemall.es/?hubs_iframe=1` devuelve `frame-ancestors` permitiendo el dominio Hubs.
- [ ] `curl -sI https://spacemall.es/mi-cuenta/` devuelve la **misma** lista permisiva (no `'self'` solo).
- [ ] Ninguna URL relevante devuelve `X-Frame-Options: SAMEORIGIN/DENY`.
- [ ] Preflight CORS: `curl -X OPTIONS -H "Origin: https://chat.myspacemall.com" https://spacemall.es/wp-json/hubs/v1/login` devuelve `Access-Control-Allow-Origin: https://chat.myspacemall.com` y `Access-Control-Allow-Credentials: true`.

### Iframe + PostMessage

- [ ] Al cargar `https://spacemall.es/?hubs_iframe=1`, la página muestra solo formulario de login (sin theme).
- [ ] La página emite `HUBS_IFRAME_READY` al cargar.
- [ ] Tras login en el iframe (cuenta válida), emite `HUBS_WORDPRESS_LOGIN_SUCCESS` con `{ token, user }` válidos.
- [ ] El `targetOrigin` del `postMessage` es el origen de Hubs (o `*` en dev).
- [ ] Si el usuario ya estaba logueado en WP (cookie viva), al abrir el iframe se emite `HUBS_WORDPRESS_LOGIN_SUCCESS` inmediatamente sin requerir login manual.
- [ ] El iframe **NO** redirige a `/mi-cuenta/` tras login.

### REST API

- [ ] `POST /wp-json/hubs/v1/login` con credenciales válidas devuelve `{ success: true, user, token }`.
- [ ] `POST /wp-json/hubs/v1/login` con credenciales inválidas devuelve 401 y JSON con `success: false`.
- [ ] `POST /wp-json/hubs/v1/verify` con token válido devuelve `{ success: true, user, expires_at }`.
- [ ] `POST /wp-json/hubs/v1/verify` con token caducado devuelve `{ success: false, message }`.
- [ ] `POST /wp-json/hubs/v1/generate-token` con cookie WP viva devuelve `{ success: true, user, token }`.
- [ ] `POST /wp-json/hubs/v1/generate-token` sin cookie devuelve 401.
- [ ] `POST /wp-json/hubs/v1/logout` cierra la sesión WP y devuelve `{ success: true }`.

### JWT

- [ ] JWT firmado con HS256.
- [ ] Claims incluyen `sub`, `email`, `iat`, `exp`, `iss`.
- [ ] `exp` está 24h en el futuro al emitirse.
- [ ] El secret NO es hardcoded en código público.
- [ ] El mismo JWT se acepta en `/verify` durante las 24h.

### Integración end-to-end

- [ ] Abrir Hubs en `https://chat.myspacemall.com` → click "Login" → modal abre.
- [ ] El iframe carga sin errores en la consola del navegador.
- [ ] Hacer login → modal cierra, Hubs muestra estado "logueado".
- [ ] Recargar Hubs → si la cookie WP está viva, auto-login funciona (vía `/generate-token`).
- [ ] Logout en Hubs → llama a `/logout`, sesión WP cerrada, `wp_get_current_user()` ya no devuelve ese usuario.

---

## 9. Resumen del flujo end-to-end

```
1. Hubs (chat.myspacemall.com) usuario click "Login"
2. Hubs abre modal con iframe src="https://spacemall.es/?hubs_iframe=1&redirect_to=https://spacemall.es"
3. WP detecta hubs_iframe=1 → render limpio sin theme
4. WP emite postMessage HUBS_IFRAME_READY
5. Si usuario ya logueado: salta a paso 8
6. Usuario ingresa credenciales y submit
7. WP procesa login, NO redirige a /mi-cuenta/ (filter)
8. WP detecta usuario logueado → genera JWT → postMessage HUBS_WORDPRESS_LOGIN_SUCCESS { token, user }
9. Hubs valida event.origin === spacemall.es → guarda token en su store
10. Hubs llama a /wp-json/hubs/v1/verify con el token para confirmar
11. Hubs cierra modal, marca estado signedIn=true
12. (uso futuro) Hubs llama a /wp-json/hubs/v1/verify o usa el JWT para Reticulum
```

---

## 10. Preguntas abiertas para resolver con el equipo WP

1. ¿Existe ya un plugin de JWT instalado (ej. `JWT Authentication for WP REST API`)? Si sí, ¿se puede reusar o conviene plugin propio?
2. ¿WooCommerce está activado? Si sí, el filter `woocommerce_login_redirect` es necesario.
3. ¿Qué dominios exactos de Hubs hay que permitir? (`chat.myspacemall.com`, `app.myspacemall.com`, etc.)
4. ¿La cookie WP actual tiene `SameSite=Strict`? Habría que cambiarla a `None; Secure` para flujos cross-origin.
5. ¿Hay un firewall/WAF (Cloudflare, ModSecurity, Wordfence) que pueda bloquear OPTIONS o `frame-ancestors`?
6. ¿Qué TTL debe tener el JWT? (default sugerido: 24h.)
