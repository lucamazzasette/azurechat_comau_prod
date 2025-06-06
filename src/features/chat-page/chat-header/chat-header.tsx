"use client";
import { ExtensionModel } from "@/features/extensions-page/extension-services/models";
import { CHAT_DEFAULT_PERSONA } from "@/features/theme/theme-config";
import { VenetianMask } from "lucide-react";
import { FC, useEffect, useState } from "react";
import { useChat } from "../chat-store";
import { useChatThreads, chatThreadsStore } from "../chat-threads-store";
import { titleRefreshService } from "../title-refresh-service";
import { ChatDocumentModel, ChatThreadModel } from "../chat-services/models";
import { DocumentDetail } from "./document-detail";
import { ExtensionDetail } from "./extension-detail";
import { PersonaDetail } from "./persona-detail";
import { AicoImage } from "./aico-image";

interface Props {
  chatThread: ChatThreadModel;
  chatDocuments: Array<ChatDocumentModel>;
  extensions: Array<ExtensionModel>;
}

export const ChatHeader: FC<Props> = (props) => {
  // Use local state instead of reactive store subscriptions
  const [currentTitle, setCurrentTitle] = useState(props.chatThread.name);
  
  // Register with title refresh service
  useEffect(() => {
    const componentId = `chat-header-${props.chatThread.id}`;
    
    // Define refresh function that updates local state
    const refreshTitle = () => {
      // Get latest title from store
      const latestThread = chatThreadsStore.getThread(props.chatThread.id);
      const newTitle = latestThread?.name || props.chatThread.name;
      
      console.log(`[ChatHeader] Refreshing title: "${currentTitle}" → "${newTitle}"`);
      
      if (newTitle !== currentTitle) {
        setCurrentTitle(newTitle);
        console.log(`[ChatHeader] ✅ Title updated to: "${newTitle}"`);
      }
    };
    
    // Register with service
    titleRefreshService.register(componentId, refreshTitle);
    console.log(`[ChatHeader] 📝 Registered with title refresh service`);
    
    // Cleanup on unmount
    return () => {
      titleRefreshService.unregister(componentId);
      console.log(`[ChatHeader] 🧹 Unregistered from title refresh service`);
    };
  }, [props.chatThread.id, currentTitle]);
  
  // Debug logging
  console.log(`[ChatHeader] Rendering with local title: "${currentTitle}"`);
  
  const persona =
    props.chatThread.personaMessageTitle === "" ||
    props.chatThread.personaMessageTitle === undefined
      ? CHAT_DEFAULT_PERSONA
      : props.chatThread.personaMessageTitle;
  
  return (
    <div className="bg-background border-b flex items-center py-4">
      <div className="container max-w-3xl flex justify-between items-center">
        <div className="flex flex-col gap-2">
          {/* Use thread name from store when available */}
          <div className="flex items-center gap-1">
            <AicoImage />
            <span className="text-2xl font-medium">{currentTitle}</span>
          </div>
          {/* <span className="text-base text-muted-foreground flex gap-2 items-center">
            <VenetianMask size={27} />
            {persona}
          </span> */}
        </div>
        <div className="flex gap-3">
          <PersonaDetail chatThread={props.chatThread} />
          <DocumentDetail chatDocuments={props.chatDocuments} />
          <ExtensionDetail
            disabled={props.chatDocuments.length !== 0}
            extensions={props.extensions}
            installedExtensionIds={props.chatThread.extension}
            chatThreadId={props.chatThread.id}
          />
        </div>
      </div>
    </div>
  );
};
