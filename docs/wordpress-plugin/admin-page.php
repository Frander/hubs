<?php
/**
 * Página de administración para Hubs Authentication Integration
 */

// Prevenir acceso directo
if (!defined('ABSPATH')) {
    exit;
}

$options = get_option('hubs_auth_options', []);
$current_tab = $_GET['tab'] ?? 'general';
?>

<div class="wrap">
    <h1>
        <span class="dashicons dashicons-networking"></span>
        Hubs Authentication Integration
    </h1>
    
    <p class="description">
        Configuración para la integración de autenticación entre WordPress y Hubs SpaceMall.
    </p>
    
    <!-- Tabs Navigation -->
    <nav class="nav-tab-wrapper">
        <a href="?page=hubs-auth-settings&tab=general" class="nav-tab <?php echo $current_tab === 'general' ? 'nav-tab-active' : ''; ?>">
            General
        </a>
        <a href="?page=hubs-auth-settings&tab=security" class="nav-tab <?php echo $current_tab === 'security' ? 'nav-tab-active' : ''; ?>">
            Seguridad
        </a>
        <a href="?page=hubs-auth-settings&tab=testing" class="nav-tab <?php echo $current_tab === 'testing' ? 'nav-tab-active' : ''; ?>">
            Testing
        </a>
        <a href="?page=hubs-auth-settings&tab=logs" class="nav-tab <?php echo $current_tab === 'logs' ? 'nav-tab-active' : ''; ?>">
            Logs
        </a>
    </nav>
    
    <form method="post" action="">
        <?php wp_nonce_field('hubs_auth_settings', 'hubs_auth_nonce'); ?>
        
        <?php if ($current_tab === 'general'): ?>
            <!-- General Settings -->
            <div class="tab-content">
                <h2>Configuración General</h2>
                
                <table class="form-table">
                    <tr>
                        <th scope="row">
                            <label for="auto_login_enabled">Auto-login habilitado</label>
                        </th>
                        <td>
                            <input type="checkbox" 
                                   id="auto_login_enabled" 
                                   name="hubs_auth_options[auto_login_enabled]" 
                                   value="1" 
                                   <?php checked(!empty($options['auto_login_enabled'])); ?>>
                            <label for="auto_login_enabled">Permitir auto-login automático via token JWT</label>
                            <p class="description">
                                Habilita el login automático cuando se recibe un token válido en la URL.
                            </p>
                        </td>
                    </tr>
                    
                    <tr>
                        <th scope="row">
                            <label for="token_expiry">Duración del token (horas)</label>
                        </th>
                        <td>
                            <input type="number" 
                                   id="token_expiry" 
                                   name="hubs_auth_options[token_expiry]" 
                                   value="<?php echo esc_attr($options['token_expiry'] ?? 24); ?>"
                                   min="1" 
                                   max="168"
                                   class="small-text">
                            <p class="description">
                                Tiempo de vida de los tokens JWT en horas (máximo 168 horas / 7 días).
                            </p>
                        </td>
                    </tr>
                    
                    <tr>
                        <th scope="row">
                            <label for="allowed_origins">Orígenes permitidos</label>
                        </th>
                        <td>
                            <textarea id="allowed_origins" 
                                      name="hubs_auth_options[allowed_origins]" 
                                      rows="5" 
                                      cols="50" 
                                      class="large-text"><?php echo esc_textarea($options['allowed_origins'] ?? ''); ?></textarea>
                            <p class="description">
                                URLs de las aplicaciones Hubs que pueden acceder (una por línea).<br>
                                Ejemplo: <code>https://spacemall-hubs.com</code>
                            </p>
                        </td>
                    </tr>
                    
                    <tr>
                        <th scope="row">
                            <label for="debug_mode">Modo Debug</label>
                        </th>
                        <td>
                            <input type="checkbox" 
                                   id="debug_mode" 
                                   name="hubs_auth_options[debug_mode]" 
                                   value="1" 
                                   <?php checked(!empty($options['debug_mode'])); ?>>
                            <label for="debug_mode">Activar logging detallado</label>
                            <p class="description">
                                ⚠️ Solo para desarrollo. Genera logs detallados en el error log de WordPress.
                            </p>
                        </td>
                    </tr>
                </table>
            </div>
            
        <?php elseif ($current_tab === 'security'): ?>
            <!-- Security Settings -->
            <div class="tab-content">
                <h2>Configuración de Seguridad</h2>
                
                <table class="form-table">
                    <tr>
                        <th scope="row">
                            <label for="jwt_secret">JWT Secret Key</label>
                        </th>
                        <td>
                            <input type="text" 
                                   id="jwt_secret" 
                                   name="hubs_auth_options[jwt_secret]" 
                                   value="<?php echo esc_attr($options['jwt_secret'] ?? ''); ?>"
                                   class="regular-text"
                                   readonly>
                            <button type="button" id="regenerate-secret" class="button">Regenerar</button>
                            <p class="description">
                                Clave secreta para firmar tokens JWT. <strong>No compartir esta clave.</strong>
                            </p>
                        </td>
                    </tr>
                </table>
                
                <h3>Estado de Seguridad</h3>
                <div class="security-status">
                    <?php
                    $security_checks = [
                        'HTTPS habilitado' => is_ssl(),
                        'Secret key configurado' => !empty($options['jwt_secret']),
                        'Orígenes configurados' => !empty($options['allowed_origins']),
                        'WordPress actualizado' => version_compare(get_bloginfo('version'), '6.0', '>=')
                    ];
                    ?>
                    
                    <ul>
                        <?php foreach ($security_checks as $check => $passed): ?>
                            <li style="color: <?php echo $passed ? 'green' : 'red'; ?>">
                                <span class="dashicons dashicons-<?php echo $passed ? 'yes' : 'no'; ?>"></span>
                                <?php echo esc_html($check); ?>
                            </li>
                        <?php endforeach; ?>
                    </ul>
                </div>
            </div>
            
        <?php elseif ($current_tab === 'testing'): ?>
            <!-- Testing Tools -->
            <div class="tab-content">
                <h2>Herramientas de Testing</h2>
                
                <div class="testing-section">
                    <h3>Generar Token de Prueba</h3>
                    <p class="description">
                        Genera un token JWT para el usuario actual para testing.
                    </p>
                    <button type="button" id="generate-test-token" class="button button-secondary">
                        Generar Token de Prueba
                    </button>
                    <div id="test-token-result" style="margin-top: 10px;"></div>
                </div>
                
                <div class="testing-section" style="margin-top: 30px;">
                    <h3>Verificar Token</h3>
                    <p class="description">
                        Verifica si un token JWT es válido.
                    </p>
                    <textarea id="token-to-verify" 
                              placeholder="Pega aquí el token JWT a verificar..." 
                              rows="3" 
                              cols="80"></textarea><br>
                    <button type="button" id="verify-token" class="button button-secondary">
                        Verificar Token
                    </button>
                    <div id="verify-token-result" style="margin-top: 10px;"></div>
                </div>
                
                <div class="testing-section" style="margin-top: 30px;">
                    <h3>Test de Conexión</h3>
                    <p class="description">
                        Prueba la conectividad con los endpoints de la API.
                    </p>
                    <button type="button" id="test-api-endpoints" class="button button-secondary">
                        Probar Endpoints
                    </button>
                    <div id="api-test-result" style="margin-top: 10px;"></div>
                </div>
                
                <div class="testing-section" style="margin-top: 30px;">
                    <h3>Información del Sistema</h3>
                    <table class="widefat striped">
                        <tbody>
                            <tr>
                                <td><strong>WordPress Version</strong></td>
                                <td><?php echo get_bloginfo('version'); ?></td>
                            </tr>
                            <tr>
                                <td><strong>PHP Version</strong></td>
                                <td><?php echo PHP_VERSION; ?></td>
                            </tr>
                            <tr>
                                <td><strong>Plugin Version</strong></td>
                                <td><?php echo HUBS_AUTH_VERSION; ?></td>
                            </tr>
                            <tr>
                                <td><strong>Site URL</strong></td>
                                <td><?php echo home_url(); ?></td>
                            </tr>
                            <tr>
                                <td><strong>API Base URL</strong></td>
                                <td><?php echo home_url('/wp-json/hubs/v1/'); ?></td>
                            </tr>
                            <tr>
                                <td><strong>HTTPS</strong></td>
                                <td><?php echo is_ssl() ? '✅ Habilitado' : '❌ Deshabilitado'; ?></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
            
        <?php elseif ($current_tab === 'logs'): ?>
            <!-- Logs -->
            <div class="tab-content">
                <h2>Logs del Sistema</h2>
                
                <div class="log-section">
                    <h3>Logs Recientes</h3>
                    <p class="description">
                        Últimas entradas de log del plugin (solo visible si debug mode está activado).
                    </p>
                    
                    <?php if (!empty($options['debug_mode'])): ?>
                        <div id="log-viewer">
                            <button type="button" id="refresh-logs" class="button">Refrescar Logs</button>
                            <button type="button" id="clear-logs" class="button">Limpiar Logs</button>
                            
                            <div id="log-content" style="margin-top: 10px; background: #f1f1f1; padding: 10px; height: 300px; overflow-y: auto; font-family: monospace; font-size: 12px;">
                                <p>Cargando logs...</p>
                            </div>
                        </div>
                    <?php else: ?>
                        <p style="color: #666;">
                            <em>Para ver logs, habilita el "Modo Debug" en la pestaña General.</em>
                        </p>
                    <?php endif; ?>
                </div>
                
                <div class="log-section" style="margin-top: 30px;">
                    <h3>Estadísticas de Uso</h3>
                    <table class="widefat striped">
                        <tbody>
                            <tr>
                                <td><strong>Total de logins procesados</strong></td>
                                <td><?php echo get_option('hubs_auth_login_count', 0); ?></td>
                            </tr>
                            <tr>
                                <td><strong>Tokens generados hoy</strong></td>
                                <td><?php echo get_option('hubs_auth_tokens_today_' . date('Y-m-d'), 0); ?></td>
                            </tr>
                            <tr>
                                <td><strong>Último login exitoso</strong></td>
                                <td><?php 
                                    $last_login = get_option('hubs_auth_last_login');
                                    echo $last_login ? date('Y-m-d H:i:s', $last_login) : 'Nunca';
                                ?></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        <?php endif; ?>
        
        <?php if ($current_tab !== 'logs'): ?>
            <p class="submit">
                <input type="submit" name="submit" id="submit" class="button button-primary" value="Guardar Configuración">
            </p>
        <?php endif; ?>
    </form>
