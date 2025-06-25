"use client";

import { Button } from "@/features/ui/button";
import { useToast } from "@/features/ui/use-toast";
import { File, Trash2 } from "lucide-react";
import { FC, useState } from "react";
import { ChatDocumentModel } from "../chat-services/models";
import { SoftDeleteChatDocument } from "../chat-services/chat-document-delete-service";
import { SynchronizeDocuments } from "../chat-services/chat-document-sync-service";
import { DocumentConfirmationDialog } from "./document-confirmation-dialog";

interface DocumentItemProps {
  document: ChatDocumentModel;
  chatThreadId: string;
  onDelete: (documentId: string) => void;
}

export const DocumentItem: FC<DocumentItemProps> = ({
  document,
  chatThreadId,
  onDelete,
}) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const handleDeleteClick = () => {
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    
    try {
      const response = await SoftDeleteChatDocument(document.id, chatThreadId);
      
      if (response.status === "OK") {
        // Provide additional feedback about document synchronization
        try {
          const syncResponse = await SynchronizeDocuments(chatThreadId);
          if (syncResponse.status === "OK") {
            const { databaseDocuments, orphanedChunks } = syncResponse.response;
            const remainingCount = databaseDocuments.length;
            
            let description = "";
            if (remainingCount > 0) {
              description = `"${document.name}" deleted. Chat retains access to ${remainingCount} remaining document${remainingCount === 1 ? '' : 's'}.`;
              if (orphanedChunks > 0) {
                description += ` Cleaned up ${orphanedChunks} orphaned chunks.`;
              }
            } else {
              description = `"${document.name}" deleted. No documents remain in this chat.`;
              if (orphanedChunks > 0) {
                description += ` Cleaned up ${orphanedChunks} orphaned chunks.`;
              }
            }
            
            toast({
              title: "Document deleted",
              description,
            });
          } else {
            toast({
              title: "Document deleted",
              description: `"${document.name}" has been successfully deleted.`,
            });
          }
        } catch (syncError) {
          console.warn("Could not verify document sync after deletion:", syncError);
          toast({
            title: "Document deleted",
            description: `"${document.name}" has been successfully deleted.`,
          });
        }
        onDelete(document.id);
      } else {
        const errorMessage = response.errors?.[0]?.message || "Failed to delete document";
        toast({
          title: "Delete failed",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error deleting document:", error);
      toast({
        title: "Delete failed",
        description: "An unexpected error occurred while deleting the document.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteDialog(false);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  return (
    <>
      <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <File size={20} className="text-muted-foreground flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate" title={document.name}>
              {document.name}
            </div>
            <div className="text-xs text-muted-foreground">
              Uploaded {formatDate(document.createdAt)}
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDeleteClick}
          disabled={isDeleting}
          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
          aria-label={`Delete ${document.name}`}
        >
          <Trash2 size={16} />
        </Button>
      </div>

      <DocumentConfirmationDialog
        isOpen={showDeleteDialog}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        documentName={document.name}
        isDeleting={isDeleting}
      />
    </>
  );
};
