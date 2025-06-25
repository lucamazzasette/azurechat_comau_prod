"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/features/ui/dialog";
import { Button } from "@/features/ui/button";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useChatHistory } from "./chat-history-store";

interface BulkDeleteDialogProps {
  selectedThreads: string[];
  onSelectionChange: (newSelection: string[]) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const BulkDeleteDialog = ({ 
  selectedThreads, 
  onSelectionChange, 
  open, 
  onOpenChange 
}: BulkDeleteDialogProps) => {
  const { bulkDeleteSelectedThreads } = useChatHistory();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirmDelete = async () => {
    console.log("🗑️ DIALOG Confirm delete with threads:", selectedThreads);
    
    // Set loading state immediately for instant UI feedback
    setIsDeleting(true);
    
    try {
      await bulkDeleteSelectedThreads(selectedThreads);
      // Clear the shared state after successful deletion
      onSelectionChange([]);
      // Close the dialog
      onOpenChange(false);
    } catch (error) {
      console.error("Error during bulk delete:", error);
    } finally {
      // Reset loading state
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete Conversations
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete {selectedThreads.length} conversation{selectedThreads.length > 1 ? 's' : ''}? 
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <div className="bg-muted p-3 rounded-md">
            <p className="text-sm text-muted-foreground">
              <strong>{selectedThreads.length}</strong> conversation{selectedThreads.length > 1 ? 's' : ''} will be permanently deleted, 
              including all messages and associated documents.
            </p>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirmDelete}
            disabled={isDeleting}
            className="gap-2"
          >
            {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isDeleting ? "Deleting..." : "Delete Conversations"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
