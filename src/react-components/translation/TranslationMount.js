import React from "react";
import PropTypes from "prop-types";
import { TranslationModal } from "./TranslationModal";
import { TranslationOverlay } from "./TranslationOverlay";
import { translationStore, useTranslationStore } from "../../utils/translation/translation-store";

export function TranslationMount({ scene }) {
  const state = useTranslationStore();
  return (
    <>
      <TranslationOverlay />
      {state.modalOpen && scene && (
        <TranslationModalWrapper scene={scene} />
      )}
    </>
  );
}

function TranslationModalWrapper({ scene }) {
  return (
    <div style={modalContainerStyle}>
      <div style={modalBackdropStyle} onClick={() => translationStore.closeModal()} />
      <div style={modalInnerStyle}>
        <TranslationModal scene={scene} onClose={() => translationStore.closeModal()} />
      </div>
    </div>
  );
}

TranslationModalWrapper.propTypes = {
  scene: PropTypes.object.isRequired
};

TranslationMount.propTypes = {
  scene: PropTypes.object
};

const modalContainerStyle = {
  position: "fixed",
  inset: 0,
  zIndex: 100,
  display: "flex",
  alignItems: "center",
  justifyContent: "center"
};

const modalBackdropStyle = {
  position: "absolute",
  inset: 0,
  background: "rgba(0, 0, 0, 0.55)"
};

const modalInnerStyle = {
  position: "relative",
  zIndex: 1
};
