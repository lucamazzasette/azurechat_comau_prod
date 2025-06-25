"use server";
import "server-only";

import { userHashedId } from "@/features/auth-page/helpers";
import { ServerActionResponse } from "@/features/common/server-action-response";
import { HistoryContainer } from "@/features/common/services/cosmos";
import { SqlQuerySpec } from "@azure/cosmos";
import { DeleteSpecificDocuments } from "./azure-ai-search/azure-ai-search";
import { RefreshChatDocumentContext } from "./chat-document-refresh-service";
import { SynchronizeDocuments } from "./chat-document-sync-service";
import { CHAT_DOCUMENT_ATTRIBUTE, ChatDocumentModel } from "./models";

const debug = process.env.DEBUG === "true";

export const FindChatDocumentForCurrentUser = async (
  documentId: string,
  chatThreadId: string
): Promise<ServerActionResponse<ChatDocumentModel>> => {
  try {
    if (debug) console.log("FindChatDocumentForCurrentUser: Searching for document:", documentId, "in thread:", chatThreadId);
    
    const querySpec: SqlQuerySpec = {
      query:
        "SELECT * FROM root r WHERE r.type=@type AND r.id=@documentId AND r.chatThreadId=@chatThreadId AND r.userId=@userId AND r.isDeleted=@isDeleted",
      parameters: [
        {
          name: "@type",
          value: CHAT_DOCUMENT_ATTRIBUTE,
        },
        {
          name: "@documentId",
          value: documentId,
        },
        {
          name: "@chatThreadId",
          value: chatThreadId,
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
      .items.query<ChatDocumentModel>(querySpec)
      .fetchAll();

    if (resources.length === 0) {
      return {
        status: "NOT_FOUND",
        errors: [{ message: `Document not found or access denied` }],
      };
    }

    if (debug) console.log("FindChatDocumentForCurrentUser: Document found:", resources[0].name);
    return {
      status: "OK",
      response: resources[0],
    };
  } catch (error) {
    console.error("FindChatDocumentForCurrentUser error:", error);
    return {
      status: "ERROR",
      errors: [{ message: `${error}` }],
    };
  }
};

export const SoftDeleteChatDocument = async (
  documentId: string,
  chatThreadId: string
): Promise<ServerActionResponse<ChatDocumentModel>> => {
  try {
    if (debug) console.log("SoftDeleteChatDocument: Starting deletion for document:", documentId);

    // First, verify the document exists and belongs to the current user
    const documentResponse = await FindChatDocumentForCurrentUser(documentId, chatThreadId);
    
    if (documentResponse.status !== "OK") {
      return documentResponse;
    }

    const document = documentResponse.response;
    
    // Soft delete the document in Cosmos DB
    const updatedDocument = {
      ...document,
      isDeleted: true,
    };

    const { resource } = await HistoryContainer().items.upsert<ChatDocumentModel>(updatedDocument);

    if (!resource) {
      return {
        status: "ERROR",
        errors: [{ message: "Failed to delete document" }],
      };
    }

    // Delete specific document from Azure AI Search index
    // This only deletes the content related to this specific document, preserving other documents
    try {
      if (debug) console.log("SoftDeleteChatDocument: Attempting to delete specific document from Azure AI Search");
      await DeleteSpecificDocuments(chatThreadId, document.name);
      if (debug) console.log("SoftDeleteChatDocument: Successfully deleted specific document from Azure AI Search");
      
      // Synchronize documents to ensure search index is aligned with database
      const syncResponse = await SynchronizeDocuments(chatThreadId);
      if (syncResponse.status === "OK") {
        const { databaseDocuments, searchIndexChunks, orphanedChunks } = syncResponse.response;
        if (debug) console.log(`SoftDeleteChatDocument: Documents synchronized - ${databaseDocuments.length} documents, ${searchIndexChunks} searchable chunks, ${orphanedChunks} orphaned chunks cleaned`);
      } else {
        console.warn("SoftDeleteChatDocument: Warning - could not synchronize documents");
      }
    } catch (searchError) {
      console.warn("SoftDeleteChatDocument: Azure AI Search deletion failed:", searchError);
      // Continue execution - the document is still marked as deleted in Cosmos DB
    }

    if (debug) console.log("SoftDeleteChatDocument: Document successfully deleted:", document.name);
    
    return {
      status: "OK",
      response: resource,
    };
  } catch (error) {
    console.error("SoftDeleteChatDocument error:", error);
    return {
      status: "ERROR",
      errors: [{ message: `${error}` }],
    };
  }
};

export const DeleteMultipleChatDocuments = async (
  documentIds: string[],
  chatThreadId: string
): Promise<ServerActionResponse<{ deletedCount: number; errors: string[] }>> => {
  try {
    if (debug) console.log("DeleteMultipleChatDocuments: Starting batch deletion for", documentIds.length, "documents");

    let deletedCount = 0;
    const errors: string[] = [];

    // Delete documents one by one
    for (const documentId of documentIds) {
      const deleteResponse = await SoftDeleteChatDocument(documentId, chatThreadId);
      
      if (deleteResponse.status === "OK") {
        deletedCount++;
        if (debug) console.log(`DeleteMultipleChatDocuments: Successfully deleted document ${documentId}`);
      } else {
        const errorMessage = deleteResponse.errors?.[0]?.message || "Unknown error";
        errors.push(`Failed to delete document ${documentId}: ${errorMessage}`);
        console.error(`DeleteMultipleChatDocuments: Failed to delete document ${documentId}:`, errorMessage);
      }
    }

    if (debug) console.log(`DeleteMultipleChatDocuments: Batch deletion completed. ${deletedCount}/${documentIds.length} documents deleted`);

    return {
      status: "OK",
      response: {
        deletedCount,
        errors,
      },
    };
  } catch (error) {
    console.error("DeleteMultipleChatDocuments error:", error);
    return {
      status: "ERROR",
      errors: [{ message: `${error}` }],
    };
  }
};
