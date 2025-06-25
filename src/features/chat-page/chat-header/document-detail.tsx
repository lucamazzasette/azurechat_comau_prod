import { Button } from "@/features/ui/button";
import { ScrollArea } from "@/features/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/features/ui/sheet";
import { File, FileX } from "lucide-react";
import { FC, useState, useEffect } from "react";
import { ChatDocumentModel } from "../chat-services/models";
import { DocumentItem } from "./document-item";
import { DocumentSyncButton } from "./document-sync-button";

interface Props {
  chatDocuments: Array<ChatDocumentModel>;
  chatThreadId: string;
}

export const DocumentDetail: FC<Props> = (props) => {
  const [documents, setDocuments] = useState(props.chatDocuments);

  // Update local state when props change
  useEffect(() => {
    setDocuments(props.chatDocuments);
  }, [props.chatDocuments]);

  const handleDocumentDelete = (documentId: string) => {
    // Remove the deleted document from local state for immediate UI update
    setDocuments(prev => prev.filter(doc => doc.id !== documentId));
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant={"outline"} size={"lg"} className="gap-3 h-14 px-5 text-lg" aria-label="Current Chat Documents Menu">
          <File size={24} /> {documents.length}
        </Button>
      </SheetTrigger>
      <SheetContent className="min-w-[480px] sm:w-[540px] flex flex-col">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle>Documents</SheetTitle>
            <DocumentSyncButton 
              chatThreadId={props.chatThreadId}
              onSyncComplete={() => {
                // Optionally refresh the document list after sync
                // For now, we'll rely on the toast notification
              }}
            />
          </div>
        </SheetHeader>
        <ScrollArea className="flex-1 -mx-6 flex" type="always">
          <div className="pb-6 px-6 flex gap-3 flex-col flex-1">
            {documents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileX size={48} className="text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground mb-2">
                  No documents uploaded
                </h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Upload documents to this chat thread to enable document-based conversations and analysis.
                </p>
              </div>
            ) : (
              documents.map((doc) => (
                <DocumentItem
                  key={doc.id}
                  document={doc}
                  chatThreadId={props.chatThreadId}
                  onDelete={handleDocumentDelete}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
