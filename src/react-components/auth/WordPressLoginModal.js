import React, { useState, useCallback, useEffect } from "react";
import PropTypes from "prop-types";
import { Modal } from "../modal/Modal";
import { CloseButton } from "../input/CloseButton";
import { Button } from "../input/Button";
import { TextInputField } from "../input/TextInputField";
import { Column } from "../layout/Column";
import { FormattedMessage, useIntl } from "react-intl";
import styles from "./WordPressLoginModal.scss";

/**
 * Formulario de login para WordPress
 */
function WordPressLoginForm({ onSubmit, isLoading, error, initialUsername = "" }) {
  const intl = useIntl();
  const [username, setUsername] = useState(initialUsername);
  const [password, setPassword] = useState("");

  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();
      if (username.trim() && password.trim() && !isLoading) {
        onSubmit({ username: username.trim(), password });
      }
    },
    [username, password, isLoading, onSubmit]
  );

  const handleUsernameChange = useCallback(
    (e) => setUsername(e.target.value),
    []
  );

  const handlePasswordChange = useCallback(
    (e) => setPassword(e.target.value),
    []
  );

  return (
    <Column as="form" onSubmit={handleSubmit} padding center>
      <div className={styles.loginHeader}>
        <h3>
          <FormattedMessage
            id="wordpress-login.title"
            defaultMessage="Iniciar Sesión"
          />
        </h3>
        <p className={styles.subtitle}>
          <FormattedMessage
            id="wordpress-login.subtitle"
            defaultMessage="Accede con tu cuenta para una experiencia personalizada"
          />
        </p>
      </div>

      {error && (
        <div className={styles.errorMessage}>
          <p>{error}</p>
        </div>
      )}

      <div className={styles.formFields}>
        <TextInputField
          label={
            <FormattedMessage
              id="wordpress-login.username-label"
              defaultMessage="Usuario o Email"
            />
          }
          name="username"
          type="text"
          value={username}
          onChange={handleUsernameChange}
          placeholder={intl.formatMessage({
            id: "wordpress-login.username-placeholder",
            defaultMessage: "tu_usuario@email.com"
          })}
          required
          disabled={isLoading}
          autoComplete="username"
          autoFocus
        />

        <TextInputField
          label={
            <FormattedMessage
              id="wordpress-login.password-label"
              defaultMessage="Contraseña"
            />
          }
          name="password"
          type="password"
          value={password}
          onChange={handlePasswordChange}
          placeholder={intl.formatMessage({
            id: "wordpress-login.password-placeholder",
            defaultMessage: "Tu contraseña"
          })}
          required
          disabled={isLoading}
          autoComplete="current-password"
        />
      </div>

      <div className={styles.formActions}>
        <Button 
          type="submit" 
          preset="accept" 
          disabled={isLoading || !username.trim() || !password.trim()}
          className={styles.submitButton}
        >
          {isLoading ? (
            <FormattedMessage
              id="wordpress-login.logging-in"
              defaultMessage="Iniciando sesión..."
            />
          ) : (
            <FormattedMessage
              id="wordpress-login.submit"
              defaultMessage="Iniciar Sesión"
            />
          )}
        </Button>
      </div>

      <div className={styles.helpLinks}>
        <p>
          <FormattedMessage
            id="wordpress-login.help-text"
            defaultMessage="¿Necesitas una cuenta? Contacta al administrador del sitio."
          />
        </p>
      </div>
    </Column>
  );
}

WordPressLoginForm.propTypes = {
  onSubmit: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
  error: PropTypes.string,
  initialUsername: PropTypes.string
};

/**
 * Pantalla de éxito después del login
 */
function LoginSuccessScreen({ user, onContinue }) {
  return (
    <Column padding center className={styles.successScreen}>
      <div className={styles.successIcon}>✅</div>
      
      <h3>
        <FormattedMessage
          id="wordpress-login.success-title"
          defaultMessage="¡Bienvenido!"
        />
      </h3>
      
      <p className={styles.welcomeMessage}>
        <FormattedMessage
          id="wordpress-login.welcome-message"
          defaultMessage="Hola {name}, has iniciado sesión correctamente."
          values={{ name: user?.display_name || user?.username }}
        />
      </p>

      {user?.email && (
        <p className={styles.userInfo}>
          <small>{user.email}</small>
        </p>
      )}

      <Button preset="accept" onClick={onContinue} className={styles.continueButton}>
        <FormattedMessage
          id="wordpress-login.continue"
          defaultMessage="Continuar"
        />
      </Button>
    </Column>
  );
}

LoginSuccessScreen.propTypes = {
  user: PropTypes.object,
  onContinue: PropTypes.func.isRequired
};

/**
 * Pantalla de verificación de conexión
 */
