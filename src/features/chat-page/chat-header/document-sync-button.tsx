"use client";

import { Button } from "@/features/ui/button";
import { useToast } from "@/features/ui/use-toast";
import { RefreshCw } from "lucide-react";
import { FC, useState } from "react";
import { AnalyzeDocumentSync, SynchronizeDocuments } from "../chat-services/chat-document-sync-service";

interface DocumentSyncButtonProps {
  chatThreadId: string;
  onSyncComplete?: () => void;
}

export const DocumentSyncButton: FC<DocumentSyncButtonProps> = ({
  chatThreadId,
  onSyncComplete,
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();

  const handleSync = async () => {
    setIsSyncing(true);
    
    try {
      // First analyze the current state
      const analysisResponse = await AnalyzeDocumentSync(chatThreadId);
      
      if (analysisResponse.status !== "OK") {
        toast({
          title: "Sync failed",
          description: "Could not analyze document synchronization status.",
          variant: "destructive",
        });
        return;
      }

      const { syncStatus, orphanedChunks } = analysisResponse.response;

      if (syncStatus === "SYNCED") {
        toast({
          title: "Documents already synchronized",
          description: "No synchronization needed. Documents are properly aligned.",
        });
        return;
      }

      // Perform synchronization
      const syncResponse = await SynchronizeDocuments(chatThreadId);
      
      if (syncResponse.status === "OK") {
        const { databaseDocuments, searchIndexChunks, details } = syncResponse.response;
        
        let description = "";
        if (orphanedChunks > 0) {
          description = `Synchronization completed! Cleaned up ${orphanedChunks} orphaned chunks. Now showing ${databaseDocuments.length} documents with ${searchIndexChunks} searchable chunks.`;
        } else {
          description = `Synchronization completed! ${details}`;
        }
        
        toast({
          title: "Documents synchronized",
          description,
        });
        
        if (onSyncComplete) {
          onSyncComplete();
        }
      } else {
        const errorMessage = syncResponse.errors?.[0]?.message || "Unknown error occurred";
        toast({
          title: "Sync failed",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error synchronizing documents:", error);
      toast({
        title: "Sync failed",
        description: "An unexpected error occurred while synchronizing documents.",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleSync}
      disabled={isSyncing}
      className="flex items-center gap-2"
      title="Synchronize documents between database and search index"
    >
      <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} />
      {isSyncing ? "Syncing..." : "Sync Documents"}
    </Button>
  );
};
