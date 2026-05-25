import { useSyncExternalStore } from "react";
import {
  DEFAULT_SOURCE_LANG,
  DEFAULT_TARGET_LANG
} from "./translation-config";
import { TranslationClient } from "./TranslationClient";

const MAX_FINALS = 6;

const state = {
  modalOpen: false,
  status: "idle",
  sourceLang: DEFAULT_SOURCE_LANG,
  targetLang: DEFAULT_TARGET_LANG,
  partial: null,
  finals: [],
  error: null
};

const listeners = new Set();
const client = new TranslationClient();

function emit() {
  for (const l of listeners) l();
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
    state.modalOpen = true;
    emit();
  },

  closeModal() {
    state.modalOpen = false;
    emit();
  },

  setSourceLang(code) {
    state.sourceLang = code;
    emit();
  },

  setTargetLang(code) {
    state.targetLang = code;
    emit();
  },

  isActive() {
    return state.status !== "idle" && state.status !== "error";
  },

  async start(sceneEl) {
    state.error = null;
    state.partial = null;
    state.finals = [];
    emit();

    await client.start({
      sceneEl,
      sourceLang: state.sourceLang,
      targetLang: state.targetLang,
      onStatus: status => {
        state.status = status;
        emit();
      },
      onTranscript: msg => handleTranscript(msg),
      onError: message => {
        state.error = message;
        emit();
      }
    });
  },

  stop() {
    client.stop();
  },

  clearError() {
    state.error = null;
    emit();
  },

  clearSubtitles() {
    state.partial = null;
    state.finals = [];
    emit();
  }
};

function handleTranscript(msg) {
  const targetLang = state.targetLang;
  const translated = msg.translations && msg.translations[targetLang];
  const text = translated || msg.original || "";
  if (!text) return;

  const entry = {
    segmentId: msg.segment_id,
    text,
    original: msg.original,
    isFinal: !!msg.is_final,
    endMs: msg.end_ms ?? Date.now()
  };

  if (entry.isFinal) {
    const existingIdx = state.finals.findIndex(f => f.segmentId === entry.segmentId);
    if (existingIdx >= 0) {
      state.finals[existingIdx] = entry;
    } else {
      state.finals = [...state.finals, entry].slice(-MAX_FINALS);
    }
    if (state.partial && state.partial.segmentId === entry.segmentId) {
      state.partial = null;
    }
  } else {
    state.partial = entry;
  }
  emit();
}

export function useTranslationStore() {
  return useSyncExternalStore(translationStore.subscribe, translationStore.getSnapshot);
}
