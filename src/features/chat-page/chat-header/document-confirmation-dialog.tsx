"use client";

import { Button } from "@/features/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/features/ui/dialog";
import { AlertTriangle, Loader2 } from "lucide-react";
import { FC } from "react";

interface DocumentConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  documentName: string;
  isDeleting?: boolean;
}

export const DocumentConfirmationDialog: FC<DocumentConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  documentName,
  isDeleting = false,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete Document
          </DialogTitle>
          <DialogDescription className="text-left">
            Are you sure you want to delete{" "}
            <span className="font-medium text-foreground">&ldquo;{documentName}&rdquo;</span>?
            <br />
            <br />
            This action cannot be undone. The document will be permanently removed from this chat thread.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isDeleting}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
            className="w-full sm:w-auto"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete Document"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
