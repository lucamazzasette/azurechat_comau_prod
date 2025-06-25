"use server";
import "server-only";

import { userHashedId } from "@/features/auth-page/helpers";
import { ServerActionResponse } from "@/features/common/server-action-response";
import { ReIndexRemainingDocuments, SimpleSearch } from "./azure-ai-search/azure-ai-search";
import { FindAllChatDocuments } from "./chat-document-service";
import { ChatDocumentModel } from "./models";

const debug = process.env.DEBUG === "true";

export interface DocumentRefreshResult {
  remainingDocuments: ChatDocumentModel[];
  searchIndexStatus: boolean;
  totalDocumentsInIndex: number;
}

export const RefreshChatDocumentContext = async (
  chatThreadId: string
): Promise<ServerActionResponse<DocumentRefreshResult>> => {
  try {
    if (debug) console.log("RefreshChatDocumentContext: Starting refresh for chatThreadId:", chatThreadId);

    // Get all remaining documents from Cosmos DB
    const documentsResponse = await FindAllChatDocuments(chatThreadId);
    
    if (documentsResponse.status !== "OK") {
      return {
        status: "ERROR",
        errors: [{ message: "Failed to fetch remaining documents" }],
      };
    }

    const remainingDocuments = documentsResponse.response;
    if (debug) console.log(`RefreshChatDocumentContext: Found ${remainingDocuments.length} remaining documents in Cosmos DB`);

    // Verify and refresh the search index
    const reIndexResponse = await ReIndexRemainingDocuments(chatThreadId);
    const searchIndexStatus = reIndexResponse.status === "OK";

    // Get count of documents in search index for verification
    let totalDocumentsInIndex = 0;
    try {
      const searchResponse = await SimpleSearch(
        undefined,
        `chatThreadId eq '${chatThreadId}' and user eq '${await userHashedId()}'`
      );
      
      if (searchResponse.status === "OK") {
        totalDocumentsInIndex = searchResponse.response.length;
        if (debug) console.log(`RefreshChatDocumentContext: Found ${totalDocumentsInIndex} document chunks in search index`);
      }
    } catch (searchError) {
      console.warn("RefreshChatDocumentContext: Could not verify search index count:", searchError);
    }

    const result: DocumentRefreshResult = {
      remainingDocuments,
      searchIndexStatus,
      totalDocumentsInIndex,
    };

    if (debug) console.log("RefreshChatDocumentContext: Refresh completed successfully", result);

    return {
      status: "OK",
      response: result,
    };
  } catch (error) {
    console.error("RefreshChatDocumentContext error:", error);
    return {
      status: "ERROR",
      errors: [{ message: `${error}` }],
    };
  }
};

export const VerifyDocumentContextIntegrity = async (
  chatThreadId: string
): Promise<ServerActionResponse<{ isIntegrityValid: boolean; details: string }>> => {
  try {
    if (debug) console.log("VerifyDocumentContextIntegrity: Checking integrity for chatThreadId:", chatThreadId);

    const refreshResult = await RefreshChatDocumentContext(chatThreadId);
    
    if (refreshResult.status !== "OK") {
      return {
        status: "ERROR",
        errors: [{ message: "Failed to refresh document context" }],
      };
    }

    const { remainingDocuments, searchIndexStatus, totalDocumentsInIndex } = refreshResult.response;
    
    // Basic integrity checks
    const hasDocuments = remainingDocuments.length > 0;
    const hasSearchContent = totalDocumentsInIndex > 0;
    const searchIndexWorking = searchIndexStatus;

    let isIntegrityValid = true;
    let details = "";

    if (hasDocuments && !hasSearchContent) {
      isIntegrityValid = false;
      details = `Found ${remainingDocuments.length} documents in database but no content in search index. Chat may lose document context.`;
    } else if (!hasDocuments && hasSearchContent) {
      isIntegrityValid = false;
      details = `Found ${totalDocumentsInIndex} document chunks in search index but no documents in database. Orphaned search content detected.`;
    } else if (!searchIndexWorking) {
      isIntegrityValid = false;
      details = "Search index is not responding properly. Document search functionality may be impaired.";
    } else if (hasDocuments && hasSearchContent) {
      details = `Document context is healthy: ${remainingDocuments.length} documents with ${totalDocumentsInIndex} searchable chunks.`;
    } else {
      details = "No documents found in this chat thread.";
    }

    if (debug) console.log("VerifyDocumentContextIntegrity:", { isIntegrityValid, details });

    return {
      status: "OK",
      response: {
        isIntegrityValid,
        details,
      },
    };
  } catch (error) {
    console.error("VerifyDocumentContextIntegrity error:", error);
    return {
      status: "ERROR",
      errors: [{ message: `${error}` }],
    };
  }
};