function ConnectionTestScreen({ isConnected, baseUrl, onRetry, onClose }) {
  return (
    <Column padding center className={styles.connectionTest}>
      <div className={isConnected ? styles.successIcon : styles.errorIcon}>
        {isConnected ? "✅" : "❌"}
      </div>
      
      <h3>
        {isConnected ? (
          <FormattedMessage
            id="wordpress-login.connection-success"
            defaultMessage="Conexión establecida"
          />
        ) : (
          <FormattedMessage
            id="wordpress-login.connection-error"
            defaultMessage="Error de conexión"
          />
        )}
      </h3>
      
      <p>
        {isConnected ? (
          <FormattedMessage
            id="wordpress-login.connection-success-message"
            defaultMessage="Conectado correctamente a {url}"
            values={{ url: baseUrl }}
          />
        ) : (
          <FormattedMessage
            id="wordpress-login.connection-error-message"
            defaultMessage="No se pudo conectar a {url}. Verifica tu conexión a internet."
            values={{ url: baseUrl }}
          />
        )}
      </p>

      <div className={styles.connectionActions}>
        {isConnected ? (
          <Button preset="accept" onClick={onClose}>
            <FormattedMessage
              id="wordpress-login.continue-to-login"
              defaultMessage="Continuar al login"
            />
          </Button>
        ) : (
          <>
            <Button preset="transparent" onClick={onRetry}>
              <FormattedMessage
                id="wordpress-login.retry-connection"
                defaultMessage="Reintentar"
              />
            </Button>
            <Button preset="cancel" onClick={onClose}>
              <FormattedMessage
                id="wordpress-login.close"
                defaultMessage="Cerrar"
              />
            </Button>
          </>
        )}
      </div>
    </Column>
  );
}

ConnectionTestScreen.propTypes = {
  isConnected: PropTypes.bool.isRequired,
  baseUrl: PropTypes.string.isRequired,
  onRetry: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired
};

/**
 * Modal principal de login de WordPress
 */
export function WordPressLoginModal({ 
  wpAuthChannel, 
  onLogin, 
  onClose, 
  testConnection = false,
  initialUsername = ""
}) {
  const [currentView, setCurrentView] = useState(testConnection ? 'connection' : 'login');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [loginResult, setLoginResult] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState(null);

  // Test de conexión al montar si está habilitado
  useEffect(() => {
    if (testConnection && currentView === 'connection') {
      handleConnectionTest();
    }
  }, [testConnection, currentView]);

  /**
   * Manejar test de conexión
   */
  const handleConnectionTest = useCallback(async () => {
    if (!wpAuthChannel) return;

    setIsLoading(true);
    try {
      const result = await wpAuthChannel.testConnection();
      setConnectionStatus(result);
      
      if (result.connected) {
        // Auto-continuar después de 2 segundos si la conexión es exitosa
        setTimeout(() => {
          setCurrentView('login');
        }, 2000);
      }
    } catch (err) {
      setConnectionStatus({
        connected: false,
        error: err.message,
        baseUrl: wpAuthChannel.wpBaseUrl
      });
    } finally {
      setIsLoading(false);
    }
  }, [wpAuthChannel]);

  /**
   * Manejar envío del formulario de login
   */
  const handleLoginSubmit = useCallback(async ({ username, password }) => {
    if (!wpAuthChannel) {
      setError("Error interno: Canal de autenticación no disponible");
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await wpAuthChannel.authenticateWithWordPress(username, password);
      
      if (result.success) {
        setLoginResult(result);
        setCurrentView('success');
        
        // Notificar éxito al padre después de mostrar pantalla de éxito
        setTimeout(() => {
          onLogin(result);
        }, 1500);
      } else {
        setError(result.message || "Error de autenticación");
      }
    } catch (err) {
      console.error("Error en login WordPress:", err);
      setError(err.message || "Error al iniciar sesión. Verifica tus credenciales.");
    } finally {
      setIsLoading(false);
    }
  }, [wpAuthChannel, onLogin]);

  /**
   * Manejar continuar después del éxito
   */
  const handleContinueAfterSuccess = useCallback(() => {
    if (loginResult) {
      onLogin(loginResult);
    }
  }, [loginResult, onLogin]);

  /**
   * Retry de conexión
   */
  const handleRetryConnection = useCallback(() => {
    setConnectionStatus(null);
    handleConnectionTest();
  }, [handleConnectionTest]);

  /**
   * Continuar al login desde test de conexión
   */
  const handleContinueToLogin = useCallback(() => {
    setCurrentView('login');
  }, []);

  // Determinar título del modal
  const getModalTitle = () => {
    switch (currentView) {
      case 'connection':
        return "Verificando Conexión";
      case 'success':
        return "Login Exitoso";
      case 'login':
      default:
        return "Iniciar Sesión";
    }
  };

  return (
    <Modal
      title={getModalTitle()}
      beforeTitle={<CloseButton onClick={onClose} />}
      className={styles.wordpressLoginModal}
      disableFullscreen
    >
      {currentView === 'connection' && (
        <ConnectionTestScreen
          isConnected={connectionStatus?.connected || false}
          baseUrl={wpAuthChannel?.wpBaseUrl || "WordPress"}
          onRetry={handleRetryConnection}
          onClose={connectionStatus?.connected ? handleContinueToLogin : onClose}
        />
      )}

      {currentView === 'login' && (
        <WordPressLoginForm
          onSubmit={handleLoginSubmit}
          isLoading={isLoading}
          error={error}
          initialUsername={initialUsername}
        />
      )}

      {currentView === 'success' && loginResult && (
        <LoginSuccessScreen
          user={loginResult.user}
          onContinue={handleContinueAfterSuccess}
        />
      )}

      {isLoading && currentView === 'connection' && (
        <div className={styles.loadingOverlay}>
          <div className={styles.spinner}>⏳</div>
          <p>
            <FormattedMessage
              id="wordpress-login.testing-connection"
              defaultMessage="Probando conexión..."
            />
          </p>
        </div>
      )}
    </Modal>
  );
}

WordPressLoginModal.propTypes = {
  wpAuthChannel: PropTypes.object.isRequired,
  onLogin: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  testConnection: PropTypes.bool,
  initialUsername: PropTypes.string
};

WordPressLoginModal.defaultProps = {
  testConnection: false,
  initialUsername: ""
};