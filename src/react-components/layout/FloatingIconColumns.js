import React, { useState } from "react";
import styles from "./FloatingIconColumns.scss";
import { ReactComponent as asistente } from "../../assets/newSkin/asistente.svg";
import { ReactComponent as calendario } from "../../assets/newSkin/calendario.svg";
import { ReactComponent as carrito } from "../../assets/newSkin/carrito.svg";
import { ReactComponent as comunity } from "../../assets/newSkin/comunity.svg";
import { ReactComponent as correo } from "../../assets/newSkin/correo.svg";
import { ReactComponent as cuenta } from "../../assets/newSkin/cuenta.svg";
import { ReactComponent as inventario } from "../../assets/newSkin/asistente.svg";
import { ReactComponent as mapa } from "../../assets/newSkin/asistente.svg";
import { ReactComponent as personas } from "../../assets/newSkin/asistente.svg";
import { ReactComponent as tareas } from "../../assets/newSkin/tareas.svg";

const LEFT_ICONS = [
  { size: "medium", SvgComponent: personas,  alt: "Personas" },
  { size: "small",  SvgComponent: tareas,    alt: "Tareas" },
  { size: "small",  SvgComponent: asistente, alt: "Asistente" },
  { size: "small",  SvgComponent: comunity,  alt: "Comunidad" },
  { size: "large",  SvgComponent: mapa,      alt: "Mapa" },
];

const RIGHT_ICONS = [
  { size: "medium", SvgComponent: calendario, alt: "Calendario" },
  { size: "small",  SvgComponent: correo,     alt: "Correo" },
  { size: "small",  SvgComponent: carrito,    alt: "Carrito" },
  { size: "small",  SvgComponent: inventario, alt: "Inventario" },
  { size: "large",  SvgComponent: cuenta,     alt: "Cuenta" },
];

function FloatingIcon({ size, SvgComponent, alt }) {
  return (
    <button className={`${styles.iconBtn} ${styles[size]}`} title={alt}>
      <SvgComponent aria-label={alt} />
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

export function FloatingIconColumns() {
  // null | "left" | "right" — only one side open at a time on mobile
  const [openSide, setOpenSide] = useState(null);

  function toggle(side) {
    setOpenSide(prev => (prev === side ? null : side));
  }

  const leftOpen  = openSide === "left";
  const rightOpen = openSide === "right";

  return (
    <>
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
            <FloatingIcon key={i} size={icon.size} SvgComponent={icon.SvgComponent} alt={icon.alt} />
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
            <FloatingIcon key={i} size={icon.size} SvgComponent={icon.SvgComponent} alt={icon.alt} />
          ))}
        </div>
      </div>
    </>
  );
}
