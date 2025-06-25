"use server";
import "server-only";

import { userHashedId } from "@/features/auth-page/helpers";
import { ServerActionResponse } from "@/features/common/server-action-response";
import { SimpleSearch } from "./azure-ai-search/azure-ai-search";
import { FindAllChatDocuments } from "./chat-document-service";
import { ChatDocumentModel } from "./models";

const debug = process.env.DEBUG === "true";

export interface DocumentSyncResult {
  databaseDocuments: ChatDocumentModel[];
  searchIndexChunks: number;
  orphanedChunks: number;
  syncStatus: "SYNCED" | "MISMATCH" | "ERROR";
  details: string;
}

export interface DocumentCleanupResult {
  removedChunks: number;
  remainingChunks: number;
  success: boolean;
  errors: string[];
}

export const AnalyzeDocumentSync = async (
  chatThreadId: string
): Promise<ServerActionResponse<DocumentSyncResult>> => {
  try {
    if (debug) console.log("AnalyzeDocumentSync: Starting analysis for chatThreadId:", chatThreadId);

    // Get documents from database
    const documentsResponse = await FindAllChatDocuments(chatThreadId);
    if (documentsResponse.status !== "OK") {
      return {
        status: "ERROR",
        errors: [{ message: "Failed to fetch documents from database" }],
      };
    }

    const databaseDocuments = documentsResponse.response;
    const activeDocumentNames = databaseDocuments.map(doc => doc.name);

    // Get all chunks from search index for this chat thread
    const searchResponse = await SimpleSearch(
      undefined,
      `chatThreadId eq '${chatThreadId}' and user eq '${await userHashedId()}'`
    );

    let searchIndexChunks = 0;
    let orphanedChunks = 0;

    if (searchResponse.status === "OK") {
      searchIndexChunks = searchResponse.response.length;
      
      // Count orphaned chunks (chunks from documents not in database)
      orphanedChunks = searchResponse.response.filter(chunk => 
        !activeDocumentNames.includes(chunk.document.metadata)
      ).length;
    }

    // Determine sync status
    let syncStatus: "SYNCED" | "MISMATCH" | "ERROR" = "SYNCED";
    let details = "";

    if (databaseDocuments.length === 0 && searchIndexChunks === 0) {
      details = "No documents found in database or search index.";
    } else if (databaseDocuments.length > 0 && searchIndexChunks === 0) {
      syncStatus = "MISMATCH";
      details = `Found ${databaseDocuments.length} documents in database but no content in search index. Documents may not be searchable.`;
    } else if (databaseDocuments.length === 0 && searchIndexChunks > 0) {
      syncStatus = "MISMATCH";
      details = `Found ${searchIndexChunks} orphaned chunks in search index but no documents in database. All chunks should be removed.`;
      orphanedChunks = searchIndexChunks;
    } else if (orphanedChunks > 0) {
      syncStatus = "MISMATCH";
      details = `Found ${orphanedChunks} orphaned chunks from deleted documents. Database has ${databaseDocuments.length} documents, search index has ${searchIndexChunks} chunks.`;
    } else {
      details = `Documents are synchronized: ${databaseDocuments.length} documents with ${searchIndexChunks} searchable chunks.`;
    }

    const result: DocumentSyncResult = {
      databaseDocuments,
      searchIndexChunks,
      orphanedChunks,
      syncStatus,
      details,
    };

    if (debug) console.log("AnalyzeDocumentSync result:", result);

    return {
      status: "OK",
      response: result,
    };
  } catch (error) {
    console.error("AnalyzeDocumentSync error:", error);
    return {
      status: "ERROR",
      errors: [{ message: `${error}` }],
    };
  }
};

