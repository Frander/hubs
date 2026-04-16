import { useEffect, useState } from "react";

// Resolves to APP.mediaDevicesManager when available, and re-renders the
// caller once it appears (it is created asynchronously in hub.js after the
// a-scene and hubChannel are both ready).
export function useMediaDevicesManager(scene) {
  const [manager, setManager] = useState(APP.mediaDevicesManager);

  useEffect(() => {
    if (manager) return;
    if (APP.mediaDevicesManager) {
      setManager(APP.mediaDevicesManager);
      return;
    }
    const target = scene || document.querySelector("a-scene");
    if (!target) return;
    const onReady = m => setManager(m || APP.mediaDevicesManager);
    target.addEventListener("media_devices_manager_ready", onReady, { once: true });
    return () => target.removeEventListener("media_devices_manager_ready", onReady);
  }, [manager, scene]);

  return manager;
}
