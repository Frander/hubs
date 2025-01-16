import { ToolbarButton } from "../../../input/ToolbarButton";
// TO DO: look into changing icon theme handling to work with TS
// @ts-ignore
import { ReactComponent as ChatIcon } from "../../../icons/Chat.svg";
import { FormattedMessage, defineMessage, useIntl } from "react-intl";
import React, { useContext } from "react";
import { ChatContext } from "../../contexts/ChatContext";
import { ToolTip } from "@mozilla/lilypad-ui";
import  ChatIconBtn from "../../../../assets/newSkin/account.png";
import { WebPageUrlModalContainer } from "../../WebPageUrlModalContainer";

const chatTooltipDescription = defineMessage({
  id: "chat-tooltip.description",
  defaultMessage: "Open WP account"
});

type AccountWPToolbarButtonProps = {
  onClick: () => void;
  selected: boolean,
  scene: any,
  showNonHistoriedDialog: any,
  url: string,
  title: string,
};

const AccountWPToolbarButton = ({ onClick, selected, scene, showNonHistoriedDialog, url, title }: AccountWPToolbarButtonProps) => {
  const { unreadMessages } = useContext(ChatContext);
  const intl = useIntl();
  const description = intl.formatMessage(chatTooltipDescription);

  return (
    <ToolTip description={description}>
      <ToolbarButton
        // Ignore type lint error as we will be redoing ToolbarButton in the future
        // @ts-ignore
        onClick={() => showNonHistoriedDialog(WebPageUrlModalContainer, { scene, url = url, title = title })}
        statusColor={unreadMessages ? "unread" : undefined}
        icon={<img src={ChatIconBtn} width="100%"/>}
        preset="accent4"
        selected={selected}
      />
    </ToolTip>
  );
};

export default AccountWPToolbarButton;
