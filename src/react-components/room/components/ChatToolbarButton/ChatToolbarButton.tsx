import { ToolbarButton } from "../../../input/ToolbarButton";
import { defineMessage, useIntl } from "react-intl";
import React, { useContext } from "react";
import { ChatContext } from "../../contexts/ChatContext";
import { ToolTip } from "@mozilla/lilypad-ui";
import ChatIconBtn from "../../../../assets/newSkin/chatBtn.png";
import ChatIconBtnClose from "../../../../assets/newSkin/chatBtnClose.png";
// @ts-ignore
import styles from "./ChatToolbarButton.scss";

const chatTooltipDescription = defineMessage({
  id: "chat-tooltip.description",
  defaultMessage: "Open the chat sidebar (T)"
});

const chatCloseTooltipDescription = defineMessage({
  id: "chat-close-tooltip.description",
  defaultMessage: "Close the chat sidebar (T)"
});

type ChatToolbarButtonProps = {
  onClick: () => void;
  selected: boolean
};

const ChatToolbarButton = ({ onClick, selected }: ChatToolbarButtonProps) => {
  const { unreadMessages } = useContext(ChatContext);
  const intl = useIntl();
  const description = intl.formatMessage(selected ? chatCloseTooltipDescription : chatTooltipDescription);

  const icon = selected
    ? <img src={ChatIconBtnClose} width="100%" />
    : <img src={ChatIconBtn} width="100%" />;

  return (
    <ToolTip description={description}>
      <ToolbarButton
        // Ignore type lint error as we will be redoing ToolbarButton in the future
        // @ts-ignore
        onClick={onClick}
        statusColor={unreadMessages ? "unread" : undefined}
        icon={icon}
        preset="accent4"
        selected={selected}
        iconContainerClassName={styles.smallIconContainer}
      />
    </ToolTip>
  );
};

export default ChatToolbarButton;
