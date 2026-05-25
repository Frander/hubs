import React from "react";
import PropTypes from "prop-types";
import { Modal } from "../modal/Modal";
import { Button } from "../input/Button";
import { CloseButton } from "../input/CloseButton";
import { SelectInputField } from "../input/SelectInputField";
import { Column } from "../layout/Column";
import { SUPPORTED_LANGUAGES } from "../../utils/translation/translation-config";
import { translationStore, useTranslationStore } from "../../utils/translation/translation-store";

const langOptions = SUPPORTED_LANGUAGES.map(l => ({ value: l.code, label: l.label }));

export function TranslationModal({ scene, onClose }) {
  const state = useTranslationStore();

  const handleStart = async () => {
    if (state.sourceLang === state.targetLang) {
      return;
    }
    await translationStore.start(scene);
    onClose();
  };

  const handleStop = () => {
    translationStore.stop();
    onClose();
  };

  const isStarting = state.status === "connecting";
  const isRunning = state.status === "streaming" || state.status === "ready";
  const sameLang = state.sourceLang === state.targetLang;

  return (
    <Modal title="Real-time Translation" beforeTitle={<CloseButton onClick={onClose} />}>
      <Column padding center grow style={{ minWidth: 360, gap: 16 }}>
        <p style={{ margin: 0, textAlign: "center", maxWidth: 360 }}>
          Captura el audio de los demás participantes de la sala y lo traduce al idioma que elijas.
          Tu micrófono no se envía.
        </p>

        <SelectInputField
          label="Idioma de origen"
          value={state.sourceLang}
          options={langOptions}
          onChange={code => translationStore.setSourceLang(code)}
          fullWidth
        />

        <SelectInputField
          label="Idioma de destino"
          value={state.targetLang}
          options={langOptions}
          onChange={code => translationStore.setTargetLang(code)}
          fullWidth
        />

        {sameLang && (
          <p style={{ color: "#c66", margin: 0, fontSize: 13 }}>
            Origen y destino no pueden ser el mismo idioma.
          </p>
        )}

        {state.error && (
          <p style={{ color: "#c66", margin: 0, fontSize: 13, textAlign: "center" }}>
            Error: {state.error}
          </p>
        )}

        <p style={{ margin: 0, fontSize: 12, color: "#888" }}>
          Estado: <strong>{state.status}</strong>
        </p>

        {!isRunning ? (
          <Button
            preset="accept"
            onClick={handleStart}
            disabled={isStarting || sameLang}
          >
            {isStarting ? "Conectando..." : "Iniciar traducción"}
          </Button>
        ) : (
          <Button preset="cancel" onClick={handleStop}>
            Detener traducción
          </Button>
        )}
      </Column>
    </Modal>
  );
}

TranslationModal.propTypes = {
  scene: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired
};
