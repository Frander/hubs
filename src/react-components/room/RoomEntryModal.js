import React from "react";
import PropTypes from "prop-types";
import classNames from "classnames";
import { Modal } from "../modal/Modal";
import { Button } from "../input/Button";
import { ReactComponent as EnterIcon } from "../icons/Enter.svg";
import { ReactComponent as VRIcon } from "../icons/VR.svg";
import { ReactComponent as ShowIcon } from "../icons/Show.svg";
import { ReactComponent as SettingsIcon } from "../icons/Settings.svg";
import styles from "./RoomEntryModal.scss";
import styleUtils from "../styles/style-utils.scss";
import { useCssBreakpoints } from "react-use-css-breakpoints";
import { Column } from "../layout/Column";
import { AppLogo } from "../misc/AppLogo";
import { FormattedMessage } from "react-intl";

export function RoomEntryModal({
  className,
  roomName,
  showJoinRoom,
  onJoinRoom,
  showEnterOnDevice,
  onEnterOnDevice,
  showSpectate,
  onSpectate,
  showRoomSettings,
  onRoomSettings,
  showLogin,
  onLogin,
  isLoggedIn,
  userDisplayName,
  ...rest
}) {
  const breakpoint = useCssBreakpoints();
  return (
    <Modal className={classNames(styles.roomEntryModal, className)} disableFullscreen {...rest}>
      <Column center className={styles.content}>
        {breakpoint !== "sm" && breakpoint !== "md" && <AppLogo className={styles.logo} />}
        <div className={styles.roomName}>
          <h5>
            <FormattedMessage id="room-entry-modal.room-name-label" defaultMessage="Room Name" />
          </h5>
          <p>{roomName}</p>
        </div>
        <Column center className={styles.buttons}>
          {/* Mostrar información de usuario logueado */}
          {isLoggedIn && userDisplayName && (
            <div className={styles.userInfo}>
              <p>
                <FormattedMessage 
                  id="room-entry-modal.welcome-user" 
                  defaultMessage="Bienvenido, {name}"
                  values={{ name: userDisplayName }}
                />
              </p>
            </div>
          )}

          {/* Botón de login/logout */}
          {showLogin && (
            <Button 
              preset={isLoggedIn ? "transparent" : "accent3"} 
              onClick={onLogin}
              className={isLoggedIn ? styles.loggedInButton : styles.loginButton}
            >
              <span>
                {isLoggedIn ? (
                  <FormattedMessage id="room-entry-modal.logout-button" defaultMessage="Cerrar Sesión" />
                ) : (
                  <FormattedMessage id="room-entry-modal.login-button" defaultMessage="Iniciar Sesión" />
                )}
              </span>
            </Button>
          )}

          {showJoinRoom && (
            <Button preset="accent4" onClick={onJoinRoom}>
              <EnterIcon />
              <span>
                {isLoggedIn ? (
                  <FormattedMessage 
                    id="room-entry-modal.join-room-button-logged-in" 
                    defaultMessage="Entrar en SpaceMall" 
                  />
                ) : (
                  <FormattedMessage 
                    id="room-entry-modal.join-room-button-guest" 
                    defaultMessage="Entrar como Invitado" 
                  />
                )}
              </span>
            </Button>
          )}
          {/* {showEnterOnDevice && (
            <Button preset="accent5" onClick={onEnterOnDevice}>
              <VRIcon />
              <span>
                <FormattedMessage id="room-entry-modal.enter-on-device-button" defaultMessage="Enter On Device" />
              </span>
            </Button>
          )} */}
          {/* {showSpectate && (
            <Button preset="accent2" onClick={onSpectate}>
              <ShowIcon />
              <span>
                <FormattedMessage id="room-entry-modal.spectate-button" defaultMessage="Spectate" />
              </span>
            </Button>
          )} */}
          {showRoomSettings && breakpoint !== "sm" && (
            <>
              <hr className={styleUtils.showLg} />
              <Button preset="transparent" className={styleUtils.showLg} onClick={onRoomSettings}>
                <SettingsIcon />
                <span>
                  <FormattedMessage id="room-entry-modal.room-settings-button" defaultMessage="Room Settings" />
                </span>
              </Button>
            </>
          )}
        </Column>
      </Column>
    </Modal>
  );
}

RoomEntryModal.propTypes = {
  className: PropTypes.string,
  roomName: PropTypes.string.isRequired,
  showJoinRoom: PropTypes.bool,
  onJoinRoom: PropTypes.func,
  showEnterOnDevice: PropTypes.bool,
  onEnterOnDevice: PropTypes.func,
  showSpectate: PropTypes.bool,
  onSpectate: PropTypes.func,
  showRoomSettings: PropTypes.bool,
  onRoomSettings: PropTypes.func,
  showLogin: PropTypes.bool,
  onLogin: PropTypes.func,
  isLoggedIn: PropTypes.bool,
  userDisplayName: PropTypes.string
};

RoomEntryModal.defaultProps = {
  showJoinRoom: true,
  showEnterOnDevice: true,
  showSpectate: true,
  showRoomSettings: true,
  showLogin: true,
  isLoggedIn: false,
  userDisplayName: null
};
