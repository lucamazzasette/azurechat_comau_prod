"use client";
import { ChatInput } from "@/features/chat-page/chat-input/chat-input";
import { chatStore, useChat } from "@/features/chat-page/chat-store";
import { ChatLoading } from "@/features/ui/chat/chat-message-area/chat-loading";
import { ChatMessageArea } from "@/features/ui/chat/chat-message-area/chat-message-area";
import ChatMessageContainer from "@/features/ui/chat/chat-message-area/chat-message-container";
import ChatMessageContentArea from "@/features/ui/chat/chat-message-area/chat-message-content";
import { useChatScrollAnchor } from "@/features/ui/chat/chat-message-area/use-chat-scroll-anchor";
import { useSession } from "next-auth/react";
import { FC, useEffect, useRef, useMemo } from "react";
import { AssistantAvatar } from "@/features/ui/assistant-avatar";
import { ExtensionModel } from "../extensions-page/extension-services/models";
import { ChatHeader } from "./chat-header/chat-header";
import {
  ChatDocumentModel,
  ChatMessageModel,
  ChatThreadModel,
} from "./chat-services/models";
import MessageContent from "./message-content";
import { 
  shouldShowPersonaIntro, 
  generatePersonaIntroMessage, 
  formatIntroMessageForChat 
} from "./persona-intro-service";

interface ChatPageProps {
  messages: Array<ChatMessageModel>;
  chatThread: ChatThreadModel;
  chatDocuments: Array<ChatDocumentModel>;
  extensions: Array<ExtensionModel>;
}

export const ChatPage: FC<ChatPageProps> = (props) => {
  const { data: session } = useSession();

  useEffect(() => {
    chatStore.initChatSession({
      chatThread: props.chatThread,
      messages: props.messages,
      userName: session?.user?.name!,
    });
    
    // Enable auto-scroll by default for better UX (like Claude.ai)
    chatStore.updateAutoScroll(true);
  }, [props.messages, session?.user?.name, props.chatThread]);

  const { messages, loading } = useChat();

  // Generate persona introduction message if needed
  const introMessage = useMemo(() => {
    const shouldShowIntro = shouldShowPersonaIntro(props.chatThread, props.messages.length);
    
    if (shouldShowIntro) {
      console.log(`[ChatPage] Generating persona intro for: ${props.chatThread.personaMessageTitle}`);
      const intro = generatePersonaIntroMessage(props.chatThread);
      return formatIntroMessageForChat(intro);
    }
    
    return null;
  }, [props.chatThread, props.messages.length]);

  // Combine intro message with chat messages
  const displayMessages = useMemo(() => {
    if (introMessage) {
      // Add intro message at the beginning
      return [introMessage, ...messages];
    }
    return messages;
  }, [introMessage, messages]);

  const current = useRef<HTMLDivElement>(null);

  useChatScrollAnchor({ ref: current });

  return (
    <main className="flex flex-1 relative flex-col">
      <ChatHeader
        chatThread={props.chatThread}
        chatDocuments={props.chatDocuments}
        extensions={props.extensions}
      />
      <ChatMessageContainer ref={current}>
        <ChatMessageContentArea>
          {displayMessages.map((message) => {
            return (
              <ChatMessageArea
                key={message.id}
                profileName={message.name}
                role={message.role}
                onCopy={() => {
                  navigator.clipboard.writeText(message.content);
                }}
                profilePicture={
                  message.role === "assistant"
                    ? undefined
                    : session?.user?.image
                }
              >
                <MessageContent message={message} />
              </ChatMessageArea>
            );
          })}
          {loading === "loading" && <ChatLoading />}
        </ChatMessageContentArea>
      </ChatMessageContainer>
      <ChatInput 
        starterPrompts={props.chatThread.starterPrompts}
        personaName={props.chatThread.personaMessageTitle}
        showStarterPrompts={
          props.messages.length === 0 && 
          props.chatThread.starterPrompts && 
          props.chatThread.starterPrompts.length > 0 &&
          !!props.chatThread.personaMessageTitle && 
          typeof props.chatThread.personaMessageTitle === 'string' &&
          props.chatThread.personaMessageTitle.trim() !== ""
        }
      />
    </main>
  );
};