export const CleanupOrphanedDocuments = async (
  chatThreadId: string
): Promise<ServerActionResponse<DocumentCleanupResult>> => {
  try {
    if (debug) console.log("CleanupOrphanedDocuments: Starting cleanup for chatThreadId:", chatThreadId);

    // First analyze to identify orphaned chunks
    const analysisResponse = await AnalyzeDocumentSync(chatThreadId);
    if (analysisResponse.status !== "OK") {
      return {
        status: "ERROR",
        errors: [{ message: "Failed to analyze document sync status" }],
      };
    }

    const { databaseDocuments, orphanedChunks } = analysisResponse.response;
    const activeDocumentNames = databaseDocuments.map(doc => doc.name);

    if (orphanedChunks === 0) {
      return {
        status: "OK",
        response: {
          removedChunks: 0,
          remainingChunks: analysisResponse.response.searchIndexChunks,
          success: true,
          errors: [],
        },
      };
    }

    // Get all chunks from search index
    const searchResponse = await SimpleSearch(
      undefined,
      `chatThreadId eq '${chatThreadId}' and user eq '${await userHashedId()}'`
    );

    if (searchResponse.status !== "OK") {
      return {
        status: "ERROR",
        errors: [{ message: "Failed to fetch search index content" }],
      };
    }

    // Identify orphaned chunks to remove
    const orphanedChunkDocuments = searchResponse.response.filter(chunk => 
      !activeDocumentNames.includes(chunk.document.metadata)
    );

    if (orphanedChunkDocuments.length === 0) {
      return {
        status: "OK",
        response: {
          removedChunks: 0,
          remainingChunks: searchResponse.response.length,
          success: true,
          errors: [],
        },
      };
    }

    // Remove orphaned chunks from search index
    const { AzureAISearchInstance } = await import("@/features/common/services/ai-search");
    const searchInstance = AzureAISearchInstance();
    
    const deleteResponse = await searchInstance.deleteDocuments(
      orphanedChunkDocuments.map(chunk => chunk.document)
    );

    let removedChunks = 0;
    const errors: string[] = [];

    deleteResponse.results.forEach((result) => {
      if (result.succeeded) {
        removedChunks++;
      } else {
        errors.push(`Failed to remove chunk: ${result.errorMessage}`);
      }
    });

    const remainingChunks = searchResponse.response.length - removedChunks;

    if (debug) console.log(`CleanupOrphanedDocuments: Removed ${removedChunks} orphaned chunks, ${remainingChunks} remaining`);

    return {
      status: "OK",
      response: {
        removedChunks,
        remainingChunks,
        success: errors.length === 0,
        errors,
      },
    };
  } catch (error) {
    console.error("CleanupOrphanedDocuments error:", error);
    return {
      status: "ERROR",
      errors: [{ message: `${error}` }],
    };
  }
};

export const SynchronizeDocuments = async (
  chatThreadId: string
): Promise<ServerActionResponse<DocumentSyncResult>> => {
  try {
    if (debug) console.log("SynchronizeDocuments: Starting synchronization for chatThreadId:", chatThreadId);

    // First cleanup orphaned documents
    const cleanupResponse = await CleanupOrphanedDocuments(chatThreadId);
    if (cleanupResponse.status !== "OK") {
      return {
        status: "ERROR",
        errors: [{ message: "Failed to cleanup orphaned documents" }],
      };
    }

    // Then analyze the final state
    const finalAnalysis = await AnalyzeDocumentSync(chatThreadId);
    if (finalAnalysis.status !== "OK") {
      return {
        status: "ERROR",
        errors: [{ message: "Failed to analyze final sync state" }],
      };
    }

    const { removedChunks } = cleanupResponse.response;
    const result = finalAnalysis.response;

    // Update details to include cleanup information
    if (removedChunks > 0) {
      result.details = `Synchronization completed: Removed ${removedChunks} orphaned chunks. ${result.details}`;
    } else {
      result.details = `Synchronization completed: No cleanup needed. ${result.details}`;
    }

    if (debug) console.log("SynchronizeDocuments completed:", result);

    return {
      status: "OK",
      response: result,
    };
  } catch (error) {
    console.error("SynchronizeDocuments error:", error);
    return {
      status: "ERROR",
      errors: [{ message: `${error}` }],
    };
  }
};

export const GetDocumentCounts = async (
  chatThreadId: string
): Promise<ServerActionResponse<{ databaseCount: number; searchIndexCount: number; isAligned: boolean }>> => {
  try {
    const analysisResponse = await AnalyzeDocumentSync(chatThreadId);
    if (analysisResponse.status !== "OK") {
      return {
        status: "ERROR",
        errors: [{ message: "Failed to get document counts" }],
      };
    }

    const { databaseDocuments, searchIndexChunks, orphanedChunks } = analysisResponse.response;
    const isAligned = orphanedChunks === 0;

    return {
      status: "OK",
      response: {
        databaseCount: databaseDocuments.length,
        searchIndexCount: searchIndexChunks,
        isAligned,
      },
    };
  } catch (error) {
    console.error("GetDocumentCounts error:", error);
    return {
      status: "ERROR",
      errors: [{ message: `${error}` }],
    };
  }
};
