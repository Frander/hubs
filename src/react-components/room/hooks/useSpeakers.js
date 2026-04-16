import { useState, useEffect, useCallback } from "react";
import { MediaDevices, MediaDevicesEvents } from "../../../utils/media-devices-utils";
import { useMediaDevicesManager } from "./useMediaDevicesManager";

export function useSpeakers() {
  const mediaDevicesManager = useMediaDevicesManager();
  const [speakerDevices, setSpeakerDevices] = useState({
    value: mediaDevicesManager?.selectedSpeakersDeviceId,
    options: mediaDevicesManager?.outputDevicesOptions
  });

  useEffect(() => {
    if (!mediaDevicesManager) return;

    const onPermissionsChanged = ({ mediaDevice }) => {
      if (mediaDevice === MediaDevices.MICROPHONE) {
        setSpeakerDevices({
          value: mediaDevicesManager.selectedSpeakersDeviceId,
          options: mediaDevicesManager.outputDevicesOptions
        });
      }
    };
    mediaDevicesManager.on(MediaDevicesEvents.PERMISSIONS_STATUS_CHANGED, onPermissionsChanged);

    const onDeviceChange = () => {
      setSpeakerDevices({
        value: mediaDevicesManager.selectedSpeakersDeviceId,
        options: mediaDevicesManager.outputDevicesOptions
      });
    };
    mediaDevicesManager.on(MediaDevicesEvents.DEVICE_CHANGE, onDeviceChange);

    setSpeakerDevices({
      value: mediaDevicesManager.selectedSpeakersDeviceId,
      options: mediaDevicesManager.outputDevicesOptions
    });

    return () => {
      mediaDevicesManager.off(MediaDevicesEvents.PERMISSIONS_STATUS_CHANGED, onPermissionsChanged);
      mediaDevicesManager.off(MediaDevicesEvents.DEVICE_CHANGE, onDeviceChange);
    };
  }, [setSpeakerDevices, mediaDevicesManager]);

  const speakerDeviceChanged = useCallback(
    deviceId => {
      if (!mediaDevicesManager) return;
      mediaDevicesManager.changeAudioOutput(deviceId);
      setSpeakerDevices({
        value: mediaDevicesManager.selectedSpeakersDeviceId,
        options: mediaDevicesManager.outputDevicesOptions
      });
    },
    [mediaDevicesManager]
  );

  return {
    speakerDeviceChanged,
    speakerDevices
  };
}
