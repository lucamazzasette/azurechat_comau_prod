"use server";
import "server-only";

import {
  getCurrentUser,
  userHashedId,
  userSession,
} from "@/features/auth-page/helpers";
import { RedirectToChat, RedirectToChatThread } from "@/features/common/navigation-helpers";
import { ServerActionResponse } from "@/features/common/server-action-response";
import { uniqueId } from "@/features/common/util";
import {
  CHAT_DEFAULT_PERSONA,
  NEW_CHAT_NAME,
} from "@/features/theme/theme-config";
import { SqlQuerySpec } from "@azure/cosmos";
import { HistoryContainer } from "../../common/services/cosmos";
import { DeleteDocuments } from "./azure-ai-search/azure-ai-search";
import { FindAllChatDocuments } from "./chat-document-service";
import { FindAllChatMessagesForCurrentUser } from "./chat-message-service";
import {
  CHAT_THREAD_ATTRIBUTE,
  ChatDocumentModel,
  ChatThreadModel,
} from "./models";

export const FindAllChatThreadForCurrentUser = async (): Promise<
  ServerActionResponse<Array<ChatThreadModel>>
> => {
  try {
    const querySpec: SqlQuerySpec = {
      query:
        "SELECT * FROM root r WHERE r.type=@type AND r.userId=@userId AND r.isDeleted=@isDeleted ORDER BY r.createdAt DESC",
      parameters: [
        {
          name: "@type",
          value: CHAT_THREAD_ATTRIBUTE,
        },
        {
          name: "@userId",
          value: await userHashedId(),
        },
        {
          name: "@isDeleted",
          value: false,
        },
      ],
    };

    const { resources } = await HistoryContainer()
      .items.query<ChatThreadModel>(querySpec, {
        partitionKey: await userHashedId(),
      })
      .fetchAll();
    return {
      status: "OK",
      response: resources,
    };
  } catch (error) {
    return {
      status: "ERROR",
      errors: [{ message: `${error}` }],
    };
  }
};

export const FindChatThreadForCurrentUser = async (
  id: string
): Promise<ServerActionResponse<ChatThreadModel>> => {
  try {
    const querySpec: SqlQuerySpec = {
      query:
        "SELECT * FROM root r WHERE r.type=@type AND r.userId=@userId AND r.id=@id AND r.isDeleted=@isDeleted",
      parameters: [
        {
          name: "@type",
          value: CHAT_THREAD_ATTRIBUTE,
        },
        {
          name: "@userId",
          value: await userHashedId(),
        },
        {
          name: "@id",
          value: id,
        },
        {
          name: "@isDeleted",
          value: false,
        },
      ],
    };

    const { resources } = await HistoryContainer()
      .items.query<ChatThreadModel>(querySpec)
      .fetchAll();

    if (resources.length === 0) {
      return {
        status: "NOT_FOUND",
        errors: [{ message: `Chat thread not found` }],
      };
    }

    return {
      status: "OK",
      response: resources[0],
    };
  } catch (error) {
    return {
      status: "ERROR",
      errors: [{ message: `${error}` }],
    };
  }
};

export const SoftDeleteChatThreadForCurrentUser = async (
  chatThreadID: string
): Promise<ServerActionResponse<ChatThreadModel>> => {
  try {
    const chatThreadResponse = await FindChatThreadForCurrentUser(chatThreadID);

    if (chatThreadResponse.status === "OK") {
      const chatResponse = await FindAllChatMessagesForCurrentUser(
        chatThreadID
      );

      if (chatResponse.status !== "OK") {
        return chatResponse;
      }
      const chats = chatResponse.response;

      chats.forEach(async (chat) => {
        const itemToUpdate = {
          ...chat,
        };
        itemToUpdate.isDeleted = true;
        await HistoryContainer().items.upsert(itemToUpdate);
      });

      const chatDocumentsResponse = await FindAllChatDocuments(chatThreadID);

      if (chatDocumentsResponse.status !== "OK") {
        return chatDocumentsResponse;
      }

      const chatDocuments = chatDocumentsResponse.response;

      if (chatDocuments.length !== 0) {
        await DeleteDocuments(chatThreadID);
      }

      chatDocuments.forEach(async (chatDocument: ChatDocumentModel) => {
        const itemToUpdate = {
          ...chatDocument,
        };
        itemToUpdate.isDeleted = true;
        await HistoryContainer().items.upsert(itemToUpdate);
      });

      chatThreadResponse.response.isDeleted = true;
      await HistoryContainer().items.upsert(chatThreadResponse.response);
    }

    return chatThreadResponse;
  } catch (error) {
    return {
      status: "ERROR",
      errors: [{ message: `${error}` }],
    };
  }
};

