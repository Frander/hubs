<?php
/**
 * Script de testing para endpoints de Hubs Auth Integration
 * Ejecutar desde navegador para probar la funcionalidad del plugin
 */

// Solo ejecutar si se accede directamente y WordPress está cargado
if (!defined('ABSPATH')) {
    // Intentar cargar WordPress
    $wp_load = dirname(__FILE__) . '/../../../../wp-load.php';
    if (file_exists($wp_load)) {
        require_once $wp_load;
    } else {
        die('Error: No se puede cargar WordPress. Coloca este archivo en el directorio del plugin.');
    }
}

// Solo permitir a administradores
if (!current_user_can('manage_options')) {
    die('Error: Sin permisos suficientes.');
}

?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hubs Auth - Test Endpoints</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 1200px; margin: 20px auto; padding: 20px; }
        .test-section { border: 1px solid #ddd; margin: 20px 0; padding: 20px; background: #f9f9f9; }
        .result { margin: 10px 0; padding: 10px; border-radius: 4px; }
        .success { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; }
        .error { background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; }
        .info { background: #d1ecf1; border: 1px solid #bee5eb; color: #0c5460; }
        button { padding: 8px 16px; margin: 5px; cursor: pointer; }
        textarea { width: 100%; height: 100px; font-family: monospace; }
        input[type="text"], input[type="password"] { padding: 8px; margin: 5px; width: 200px; }
    </style>
</head>
<body>
    <h1>🧪 Hubs Authentication - Test Suite</h1>
    <p><strong>WordPress Site:</strong> <?php echo home_url(); ?></p>
    <p><strong>Current User:</strong> <?php echo wp_get_current_user()->display_name; ?> (<?php echo wp_get_current_user()->user_email; ?>)</p>
    
    <!-- Test 1: Generar Token -->
    <div class="test-section">
        <h2>1. Generar Token JWT</h2>
        <p>Genera un token JWT para el usuario actual.</p>
        <button onclick="generateToken()">Generar Token</button>
        <div id="generate-result"></div>
    </div>
    
    <!-- Test 2: Verificar Token -->
    <div class="test-section">
        <h2>2. Verificar Token</h2>
        <p>Verifica si un token JWT es válido.</p>
        <textarea id="token-input" placeholder="Pega aquí el token JWT..."></textarea><br>
        <button onclick="verifyToken()">Verificar Token</button>
        <div id="verify-result"></div>
    </div>
    
    <!-- Test 3: Login API -->
    <div class="test-section">
        <h2>3. Test Login API</h2>
        <p>Prueba el endpoint de login con credenciales.</p>
        <input type="text" id="login-username" placeholder="Username">
        <input type="password" id="login-password" placeholder="Password"><br>
        <button onclick="testLogin()">Test Login</button>
        <div id="login-result"></div>
    </div>
    
    <!-- Test 4: Auto-login URL -->
    <div class="test-section">
        <h2>4. Test Auto-login URL</h2>
        <p>Genera una URL de auto-login y ábrela en nueva ventana.</p>
        <input type="text" id="target-path" value="/mi-cuenta/" placeholder="Ruta destino">
        <button onclick="testAutoLogin()">Generar URL y Abrir</button>
        <div id="autoLogin-result"></div>
    </div>
    
    <!-- Test 5: Iframe Integration -->
    <div class="test-section">
        <h2>5. Test Iframe Integration</h2>
        <p>Simula la integración iframe con comunicación PostMessage.</p>
        <button onclick="testIframe()">Abrir Iframe Test</button>
        <button onclick="closeIframe()">Cerrar Iframe</button>
        <div id="iframe-result"></div>
        <div id="iframe-container" style="display: none; margin-top: 20px;">
            <iframe id="test-iframe" width="100%" height="400" frameborder="1"></iframe>
        </div>
    </div>
    
    <!-- Test 6: CORS Headers -->
    <div class="test-section">
        <h2>6. Test CORS Headers</h2>
        <p>Verifica la configuración de headers CORS.</p>
        <button onclick="testCORS()">Test CORS</button>
        <div id="cors-result"></div>
    </div>
    
    <!-- Test 7: Performance -->
    <div class="test-section">
        <h2>7. Test Performance</h2>
        <p>Prueba la velocidad de generación y verificación de tokens.</p>
        <button onclick="performanceTest()">Ejecutar Test de Performance</button>
        <div id="performance-result"></div>
    </div>

    <script>
        const baseURL = '<?php echo home_url(); ?>';
        const apiURL = baseURL + '/wp-json/hubs/v1';
        let currentToken = '';
        let iframeMessages = [];
        
        // Funciones de testing
        async function generateToken() {
            showLoading('generate-result');
            try {
                const response = await fetch(apiURL + '/generate-token', {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                    }
                });
                
                const data = await response.json();
                
                if (data.success) {
                    currentToken = data.token;
                    showResult('generate-result', `
                        <div class="success">
                            <p><strong>✅ Token generado exitosamente</strong></p>
                            <p><strong>Usuario:</strong> ${data.user.display_name} (${data.user.email})</p>
                            <p><strong>Token:</strong></p>
                            <textarea readonly>${data.token}</textarea>
                        </div>
                    `);
                } else {
                    showResult('generate-result', `
                        <div class="error">❌ Error: ${data.message}</div>
                    `);
                }
            } catch (error) {
                showResult('generate-result', `
                    <div class="error">❌ Error de conexión: ${error.message}</div>
                `);
            }
        }
        
        async function verifyToken() {
            const token = document.getElementById('token-input').value.trim();
            if (!token) {
                showResult('verify-result', '<div class="error">❌ Por favor ingresa un token</div>');
                return;
            }
            
            showLoading('verify-result');
            try {
                const response = await fetch(apiURL + '/verify', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ token: token })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    showResult('verify-result', `
                        <div class="success">
                            <p><strong>✅ Token válido</strong></p>
                            <p><strong>Usuario:</strong> ${data.user.display_name} (${data.user.email})</p>
                            <p><strong>Expira:</strong> ${new Date(data.expires_at * 1000).toLocaleString()}</p>
                        </div>
                    `);
                } else {
                    showResult('verify-result', `
                        <div class="error">❌ Token inválido: ${data.message}</div>
                    `);
                }
            } catch (error) {
                showResult('verify-result', `
                    <div class="error">❌ Error: ${error.message}</div>
                `);
            }
        }
        
        async function testLogin() {
            const username = document.getElementById('login-username').value;
            const password = document.getElementById('login-password').value;
            
            if (!username || !password) {
                showResult('login-result', '<div class="error">❌ Ingresa usuario y contraseña</div>');
                return;
            }
            
            showLoading('login-result');
            try {
                const response = await fetch(apiURL + '/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        username: username,
                        password: password
                    })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    currentToken = data.token;
                    showResult('login-result', `
                        <div class="success">
                            <p><strong>✅ Login exitoso</strong></p>
                            <p><strong>Usuario:</strong> ${data.user.display_name}</p>
                            <p><strong>Token generado:</strong> ${data.token.substring(0, 50)}...</p>
                        </div>
                    `);
                } else {
                    showResult('login-result', `
                        <div class="error">❌ Login fallido: ${data.message}</div>
                    `);
                }
            } catch (error) {
                showResult('login-result', `
                    <div class="error">❌ Error: ${error.message}</div>
                `);
            }
        }
        
        async function testAutoLogin() {
            if (!currentToken) {
                showResult('autoLogin-result', '<div class="error">❌ Primero genera un token</div>');
                return;
            }
            
            const path = document.getElementById('target-path').value;
            const autoLoginURL = `${baseURL}${path}?hub_token=${currentToken}`;
            
            showResult('autoLogin-result', `
                <div class="info">
                    <p><strong>🔗 URL generada:</strong></p>
                    <textarea readonly>${autoLoginURL}</textarea>
                    <p><a href="${autoLoginURL}" target="_blank">👆 Click para abrir en nueva ventana</a></p>
                </div>
            `);
            
            // Abrir automáticamente
            window.open(autoLoginURL, '_blank');
        }
        
        function testIframe() {
            if (!currentToken) {
                showResult('iframe-result', '<div class="error">❌ Primero genera un token</div>');
                return;
            }
            
            const iframe = document.getElementById('test-iframe');
            const container = document.getElementById('iframe-container');
            
            // Configurar listener para mensajes del iframe
            window.addEventListener('message', handleIframeMessage);
            
            // Cargar iframe con token
            const iframeSrc = `${baseURL}/mi-cuenta/?hub_token=${currentToken}`;
            iframe.src = iframeSrc;
            container.style.display = 'block';
            
            iframeMessages = [];
            showResult('iframe-result', `
                <div class="info">
                    <p><strong>🖼️ Iframe cargado con auto-login</strong></p>
                    <p>URL: ${iframeSrc}</p>
                    <div id="iframe-messages"></div>
                </div>
            `);
        }
        
        function handleIframeMessage(event) {
            // Log todos los mensajes del iframe
            iframeMessages.push({
                timestamp: new Date().toLocaleTimeString(),
                origin: event.origin,
                type: event.data.type || 'unknown',
                data: event.data
            });
            
            updateIframeMessages();
        }
        
        function updateIframeMessages() {
            const messagesDiv = document.getElementById('iframe-messages');
            if (messagesDiv) {
                const messagesHTML = iframeMessages.map(msg => 
                    `<p><small>[${msg.timestamp}] ${msg.type}: ${JSON.stringify(msg.data)}</small></p>`
                ).join('');
                
                messagesDiv.innerHTML = `<h4>Mensajes recibidos:</h4>${messagesHTML}`;
            }
        }
        
        function closeIframe() {
            document.getElementById('iframe-container').style.display = 'none';
            document.getElementById('test-iframe').src = 'about:blank';
            window.removeEventListener('message', handleIframeMessage);
        }
        
        async function testCORS() {
            showLoading('cors-result');
            
            try {
                // Test desde origen diferente (simulado)
                const response = await fetch(apiURL + '/verify', {
                    method: 'OPTIONS',
                });
                
                const headers = {};
                for (let [key, value] of response.headers.entries()) {
                    if (key.includes('access-control') || key.includes('cors')) {
                        headers[key] = value;
                    }
                }
                
                showResult('cors-result', `
                    <div class="success">
                        <p><strong>✅ CORS Headers configurados:</strong></p>
                        <pre>${JSON.stringify(headers, null, 2)}</pre>
                    </div>
                `);
            } catch (error) {
                showResult('cors-result', `
                    <div class="error">❌ Error CORS: ${error.message}</div>
                `);
            }
        }
        
        async function performanceTest() {
            showLoading('performance-result');
            
            const tests = [];
            const iterations = 10;
            
            // Test generación de tokens
            for (let i = 0; i < iterations; i++) {
                const start = performance.now();
                try {
                    const response = await fetch(apiURL + '/generate-token', {
                        method: 'POST',
                        credentials: 'include'
                    });
                    await response.json();
                    const end = performance.now();
                    tests.push(end - start);
                } catch (error) {
                    console.error('Error en performance test:', error);
                }
            }
            
            const avgTime = tests.reduce((a, b) => a + b, 0) / tests.length;
            const minTime = Math.min(...tests);
            const maxTime = Math.max(...tests);
            
            showResult('performance-result', `
                <div class="success">
                    <p><strong>📊 Resultados Performance (${iterations} iteraciones):</strong></p>
                    <ul>
                        <li><strong>Tiempo promedio:</strong> ${avgTime.toFixed(2)}ms</li>
                        <li><strong>Tiempo mínimo:</strong> ${minTime.toFixed(2)}ms</li>
                        <li><strong>Tiempo máximo:</strong> ${maxTime.toFixed(2)}ms</li>
                        <li><strong>Requests/segundo:</strong> ${(1000 / avgTime).toFixed(2)}</li>
                    </ul>
                </div>
            `);
        }
        
        // Funciones auxiliares
        function showLoading(elementId) {
            document.getElementById(elementId).innerHTML = '<div class="info">⏳ Cargando...</div>';
        }
        
        function showResult(elementId, html) {
            document.getElementById(elementId).innerHTML = html;
        }
        
        // Auto-ejecutar algunos tests al cargar
        window.onload = function() {
            console.log('🧪 Hubs Auth Test Suite cargado');
            console.log('Base URL:', baseURL);
            console.log('API URL:', apiURL);
        };
    </script>
</body>
</html>