</div>

<!-- JavaScript para funcionalidades de admin -->
<script>
jQuery(document).ready(function($) {
    
    // Regenerar JWT Secret
    $('#regenerate-secret').click(function() {
        if (confirm('¿Estás seguro? Esto invalidará todos los tokens existentes.')) {
            const newSecret = generateRandomString(64);
            $('#jwt_secret').val(newSecret);
            alert('Nueva clave secreta generada. Guarda la configuración para aplicar los cambios.');
        }
    });
    
    // Generar token de prueba
    $('#generate-test-token').click(function() {
        const button = $(this);
        button.prop('disabled', true).text('Generando...');
        
        $.post(ajaxurl, {
            action: 'hubs_auth_generate_test_token',
            nonce: '<?php echo wp_create_nonce('hubs_auth_test'); ?>'
        })
        .done(function(response) {
            if (response.success) {
                $('#test-token-result').html(`
                    <div class="notice notice-success inline">
                        <p><strong>Token generado:</strong></p>
                        <textarea readonly rows="3" cols="80">${response.data.token}</textarea>
                        <p><small>Válido hasta: ${new Date(response.data.expires * 1000).toLocaleString()}</small></p>
                    </div>
                `);
            } else {
                $('#test-token-result').html(`
                    <div class="notice notice-error inline">
                        <p>Error: ${response.data.message}</p>
                    </div>
                `);
            }
        })
        .fail(function() {
            $('#test-token-result').html(`
                <div class="notice notice-error inline">
                    <p>Error de conexión</p>
                </div>
            `);
        })
        .always(function() {
            button.prop('disabled', false).text('Generar Token de Prueba');
        });
    });
    
    // Verificar token
    $('#verify-token').click(function() {
        const token = $('#token-to-verify').val().trim();
        if (!token) {
            alert('Por favor ingresa un token para verificar');
            return;
        }
        
        const button = $(this);
        button.prop('disabled', true).text('Verificando...');
        
        $.post(ajaxurl, {
            action: 'hubs_auth_verify_test_token',
            token: token,
            nonce: '<?php echo wp_create_nonce('hubs_auth_test'); ?>'
        })
        .done(function(response) {
            if (response.success) {
                $('#verify-token-result').html(`
                    <div class="notice notice-success inline">
                        <p><strong>Token válido</strong></p>
                        <ul>
                            <li>Usuario: ${response.data.user.display_name} (${response.data.user.email})</li>
                            <li>Expira: ${new Date(response.data.user.exp * 1000).toLocaleString()}</li>
                            <li>Emitido: ${new Date(response.data.user.iat * 1000).toLocaleString()}</li>
                        </ul>
                    </div>
                `);
            } else {
                $('#verify-token-result').html(`
                    <div class="notice notice-error inline">
                        <p>Token inválido: ${response.data.message}</p>
                    </div>
                `);
            }
        })
        .always(function() {
            button.prop('disabled', false).text('Verificar Token');
        });
    });
    
    // Test API endpoints
    $('#test-api-endpoints').click(function() {
        const button = $(this);
        button.prop('disabled', true).text('Probando...');
        
        const endpoints = [
            { name: 'Login', url: '/wp-json/hubs/v1/login' },
            { name: 'Verify', url: '/wp-json/hubs/v1/verify' },
            { name: 'Generate Token', url: '/wp-json/hubs/v1/generate-token' }
        ];
        
        let results = '<div class="notice notice-info inline"><p><strong>Resultados del test:</strong></p><ul>';
        
        endpoints.forEach(function(endpoint) {
            $.get(endpoint.url)
            .done(function() {
                results += `<li style="color: green;">✅ ${endpoint.name}: Accesible</li>`;
            })
            .fail(function(xhr) {
                if (xhr.status === 401 || xhr.status === 400) {
                    results += `<li style="color: green;">✅ ${endpoint.name}: Funcional (${xhr.status})</li>`;
                } else {
                    results += `<li style="color: red;">❌ ${endpoint.name}: Error ${xhr.status}</li>`;
                }
            })
            .always(function() {
                results += '</ul></div>';
                $('#api-test-result').html(results);
                button.prop('disabled', false).text('Probar Endpoints');
            });
        });
    });
    
    // Refrescar logs
    $('#refresh-logs').click(function() {
        // Implementar carga de logs via AJAX
        $('#log-content').html('<p>Función de logs en desarrollo...</p>');
    });
    
    // Función auxiliar para generar string random
    function generateRandomString(length) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
});
</script>

<style>
.tab-content {
    margin-top: 20px;
}

.testing-section {
    border: 1px solid #ddd;
    padding: 20px;
    margin-bottom: 20px;
    background: #fff;
}

.security-status ul {
    list-style: none;
    padding: 0;
}

.security-status li {
    padding: 5px 0;
}

.log-section {
    margin-bottom: 30px;
}

#log-content {
    border: 1px solid #ddd;
}

.notice.inline {
    margin: 10px 0;
    padding: 10px;
}
</style>