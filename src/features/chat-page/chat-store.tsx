"use client";
import { uniqueId } from "@/features/common/util";
import { showError } from "@/features/globals/global-message-store";
import { AI_NAME, NEW_CHAT_NAME } from "@/features/theme/theme-config";
import {
  ParsedEvent,
  ReconnectInterval,
  createParser,
} from "eventsource-parser";
import { FormEvent } from "react";
import { proxy, useSnapshot } from "valtio";
import { RevalidateCache } from "../common/navigation-helpers";
import { InputImageStore } from "../ui/chat/chat-input-area/input-image-store";
import { textToSpeechStore } from "./chat-input/speech/use-text-to-speech";
import { ResetInputRows } from "./chat-input/use-chat-input-dynamic-height";
import { chatThreadsStore } from "./chat-threads-store";
import { titleRefreshService } from "./title-refresh-service";
import {
  AddExtensionToChatThread,
  RemoveExtensionFromChatThread,
  UpdateChatTitle,
} from "./chat-services/chat-thread-service";
import {
  AzureChatCompletion,
  ChatMessageModel,
  ChatThreadModel,
} from "./chat-services/models";
let abortController: AbortController = new AbortController();

type chatStatus = "idle" | "loading" | "file upload";

class ChatState {
  public messages: Array<ChatMessageModel> = [];
  public loading: chatStatus = "idle";
  public input: string = "";
  public lastMessage: string = "";
  public autoScroll: boolean = false;
  public userName: string = "";
  public chatThreadId: string = "";

  private chatThread: ChatThreadModel | undefined;

  private addToMessages(message: ChatMessageModel) {
    const currentMessage = this.messages.find((el) => el.id === message.id);
    if (currentMessage) {
      currentMessage.content = message.content;
    } else {
      this.messages.push(message);
    }
  }

  private removeMessage(id: string) {
    const index = this.messages.findIndex((el) => el.id === id);
    if (index > -1) {
      this.messages.splice(index, 1);
    }
  }

  public updateLoading(value: chatStatus) {
    this.loading = value;
  }

  public initChatSession({
    userName,
    messages,
    chatThread,
  }: {
    chatThread: ChatThreadModel;
    userName: string;
    messages: Array<ChatMessageModel>;
  }) {
    this.chatThread = chatThread;
    this.chatThreadId = chatThread.id;
    this.messages = messages;
    this.userName = userName;
    
    console.log(`[ChatStore] Initializing chat session for thread ${chatThread.id} with name "${chatThread.name}"`);
    
    // Ensure the threads store is also initialized with this thread
    // Use addOrUpdateThread to properly sync the current thread
    chatThreadsStore.addOrUpdateThread(chatThread);
    
    // Set this as the current thread in the store
    chatThreadsStore.setCurrentThread(chatThread.id);
  }

  public async AddExtensionToChatThread(extensionId: string) {
    this.loading = "loading";

    const response = await AddExtensionToChatThread({
      extensionId: extensionId,
      chatThreadId: this.chatThreadId,
    });
    RevalidateCache({
      page: "chat",
      type: "layout",
    });

    if (response.status !== "OK") {
      showError(response.errors[0].message);
    }

    this.loading = "idle";
  }

  public async RemoveExtensionFromChatThread(extensionId: string) {
    this.loading = "loading";

    const response = await RemoveExtensionFromChatThread({
      extensionId: extensionId,
      chatThreadId: this.chatThreadId,
    });

    RevalidateCache({
      page: "chat",
    });

    if (response.status !== "OK") {
      showError(response.errors[0].message);
    }

    this.loading = "idle";
  }

  public updateInput(value: string) {
    this.input = value;
  }

  public stopGeneratingMessages() {
    abortController.abort();
  }

  public updateAutoScroll(value: boolean) {
    this.autoScroll = value;
  }

  public updateThreadTitle(threadId: string, newTitle: string) {
    // Update current chat thread title if this is the active thread
    if (this.chatThreadId === threadId) {
      if (this.chatThread) {
        this.chatThread.name = newTitle;
      }
      console.log(`[ChatStore] Updated active thread title to "${newTitle}"`);
    }
  }

  public setStreamingMode(isStreaming: boolean) {
    // During streaming, ensure auto-scroll is gentle and responsive
    if (isStreaming && this.autoScroll) {
      // Keep auto-scroll enabled but mark as streaming for special handling
      this.loading = "loading";
    }
  }

  private reset() {
    this.input = "";
    ResetInputRows();
    InputImageStore.Reset();
  }

