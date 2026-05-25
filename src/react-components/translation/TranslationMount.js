import React from "react";
import PropTypes from "prop-types";
import { TranslationOverlay } from "./TranslationOverlay";

export function TranslationMount({ chatOpen }) {
  return <TranslationOverlay chatOpen={chatOpen} />;
}

TranslationMount.propTypes = {
  chatOpen: PropTypes.bool
};
