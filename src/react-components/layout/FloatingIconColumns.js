import React from "react";
import styles from "./FloatingIconColumns.scss";
import asistente from "../../assets/newSkin/asistente.svg";                                                                                                                                                 
import calendario from "../../assets/newSkin/calendario.svg";                                                                                                                                                 
import carrito from "../../assets/newSkin/carrito.svg";                                                                                                                                                 
import comunity from "../../assets/newSkin/comunity.svg";                                                                                                                                                 
import correo from "../../assets/newSkin/correo.svg";                                                                                                                                                 
import cuenta from "../../assets/newSkin/cuenta.svg";                                                                                                                                                 
import inventario from "../../assets/newSkin/asistente.svg";                                                                                                                                                 
import mapa from "../../assets/newSkin/asistente.svg";                                                                                                                                                 
import personas from "../../assets/newSkin/asistente.svg";                                                                                                                                                 
import tareas from "../../assets/newSkin/tareas.svg";                                                                                                                                                       


// Placeholder SVG shown when no icon is assigned yet
function PlaceholderSVG() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="44" height="44" rx="8" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeDasharray="6 4" />
      <circle cx="24" cy="20" r="6" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
      <path d="M10 38c0-7.732 6.268-14 14-14s14 6.268 14 14" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// Replace `SvgComponent` with your imported SVG (as React component) or keep null for placeholder
function FloatingIcon({ size, SvgComponent, alt }) {
  return (
    <button className={`${styles.iconBtn} ${styles[size]}`} title={alt}>
      {SvgComponent ? <SvgComponent aria-label={alt} /> : <PlaceholderSVG />}
    </button>
  );
}

export function LeftIconColumn() {
  const icons = [
    { size: "medium", SvgComponent: personas, alt: "Left icon 1" },
    { size: "small",  SvgComponent: tareas, alt: "Left icon 2" },
    { size: "small",  SvgComponent: asistente, alt: "Left icon 3" },
    { size: "small",  SvgComponent: comunity, alt: "Left icon 4" },
    { size: "large",  SvgComponent: mapa, alt: "Left icon 5" },
  ];

  return (
    <div className={`${styles.column} ${styles.left}`}>
      {icons.map((icon, i) => (
        <FloatingIcon key={i} size={icon.size} SvgComponent={icon.SvgComponent} alt={icon.alt} />
      ))}
    </div>
  );
}

export function RightIconColumn() {
  const icons = [
    { size: "medium", SvgComponent: calendario, alt: "Right icon 1" },
    { size: "small",  SvgComponent: correo, alt: "Right icon 2" },
    { size: "small",  SvgComponent: carrito, alt: "Right icon 3" },
    { size: "small",  SvgComponent: inventario, alt: "Right icon 4" },
    { size: "large",  SvgComponent: cuenta, alt: "Right icon 5" },
  ];

  return (
    <div className={`${styles.column} ${styles.right}`}>
      {icons.map((icon, i) => (
        <FloatingIcon key={i} size={icon.size} SvgComponent={icon.SvgComponent} alt={icon.alt} />
      ))}
    </div>
  );
}
