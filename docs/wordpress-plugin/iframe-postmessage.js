/**
 * Hubs WordPress Integration - PostMessage Bridge para Iframe
 *
 * Este script detecta cuando WordPress está dentro de un iframe de Hubs
 * y envía mensajes PostMessage cuando el usuario hace login/logout.
 */

(function() {
    'use strict';

    const DEBUG = true;
    const HUBS_ORIGIN = window.location.ancestorOrigins ? window.location.ancestorOrigins[0] : '*';

    function log(message, data) {
        if (DEBUG) {
            console.log('[WP PostMessage]', message, data || '');
        }
    }

    /**
     * Verificar si estamos en un iframe
     */
    function isInIframe() {
        try {
            return window.self !== window.top;
        } catch (e) {
            return true;
        }
    }

    /**
     * Enviar mensaje al parent (Hubs)
     */
    function sendMessageToParent(type, data = {}) {
        if (!isInIframe()) {
            log('No estamos en iframe, no enviar mensaje');
            return;
        }

        const message = {
            type: type,
            data: data,
            timestamp: Date.now(),
            source: 'wordpress'
        };

        log('Enviando mensaje a parent:', message);

        try {
            window.parent.postMessage(message, HUBS_ORIGIN);
        } catch (error) {
            log('Error enviando mensaje:', error);
        }
    }

    /**
     * Notificar que WordPress está listo
     */
    function notifyReady() {
        sendMessageToParent('HUBS_IFRAME_READY', {
            url: window.location.href,
            title: document.title
        });
    }

    /**
     * Obtener información del usuario actual (desde variable inyectada)
     */
    function getCurrentUserInfo() {
        // Estos datos deben ser inyectados por PHP
        if (window.hubsUserData) {
            return window.hubsUserData;
        }

        return null;
    }

    /**
     * Verificar estado de login actual directamente con el servidor
     */
    async function checkCurrentLoginStatus() {
        try {
            const url = window.location.origin + '/wp-json/hubs/v1/generate-token';
            const response = await fetch(url, {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.user) {
                    log('✅ Usuario logueado verificado vía API');
                    // Actualizar hubsUserData con la info más reciente
                    window.hubsUserData = {
                        logged_in: true,
                        id: data.user.id,
                        username: data.user.username,
                        email: data.user.email,
                        display_name: data.user.display_name,
                        avatar_url: data.user.avatar_url || '',
                        token: data.token // Incluir el token
                    };
                    return { logged_in: true, token: data.token, ...data.user };
                }
            }

            return { logged_in: false };
        } catch (error) {
            log('⚠️ Error verificando login status:', error);
            return getCurrentUserInfo() || { logged_in: false };
        }
    }

    /**
     * Notificar login exitoso
     */
    async function notifyLoginSuccess() {
        const userInfo = getCurrentUserInfo();

        if (userInfo && userInfo.logged_in) {
            log('✅ Usuario logueado detectado:', userInfo);

            // Verificar si el token ya viene en hubsUserData (generado por PHP)
            let token = userInfo.token;

            if (token) {
                log('✅ Token ya disponible en hubsUserData:', token.substring(0, 20) + '...');
            } else {
                // Fallback: intentar generar token via API
                try {
                    log('🔄 Token no en hubsUserData, generando via API...');
                    token = await generateJWTToken();

                    if (!token) {
                        throw new Error('Token vacío recibido del endpoint');
                    }

                    log('✅ Token generado via API exitosamente:', token.substring(0, 20) + '...');
                } catch (error) {
                    log('❌ Error crítico generando token:', error);

                    // Mostrar error al usuario
                    if (window.confirm('No se pudo generar el token de autenticación.\n\n' + error.message + '\n\n¿Deseas intentar de nuevo?')) {
                        setTimeout(() => notifyLoginSuccess(), 1000);
                        return;
                    }
                    return;
                }
            }

            const payload = {
                user: {
                    id: userInfo.id,
                    username: userInfo.username,
                    email: userInfo.email,
                    display_name: userInfo.display_name,
                    avatar_url: userInfo.avatar_url
                },
                token: token,
                timestamp: Date.now()
            };

            log('📤 Enviando login success con token a Hubs:', payload);
            sendMessageToParent('HUBS_WORDPRESS_LOGIN_SUCCESS', payload);

        } else {
            log('⚠️ No se puede notificar login - usuario no logueado o info incompleta');
        }
    }

    /**
     * Generar token JWT desde WordPress
     */
    async function generateJWTToken() {
        try {
            const url = window.location.origin + '/wp-json/hubs/v1/generate-token';
            log('🔗 Llamando a:', url);

            const response = await fetch(url, {
                method: 'POST',
                credentials: 'same-origin', // Importante: same-origin para incluir cookies
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            log('📡 Response status:', response.status);
            log('📡 Response ok:', response.ok);

            if (!response.ok) {
                const errorText = await response.text();
                log('❌ Error response body:', errorText);
                throw new Error('Error HTTP ' + response.status + ': ' + errorText);
            }

            const data = await response.json();
            log('📦 Response data:', data);

            if (data.success && data.token) {
                log('✅ Token válido recibido');
                return data.token;
            } else {
                throw new Error('Respuesta inválida: ' + (data.message || 'Token no presente'));
            }
        } catch (error) {
            log('❌ Error en generateJWTToken:', error);
            throw error;
        }
    }

    /**
     * Notificar logout
     */
    function notifyLogout() {
        log('Logout detectado');

        sendMessageToParent('HUBS_WORDPRESS_LOGOUT', {
            timestamp: Date.now()
        });
    }

    /**
     * Escuchar mensajes del parent (Hubs)
     */
    function setupParentListener() {
        window.addEventListener('message', function(event) {
            // En producción, validar event.origin contra lista de orígenes permitidos

            const { type, data } = event.data || {};
            log('Mensaje recibido del parent:', { type, data });

            switch (type) {
                case 'HUBS_PARENT_READY':
                    log('Parent (Hubs) está listo');
                    // Notificar estado actual
                    const userInfo = getCurrentUserInfo();
                    if (userInfo && userInfo.logged_in) {
                        notifyLoginSuccess();
                    }
                    break;

                case 'HUBS_REQUEST_STATUS':
                    log('Parent solicita estado actual');
                    const currentUser = getCurrentUserInfo();
                    if (currentUser && currentUser.logged_in) {
                        notifyLoginSuccess();
                    }
                    break;
            }
        });
    }

    /**
     * Detectar cambios de login en la página
     */
    function detectLoginChanges() {
        // Inicializar el estado actual sin notificar
        let lastLoginState = getCurrentUserInfo()?.logged_in || false;
        let initialStateSet = false;
        let checkCount = 0;

        setInterval(async function() {
            checkCount++;

            // Cada 5 verificaciones (2.5 segundos), verificar con el servidor
            // para capturar cambios que no se reflejan en hubsUserData
            let currentLoginState;
            if (checkCount % 5 === 0) {
                const serverStatus = await checkCurrentLoginStatus();
                currentLoginState = serverStatus.logged_in;
                log('🔄 Verificación con servidor:', { logged_in: currentLoginState, check: checkCount });
            } else {
                const currentUser = getCurrentUserInfo();
                currentLoginState = currentUser?.logged_in || false;
            }

            // Primera verificación: solo establecer el estado inicial sin notificar
            if (!initialStateSet) {
                lastLoginState = currentLoginState;
                initialStateSet = true;
                log('Estado inicial establecido:', { logged_in: currentLoginState });
                return;
            }

            // Detectar cambios de estado
            if (currentLoginState !== lastLoginState) {
                log('✨ Cambio de estado de login detectado:', {
                    was: lastLoginState,
                    now: currentLoginState,
                    check: checkCount
                });

                if (currentLoginState) {
                    notifyLoginSuccess();
                } else {
                    notifyLogout();
                }

                lastLoginState = currentLoginState;
            }
        }, 500); // Verificar cada 500ms
    }

    /**
     * Inicializar
     */
    function init() {
        log('Inicializando PostMessage bridge');
        log('En iframe:', isInIframe());
        log('Datos de usuario:', getCurrentUserInfo());

        if (!isInIframe()) {
            log('No estamos en iframe, no inicializar bridge');
            return;
        }

        // Configurar listener para mensajes del parent
        setupParentListener();

        // Notificar que estamos listos
        notifyReady();

        // Detectar cambios de login
        detectLoginChanges();

        // NO notificar automáticamente si ya estamos logueados
        // Solo notificar cuando hay un cambio de estado (de no-logueado a logueado)

        log('PostMessage bridge inicializado');
    }

    // Inicializar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
