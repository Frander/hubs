import React, { useRef } from "react";
import PropTypes from "prop-types";
import { RoomLayout } from "../layout/RoomLayout";
import { useResizeViewport } from "./hooks/useResizeViewport";

export function RoomLayoutContainer({ store, scene, showNonHistoriedDialog, onPersonasClick, personasCount, ...rest }) {
  const viewportRef = useRef();

  useResizeViewport(viewportRef, store, scene);

  return <RoomLayout viewportRef={viewportRef} scene={scene} showNonHistoriedDialog={showNonHistoriedDialog} onPersonasClick={onPersonasClick} personasCount={personasCount} {...rest} />;
}

RoomLayoutContainer.propTypes = {
  store: PropTypes.object.isRequired,
  scene: PropTypes.object.isRequired
};
