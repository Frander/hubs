import { ToolbarButton } from "../../../input/ToolbarButton";
import { defineMessage, useIntl } from "react-intl";
import React from "react";
import { ToolTip } from "@mozilla/lilypad-ui";
import FullIconBtn from "../../../../assets/newSkin/full.png";
// @ts-ignore
import styles from "./ChatToolbarButton.scss";

const expandTooltip = defineMessage({
  id: "fullscreen-chat-tooltip.expand",
  defaultMessage: "Expand chat"
});

const collapseTooltip = defineMessage({
  id: "fullscreen-chat-tooltip.collapse",
  defaultMessage: "Collapse chat"
});

type FullscreenChatButtonProps = {
  expanded: boolean;
  onClick: () => void;
};

const FullscreenChatButton = ({ expanded, onClick }: FullscreenChatButtonProps) => {
  const intl = useIntl();
  const description = intl.formatMessage(expanded ? collapseTooltip : expandTooltip);

  return (
    <ToolTip description={description}>
      <ToolbarButton
        // @ts-ignore
        onClick={onClick}
        icon={<img src={FullIconBtn} width="100%" />}
        preset="accent4"
        selected={expanded}
        iconContainerClassName={styles.smallIconContainer}
      />
    </ToolTip>
  );
};

export default FullscreenChatButton;
