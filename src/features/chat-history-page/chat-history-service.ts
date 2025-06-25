"use server";
import "server-only";

import { ServerActionResponse } from "@/features/common/server-action-response";
import { SoftDeleteChatThreadForCurrentUser } from "@/features/chat-page/chat-services/chat-thread-service";
import { ChatThreadModel } from "@/features/chat-page/chat-services/models";

export const BulkDeleteChatThreads = async (
  threadIds: string[]
): Promise<ServerActionResponse<{ deletedCount: number }>> => {
  try {
    let deletedCount = 0;
    const errors: string[] = [];

    // Process deletions sequentially to avoid overwhelming the database
    for (const threadId of threadIds) {
      try {
        const response = await SoftDeleteChatThreadForCurrentUser(threadId);
        if (response.status === "OK") {
          deletedCount++;
        } else {
          errors.push(`Failed to delete thread ${threadId}: ${response.errors[0]?.message || "Unknown error"}`);
        }
      } catch (error) {
        errors.push(`Error deleting thread ${threadId}: ${error}`);
      }
    }

    if (errors.length > 0) {
      console.warn("Some deletions failed:", errors);
    }

    return {
      status: "OK",
      response: { deletedCount },
    };
  } catch (error) {
    return {
      status: "ERROR",
      errors: [{ message: `Bulk delete failed: ${error}` }],
    };
  }
};

export const GetChatHistoryWithMetadata = async (): Promise<
  ServerActionResponse<Array<ChatThreadModel & { messageCount?: number }>>
> => {
  try {
    // For now, we'll use the existing service and extend it later with message counts
    // This can be enhanced to include message counts per thread
    const { FindAllChatThreadForCurrentUser } = await import("@/features/chat-page/chat-services/chat-thread-service");
    
    const response = await FindAllChatThreadForCurrentUser();
    
    if (response.status === "OK") {
      // TODO: Add message count aggregation here if needed
      const threadsWithMetadata = response.response.map(thread => ({
        ...thread,
        messageCount: 0 // Placeholder - can be implemented later
      }));
      
      return {
        status: "OK",
        response: threadsWithMetadata,
      };
    }
    
    return response;
  } catch (error) {
    return {
      status: "ERROR",
      errors: [{ message: `Failed to load chat history: ${error}` }],
    };
  }
};
