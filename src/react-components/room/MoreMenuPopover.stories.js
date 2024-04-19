import React from "react";
import { RoomLayout } from "../layout/RoomLayout";
import { ReactComponent as CameraIcon } from "../icons/Camera.svg";
import { ReactComponent as AvatarIcon } from "../icons/Avatar.svg";
import { ReactComponent as SceneIcon } from "../icons/Scene.svg";
import { ReactComponent as StarOutlineIcon } from "../icons/StarOutline.svg";
import { ReactComponent as SettingsIcon } from "../icons/Settings.svg";
import { ReactComponent as WarningCircleIcon } from "../icons/WarningCircle.svg";
import { ReactComponent as HomeIcon } from "../icons/Home.svg";
import { ReactComponent as TextDocumentIcon } from "../icons/TextDocument.svg";
import { ReactComponent as SupportIcon } from "../icons/Support.svg";
import { ReactComponent as ShieldIcon } from "../icons/Shield.svg";
import { CompactMoreMenuButton, MoreMenuContextProvider, MoreMenuPopoverButton } from "./MoreMenuPopover";

export default {
  title: "Room/MoreMenuPopover",
  parameters: {
    layout: "fullscreen"
  }
};

const menu = [
  {
    id: "user",
    label: "You",
    items: [
      { id: "user-profile", label: "Cambiar nombre y Avatar", icon: AvatarIcon },
      { id: "favorite-room", label: "Salas favoritas", icon: StarOutlineIcon },
      { id: "preferences", label: "Preferencias", icon: SettingsIcon }
    ]
  },
  {
    id: "room",
    label: "Room",
    items: [
      { id: "room-settings", label: "Ajustes de sala", icon: HomeIcon },
      { id: "change-scene", label: "Cambiar escena", icon: SceneIcon },
      { id: "camera-mode", label: "Entrar en modo cámara", icon: CameraIcon }
    ]
  },
  {
    id: "support",
    label: "Support",
    items: [
      {
        id: "report-issue",
        label: "Reportar un problema",
        icon: WarningCircleIcon,
        href: "https://github.com/mozilla/hubs/issues/new/choose"
      },
      {
        id: "help",
        label: "Ayuda",
        icon: SupportIcon,
        href: "https://hubs.mozilla.com/docs"
      },
      {
        id: "tos",
        label: "Términos de servicio",
        icon: TextDocumentIcon,
        href: "https://github.com/mozilla/hubs/blob/master/TERMS.md"
      },
      {
        id: "privacy",
        label: "Aviso de privacidad",
        icon: ShieldIcon,
        href: "https://github.com/mozilla/hubs/blob/master/PRIVACY.md"
      }
    ]
  }
];

export const Base = () => (
  <MoreMenuContextProvider initiallyVisible={true}>
    <RoomLayout viewport={<CompactMoreMenuButton />} toolbarRight={<MoreMenuPopoverButton menu={menu} />} />
  </MoreMenuContextProvider>
);
