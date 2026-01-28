# Plugin WordPress para Integración Hubs

## Archivo Principal: hubs-auth-integration.php

```php
<?php
/**
 * Plugin Name: Hubs Authentication Integration
 * Description: Auto-login para usuarios de Hubs via iframe
 * Version: 1.0.0
 * Author: SpaceMall Team
 */

// Prevenir acceso directo
if (!defined('ABSPATH')) {
    exit;
}

class HubsAuthIntegration {
    
    private $jwt_secret;
    private $allowed_origins;
    
    public function __construct() {
        $this->jwt_secret = get_option('hubs_jwt_secret', wp_generate_password(32, false));
        $this->allowed_origins = ['https://spacemall-hubs.com', 'https://hubs.spacemall.es'];
        
        add_action('init', [$this, 'handle_iframe_login']);
        add_action('send_headers', [$this, 'set_iframe_headers']);
        add_action('rest_api_init', [$this, 'register_api_endpoints']);
        add_action('wp_login', [$this, 'generate_jwt_token'], 10, 2);
        add_action('wp_enqueue_scripts', [$this, 'enqueue_scripts']);
    }
    
    /**
     * Auto-login via token en URL
     */
    public function handle_iframe_login() {
        if (!isset($_GET['hub_token'])) return;
        
        $token = sanitize_text_field($_GET['hub_token']);
        $user_data = $this->verify_jwt_token($token);
        
        if ($user_data && !is_user_logged_in()) {
            $user = get_user_by('email', $user_data->email);
            
            if ($user) {
                wp_set_current_user($user->ID);
                wp_set_auth_cookie($user->ID, true);
                
                // Limpiar URL sin recargar
                echo "<script>
                    if (window.history.replaceState) {
                        const url = new URL(window.location);
                        url.searchParams.delete('hub_token');
                        window.history.replaceState({}, '', url);
                    }
                </script>";
            }
        }
    }
    
    /**
     * Headers para permitir iframe desde Hubs
     */
    public function set_iframe_headers() {
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        
        if (in_array($origin, $this->allowed_origins)) {
            header("Access-Control-Allow-Origin: $origin");
            header("Access-Control-Allow-Credentials: true");
        }
        
        // Permitir iframe desde dominios autorizados
        if (isset($_GET['hub_token']) || $this->is_hubs_request()) {
            header("X-Frame-Options: SAMEORIGIN");
            header("Content-Security-Policy: frame-ancestors 'self' " . implode(' ', $this->allowed_origins));
        }
    }
    
    /**
     * API Endpoints REST
     */
    public function register_api_endpoints() {
        // Login endpoint
        register_rest_route('hubs/v1', '/login', [
            'methods' => 'POST',
            'callback' => [$this, 'api_login'],
            'permission_callback' => '__return_true'
        ]);
        
        // Verificar estado endpoint
        register_rest_route('hubs/v1', '/verify', [
            'methods' => 'POST',
            'callback' => [$this, 'api_verify_token'],
            'permission_callback' => '__return_true'
        ]);
        
        // Logout endpoint
        register_rest_route('hubs/v1', '/logout', [
            'methods' => 'POST',
            'callback' => [$this, 'api_logout'],
            'permission_callback' => '__return_true'
        ]);
    }
    
    /**
     * API Login
     */
    public function api_login($request) {
        $username = $request->get_param('username');
        $password = $request->get_param('password');
        
        $user = wp_authenticate($username, $password);
        
        if (is_wp_error($user)) {
            return new WP_REST_Response([
                'success' => false,
                'message' => 'Credenciales inválidas'
            ], 401);
        }
        
        $token = $this->generate_jwt_token_for_user($user);
        
        return new WP_REST_Response([
            'success' => true,
            'token' => $token,
            'user' => [
                'id' => $user->ID,
                'email' => $user->user_email,
                'display_name' => $user->display_name
            ]
        ], 200);
    }
    
    /**
     * Verificar token JWT
     */
    public function api_verify_token($request) {
        $token = $request->get_param('token');
        $user_data = $this->verify_jwt_token($token);
        
        if (!$user_data) {
            return new WP_REST_Response([
                'success' => false,
                'message' => 'Token inválido'
            ], 401);
        }
        
        return new WP_REST_Response([
            'success' => true,
            'user' => $user_data
        ], 200);
    }
    
    /**
     * Generar JWT Token
     */
    private function generate_jwt_token_for_user($user) {
        $payload = [
            'iss' => home_url(),
            'iat' => time(),
            'exp' => time() + (24 * 60 * 60), // 24 horas
            'user_id' => $user->ID,
            'email' => $user->user_email,
            'display_name' => $user->display_name
        ];
        
        return $this->jwt_encode($payload, $this->jwt_secret);
    }
    
    /**
     * Verificar JWT Token
     */
    private function verify_jwt_token($token) {
        try {
            $payload = $this->jwt_decode($token, $this->jwt_secret);
            
            // Verificar expiración
            if (isset($payload->exp) && $payload->exp < time()) {
                return false;
            }
            
            return $payload;
        } catch (Exception $e) {
            return false;
        }
    }
    
    /**
     * Script para comunicación PostMessage
     */
    public function enqueue_scripts() {
        if ($this->is_iframe_context()) {
            wp_enqueue_script('hubs-iframe-bridge', plugin_dir_url(__FILE__) . 'iframe-bridge.js', [], '1.0.0', true);
        }
    }
    
    /**
     * Detectar si estamos en iframe desde Hubs
     */
    private function is_iframe_context() {
        return isset($_GET['hub_token']) || 
               (isset($_SERVER['HTTP_REFERER']) && 
                in_array(parse_url($_SERVER['HTTP_REFERER'], PHP_URL_HOST), 
                         array_map(function($url) { return parse_url($url, PHP_URL_HOST); }, $this->allowed_origins)));
    }
    
    /**
     * Detectar request desde Hubs
     */
    private function is_hubs_request() {
        $referer = $_SERVER['HTTP_REFERER'] ?? '';
        foreach ($this->allowed_origins as $origin) {
            if (strpos($referer, $origin) === 0) return true;
        }
        return false;
    }
    
    /**
     * Simple JWT encode (usar biblioteca real en producción)
     */
    private function jwt_encode($payload, $secret) {
        $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
        $payload = json_encode($payload);
        
        $base64Header = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));
        $base64Payload = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($payload));
        
        $signature = hash_hmac('sha256', $base64Header . "." . $base64Payload, $secret, true);
        $base64Signature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));
        
        return $base64Header . "." . $base64Payload . "." . $base64Signature;
    }
    
    /**
     * Simple JWT decode (usar biblioteca real en producción)
     */
    private function jwt_decode($jwt, $secret) {
        $parts = explode('.', $jwt);
        if (count($parts) !== 3) throw new Exception('Invalid JWT');
        
        list($header, $payload, $signature) = $parts;
        
        $headerDecoded = json_decode(base64_decode(str_replace(['-', '_'], ['+', '/'], $header)));
        $payloadDecoded = json_decode(base64_decode(str_replace(['-', '_'], ['+', '/'], $payload)));
        
        // Verificar firma
        $expectedSignature = str_replace(['+', '/', '='], ['-', '_', ''], 
            base64_encode(hash_hmac('sha256', $header . "." . $payload, $secret, true)));
        
        if ($signature !== $expectedSignature) {
            throw new Exception('Invalid signature');
        }
        
        return $payloadDecoded;
    }
}

// Inicializar plugin
new HubsAuthIntegration();

/**
 * Activación del plugin
 */
register_activation_hook(__FILE__, function() {
    // Generar secret key si no existe
    if (!get_option('hubs_jwt_secret')) {
        update_option('hubs_jwt_secret', wp_generate_password(32, false));
    }
});
?>
```

