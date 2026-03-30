import React, { useCallback, useContext, useEffect, useState, useRef } from "react";
import PropTypes from "prop-types";
import {
  ChatSidebar,
  ChatMessageGroup,
  SystemMessage,
  ChatMessageList,
  ChatInput,
  MessageAttachmentButton,
  SendMessageButton,
  EmojiPickerPopoverButton,
  PlaceChatButton,
  ChatLengthWarning,
  PermissionMessageGroup
} from "./ChatSidebar";
import { useMaintainScrollPosition } from "../misc/useMaintainScrollPosition";
// import { spawnChatMessage } from "../chat-message";
import { discordBridgesForPresences } from "../../utils/phoenix-utils";
import { defineMessages, useIntl, FormattedMessage } from "react-intl";
import { MAX_MESSAGE_LENGTH } from "../../utils/chat-message";
import { PermissionNotification } from "./PermissionNotifications";
import { usePermissions } from "./hooks/usePermissions";
import { useRoomPermissions } from "./hooks/useRoomPermissions";
import { useRole } from "./hooks/useRole";
import { ChatContext } from "./contexts/ChatContext";
import { ReactComponent as PenIcon } from "../icons/Pen.svg";
import { ReactComponent as CameraIcon } from "../icons/Camera.svg";
import { ReactComponent as GIFIcon } from "../icons/GIF.svg";
import { ReactComponent as ObjectIcon } from "../icons/Object.svg";
import { ReactComponent as UploadIcon } from "../icons/Upload.svg";
import { ObjectUrlModalContainer } from "./ObjectUrlModalContainer";
import configs from "../../utils/configs";
import { anyEntityWith } from "../../utils/bit-utils";
import { MyCameraTool } from "../../bit-components";

const chatSidebarMessages = defineMessages({
  emmptyRoom: {
    id: "chat-sidebar-container.input-placeholder.empty-room",
    defaultMessage: "Nobody is here yet..."
  },
  emmptyRoomBot: {
    id: "chat-sidebar-container.input-placeholder.empty-room-bot",
    defaultMessage: "Send message to {discordChannels}"
  },
  occupants: {
    id: "chat-sidebar-container.input-placeholder.occupants",
    defaultMessage:
      "{occupantCount, plural, one {Send message to one other...} other {Send message to {occupantCount} others...} }"
  },
  occupantsAndBot: {
    id: "chat-sidebar-container.input-placeholder.occupants-and-bot",
    defaultMessage:
      "{occupantCount, plural, one {Send message to one other and {discordChannels}...} other {Send message to {occupantCount} others and {discordChannels}...} }"
  },
  textChatOff: {
    id: "chat-sidebar-container.input-send-button.disabled",
    defaultMessage: "Text Chat Off"
  }
});