export const EnsureChatThreadOperation = async (
  chatThreadID: string
): Promise<ServerActionResponse<ChatThreadModel>> => {
  const response = await FindChatThreadForCurrentUser(chatThreadID);
  const currentUser = await getCurrentUser();
  const hashedId = await userHashedId();

  if (response.status === "OK") {
    if (currentUser.isAdmin || response.response.userId === hashedId) {
      return response;
    }
  }

  return response;
};

export const AddExtensionToChatThread = async (props: {
  chatThreadId: string;
  extensionId: string;
}): Promise<ServerActionResponse<ChatThreadModel>> => {
  try {
    const response = await FindChatThreadForCurrentUser(props.chatThreadId);
    if (response.status === "OK") {
      const chatThread = response.response;

      const existingExtension = chatThread.extension.find(
        (e) => e === props.extensionId
      );

      if (existingExtension === undefined) {
        chatThread.extension.push(props.extensionId);
        return await UpsertChatThread(chatThread);
      }

      return {
        status: "OK",
        response: chatThread,
      };
    }

    return response;
  } catch (error) {
    return {
      status: "ERROR",
      errors: [{ message: `${error}` }],
    };
  }
};

export const RemoveExtensionFromChatThread = async (props: {
  chatThreadId: string;
  extensionId: string;
}): Promise<ServerActionResponse<ChatThreadModel>> => {
  const response = await FindChatThreadForCurrentUser(props.chatThreadId);
  if (response.status === "OK") {
    const chatThread = response.response;
    chatThread.extension = chatThread.extension.filter(
      (e) => e !== props.extensionId
    );

    return await UpsertChatThread(chatThread);
  }

  return response;
};

export const UpsertChatThread = async (
  chatThread: ChatThreadModel
): Promise<ServerActionResponse<ChatThreadModel>> => {
  try {
    if (chatThread.id) {
      const response = await EnsureChatThreadOperation(chatThread.id);
      if (response.status !== "OK") {
        return response;
      }
    }

    chatThread.lastMessageAt = new Date();
    const { resource } = await HistoryContainer().items.upsert<ChatThreadModel>(
      chatThread
    );

    if (resource) {
      return {
        status: "OK",
        response: resource,
      };
    }

    return {
      status: "ERROR",
      errors: [{ message: `Chat thread not found` }],
    };
  } catch (error) {
    return {
      status: "ERROR",
      errors: [{ message: `${error}` }],
    };
  }
};

export const CreateChatThread = async (): Promise<
  ServerActionResponse<ChatThreadModel>
> => {
  try {
    const modelToSave: ChatThreadModel = {
      name: NEW_CHAT_NAME,
      useName: (await userSession())!.name,
      userId: await userHashedId(),
      id: uniqueId(),
      createdAt: new Date(),
      lastMessageAt: new Date(),
      bookmarked: false,
      isDeleted: false,
      type: CHAT_THREAD_ATTRIBUTE,
      personaMessage: "",
      personaMessageTitle: CHAT_DEFAULT_PERSONA,
      starterPrompts: undefined,
      extension: [],
    };

    const { resource } = await HistoryContainer().items.create<ChatThreadModel>(
      modelToSave
    );
    if (resource) {
      return {
        status: "OK",
        response: resource,
      };
    }

    return {
      status: "ERROR",
      errors: [{ message: `Chat thread not found` }],
    };
  } catch (error) {
    return {
      status: "ERROR",
      errors: [{ message: `${error}` }],
    };
  }
};

