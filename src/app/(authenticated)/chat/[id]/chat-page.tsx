"use client";
import React, { FC, useEffect, useRef, useState, useCallback, useMemo } from "react";
import { ChatInput } from "../../../../features/chat-page/chat-input/chat-input";
import { chatStore, useChat } from "../../../../features/chat-page/chat-store";
import { ChatLoading } from "../../../../features/ui/chat/chat-message-area/chat-loading";
import { ChatMessageArea } from "../../../../features/ui/chat/chat-message-area/chat-message-area";
import ChatMessageContainer from "../../../../features/ui/chat/chat-message-area/chat-message-container";
import ChatMessageContentArea from "../../../../features/ui/chat/chat-message-area/chat-message-content";
import { useChatScrollAnchor } from "../../../../features/ui/chat/chat-message-area/use-chat-scroll-anchor";
import { useSession } from "next-auth/react";
import { ExtensionModel } from "../../../../features/extensions-page/extension-services/models";
import { ChatHeader } from "../../../../features/chat-page/chat-header/chat-header";
import {
  ChatDocumentModel,
  ChatMessageModel,
  ChatThreadModel,
} from "../../../../features/chat-page/chat-services/models";
import MessageContent from "../../../../features/chat-page/message-content";
import Disclaimer from "../../../../features/ui/chat/disclaimer";
import { useTheme } from "next-themes";

interface ChatPageProps {
  messages: Array<ChatMessageModel>;
  chatThread: ChatThreadModel;
  chatDocuments: Array<ChatDocumentModel>;
  extensions: Array<ExtensionModel>;
}

const MemoizedChatHeader = React.memo(ChatHeader);

export const ChatPage: FC<ChatPageProps> = (props) => {
  const { data: session } = useSession();
  const { theme } = useTheme();
  const [profilePicture, setProfilePicture] = useState("/logo.png");

  useEffect(() => {
    chatStore.initChatSession({
      chatThread: props.chatThread,
      messages: props.messages,
      userName: session?.user?.name!,
    });

    setProfilePicture(theme === "dark" ? "/Logo-white.png" : "/logo.png");
  }, [props.chatThread, props.messages, session?.user?.name, theme]);

  const { messages, loading } = useChat();

  const current = useRef<HTMLDivElement>(null);

  useChatScrollAnchor({ ref: current });

  const handleCopy = useCallback((content: string) => {
    navigator.clipboard.writeText(content);
  }, []);

  const memoizedMessages = useMemo(() => messages.map((message: ChatMessageModel) => (
    <ChatMessageArea
      key={message.id}
      profileName={message.name}
      role={message.role}
      onCopy={() => handleCopy(message.content)}
      profilePicture={
        message.role === "assistant"
          ? profilePicture
          : session?.user?.image
      }
      theme={theme}
    >
      <MessageContent message={message} />
    </ChatMessageArea>
  )), [messages, profilePicture, session?.user?.image, theme, handleCopy]);

  return (
    <main className="flex flex-1 relative flex-col">
      <MemoizedChatHeader
        chatThread={props.chatThread}
        chatDocuments={props.chatDocuments}
        extensions={props.extensions}
      />
      <ChatMessageContainer ref={current}>
        <ChatMessageContentArea>
          {memoizedMessages}
          {loading === "loading" && <ChatLoading />}
        </ChatMessageContentArea>
      </ChatMessageContainer>
      <div className="flex flex-col items-center mt-4">
         <ChatInput />
       <div className="mt-2 text-center">
        <Disclaimer text={"The information generated by COMAU AICO could be wrong, please verify before using it."} />
       </div>
      </div>
    </main>
  );
};