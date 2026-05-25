import React, { useLayoutEffect, useRef, useState, useEffect } from "react";
import PropTypes from "prop-types";
import classNames from "classnames";
import { useTranslationStore } from "../../utils/translation/translation-store";
import styles from "./TranslationOverlay.scss";

function formatLag(ms) {
  if (ms == null) return "—";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function lagSeverity(ms) {
  if (ms == null) return "idle";
  if (ms < 1500) return "ok";
  if (ms < 4000) return "warn";
  return "bad";
}

export function TranslationOverlay({ chatOpen }) {
  const state = useTranslationStore();
  const active = state.status !== "idle" && state.status !== "error";
  const listRef = useRef(null);

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 400);
    return () => clearInterval(id);
  }, [active]);

  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [state.finals, state.partial, active]);

  if (!active) return null;

  const hasContent = state.finals.length > 0 || state.partial;
  const sinceLast = state.lastTranscriptAt ? now - state.lastTranscriptAt : null;
  const severity = lagSeverity(sinceLast);

  return (
    <div className={classNames(styles.bar, { [styles.chatOpen]: chatOpen })}>
      <div className={styles.header}>
        <span>Translation</span>
        <span className={styles.langs}>
          {state.sourceLang.toUpperCase()} → {state.targetLang.toUpperCase()}
        </span>
        <span className={styles.metrics}>
          <span
            className={classNames(styles.lag, styles[`lag-${severity}`])}
            title={
              state.firstTranscriptLatencyMs != null
                ? `First response: ${formatLag(state.firstTranscriptLatencyMs)}`
                : "Waiting for first transcript"
            }
          >
            {sinceLast != null ? `last ${formatLag(sinceLast)} ago` : "waiting…"}
          </span>
        </span>
        {state.status === "connecting" && <span className={styles.connecting}>connecting…</span>}
      </div>
      <div className={styles.lines} ref={listRef}>
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
          <div className={classNames(styles.line, styles.partial)}>
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

TranslationOverlay.propTypes = {
  chatOpen: PropTypes.bool
};