export const UpdateChatTitle = async (
  chatThreadId: string,
  title: string
): Promise<ServerActionResponse<ChatThreadModel>> => {
  try {
    const response = await FindChatThreadForCurrentUser(chatThreadId);
    if (response.status === "OK") {
      const chatThread = response.response;
      // Use the smart title as-is, don't truncate unless necessary
      chatThread.name = title.length > 50 ? title.substring(0, 47) + "..." : title;
      chatThread.lastMessageAt = new Date(); // Update timestamp for proper sorting
      return await UpsertChatThread(chatThread);
    }
    return response;
  } catch (error) {
    return {
      status: "ERROR",
      errors: [{ message: `${error}` }],
    };
  }
};

export const FindUnusedChatThreadForCurrentUser = async (): Promise<
  ServerActionResponse<ChatThreadModel>
> => {
  try {
    // Get all chat threads for the current user
    const allThreadsResponse = await FindAllChatThreadForCurrentUser();
    
    if (allThreadsResponse.status !== "OK") {
      return {
        status: "ERROR",
        errors: [{ message: "Could not fetch chat threads" }],
      };
    }
    
    // Filter for recent threads (created in the last hour) with default name
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);
    
    const recentThreads = allThreadsResponse.response.filter(thread => 
      new Date(thread.createdAt) > oneHourAgo && 
      // Use case-insensitive comparison to handle both "New chat" and "New Chat"
      thread.name.toLowerCase() === NEW_CHAT_NAME.toLowerCase()
    );
    
    // Check each thread for messages
    for (const thread of recentThreads) {
      const messagesResponse = await FindAllChatMessagesForCurrentUser(thread.id);
      
      if (messagesResponse.status === "OK" && messagesResponse.response.length === 0) {
        // Found an unused thread (has no messages)
        return {
          status: "OK",
          response: thread,
        };
      }
    }
    
    // No unused threads found
    return {
      status: "NOT_FOUND",
      errors: [{ message: "No unused chat threads found" }],
    };
  } catch (error) {
    return {
      status: "ERROR",
      errors: [{ message: `${error}` }],
    };
  }
};

export const CreateChatAndRedirect = async (): Promise<{
  threadId: string | null;
  success: boolean;
  error?: string;
}> => {
  try {
    // First check for existing unused threads
    console.log("Looking for unused threads...");
    const unusedThreadResponse = await FindUnusedChatThreadForCurrentUser();
    
    let threadId: string | null = null;
    
    if (unusedThreadResponse.status === "OK") {
      // Use the existing unused thread
      const thread = unusedThreadResponse.response;
      console.log("Found unused thread:", thread.id, "with name:", thread.name);
      
      // Verify thread has a valid name
      if (!thread.name || thread.name.trim() === '') {
        console.log("Thread has empty name, setting to default name");
        thread.name = NEW_CHAT_NAME;
        await UpsertChatThread(thread);
      }
      
      threadId = thread.id;
      console.log("Using existing thread:", threadId);
      
    } else {
      console.log("No unused threads found, creating new one...");
      // Create a new thread
      const response = await CreateChatThread();
      
      if (response.status === "OK") {
        const newThread = response.response;
        console.log("New thread created:", newThread.id, "with name:", newThread.name);
        
        // Double-check the name was set correctly
        if (!newThread.name || newThread.name.trim() === '') {
          console.log("New thread has empty name, setting to default name");
          newThread.name = NEW_CHAT_NAME;
          await UpsertChatThread(newThread);
        }
        
        threadId = newThread.id;
        console.log("Created new thread:", threadId);
      } else {
        console.error("Failed to create thread:", response.errors);
        return {
          threadId: null,
          success: false,
          error: response.errors[0]?.message || "Failed to create thread"
        };
      }
    }
    
    // Return the thread ID for client-side navigation
    return {
      threadId,
      success: true
    };
    
  } catch (error) {
    console.error("Error in CreateChatAndRedirect:", error);
    return {
      threadId: null,
      success: false,
      error: String(error)
    };
  }
};
