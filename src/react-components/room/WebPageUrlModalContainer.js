import React, { useCallback } from "react";
import PropTypes from "prop-types";
import { WebPageUrlModal } from "./WebPageUrlModal";
export function WebPageUrlModalContainer({ scene, onClose, url }) {
  const onSubmit = useCallback(
    
    ({ src }) => {
      console.log("test");
      scene.emit("spawn-iframe", { src });
      onClose();
    },
    [scene, onClose]
  );
  return <WebPageUrlModal onSubmit={onSubmit} onClose={onClose} url={url} />;
}
WebPageUrlModalContainer.propTypes = {
  scene: PropTypes.object.isRequired,
  onClose: PropTypes.func
};