import React, { useEffect, useRef } from "react";
import { useTranslationStore } from "../../utils/translation/translation-store";
import styles from "./TranslationOverlay.scss";

const STICKY_THRESHOLD_PX = 40;

export function TranslationOverlay() {
  const state = useTranslationStore();
  const active = state.status !== "idle" && state.status !== "error";
  const listRef = useRef(null);
  const stickToBottomRef = useRef(true);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    if (stickToBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [state.finals, state.partial]);

  if (!active) return null;

  const handleScroll = () => {
    const el = listRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottomRef.current = distanceFromBottom <= STICKY_THRESHOLD_PX;
  };

  const hasContent = state.finals.length > 0 || state.partial;

  return (
    <div className={styles.bar}>
      <div className={styles.header}>
        <span>Translation</span>
        <span className={styles.langs}>
          {state.sourceLang.toUpperCase()} → {state.targetLang.toUpperCase()}
        </span>
        {state.status === "connecting" && <span className={styles.connecting}>connecting…</span>}
      </div>
      <div className={styles.lines} ref={listRef} onScroll={handleScroll}>
        {!hasContent && (
          <div className={styles.placeholder}>Esperando audio de la sala…</div>
        )}
        {state.finals.map(f => (
          <div key={f.segmentId} className={styles.line}>
            <div className={styles.text}>{f.text}</div>
            {f.original && f.original !== f.text && (
              <div className={styles.original}>{f.original}</div>
            )}
          </div>
        ))}
        {state.partial && (
          <div className={`${styles.line} ${styles.partial}`}>
            <div className={styles.text}>{state.partial.text}</div>
            {state.partial.original && state.partial.original !== state.partial.text && (
              <div className={styles.original}>{state.partial.original}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
