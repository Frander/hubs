import React, { useState } from "react";
import styles from "./FloatingIconColumns.scss";
import { AppLogo } from "../misc/AppLogo";
import { WebPageUrlModalContainer } from "../room/WebPageUrlModalContainer";
import { ReactComponent as AvatarIcon } from "../icons/Avatar.svg";
import asistente from "../../assets/newSkin/asistente.png";
import calendario from "../../assets/newSkin/calendario.png";
import carrito from "../../assets/newSkin/carrito.png";
import comunity from "../../assets/newSkin/community.png";
import correo from "../../assets/newSkin/correo.png";
import cuenta from "../../assets/newSkin/cuenta.png";
import inventario from "../../assets/newSkin/inventario.png";
import mapa from "../../assets/newSkin/mapa.png";
import personas from "../../assets/newSkin/personas.png";
import tareas from "../../assets/newSkin/tareas.png";

const LEFT_ICONS = [
  { size: "medium", src: personas,  alt: "Personas" },
  { size: "small",  src: tareas,    alt: "Tareas" },
  { size: "small",  src: asistente, alt: "Asistente", iframeUrl: "https://cloudxrserver.com/spacemall/", iframeTitle: "Avatar IA" },
  { size: "small",  src: comunity,  alt: "Comunidad" },
  { size: "large",  src: mapa,      alt: "Mapa" },
];

const RIGHT_ICONS = [
  { size: "medium", src: calendario, alt: "Calendario" },
  { size: "small",  src: correo,     alt: "Correo" },
  { size: "small",  src: carrito,    alt: "Carrito" },
  { size: "small",  src: inventario, alt: "Inventario" },
  { size: "large",  src: cuenta,     alt: "Cuenta", iframeUrl: "https://spacemall.es/mi-perfil/", iframeTitle: "Mi cuenta" },
];

function FloatingIcon({ size, src, alt, onClick, badge, overlay }) {
  return (
    <button className={`${styles.iconBtn} ${styles[size]}`} title={alt} onClick={onClick}>
      <img src={src} alt={alt} />
      {badge != null && <span className={styles.iconBadge}>{badge}</span>}
      {overlay && <span className={styles.iconOverlay}>{overlay}</span>}
    </button>
  );
}

// Chevron arrow used in the toggle button
function ChevronSVG({ direction }) {
  const rotate = { left: "0deg", right: "180deg" };
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      style={{ transform: `rotate(${rotate[direction]})`, transition: "transform 0.25s ease" }}
      aria-hidden="true"
    >
      <path d="M15 6l-6 6 6 6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function FloatingIconColumns({ scene, showNonHistoriedDialog, onPersonasClick, personasCount }) {
  // null | "left" | "right" — only one side open at a time on mobile
  const [openSide, setOpenSide] = useState(null);

  function toggle(side) {
    setOpenSide(prev => (prev === side ? null : side));
  }

  function handleIconClick(icon) {
    if (icon.alt === "Personas" && onPersonasClick) {
      onPersonasClick();
    } else if (icon.iframeUrl && showNonHistoriedDialog && scene) {
      showNonHistoriedDialog(WebPageUrlModalContainer, { scene, url: icon.iframeUrl, title: icon.iframeTitle });
    }
  }

  const leftOpen  = openSide === "left";
  const rightOpen = openSide === "right";

  return (
    <>
      {/* ── LOGO (always visible, top-left) ── */}
      <div className={styles.logo}>
        <AppLogo className={styles.logoImg} />
      </div>

      {/* ── LEFT SIDE ── */}
      <div className={`${styles.wrapper} ${styles.wrapperLeft}`}>
        {/* Toggle button — only visible on mobile */}
        <button
          className={`${styles.toggleBtn} ${styles.toggleLeft}`}
          onClick={() => toggle("left")}
          title={leftOpen ? "Ocultar menú izquierdo" : "Mostrar menú izquierdo"}
        >
          <ChevronSVG direction={leftOpen ? "left" : "right"} />
        </button>

        {/* Icon column */}
        <div className={`${styles.column} ${styles.left} ${leftOpen ? styles.columnOpen : ""}`}>
          {LEFT_ICONS.map((icon, i) => (
            <FloatingIcon
              key={i}
              size={icon.size}
              src={icon.src}
              alt={icon.alt}
              onClick={() => handleIconClick(icon)}
              badge={icon.alt === "Personas" ? personasCount : undefined}
            />
          ))}
        </div>
      </div>

      {/* ── RIGHT SIDE ── */}
      <div className={`${styles.wrapper} ${styles.wrapperRight}`}>
        {/* Toggle button — only visible on mobile */}
        <button
          className={`${styles.toggleBtn} ${styles.toggleRight}`}
          onClick={() => toggle("right")}
          title={rightOpen ? "Ocultar menú derecho" : "Mostrar menú derecho"}
        >
          <ChevronSVG direction={rightOpen ? "right" : "left"} />
        </button>

        {/* Icon column */}
        <div className={`${styles.column} ${styles.right} ${rightOpen ? styles.columnOpen : ""}`}>
          {RIGHT_ICONS.map((icon, i) => (
            <FloatingIcon
              key={i}
              size={icon.size}
              src={icon.src}
              alt={icon.alt}
              onClick={() => handleIconClick(icon)}
              overlay={icon.alt === "Cuenta" ? <AvatarIcon className={styles.iconOverlaySvg} /> : undefined}
            />
          ))}
        </div>
      </div>
    </>
  );
}