// NOTE: context and related functions moved to ChatContext
export function ChatSidebarContainer({
  scene,
  canSpawnMessages,
  presences,
  occupantCount,
  initialValue,
  autoFocus,
  onClose,
  chatExpanded,
  hubChannel,
  mediaSearchStore,
  showNonHistoriedDialog
}) {
  const { messageGroups, sendMessage, setMessagesRead } = useContext(ChatContext);
  const [onScrollList, listRef, scrolledToBottom] = useMaintainScrollPosition(messageGroups);
  const [message, setMessage] = useState(initialValue || "");
  const [isCommand, setIsCommand] = useState(false);
  const { text_chat: canTextChat } = usePermissions();
  const isMod = useRole("owner");
  const { text_chat: textChatEnabled } = useRoomPermissions();
  const typingTimeoutRef = useRef();
  const intl = useIntl();
  const inputRef = useRef();
  const [placeItems, setPlaceItems] = useState([]);

  useEffect(() => {
    if (!hubChannel) return;
    function updatePlaceItems() {
      const hasActiveCamera = !!anyEntityWith(APP.world, MyCameraTool);
      const hasActivePen = !!scene.systems["pen-tools"].getMyPen();

      let nextItems = [
        hubChannel.can("spawn_drawing") && {
          id: "pen",
          icon: PenIcon,
          color: "accent5",
          label: <FormattedMessage id="place-popover.item-type.pen" defaultMessage="Pen" />,
          onSelect: () => scene.emit("penButtonPressed"),
          selected: hasActivePen
        },
        hubChannel.can("spawn_camera") && {
          id: "camera",
          icon: CameraIcon,
          color: "accent5",
          label: <FormattedMessage id="place-popover.item-type.camera" defaultMessage="Camera" />,
          onSelect: () => scene.emit("action_toggle_camera"),
          selected: hasActiveCamera
        }
      ];

      if (hubChannel.can("spawn_and_move_media")) {
        nextItems = [
          ...nextItems,
          configs.integration("tenor") && {
            id: "gif",
            icon: GIFIcon,
            color: "accent2",
            label: <FormattedMessage id="place-popover.item-type.gif" defaultMessage="GIF" />,
            onSelect: () => mediaSearchStore.sourceNavigate("gifs")
          },
          configs.integration("sketchfab") && {
            id: "model",
            icon: ObjectIcon,
            color: "accent2",
            label: <FormattedMessage id="place-popover.item-type.model" defaultMessage="3D Model" />,
            onSelect: () => mediaSearchStore.sourceNavigate("sketchfab")
          },
          {
            id: "upload",
            icon: UploadIcon,
            color: "accent3",
            label: <FormattedMessage id="place-popover.item-type.upload" defaultMessage="Upload" />,
            onSelect: () => showNonHistoriedDialog(ObjectUrlModalContainer, { scene })
          }
        ];
      }

      setPlaceItems(nextItems);
    }

    hubChannel.addEventListener("permissions_updated", updatePlaceItems);
    updatePlaceItems();

    const onSceneStateChange = event => {
      if (event.detail === "camera" || event.detail === "pen") {
        updatePlaceItems();
      }
    };
    scene.addEventListener("stateadded", onSceneStateChange);
    scene.addEventListener("stateremoved", onSceneStateChange);

    return () => {
      hubChannel.removeEventListener("permissions_updated", updatePlaceItems);
      scene.removeEventListener("stateadded", onSceneStateChange);
      scene.removeEventListener("stateremoved", onSceneStateChange);
    };
  }, [hubChannel, mediaSearchStore, showNonHistoriedDialog, scene]);

  const onKeyDown = useCallback(
    e => {
      setIsCommand(e.target.value.startsWith("/"));
      if (!canTextChat && !isCommand) return;
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (e.target.value.length <= MAX_MESSAGE_LENGTH) {
          sendMessage(e.target.value);
          setMessage("");
          // intentionally only doing this on "enter" press and not clicking of send button
          if (e.target.value.startsWith("/")) {
            onClose();
          }
        }
      } else if (e.key === "Escape") {
        onClose();
      }
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => window.APP.hubChannel.endTyping(), 500);
      window.APP.hubChannel.beginTyping();
    },
    [sendMessage, setMessage, onClose, canTextChat, isCommand]
  );

  const onSendMessage = useCallback(() => {
    sendMessage(message.substring(0, MAX_MESSAGE_LENGTH));
    setMessage("");
  }, [message, sendMessage, setMessage]);

  const onUploadAttachments = useCallback(
    e => {
      // TODO: Right now there's no way to upload files to the chat only.
      // When we add the place menu whcih will have an explicit button for uploading files,
      // should we make this attach button only upload to chat?
      for (const file of e.target.files) {
        scene.emit("add_media", file);
      }
    },
    [scene]
  );

  const onSelectEmoji = useCallback(
    ({ emoji, pickerRemainedOpen }) => {
      setMessage(message => message + emoji);
      // If the picker remained open, avoid selecting the input so that the
      // user can keep picking emojis.
      if (!pickerRemainedOpen) inputRef.current.select();
    },
    [setMessage, inputRef]
  );

  useEffect(() => {
    if (autoFocus) {
      inputRef.current.focus();
      const len = inputRef.current.value.length;
      inputRef.current.setSelectionRange(len, len);
    }
    // We only want this effect to run on initial mount even if autoFocus were to change.
    // This does not happen in practice, but this is more correct.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (scrolledToBottom) {
      setMessagesRead();
    }
  }, [messageGroups, scrolledToBottom, setMessagesRead]);

  const discordBridges = discordBridgesForPresences(presences);
  const discordSnippet = discordBridges.map(ch => "#" + ch).join(", ");
  let placeholder;

  if (occupantCount <= 1) {
    if (discordBridges.length === 0) {
      placeholder = intl.formatMessage(chatSidebarMessages["emmptyRoom"]);
    } else {
      placeholder = intl.formatMessage(chatSidebarMessages["emmptyRoomBot"], { discordChannels: discordSnippet });
    }
  } else {
    if (discordBridges.length === 0) {
      placeholder = intl.formatMessage(chatSidebarMessages["occupants"], {
        discordChannels: discordSnippet,
        occupantCount: occupantCount - 1
      });
    } else {
      placeholder = intl.formatMessage(chatSidebarMessages["occupantsAndBot"], {
        discordChannels: discordSnippet,
        occupantCount: occupantCount - 1
      });
    }
  }

  const isMobile = AFRAME.utils.device.isMobile();
  const isOverMaxLength = message.length > MAX_MESSAGE_LENGTH;
  const isDisabled = message.length === 0 || isOverMaxLength || !canTextChat;
  return (
    <ChatSidebar onClose={onClose} chatExpanded={chatExpanded}>
      <ChatMessageList ref={listRef} onScroll={onScrollList}>
        {messageGroups.map(entry => {
          const { id, systemMessage, type } = entry;
          if (systemMessage) {
            return <SystemMessage key={id} {...entry} />;
          } else {
            if (type === "permission") {
              return <PermissionMessageGroup key={id} {...entry} />;
            } else {
              return <ChatMessageGroup key={id} {...entry} />;
            }
          }
        })}
      </ChatMessageList>
      {!canTextChat && <PermissionNotification permission={"text_chat"} />}
      {!textChatEnabled && isMod && <PermissionNotification permission={"text_chat"} isMod={true} />}
      <ChatInput
        id="chat-input"
        ref={inputRef}
        onKeyDown={onKeyDown}
        onChange={e => setMessage(e.target.value)}
        placeholder={placeholder}
        value={message}
        isOverMaxLength={isOverMaxLength}
        warning={
          <>
            {message.length + 50 > MAX_MESSAGE_LENGTH && (
              <ChatLengthWarning messageLength={message.length} maxLength={MAX_MESSAGE_LENGTH} />
            )}
          </>
        }
        afterInput={
          <>
            {!isMobile && <EmojiPickerPopoverButton onSelectEmoji={onSelectEmoji} />}
            {hubChannel && <PlaceChatButton items={placeItems} />}
            {canSpawnMessages && (
              <MessageAttachmentButton onChange={onUploadAttachments} />
            )}
            <SendMessageButton
              onClick={onSendMessage}
              as={"button"}
              disabled={isDisabled && !isCommand}
              title={isDisabled && !isCommand ? intl.formatMessage(chatSidebarMessages["textChatOff"]) : undefined}
            />
          </>
        }
      />
    </ChatSidebar>
  );
}

ChatSidebarContainer.propTypes = {
  canSpawnMessages: PropTypes.bool,
  presences: PropTypes.object.isRequired,
  occupantCount: PropTypes.number.isRequired,
  scene: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
  autoFocus: PropTypes.bool,
  initialValue: PropTypes.string,
  chatExpanded: PropTypes.bool,
  hubChannel: PropTypes.object,
  mediaSearchStore: PropTypes.object,
  showNonHistoriedDialog: PropTypes.func
};
