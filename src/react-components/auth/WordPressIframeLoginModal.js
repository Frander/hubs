import React, { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { Modal } from "../modal/Modal";
import { CloseButton } from "../input/CloseButton";
import { FormattedMessage } from "react-intl";
import styles from "./WordPressLoginModal.scss";

/**
 * Modal de login WordPress usando Iframe + PostMessage
 */
export function WordPressIframeLoginModal({
  wpAuthChannel,
  onLogin,
  onClose
}) {
  const iframeRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loginUrl] = useState(() => {
    // URL de login de WordPress
    // Agregar parámetros para indicar que está en iframe
    const url = new URL(`${wpAuthChannel.wpBaseUrl}/mi-cuenta2/`);
    url.searchParams.append('hubs_iframe', '1');
    url.searchParams.append('redirect_to', wpAuthChannel.wpBaseUrl);
    return url.toString();
  });

  useEffect(() => {
    console.log('[WP Iframe] Modal montado, configurando listener');

    /**
     * Listener para mensajes PostMessage desde WordPress
     */
    const handleMessage = (event) => {
      // Validar origen
      if (event.origin !== wpAuthChannel.wpBaseUrl) {
        console.log('[WP Iframe] Mensaje de origen no válido:', event.origin);
        return;
      }

      const { type, data } = event.data || {};
      console.log('[WP Iframe] Mensaje recibido:', { type, data });

      switch (type) {
        case 'HUBS_WORDPRESS_LOGIN_SUCCESS':
          handleLoginSuccess(data);
          break;

        case 'HUBS_WORDPRESS_LOGOUT':
          handleLogout(data);
          break;

        case 'HUBS_IFRAME_READY':
          console.log('[WP Iframe] Iframe WordPress listo');
          setIsLoading(false);
          break;

        default:
          console.log('[WP Iframe] Tipo de mensaje no reconocido:', type);
      }
    };

    /**
     * Manejar login exitoso desde WordPress
     */
    const handleLoginSuccess = async (data) => {
      console.log('[WP Iframe] Login exitoso recibido:', data);
      console.log('[WP Iframe] Token presente:', !!data.token);
      console.log('[WP Iframe] Datos del usuario:', data.user);

      try {
        // Verificar que tenemos los datos del usuario
        if (!data || !data.user) {
          console.error('[WP Iframe] Error: Datos de usuario incompletos', data);
          throw new Error('Datos de usuario incompletos');
        }

        // Verificar que tenemos el token
        if (!data.token) {
          console.error('[WP Iframe] Error: Token no recibido en PostMessage');
          throw new Error('Token no recibido. Por favor intenta de nuevo.');
        }

        console.log('[WP Iframe] ✅ Token recibido correctamente');

        // Guardar credenciales usando el AuthChannel
        await wpAuthChannel.handleAuthCredentials(data.user.email, data.token);

        console.log('[WP Iframe] ✅ Credenciales guardadas en store');

        // Notificar al componente padre
        onLogin({
          success: true,
          user: data.user,
          token: data.token
        });

        console.log('[WP Iframe] ✅ Login completado exitosamente');

      } catch (error) {
        console.error('[WP Iframe] ❌ Error procesando login:', error);
        alert('Error al procesar el login: ' + error.message + '\n\nPor favor intenta de nuevo o contacta soporte.');
      }
    };

    /**
     * Manejar logout desde WordPress
     */
    const handleLogout = (data) => {
      console.log('[WP Iframe] Logout recibido:', data);
      // Podrías manejar esto si es necesario
    };

    // Agregar listener
    window.addEventListener('message', handleMessage);

    // Cleanup
    return () => {
      console.log('[WP Iframe] Removiendo listener');
      window.removeEventListener('message', handleMessage);
    };
  }, [wpAuthChannel, onLogin]);

  /**
   * Manejar carga del iframe
   */
  const handleIframeLoad = () => {
    console.log('[WP Iframe] Iframe cargado');
    setIsLoading(false);

    // Enviar mensaje al iframe indicando que estamos listos
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        {
          type: 'HUBS_PARENT_READY',
          source: 'hubs-client'
        },
        wpAuthChannel.wpBaseUrl
      );
    }
  };

  return (
    <Modal
      title={
        <FormattedMessage
          id="wordpress-iframe-login.title"
          defaultMessage="Iniciar Sesión"
        />
      }
      beforeTitle={<CloseButton onClick={onClose} />}
      className={styles.wordpressLoginModal}
      disableFullscreen
    >
      <div className={styles.iframeContainer}>
        {isLoading && (
          <div className={styles.loadingOverlay}>
            <div className={styles.spinner}></div>
            <p>
              <FormattedMessage
                id="wordpress-iframe-login.loading"
                defaultMessage="Cargando login..."
              />
            </p>
          </div>
        )}

        <iframe
          ref={iframeRef}
          src={loginUrl}
          title="WordPress Login"
          className={styles.loginIframe}
          width="100%"
          height="600px"
          onLoad={handleIframeLoad}
          allow="same-origin"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
        />

        <div className={styles.iframeFooter}>
          <p className={styles.footerText}>
            <FormattedMessage
              id="wordpress-iframe-login.footer-text"
              defaultMessage="Inicia sesión con tu cuenta de SpaceMall"
            />
          </p>
        </div>
      </div>
    </Modal>
  );
}

WordPressIframeLoginModal.propTypes = {
  wpAuthChannel: PropTypes.object.isRequired,
  onLogin: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired
};