## Archivo JavaScript: iframe-bridge.js

```javascript
// wp-content/plugins/hubs-auth-integration/iframe-bridge.js

(function() {
    'use strict';
    
    // Solo ejecutar si estamos en iframe
    if (window.parent === window) return;
    
    // Notificar al padre sobre login exitoso
    function notifyParentLogin() {
        const userData = {
            id: window.wpUserId || null,
            email: window.wpUserEmail || null,
            displayName: window.wpDisplayName || null,
            isLoggedIn: window.wpIsLoggedIn || false
        };
        
        window.parent.postMessage({
            type: 'WORDPRESS_LOGIN_STATUS',
            data: userData,
            timestamp: Date.now()
        }, '*');
    }
    
    // Escuchar requests del padre
    window.addEventListener('message', function(event) {
        // Verificar origen
        const allowedOrigins = ['https://spacemall-hubs.com', 'https://hubs.spacemall.es'];
        if (!allowedOrigins.includes(event.origin)) return;
        
        if (event.data.type === 'REQUEST_LOGIN_STATUS') {
            notifyParentLogin();
        }
    });
    
    // Detectar cambios de login (auto-notificar)
    let lastLoginState = window.wpIsLoggedIn || false;
    setInterval(function() {
        const currentLoginState = document.querySelector('body').classList.contains('logged-in');
        if (currentLoginState !== lastLoginState) {
            lastLoginState = currentLoginState;
            window.wpIsLoggedIn = currentLoginState;
            notifyParentLogin();
        }
    }, 1000);
    
    // Notificar inmediatamente al cargar
    setTimeout(notifyParentLogin, 500);
})();
```