  private async chat(formData: FormData) {
    this.updateAutoScroll(true);
    this.loading = "loading";

    const multimodalImage = formData.get("image-base64") as unknown as string;

    const newUserMessage: ChatMessageModel = {
      id: uniqueId(),
      role: "user",
      content: this.input,
      name: this.userName,
      multiModalImage: multimodalImage,
      createdAt: new Date(),
      isDeleted: false,
      threadId: this.chatThreadId,
      type: "CHAT_MESSAGE",
      userId: "",
    };

    this.messages.push(newUserMessage);
    this.reset();

    const controller = new AbortController();
    abortController = controller;

    try {
      if (this.chatThreadId === "" || this.chatThreadId === undefined) {
        showError("Chat thread ID is empty");
        return;
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      const onParse = (event: ParsedEvent | ReconnectInterval) => {
        if (event.type === "event") {
          const responseType = JSON.parse(event.data) as AzureChatCompletion;
          switch (responseType.type) {
            case "functionCall":
              const mappedFunction: ChatMessageModel = {
                id: uniqueId(),
                content: responseType.response.arguments,
                name: responseType.response.name,
                role: "function",
                createdAt: new Date(),
                isDeleted: false,
                threadId: this.chatThreadId,
                type: "CHAT_MESSAGE",
                userId: "",
                multiModalImage: "",
              };
              this.addToMessages(mappedFunction);
              break;
            case "functionCallResult":
              const mappedFunctionResult: ChatMessageModel = {
                id: uniqueId(),
                content: responseType.response,
                name: "tool",
                role: "tool",
                createdAt: new Date(),
                isDeleted: false,
                threadId: this.chatThreadId,
                type: "CHAT_MESSAGE",
                userId: "",
                multiModalImage: "",
              };
              this.addToMessages(mappedFunctionResult);
              break;
            case "content":
              const mappedContent: ChatMessageModel = {
                id: responseType.response.id,
                content: responseType.response.choices[0].message.content || "",
                name: AI_NAME,
                role: "assistant",
                createdAt: new Date(),
                isDeleted: false,
                threadId: this.chatThreadId,
                type: "CHAT_MESSAGE",
                userId: "",
                multiModalImage: "",
              };

              this.addToMessages(mappedContent);
              this.lastMessage = mappedContent.content;

              break;
            case "abort":
              this.removeMessage(newUserMessage.id);
              this.loading = "idle";
              break;
            case "error":
              showError(responseType.response);
              this.loading = "idle";
              break;
            case "finalContent":
              this.loading = "idle";
              this.completed(this.lastMessage);
              this.updateTitle();
              break;
            default:
              break;
          }
        }
      };

      if (response.body) {
        const parser = createParser(onParse);

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let done = false;
        while (!done) {
          const { value, done: doneReading } = await reader.read();
          done = doneReading;

          const chunkValue = decoder.decode(value);
          parser.feed(chunkValue);
        }
        this.loading = "idle";
      }
    } catch (error) {
      showError("" + error);
      this.loading = "idle";
    }
  }

  private async updateTitle() {
    if (this.chatThread && this.chatThread.name === NEW_CHAT_NAME) {
      // Generate a smart title from the first message (optimistic update)
      const firstMessage = this.messages.find(m => m.role === "user")?.content || "";
      const optimisticTitle = this.generateSmartTitle(firstMessage);
      
      console.log(`[ChatStore] 🎯 Updating title for thread ${this.chatThreadId}: "${this.chatThread.name}" → "${optimisticTitle}"`);
      console.log(`[ChatStore] Generated title: "${optimisticTitle}" from message: "${firstMessage}"`);
      
      // Update local chat thread state immediately (optimistic UI)
      this.chatThread.name = optimisticTitle;
      
      // Critical: Update the global threads store for sidebar reactivity
      try {
        await chatThreadsStore.updateThreadTitle(this.chatThreadId, optimisticTitle);
        console.log(`[ChatStore] ✅ Successfully updated threads store with new title for ${this.chatThreadId}`);
        
        // 🔥 CRITICAL: Trigger manual refresh of all title components
        titleRefreshService.refreshAll();
        console.log(`[ChatStore] 🔄 Triggered title refresh service for all components`);
        
      } catch (error) {
        console.error(`[ChatStore] ❌ Failed to update threads store:`, error);
        // Revert local change if store update failed
        this.chatThread.name = NEW_CHAT_NAME;
      }
    }
  }

  private generateSmartTitle(firstMessage: string): string {
    // Generate a smart title from the first message - improved for Chinese text
    const cleanMessage = firstMessage.trim();
    
    console.log(`[ChatStore] 📝 Generating title from: "${cleanMessage}"`);
    
    // Handle empty message
    if (!cleanMessage) {
      console.log(`[ChatStore] Empty message, using default title`);
      return NEW_CHAT_NAME;
    }
    
    // If it's a greeting, use a generic title
    const greetings = /^(hi|hello|hey|good morning|good afternoon|good evening|你好|早上好|下午好|晚上好)/i;
    if (greetings.test(cleanMessage)) {
      console.log(`[ChatStore] Detected greeting, using default title`);
      return NEW_CHAT_NAME;
    }
    
    // Better handling for Chinese and English text
    // For Chinese: limit to ~15 characters, for English: limit to ~30 characters
    const isChinese = /[\u4e00-\u9fff]/.test(cleanMessage);
    const maxLength = isChinese ? 15 : 30;
    
    if (cleanMessage.length > maxLength) {
      const truncated = cleanMessage.slice(0, maxLength) + "...";
      console.log(`[ChatStore] Truncated title (${isChinese ? 'Chinese' : 'English'}): "${truncated}"`);
      return truncated;
    }
    
    console.log(`[ChatStore] Using full message as title: "${cleanMessage}"`);
    return cleanMessage;
  }

  private completed(message: string) {
    textToSpeechStore.speak(message);
  }

  public async submitChat(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (this.input === "" || this.loading !== "idle") {
      return;
    }

    // get form data from e
    const formData = new FormData(e.currentTarget);

    const body = JSON.stringify({
      id: this.chatThreadId,
      message: this.input,
    });
    formData.append("content", body);

    this.chat(formData);
  }
}

export const chatStore = proxy(new ChatState());

export const useChat = () => {
  return useSnapshot(chatStore, { sync: true });
};
