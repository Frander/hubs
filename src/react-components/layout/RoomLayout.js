import React, { useState } from "react";
import PropTypes from "prop-types";
import classNames from "classnames";
import styles from "./RoomLayout.scss";
import { Toolbar } from "./Toolbar";
import { FloatingIconColumns } from "./FloatingIconColumns";

function ToolbarChevronSVG({ open }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.25s ease" }}
      aria-hidden="true"
    >
      <path d="M6 9l6 6 6-6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function RoomLayout({
  className,
  viewportClassName,
  sidebar,
  sidebarClassName,
  toolbarLeft,
  toolbarCenter,
  toolbarRight,
  toolbarClassName,
  modal,
  viewport,
  objectFocused,
  streaming,
  viewportRef,
  scene,
  showNonHistoriedDialog,
  onPersonasClick,
  personasCount,
  chatOpen,
  chatExpanded,
  ...rest
}) {
  const [toolbarOpen, setToolbarOpen] = useState(false);

  return (
    <div className={classNames(styles.roomLayout, { [styles.objectFocused]: objectFocused }, className)} {...rest}>
      {sidebar && <div className={classNames(styles.sidebar, sidebarClassName)}>{sidebar}</div>}
      <div className={classNames(styles.modalContainer, styles.viewport)}>{modal}</div>
      {(toolbarLeft || toolbarCenter || toolbarRight) && (
        <div
          className={classNames(styles.main, styles.toolbar, toolbarClassName)}
          style={{
            bottom: chatOpen ? (chatExpanded ? "91%" : "36%") : "2%",
            width: chatExpanded ? "95vw" : undefined,
            margin: chatExpanded ? "auto" : undefined,
            transition: "bottom 0.3s ease, width 0.3s ease"
          }}
        >
          <button
            className={classNames(styles.toolbarToggle, { [styles.toolbarToggleOpen]: toolbarOpen })}
            onClick={() => setToolbarOpen(prev => !prev)}
            aria-label={toolbarOpen ? "Ocultar toolbar" : "Mostrar toolbar"}
          >
            <ToolbarChevronSVG open={toolbarOpen} />
          </button>
          <div className={classNames(styles.toolbarInner, { [styles.toolbarInnerOpen]: toolbarOpen })}>
            <Toolbar
              left={toolbarLeft}
              center={toolbarCenter}
              right={toolbarRight}
              style={chatExpanded ? { width: "95vw", margin: "auto" } : undefined}
            />
          </div>
        </div>
      )}
      <FloatingIconColumns scene={scene} showNonHistoriedDialog={showNonHistoriedDialog} onPersonasClick={onPersonasClick} personasCount={personasCount} />
      <div
        className={classNames(styles.main, styles.viewport, { [styles.streaming]: streaming }, viewportClassName)}
        ref={viewportRef}
      >
        {viewport}
      </div>
    </div>
  );
}

RoomLayout.propTypes = {
  className: PropTypes.string,
  viewportClassName: PropTypes.string,
  sidebar: PropTypes.node,
  sidebarClassName: PropTypes.string,
  toolbarLeft: PropTypes.node,
  toolbarCenter: PropTypes.node,
  toolbarRight: PropTypes.node,
  toolbarClassName: PropTypes.string,
  modal: PropTypes.node,
  viewport: PropTypes.node,
  objectFocused: PropTypes.bool,
  streaming: PropTypes.bool,
  viewportRef: PropTypes.any,
  chatOpen: PropTypes.bool,
  chatExpanded: PropTypes.bool
};
