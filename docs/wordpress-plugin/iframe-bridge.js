/**
 * Hubs Authentication Integration - Iframe Bridge
 * Maneja comunicación entre iframe WordPress y aplicación Hubs padre
 * Version: 1.0.0
 */

(function() {
    'use strict';
    
    // Solo ejecutar si estamos en iframe
    if (window.parent === window || !window.hubsAuth) {
        console.log('Hubs Auth Bridge: No se detectó contexto de iframe válido');
        return;
    }
    
    // Configuración desde WordPress
    const config = {
        isLoggedIn: window.hubsAuth.isLoggedIn || false,
        userId: window.hubsAuth.userId || null,
        userEmail: window.hubsAuth.userEmail || '',
        displayName: window.hubsAuth.displayName || '',
        allowedOrigins: window.hubsAuth.allowedOrigins || [],
        debugMode: window.hubsAuth.debugMode || false
    };
    
    // Variables de estado
    let communicationEstablished = false;
    let lastLoginState = config.isLoggedIn;
    let heartbeatInterval;
    let loginCheckInterval;
    
    /**
     * Logging con debug condicional
     */
    function debugLog(message, data = null) {
        if (config.debugMode) {
            console.log(`[Hubs Auth Bridge] ${message}`, data || '');
        }
    }
    
    /**
     * Verificar si el origen es permitido
     */
    function isOriginAllowed(origin) {
        if (!origin || config.allowedOrigins.length === 0) return false;
        
        return config.allowedOrigins.some(allowedOrigin => {
            return origin === allowedOrigin || origin.endsWith(allowedOrigin.replace('https://', ''));
        });
    }
    
    /**
     * Enviar mensaje al padre con validación de origen
     */
    function sendToParent(messageType, data = {}, targetOrigin = '*') {
        if (!window.parent) return;
        
        const message = {
            type: messageType,
            source: 'hubs-wordpress-iframe',
            data: data,
            timestamp: Date.now(),
            url: window.location.href
        };
        
        try {
            debugLog(`Enviando mensaje: ${messageType}`, message);
            window.parent.postMessage(message, targetOrigin);
        } catch (error) {
            debugLog(`Error enviando mensaje: ${error.message}`);
        }
    }
    
    /**
     * Obtener datos actuales del usuario
     */
    function getCurrentUserData() {
        // Detectar estado de login dinámicamente
        const bodyClasses = document.body.classList;
        const isCurrentlyLoggedIn = bodyClasses.contains('logged-in') || 
                                   bodyClasses.contains('admin-bar') ||
                                   document.querySelector('.wp-admin-bar') !== null;
        
        // Intentar obtener datos del usuario desde elementos DOM
        let currentUserEmail = config.userEmail;
        let currentDisplayName = config.displayName;
        let currentUserId = config.userId;
        
        // Buscar datos en elementos específicos del tema
        const emailElement = document.querySelector('[data-user-email]') || 
                           document.querySelector('.user-email');
        const nameElement = document.querySelector('[data-user-name]') || 
                          document.querySelector('.user-display-name') ||
                          document.querySelector('.username');
        
        if (emailElement) {
            currentUserEmail = emailElement.dataset.userEmail || emailElement.textContent.trim();
        }
        
        if (nameElement) {
            currentDisplayName = nameElement.dataset.userName || nameElement.textContent.trim();
        }
        
        return {
            isLoggedIn: isCurrentlyLoggedIn,
            userId: currentUserId,
            email: currentUserEmail,
            displayName: currentDisplayName,
            avatarUrl: getAvatarUrl(),
            loginUrl: getLoginUrl(),
            accountUrl: getAccountUrl()
        };
    }
    
    /**
     * Obtener URL del avatar del usuario
     */
    function getAvatarUrl() {
        const avatarImg = document.querySelector('.avatar') || 
                         document.querySelector('[class*="avatar"]') ||
                         document.querySelector('img[src*="gravatar"]');
        
        return avatarImg ? avatarImg.src : null;
    }
    
    /**
     * Obtener URL de login
     */
    function getLoginUrl() {
        const loginLink = document.querySelector('a[href*="wp-login"]') ||
                         document.querySelector('a[href*="/login"]') ||
                         document.querySelector('.login-link a');
        
        return loginLink ? loginLink.href : `${window.location.origin}/wp-login.php`;
    }
    
    /**
     * Obtener URL de cuenta/perfil
     */
    function getAccountUrl() {
        const accountLink = document.querySelector('a[href*="mi-cuenta"]') ||
                          document.querySelector('a[href*="/account"]') ||
                          document.querySelector('a[href*="profile"]') ||
                          document.querySelector('.account-link a');
        
        return accountLink ? accountLink.href : `${window.location.origin}/mi-cuenta/`;
    }
    
    /**
     * Notificar estado de login al padre
     */
    function notifyLoginStatus(forced = false) {
        const currentData = getCurrentUserData();
        
        // Solo enviar si hay cambios o es forzado
        if (forced || currentData.isLoggedIn !== lastLoginState) {
            debugLog('Cambio de estado de login detectado', {
                previous: lastLoginState,
                current: currentData.isLoggedIn
            });
            
            sendToParent('HUBS_WORDPRESS_LOGIN_STATUS', {
                user: currentData,
                stateChanged: currentData.isLoggedIn !== lastLoginState,
                timestamp: Date.now()
            });
            
            lastLoginState = currentData.isLoggedIn;
        }
    }
    
    /**
     * Establecer comunicación con el padre
     */
    function establishCommunication() {
        debugLog('Estableciendo comunicación con aplicación padre');
        
        sendToParent('HUBS_IFRAME_READY', {
            url: window.location.href,
            title: document.title,
            ready: true
        });
        
        // Enviar estado inicial
        setTimeout(() => {
            notifyLoginStatus(true);
        }, 100);
        
        communicationEstablished = true;
    }
    
    /**
     * Manejar mensajes del padre
     */
    function handleParentMessage(event) {
        // Validar origen
        if (!isOriginAllowed(event.origin)) {
            debugLog(`Origen no permitido: ${event.origin}`);
            return;
        }
        
        if (!event.data || typeof event.data !== 'object') {
            return;
        }
        
        const { type, data } = event.data;
        
        debugLog(`Mensaje recibido del padre: ${type}`, event.data);
        
        switch (type) {
            case 'HUBS_REQUEST_LOGIN_STATUS':
                notifyLoginStatus(true);
                break;
                
            case 'HUBS_REQUEST_USER_DATA':
                sendToParent('HUBS_USER_DATA_RESPONSE', {
                    user: getCurrentUserData()
                });
                break;
                
            case 'HUBS_PING':
                sendToParent('HUBS_PONG', {
                    timestamp: Date.now()
                });
                break;
                
            case 'HUBS_NAVIGATION_REQUEST':
                if (data && data.url) {
                    handleNavigationRequest(data.url);
                }
                break;
                
            case 'HUBS_LOGOUT_REQUEST':
                handleLogoutRequest();
                break;
                
            default:
                debugLog(`Tipo de mensaje no reconocido: ${type}`);
        }
    }
    
    /**
     * Manejar solicitud de navegación
     */
    function handleNavigationRequest(url) {
        debugLog(`Solicitud de navegación a: ${url}`);
        
        try {
            // Validar que la URL sea del mismo dominio
            const targetUrl = new URL(url, window.location.origin);
            if (targetUrl.origin === window.location.origin) {
                window.location.href = targetUrl.href;
            } else {
                debugLog('URL de navegación rechazada - dominio diferente');
            }
        } catch (error) {
            debugLog(`Error en navegación: ${error.message}`);
        }
    }
    
    /**
     * Manejar solicitud de logout
     */
    function handleLogoutRequest() {
        debugLog('Solicitud de logout recibida');
        
        // Buscar enlace de logout
        const logoutLink = document.querySelector('a[href*="wp-login.php?action=logout"]') ||
                          document.querySelector('a[href*="logout"]') ||
                          document.querySelector('.logout-link a');
        
        if (logoutLink) {
            logoutLink.click();
        } else {
            // Fallback: navegar a logout URL
            window.location.href = `${window.location.origin}/wp-login.php?action=logout`;
        }
    }
    
    /**
     * Observar cambios en el DOM que indiquen login/logout
     */
    function observeLoginChanges() {
        // Observer para cambios en el body class
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const currentState = getCurrentUserData();
                    if (currentState.isLoggedIn !== lastLoginState) {
                        debugLog('Cambio de login detectado via DOM mutation');
                        notifyLoginStatus();
                    }
                }
            });
        });
        
        observer.observe(document.body, {
            attributes: true,
            attributeFilter: ['class']
        });
        
        // Observer para admin bar (WordPress)
        const adminBarObserver = new MutationObserver(() => {
            const hasAdminBar = document.querySelector('.wp-admin-bar') !== null;
            const currentState = getCurrentUserData();
            
            if (currentState.isLoggedIn !== lastLoginState) {
                debugLog('Cambio de login detectado via admin bar');
                notifyLoginStatus();
            }
        });
        
        adminBarObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    
    /**
     * Configurar heartbeat para mantener comunicación
     */
    function setupHeartbeat() {
        heartbeatInterval = setInterval(() => {
            if (communicationEstablished) {
                sendToParent('HUBS_HEARTBEAT', {
                    timestamp: Date.now(),
                    url: window.location.href
                });
            }
        }, 30000); // Cada 30 segundos
    }
    
    /**
     * Monitoreo periódico del estado de login
     */
    function setupLoginMonitoring() {
        loginCheckInterval = setInterval(() => {
            notifyLoginStatus();
        }, 2000); // Cada 2 segundos
    }
    
    /**
     * Limpiar recursos al cerrar
     */
    function cleanup() {
        if (heartbeatInterval) clearInterval(heartbeatInterval);
        if (loginCheckInterval) clearInterval(loginCheckInterval);
        
        debugLog('Recursos limpiados');
    }
    
    /**
     * Inicialización principal
     */
    function init() {
        debugLog('Inicializando Hubs Auth Bridge', config);
        
        // Configurar listeners
        window.addEventListener('message', handleParentMessage, false);
        window.addEventListener('beforeunload', cleanup, false);
        
        // Establecer comunicación inicial
        establishCommunication();
        
        // Configurar observadores
        observeLoginChanges();
        
        // Configurar monitoreo
        setupHeartbeat();
        setupLoginMonitoring();
        
        debugLog('Hubs Auth Bridge inicializado correctamente');
    }
    
    // Inicializar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        // DOM ya está listo
        setTimeout(init, 100);
    }
    
    // Exportar funciones para debugging (solo en modo debug)
    if (config.debugMode) {
        window.hubsAuthBridge = {
            getCurrentUserData,
            notifyLoginStatus,
            sendToParent,
            config
        };
    }
    
})();