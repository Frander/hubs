import { useSyncExternalStore } from "react";
import {
  DEFAULT_SOURCE_LANG,
  DEFAULT_TARGET_LANG
} from "./translation-config";
import { TranslationClient } from "./TranslationClient";

const MAX_FINALS = 50;

let state = {
  modalOpen: false,
  status: "idle",
  sourceLang: DEFAULT_SOURCE_LANG,
  targetLang: DEFAULT_TARGET_LANG,
  partial: null,
  finals: [],
  error: null,
  startedAt: null,
  lastTranscriptAt: null,
  firstTranscriptLatencyMs: null
};

const listeners = new Set();
const client = new TranslationClient();

function emit() {
  for (const l of listeners) l();
}

function update(patch) {
  state = { ...state, ...patch };
  emit();
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return state;
}

export const translationStore = {
  subscribe,
  getSnapshot,

  openModal() {
    update({ modalOpen: true });
  },

  closeModal() {
    update({ modalOpen: false });
  },

  setSourceLang(code) {
    update({ sourceLang: code });
  },

  setTargetLang(code) {
    update({ targetLang: code });
  },

  isActive() {
    return state.status !== "idle" && state.status !== "error";
  },

  async start(sceneEl) {
    update({
      error: null,
      partial: null,
      finals: [],
      startedAt: Date.now(),
      lastTranscriptAt: null,
      firstTranscriptLatencyMs: null
    });

    await client.start({
      sceneEl,
      sourceLang: state.sourceLang,
      targetLang: state.targetLang,
      onStatus: status => update({ status }),
      onTranscript: handleTranscript,
      onError: message => update({ error: message })
    });
  },

  stop() {
    client.stop();
  },

  clearError() {
    update({ error: null });
  },

  clearSubtitles() {
    update({ partial: null, finals: [] });
  }
};

function handleTranscript(msg) {
  const now = Date.now();
  const patch = { lastTranscriptAt: now };
  if (state.firstTranscriptLatencyMs === null && state.startedAt) {
    patch.firstTranscriptLatencyMs = now - state.startedAt;
  }

  const targetLang = state.targetLang;
  const translated = msg.translations && msg.translations[targetLang];
  const text = translated || msg.original || "";
  if (!text) {
    update(patch);
    return;
  }

  const entry = {
    segmentId: msg.segment_id,
    text,
    original: msg.original,
    isFinal: !!msg.is_final,
    endMs: msg.end_ms ?? Date.now()
  };

  if (entry.isFinal) {
    const existingIdx = state.finals.findIndex(f => f.segmentId === entry.segmentId);
    let newFinals;
    if (existingIdx >= 0) {
      newFinals = [...state.finals];
      newFinals[existingIdx] = entry;
    } else {
      newFinals = [...state.finals, entry].slice(-MAX_FINALS);
    }
    patch.finals = newFinals;
    if (state.partial && state.partial.segmentId === entry.segmentId) {
      patch.partial = null;
    }
  } else {
    patch.partial = entry;
  }
  update(patch);
}

export function useTranslationStore() {
  return useSyncExternalStore(translationStore.subscribe, translationStore.getSnapshot);
}
