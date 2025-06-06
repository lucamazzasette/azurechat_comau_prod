"use client";
import { ChatInput } from "@/features/chat-page/chat-input/chat-input";
import { ChatHeader } from "@/features/chat-page/chat-header/chat-header";
import { chatStore, useChat } from "@/features/chat-page/chat-store";
import { ChatThreadModel, ChatMessageModel, ChatDocumentModel } from "@/features/chat-page/chat-services/models";
import { AddExtension } from "@/features/extensions-page/add-extension/add-new-extension";
import { ExtensionCard } from "@/features/extensions-page/extension-card/extension-card";
import { ExtensionModel } from "@/features/extensions-page/extension-services/models";
import { PersonaCard } from "@/features/persona-page/persona-card/persona-card";
import { PersonaModel } from "@/features/persona-page/persona-services/models";
import { ScrollArea } from "@/features/ui/scroll-area";
import { FC, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { ChatLoading } from "@/features/ui/chat/chat-message-area/chat-loading";
import { ChatMessageArea } from "@/features/ui/chat/chat-message-area/chat-message-area";
import ChatMessageContainer from "@/features/ui/chat/chat-message-area/chat-message-container";
import ChatMessageContentArea from "@/features/ui/chat/chat-message-area/chat-message-content";
import { useChatScrollAnchor } from "@/features/ui/chat/chat-message-area/use-chat-scroll-anchor";
import MessageContent from "@/features/chat-page/message-content";

interface ChatHomeProps {
  personas: PersonaModel[];
  extensions: ExtensionModel[];
  chatThread: ChatThreadModel;
  messages: Array<ChatMessageModel>;
  chatDocuments: Array<ChatDocumentModel>;
}

export const ChatHome: FC<ChatHomeProps> = (props) => {
  const { data: session } = useSession();

  // Initialize chat session
  useEffect(() => {
    chatStore.initChatSession({
      chatThread: props.chatThread,
      messages: props.messages,
      userName: session?.user?.name!,
    });
    
    // Enable auto-scroll by default for better UX
    chatStore.updateAutoScroll(true);
  }, [props.messages, session?.user?.name, props.chatThread]);

  const { messages, loading } = useChat();
  const current = useRef<HTMLDivElement>(null);
  useChatScrollAnchor({ ref: current });

  return (
    <main className="flex flex-1 relative flex-col">
      <ChatHeader
        chatThread={props.chatThread}
        chatDocuments={props.chatDocuments}
        extensions={props.extensions}
      />
      
      {messages.length === 0 ? (
        <ScrollArea className="flex-1">
          <div className="flex flex-1 flex-col gap-6 pb-6">
            <div className="container max-w-4xl flex gap-20 flex-col">
              <div>
                <h2 className="text-2xl font-bold mb-3">Extensions</h2>
                {props.extensions && props.extensions.length > 0 ? (
                  <div className="grid grid-cols-3 gap-3">
                    {props.extensions.map((extension) => {
                      return (
                        <ExtensionCard
                          extension={extension}
                          key={extension.id}
                          showContextMenu={false}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-muted-foreground max-w-xl">No extensions created</p>
                )}
              </div>
              
              <div>
                <h2 className="text-2xl font-bold mb-3">Personas</h2>
                {props.personas && props.personas.length > 0 ? (
                  <div className="grid grid-cols-3 gap-3">
                    {props.personas.map((persona) => {
                      return (
                        <PersonaCard
                          persona={persona}
                          key={persona.id}
                          showContextMenu={false}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-muted-foreground max-w-xl">No personas created</p>
                )}
              </div>
            </div>
            <AddExtension />
          </div>
        </ScrollArea>
      ) : (
        <ChatMessageContainer ref={current}>
          <ChatMessageContentArea>
            {messages.map((message) => {
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
      )}
      
      <ChatInput />
    </main>
  );
};
