import React from "react";
import styles from "./FloatingIconColumns.scss";

// Placeholder icon — replace `src` with your PNG path
function FloatingIcon({ size, src, alt }) {
  return (
    <button className={`${styles.iconBtn} ${styles[size]}`} title={alt}>
      {src ? (
        <img src={src} alt={alt} draggable={false} />
      ) : (
        <div className={styles.placeholder} />
      )}
    </button>
  );
}

export function LeftIconColumn() {
  const icons = [
    { size: "medium", src: null, alt: "Left icon 1" },
    { size: "small",  src: null, alt: "Left icon 2" },
    { size: "small",  src: null, alt: "Left icon 3" },
    { size: "small",  src: null, alt: "Left icon 4" },
    { size: "large",  src: null, alt: "Left icon 5" },
  ];

  return (
    <div className={`${styles.column} ${styles.left}`}>
      {icons.map((icon, i) => (
        <FloatingIcon key={i} size={icon.size} src={icon.src} alt={icon.alt} />
      ))}
    </div>
  );
}

export function RightIconColumn() {
  const icons = [
    { size: "medium", src: null, alt: "Right icon 1" },
    { size: "small",  src: null, alt: "Right icon 2" },
    { size: "small",  src: null, alt: "Right icon 3" },
    { size: "small",  src: null, alt: "Right icon 4" },
    { size: "large",  src: null, alt: "Right icon 5" },
  ];

  return (
    <div className={`${styles.column} ${styles.right}`}>
      {icons.map((icon, i) => (
        <FloatingIcon key={i} size={icon.size} src={icon.src} alt={icon.alt} />
      ))}
    </div>
  );
}
