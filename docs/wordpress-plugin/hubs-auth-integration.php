<?php
/**
 * Plugin Name: Hubs Authentication Integration
 * Plugin URI: https://spacemall.es
 * Description: Plugin para integrar autenticación de Hubs con WordPress via iframe y JWT tokens
 * Version: 1.0.3
 * Author: SpaceMall Team
 * License: GPL v2 or later
 * Text Domain: hubs-auth
 */

// Prevenir acceso directo
if (!defined('ABSPATH')) {
    exit;
}

// Definir constantes del plugin
define('HUBS_AUTH_VERSION', '1.0.3');
define('HUBS_AUTH_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('HUBS_AUTH_PLUGIN_URL', plugin_dir_url(__FILE__));

class HubsAuthIntegration {

    private $jwt_secret;
    private $allowed_origins;
    private $plugin_options;

    public function __construct() {
        $this->init_options();
        $this->init_hooks();
    }

    /**
     * Inicializar opciones del plugin
     */
    private function init_options() {
        $this->plugin_options = get_option('hubs_auth_options', [
            'jwt_secret' => wp_generate_password(64, false),
            'allowed_origins' => "https://spacemall-hubs.com\nhttps://hubs.spacemall.es",
            'token_expiry' => 24, // horas
            'auto_login_enabled' => true,
            'debug_mode' => false
        ]);

        $this->jwt_secret = $this->plugin_options['jwt_secret'];
        $this->allowed_origins = array_filter(array_map('trim', explode("\n", $this->plugin_options['allowed_origins'])));
    }

    /**
     * Inicializar hooks de WordPress
     */
    private function init_hooks() {
        add_action('init', [$this, 'handle_iframe_login']);
        add_action('send_headers', [$this, 'set_iframe_headers']);
        add_action('rest_api_init', [$this, 'register_api_endpoints']);
        add_action('wp_enqueue_scripts', [$this, 'enqueue_scripts']);
        add_action('admin_menu', [$this, 'add_admin_menu']);
        add_action('admin_init', [$this, 'register_settings']);

        // Hooks para debugging
        if ($this->plugin_options['debug_mode']) {
            add_action('wp_footer', [$this, 'debug_info']);
        }
    }

    /**
     * Manejar auto-login via token en URL
     */
    public function handle_iframe_login() {
        // Solo procesar si auto-login está habilitado
        if (!$this->plugin_options['auto_login_enabled']) {
            return;
        }

        if (!isset($_GET['hub_token'])) {
            return;
        }

        $token = sanitize_text_field($_GET['hub_token']);
        $this->debug_log('Token recibido: ' . substr($token, 0, 20) . '...');

        $user_data = $this->verify_jwt_token($token);

        if ($user_data && !is_user_logged_in()) {
            $this->debug_log('Token válido para email: ' . $user_data->email);

            $user = get_user_by('email', $user_data->email);

            if ($user) {
                wp_set_current_user($user->ID);
                wp_set_auth_cookie($user->ID, true);

                $this->debug_log('Usuario logueado: ' . $user->user_login);

                // JavaScript para limpiar URL
                add_action('wp_footer', function() {
                    echo "<script>
                        console.log('Hubs Auth: Login exitoso, limpiando URL');
                        if (window.history.replaceState) {
                            const url = new URL(window.location);
                            url.searchParams.delete('hub_token');
                            window.history.replaceState({}, document.title, url.toString());
                        }
                    </script>";
                });

                // Notificar éxito
                add_action('wp_footer', [$this, 'notify_login_success']);

            } else {
                $this->debug_log('Usuario no encontrado para email: ' . $user_data->email);
            }
        } elseif ($user_data && is_user_logged_in()) {
            $this->debug_log('Usuario ya está logueado');
            add_action('wp_footer', [$this, 'notify_login_success']);
        } else {
            $this->debug_log('Token inválido o expirado');
        }
    }

    /**
     * Configurar headers para iframe
     */
    public function set_iframe_headers() {
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';

        // Configurar CORS para orígenes permitidos
        if (in_array($origin, $this->allowed_origins)) {
            header("Access-Control-Allow-Origin: $origin");
            header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
            header("Access-Control-Allow-Headers: Authorization, Content-Type, X-Requested-With");
            header("Access-Control-Allow-Credentials: true");
        }

        // Configurar headers para iframe cuando hay token o request de Hubs
        if (isset($_GET['hub_token']) || isset($_GET['hubs_iframe']) || $this->is_hubs_request()) {
            // Permitir iframe desde dominios autorizados
            if (!empty($this->allowed_origins)) {
                $frame_ancestors = "'self' " . implode(' ', $this->allowed_origins);
                header("Content-Security-Policy: frame-ancestors $frame_ancestors");
            }

            // Headers adicionales para iframe
            header("X-Frame-Options: SAMEORIGIN");
            header("Referrer-Policy: strict-origin-when-cross-origin");
        }

        // Manejo de preflight OPTIONS
        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            http_response_code(200);
            exit;
        }
    }

    /**
     * Registrar endpoints de API REST
     */
    public function register_api_endpoints() {

        // Endpoint para login
        register_rest_route('hubs/v1', '/login', [
            'methods' => 'POST',
            'callback' => [$this, 'api_login'],
            'permission_callback' => '__return_true',
            'args' => [
                'username' => [
                    'required' => true,
                    'sanitize_callback' => 'sanitize_text_field',
                ],
                'password' => [
                    'required' => true,
                    'sanitize_callback' => 'sanitize_text_field',
                ]
            ]
        ]);

        // Endpoint para verificar token
        register_rest_route('hubs/v1', '/verify', [
            'methods' => 'POST',
            'callback' => [$this, 'api_verify_token'],
            'permission_callback' => '__return_true',
            'args' => [
                'token' => [
                    'required' => true,
                    'sanitize_callback' => 'sanitize_text_field',
                ]
            ]
        ]);

        // Endpoint para logout
        register_rest_route('hubs/v1', '/logout', [
            'methods' => 'POST',
            'callback' => [$this, 'api_logout'],
            'permission_callback' => 'is_user_logged_in'
        ]);

        // Endpoint para generar token (para usuarios ya logueados)
        register_rest_route('hubs/v1', '/generate-token', [
            'methods' => 'POST',
            'callback' => [$this, 'api_generate_token'],
            'permission_callback' => '__return_true'
        ]);
    }

    /**
     * API: Login de usuario
     */
    public function api_login($request) {
        $username = $request->get_param('username');
        $password = $request->get_param('password');

        $this->debug_log("Intento de login para usuario: $username");

        $user = wp_authenticate($username, $password);

        if (is_wp_error($user)) {
            $this->debug_log("Login fallido: " . $user->get_error_message());

            return new WP_REST_Response([
                'success' => false,
                'message' => 'Credenciales inválidas',
                'error_code' => 'invalid_credentials'
            ], 401);
        }

        $token = $this->generate_jwt_token_for_user($user);

        $this->debug_log("Login exitoso para: " . $user->user_login);

        return new WP_REST_Response([
            'success' => true,
            'token' => $token,
            'user' => [
                'id' => $user->ID,
                'email' => $user->user_email,
                'username' => $user->user_login,
                'display_name' => $user->display_name,
                'avatar_url' => get_avatar_url($user->ID)
            ]
        ], 200);
    }

    /**
     * API: Verificar token
     */
    public function api_verify_token($request) {
        $token = $request->get_param('token');
        $user_data = $this->verify_jwt_token($token);

        if (!$user_data) {
            return new WP_REST_Response([
                'success' => false,
                'message' => 'Token inválido o expirado',
                'error_code' => 'invalid_token'
            ], 401);
        }

        return new WP_REST_Response([
            'success' => true,
            'valid' => true,
            'user' => [
                'id' => $user_data->user_id,
                'email' => $user_data->email,
                'display_name' => $user_data->display_name
            ],
            'expires_at' => $user_data->exp
        ], 200);
    }

    /**
     * API: Logout
     */
    public function api_logout($request) {
        wp_logout();

        return new WP_REST_Response([
            'success' => true,
            'message' => 'Logout exitoso'
        ], 200);
    }

    /**
     * API: Generar token para usuario actual
     */
    public function api_generate_token($request) {
        // Verificar si el usuario está logueado
        if (!is_user_logged_in()) {
            $this->debug_log('generate-token: Usuario no autenticado');
            return new WP_REST_Response([
                'success' => false,
                'message' => 'Usuario no autenticado',
                'logged_in' => false
            ], 200);
        }

        $user = wp_get_current_user();

        if (!$user || !$user->ID) {
            $this->debug_log('generate-token: Usuario inválido');
            return new WP_REST_Response([
                'success' => false,
                'message' => 'Usuario inválido',
                'logged_in' => false
            ], 200);
        }

        $this->debug_log('generate-token: Generando token para usuario ' . $user->user_login);

        $token = $this->generate_jwt_token_for_user($user);

        $this->debug_log('generate-token: Token generado exitosamente');

        return new WP_REST_Response([
            'success' => true,
            'token' => $token,
            'user' => [
                'id' => $user->ID,
                'email' => $user->user_email,
                'username' => $user->user_login,
                'display_name' => $user->display_name
            ],
            'logged_in' => true
        ], 200);
    }

    /**
     * Generar JWT Token para usuario
     */
    private function generate_jwt_token_for_user($user) {
        $expiry_hours = intval($this->plugin_options['token_expiry']);
        $expiry_time = time() + ($expiry_hours * 60 * 60);

        $payload = [
            'iss' => home_url(),
            'iat' => time(),
            'exp' => $expiry_time,
            'user_id' => $user->ID,
            'email' => $user->user_email,
            'username' => $user->user_login,
            'display_name' => $user->display_name,
            'roles' => $user->roles
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
                $this->debug_log('Token expirado');
                return false;
            }

            // Verificar emisor
            if (isset($payload->iss) && $payload->iss !== home_url()) {
                $this->debug_log('Token de emisor incorrecto');
                return false;
            }

            return $payload;
        } catch (Exception $e) {
            $this->debug_log('Error decodificando token: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Cargar scripts necesarios
     */
    public function enqueue_scripts() {
        // Cargar script PostMessage para iframe
        wp_enqueue_script(
            'hubs-iframe-postmessage',
            HUBS_AUTH_PLUGIN_URL . 'iframe-postmessage.js',
            [],
            HUBS_AUTH_VERSION,
            true
        );

        // Preparar datos del usuario actual
        $user_data = [
            'logged_in' => is_user_logged_in(),
            'id' => 0,
            'username' => '',
            'email' => '',
            'display_name' => '',
            'avatar_url' => '',
            'token' => null
        ];

        if (is_user_logged_in()) {
            $current_user = wp_get_current_user();

            // GENERAR TOKEN JWT AQUÍ DIRECTAMENTE
            $token = $this->generate_jwt_token_for_user($current_user);

            $user_data = [
                'logged_in' => true,
                'id' => $current_user->ID,
                'username' => $current_user->user_login,
                'email' => $current_user->user_email,
                'display_name' => $current_user->display_name,
                'avatar_url' => get_avatar_url($current_user->ID),
                'token' => $token
            ];

            $this->debug_log('Token JWT generado en enqueue_scripts para: ' . $current_user->user_login);
        }

        // Inyectar datos del usuario en window.hubsUserData
        wp_add_inline_script('hubs-iframe-postmessage',
            'window.hubsUserData = ' . wp_json_encode($user_data) . ';',
            'before'
        );

        // También pasar configuración del plugin
        wp_localize_script('hubs-iframe-postmessage', 'hubsAuthConfig', [
            'allowedOrigins' => $this->allowed_origins,
            'debugMode' => $this->plugin_options['debug_mode']
        ]);
    }

    /**
     * Notificar éxito de login al iframe padre
     */
    public function notify_login_success() {
        if (!$this->is_iframe_context()) return;

        $user = wp_get_current_user();

        echo "<script>
            if (window.parent !== window) {
                console.log('Hubs Auth: Notificando login exitoso al padre');
                window.parent.postMessage({
                    type: 'HUBS_WORDPRESS_LOGIN_SUCCESS',
                    user: {
                        id: {$user->ID},
                        email: '{$user->user_email}',
                        username: '{$user->user_login}',
                        displayName: '{$user->display_name}',
                        isLoggedIn: true
                    },
                    timestamp: Date.now()
                }, '*');
            }
        </script>";
    }

    /**
     * Detectar si estamos en contexto de iframe
     */
    private function is_iframe_context() {
        return isset($_GET['hub_token']) || isset($_GET['hubs_iframe']) || $this->is_hubs_request();
    }

    /**
     * Detectar si el request viene de Hubs
     */
    private function is_hubs_request() {
        $referer = $_SERVER['HTTP_REFERER'] ?? '';
        $user_agent = $_SERVER['HTTP_USER_AGENT'] ?? '';

        foreach ($this->allowed_origins as $origin) {
            if (strpos($referer, $origin) === 0) {
                return true;
            }
        }

        return false;
    }

    /**
     * Logging para debug
     */
    private function debug_log($message) {
        if ($this->plugin_options['debug_mode']) {
            error_log('[Hubs Auth] ' . $message);
        }
    }

    /**
     * Mostrar información de debug en footer
     */
    public function debug_info() {
        if (!current_user_can('manage_options')) return;

        echo "<div style='position:fixed; bottom:0; right:0; background:#000; color:#fff; padding:10px; font-size:12px; z-index:9999;'>";
        echo "<strong>Hubs Auth Debug:</strong><br>";
        echo "Logged In: " . (is_user_logged_in() ? 'Yes' : 'No') . "<br>";
        echo "Is Iframe: " . ($this->is_iframe_context() ? 'Yes' : 'No') . "<br>";
        echo "Has Token: " . (isset($_GET['hub_token']) ? 'Yes' : 'No') . "<br>";
        echo "Referer: " . substr($_SERVER['HTTP_REFERER'] ?? 'None', 0, 50) . "<br>";
        echo "</div>";
    }

    /**
     * Simple JWT encode (usar biblioteca real en producción)
     */
    private function jwt_encode($payload, $secret) {
        $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
        $payload = json_encode($payload);

        $base64Header = $this->base64url_encode($header);
        $base64Payload = $this->base64url_encode($payload);

        $signature = hash_hmac('sha256', $base64Header . "." . $base64Payload, $secret, true);
        $base64Signature = $this->base64url_encode($signature);

        return $base64Header . "." . $base64Payload . "." . $base64Signature;
    }

    /**
     * Simple JWT decode
     */
    private function jwt_decode($jwt, $secret) {
        $parts = explode('.', $jwt);
        if (count($parts) !== 3) {
            throw new Exception('Token JWT inválido - formato incorrecto');
        }

        list($header, $payload, $signature) = $parts;

        $headerDecoded = json_decode($this->base64url_decode($header));
        $payloadDecoded = json_decode($this->base64url_decode($payload));

        // Verificar firma
        $expectedSignature = $this->base64url_encode(
            hash_hmac('sha256', $header . "." . $payload, $secret, true)
        );

        if (!hash_equals($signature, $expectedSignature)) {
            throw new Exception('Token JWT inválido - firma incorrecta');
        }

        return $payloadDecoded;
    }

    /**
     * Base64 URL encode
     */
    private function base64url_encode($data) {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    /**
     * Base64 URL decode
     */
    private function base64url_decode($data) {
        return base64_decode(str_pad(strtr($data, '-_', '+/'), strlen($data) % 4, '=', STR_PAD_RIGHT));
    }

    /**
     * Agregar menú de administración
     */
    public function add_admin_menu() {
        add_options_page(
            'Hubs Authentication',
            'Hubs Auth',
            'manage_options',
            'hubs-auth-settings',
            [$this, 'admin_page']
        );
    }

    /**
     * Registrar configuraciones
     */
    public function register_settings() {
        register_setting('hubs_auth_options', 'hubs_auth_options', [
            'sanitize_callback' => [$this, 'sanitize_options']
        ]);
    }

    /**
     * Sanitizar opciones
     */
    public function sanitize_options($input) {
        $sanitized = [];

        $sanitized['jwt_secret'] = sanitize_text_field($input['jwt_secret'] ?? $this->plugin_options['jwt_secret']);
        $sanitized['allowed_origins'] = sanitize_textarea_field($input['allowed_origins'] ?? '');
        $sanitized['token_expiry'] = intval($input['token_expiry'] ?? 24);
        $sanitized['auto_login_enabled'] = !empty($input['auto_login_enabled']);
        $sanitized['debug_mode'] = !empty($input['debug_mode']);

        return $sanitized;
    }

    /**
     * Página de administración
     */
    public function admin_page() {
        if (isset($_POST['submit'])) {
            $options = $_POST['hubs_auth_options'];
            update_option('hubs_auth_options', $options);
            $this->init_options(); // Reload options
            echo '<div class="notice notice-success"><p>Configuración guardada.</p></div>';
        }

        include HUBS_AUTH_PLUGIN_DIR . 'admin-page.php';
    }
}

// Inicializar plugin
function init_hubs_auth_integration() {
    new HubsAuthIntegration();
}
add_action('plugins_loaded', 'init_hubs_auth_integration');

/**
 * Activación del plugin
 */
register_activation_hook(__FILE__, function() {
    // Crear opciones por defecto si no existen
    if (!get_option('hubs_auth_options')) {
        $default_options = [
            'jwt_secret' => wp_generate_password(64, false),
            'allowed_origins' => "https://spacemall-hubs.com\nhttps://hubs.spacemall.es",
            'token_expiry' => 24,
            'auto_login_enabled' => true,
            'debug_mode' => false
        ];
        update_option('hubs_auth_options', $default_options);
    }
});

/**
 * Desactivación del plugin
 */
register_deactivation_hook(__FILE__, function() {
    // Limpiar transients si es necesario
    delete_transient('hubs_auth_cache');
});
