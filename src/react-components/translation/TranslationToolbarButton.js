import React from "react";
import { ToolbarButton } from "../input/ToolbarButton";
import { ReactComponent as AudioIcon } from "../icons/Audio.svg";
import { translationStore, useTranslationStore } from "../../utils/translation/translation-store";

export function TranslationToolbarButton() {
  const state = useTranslationStore();
  const active = state.status !== "idle" && state.status !== "error";

  return (
    <ToolbarButton
      icon={<AudioIcon />}
      preset={active ? "accept" : "basic"}
      title={active ? "Translation active — click to manage" : "Open real-time translation"}
      selected={state.modalOpen}
      statusColor={active ? "enabled" : undefined}
      onClick={() => {
        if (state.modalOpen) {
          translationStore.closeModal();
        } else {
          translationStore.openModal();
        }
      }}
    />
  );
}
