import React from "react";
import PropTypes from "prop-types";
import { ToolbarButton } from "../input/ToolbarButton";
import { ReactComponent as AudioIcon } from "../icons/Audio.svg";
import { useTranslationStore } from "../../utils/translation/translation-store";

export function TranslationToolbarButton({ onClick }) {
  const state = useTranslationStore();
  const active = state.status !== "idle" && state.status !== "error";

  return (
    <ToolbarButton
      icon={<AudioIcon />}
      preset={active ? "accept" : "basic"}
      title={active ? "Translation active — click to manage" : "Open real-time translation"}
      statusColor={active ? "enabled" : undefined}
      onClick={onClick}
    />
  );
}

TranslationToolbarButton.propTypes = {
  onClick: PropTypes.func.isRequired
};
