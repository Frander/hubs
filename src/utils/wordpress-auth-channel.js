import AuthChannel from "./auth-channel";
import { connectToReticulum } from "./phoenix-utils";

/**
 * WordPress Authentication Channel
 * Extiende AuthChannel para soportar autenticación con WordPress
 */
export default class WordPressAuthChannel extends AuthChannel {
  constructor(store, config = {}) {
    super(store);
    
    this.wpBaseUrl = config.wpBaseUrl || 'https://spacemall.es';
    this.debug = config.debug || false;
    this.timeout = config.timeout || 10000; // 10 segundos
    
    this._debugLog('WordPressAuthChannel inicializado', { wpBaseUrl: this.wpBaseUrl });
  }

  /**
   * Autenticar usuario con credenciales WordPress
   */
  async authenticateWithWordPress(username, password) {
    this._debugLog('Iniciando autenticación WordPress', { username });
    
    try {
      const response = await this._makeRequest('/wp-json/hubs/v1/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username.trim(),
          password: password
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Error de conexión' }));
        throw new Error(errorData.message || `Error HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Login fallido');
      }

      // Manejar credenciales usando el sistema existente de AuthChannel
      await this.handleAuthCredentials(data.user.email, data.token);
      
      this._debugLog('Autenticación WordPress exitosa', {
        user: data.user.display_name,
        email: data.user.email
      });

      return {
        success: true,
        user: data.user,
        token: data.token
      };

    } catch (error) {
      this._debugLog('Error en autenticación WordPress', { error: error.message });
      throw new Error(`Login fallido: ${error.message}`);
    }
  }

  /**
   * Verificar si un token JWT de WordPress es válido
   */
  async verifyWordPressToken(token) {
    this._debugLog('Verificando token WordPress');
    
    try {
      const response = await this._makeRequest('/wp-json/hubs/v1/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token })
      });

      const data = await response.json();
      
      if (data.success) {
        this._debugLog('Token WordPress válido', { user: data.user });
        return {
          valid: true,
          user: data.user,
          expiresAt: data.expires_at
        };
      } else {
        this._debugLog('Token WordPress inválido', { message: data.message });
        return { valid: false, error: data.message };
      }

    } catch (error) {
      this._debugLog('Error verificando token', { error: error.message });
      return { valid: false, error: error.message };
    }
  }

  /**
   * Generar token para usuario actualmente autenticado en WordPress
   */
  async generateTokenFromWordPress() {
    this._debugLog('Generando token desde WordPress actual');
    
    try {
      const response = await this._makeRequest('/wp-json/hubs/v1/generate-token', {
        method: 'POST',
        credentials: 'include' // Incluir cookies de WordPress
      });

      const data = await response.json();
      
      if (data.success) {
        this._debugLog('Token generado desde WordPress', { user: data.user });
        
        // Manejar credenciales
        await this.handleAuthCredentials(data.user.email, data.token);
        
        return {
          success: true,
          user: data.user,
          token: data.token
        };
      } else {
        throw new Error(data.message || 'No se pudo generar token');
      }

    } catch (error) {
      this._debugLog('Error generando token', { error: error.message });
      throw error;
    }
  }

  /**
   * Generar URL de iframe con token para auto-login
   */
  generateIframeUrl(targetPath = '/mi-cuenta/') {
    const token = this.store.state.credentials.token;
    
    if (!token) {
      this._debugLog('Sin token disponible para iframe');
      return `${this.wpBaseUrl}${targetPath}`;
    }
    
    const url = new URL(`${this.wpBaseUrl}${targetPath}`);
    url.searchParams.append('hub_token', token);
    
    this._debugLog('URL iframe generada', { url: url.toString() });
    return url.toString();
  }

  /**
   * Cerrar sesión en WordPress
   */
  async logoutFromWordPress() {
    this._debugLog('Cerrando sesión WordPress');
    
    try {
      await this._makeRequest('/wp-json/hubs/v1/logout', {
        method: 'POST',
        credentials: 'include'
      });
      
      // Llamar al logout del AuthChannel padre
      await this.signOut();
      
      this._debugLog('Logout WordPress exitoso');
      return { success: true };

    } catch (error) {
      this._debugLog('Error en logout WordPress', { error: error.message });
      throw error;
    }
  }

  /**
   * Verificar conexión con WordPress
   */
  async testConnection() {
    this._debugLog('Probando conexión con WordPress');
    
    try {
      const response = await this._makeRequest('/wp-json/hubs/v1/verify', {
        method: 'OPTIONS',
        timeout: 5000
      });

      const isConnected = response.ok || response.status === 405; // OPTIONS puede devolver 405
      
      this._debugLog('Test de conexión WordPress', { 
        connected: isConnected, 
        status: response.status 
      });
      
      return {
        connected: isConnected,
        baseUrl: this.wpBaseUrl,
        status: response.status
      };

    } catch (error) {
      this._debugLog('Error en test de conexión', { error: error.message });
      return {
        connected: false,
        error: error.message,
        baseUrl: this.wpBaseUrl
      };
    }
  }

  /**
   * Configurar listener para mensajes de iframe
   */
  setupIframeListener(callback) {
    this._debugLog('Configurando listener para iframe');
    
    const messageHandler = (event) => {
      // Validar origen
      if (!this._isValidOrigin(event.origin)) {
        this._debugLog('Mensaje de origen no válido', { origin: event.origin });
        return;
      }

      const { type, data } = event.data || {};
      
      this._debugLog('Mensaje recibido de iframe', { type, data });

      switch (type) {
        case 'HUBS_WORDPRESS_LOGIN_SUCCESS':
          this._handleIframeLoginSuccess(data, callback);
          break;
          
        case 'HUBS_WORDPRESS_LOGIN_STATUS':
          this._handleIframeStatusUpdate(data, callback);
          break;
          
        case 'HUBS_IFRAME_READY':
          this._handleIframeReady(data, callback);
          break;
          
        default:
          this._debugLog('Tipo de mensaje no reconocido', { type });
      }
    };

    window.addEventListener('message', messageHandler);
    
    // Retornar función para limpiar listener
    return () => {
      window.removeEventListener('message', messageHandler);
      this._debugLog('Listener de iframe removido');
    };
  }

  /**
   * Enviar mensaje a iframe
   */
  sendMessageToIframe(iframe, type, data = {}) {
    if (!iframe || !iframe.contentWindow) {
      this._debugLog('Iframe no disponible para enviar mensaje');
      return;
    }

    const message = {
      type,
      data,
      timestamp: Date.now(),
      source: 'hubs-parent'
    };

    this._debugLog('Enviando mensaje a iframe', { type, data });
    iframe.contentWindow.postMessage(message, this.wpBaseUrl);
  }

  /**
   * Detectar si el usuario ya está autenticado en WordPress
   */
  async detectExistingWordPressAuth() {
    this._debugLog('Detectando autenticación WordPress existente');
    
    try {
      const result = await this.generateTokenFromWordPress();
      this._debugLog('Usuario ya autenticado en WordPress detectado');
      return result;
    } catch (error) {
      this._debugLog('No hay autenticación WordPress existente');
      return null;
    }
  }

  // Métodos privados

  /**
   * Realizar request HTTP con timeout y error handling
   */
  async _makeRequest(endpoint, options = {}) {
    const url = `${this.wpBaseUrl}${endpoint}`;
    const timeout = options.timeout || this.timeout;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.abort,
        credentials: options.credentials || 'omit'
      });
      
      clearTimeout(timeoutId);
      return response;
      
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error('Timeout de conexión');
      }
      
      throw error;
    }
  }

  /**
   * Validar origen de mensaje
   */
  _isValidOrigin(origin) {
    const allowedOrigins = [
      this.wpBaseUrl,
      new URL(this.wpBaseUrl).origin
    ];
    
    return allowedOrigins.includes(origin);
  }

  /**
   * Manejar login exitoso desde iframe
   */
  async _handleIframeLoginSuccess(data, callback) {
    this._debugLog('Login exitoso desde iframe', data);
    
    if (data.user && data.user.email) {
      try {
        // Generar token para el usuario autenticado
        const result = await this.generateTokenFromWordPress();
        
        if (callback) {
          callback({
            type: 'login_success',
            user: result.user,
            token: result.token
          });
        }
      } catch (error) {
        this._debugLog('Error procesando login desde iframe', { error: error.message });
        if (callback) {
          callback({
            type: 'login_error',
            error: error.message
          });
        }
      }
    }
  }

  /**
   * Manejar actualización de estado desde iframe
   */
  _handleIframeStatusUpdate(data, callback) {
    this._debugLog('Actualización de estado desde iframe', data);
    
    if (callback) {
      callback({
        type: 'status_update',
        user: data.user,
        stateChanged: data.stateChanged
      });
    }
  }

  /**
   * Manejar iframe listo
   */
  _handleIframeReady(data, callback) {
    this._debugLog('Iframe WordPress listo', data);
    
    if (callback) {
      callback({
        type: 'iframe_ready',
        url: data.url,
        title: data.title
      });
    }
  }

  /**
   * Debug logging condicional
   */
  _debugLog(message, data = null) {
    if (this.debug) {
      console.log(`[WordPressAuth] ${message}`, data || '');
    }
  }
}

/**
 * Factory function para crear instancia configurada
 */
export function createWordPressAuthChannel(store, config = {}) {
  return new WordPressAuthChannel(store, {
    wpBaseUrl: 'https://spacemall.es',
    debug: process.env.NODE_ENV === 'development',
    timeout: 10000,
    ...config
  });
}