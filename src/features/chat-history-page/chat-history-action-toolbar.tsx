"use client";

import { Button } from "@/features/ui/button";
import { Checkbox } from "@/features/ui/checkbox";
import { Trash2, Users } from "lucide-react";
import { useChatHistory } from "./chat-history-store";
import { chatHistoryStore } from "./chat-history-store";

interface ChatHistoryActionToolbarProps {
  totalThreads: number;
  selectedThreads: string[];
  onSelectionChange: (newSelection: string[]) => void;
  allThreadIds: string[];
  onOpenDeleteDialog: () => void;
}

export const ChatHistoryActionToolbar = ({ 
  totalThreads, 
  selectedThreads, 
  onSelectionChange,
  allThreadIds,
  onOpenDeleteDialog
}: ChatHistoryActionToolbarProps) => {
  const { loading } = useChatHistory();

  const handleSelectAll = () => {
    console.log("🚀 TOOLBAR Select All clicked");
    if (selectedThreads.length === totalThreads) {
      // Clear all
      onSelectionChange([]);
    } else {
      // Select all using the provided thread IDs
      onSelectionChange(allThreadIds);
    }
  };

  const handleDeleteSelected = () => {
    console.log("🚀 TOOLBAR Delete clicked", selectedThreads.length);
    if (selectedThreads.length > 0) {
      onOpenDeleteDialog();
    }
  };

  const handleClearSelection = () => {
    console.log("🚀 TOOLBAR Clear clicked");
    onSelectionChange([]);
  };

  return (
    <div className="bg-background border-b border-border px-6 py-4 sticky top-0 z-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {totalThreads} conversation{totalThreads !== 1 ? 's' : ''}
            </span>
          </div>
          
          {selectedThreads.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>•</span>
              <span className="font-medium text-foreground">
                {selectedThreads.length} selected
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {totalThreads > 0 && (
            <>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedThreads.length === totalThreads && totalThreads > 0}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all conversations"
                />
                <span className="text-sm text-muted-foreground">
                  {selectedThreads.length === totalThreads ? "Deselect All" : "Select All"}
                </span>
              </div>

              <div className="h-4 w-px bg-border" />

              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteSelected}
                disabled={selectedThreads.length === 0 || loading}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                {selectedThreads.length > 0 
                  ? `Delete (${selectedThreads.length})` 
                  : "Delete Selected"
                }
              </Button>

              {selectedThreads.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearSelection}
                  disabled={loading}
                >
                  Clear
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
