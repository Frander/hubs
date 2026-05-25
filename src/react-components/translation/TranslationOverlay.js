import React from "react";
import { useTranslationStore } from "../../utils/translation/translation-store";
import styles from "./TranslationOverlay.scss";

export function TranslationOverlay() {
  const state = useTranslationStore();
  const active = state.status !== "idle" && state.status !== "error";

  if (!active) return null;

  const lastFinal = state.finals.length > 0 ? state.finals[state.finals.length - 1] : null;
  const partial = state.partial;

  return (
    <>
      <div className={styles.overlay}>
        {lastFinal && (
          <div className={styles.line}>
            {lastFinal.text}
            {lastFinal.original && lastFinal.original !== lastFinal.text && (
              <span className={styles.original}>{lastFinal.original}</span>
            )}
          </div>
        )}
        {partial && (
          <div className={`${styles.line} ${styles.partial}`}>
            {partial.text}
            {partial.original && partial.original !== partial.text && (
              <span className={styles.original}>{partial.original}</span>
            )}
          </div>
        )}
      </div>
      <div className={styles.statusBadge}>
        Translating {state.sourceLang.toUpperCase()} → {state.targetLang.toUpperCase()}
        {state.status === "connecting" ? " (connecting…)" : ""}
      </div>
    </>
  );
}
