"use client";

import { useState, useEffect, useMemo } from "react";
import { useChatHistory } from "./chat-history-store";
import { ChatHistoryTable } from "./chat-history-table";
import { ChatHistoryActionToolbar } from "./chat-history-action-toolbar";
import { ChatHistoryFilters } from "./chat-history-filters";
import { BulkDeleteDialog } from "./bulk-delete-dialog";
import { ChatThreadModel } from "@/features/chat-page/chat-services/models";
import { chatHistoryStore } from "./chat-history-store";

interface ChatHistoryPageProps {
  threads: ChatThreadModel[];
}

interface ChatHistoryFiltersState {
  search: string;
  dateFrom: string;
  dateTo: string;
  bookmarked: boolean | null;
  sortBy: "createdAt" | "lastMessageAt" | "name";
  sortOrder: "asc" | "desc";
}

export const ChatHistoryPage = ({ threads: initialThreads }: ChatHistoryPageProps) => {
  const { threads, initializeWithData } = useChatHistory();

  // 🚀 SHARED STATE: Lifted up from table to sync with toolbar
  const [selectedThreads, setSelectedThreads] = useState<string[]>([]);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);

  // 🎯 CLIENT-SIDE FILTERS: React state instead of Valtio (mirroring ActionToolbar pattern)
  const [filters, setFilters] = useState<ChatHistoryFiltersState>({
    search: "",
    dateFrom: "",
    dateTo: "",
    bookmarked: null,
    sortBy: "lastMessageAt",
    sortOrder: "desc"
  });

  useEffect(() => {
    // Always initialize store with latest data if available
    if (initialThreads.length > 0) {
      console.log("📋 Initializing store with", initialThreads.length, "threads");
      initializeWithData(initialThreads);
    }
  }, [initialThreads, initializeWithData]);

  // 🔧 CLIENT-SIDE FILTERING: Pure function for filtering (no Valtio reactivity issues)
  const filteredThreads = useMemo(() => {
    const sourceThreads = threads.length > 0 ? threads : initialThreads;
    let filtered = [...sourceThreads];

    // Apply search filter
    if (filters.search.trim()) {
      const searchTerm = filters.search.toLowerCase().trim();
      filtered = filtered.filter(thread => 
        thread.name.toLowerCase().includes(searchTerm)
      );
    }

    // Apply date filters
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      filtered = filtered.filter(thread => 
        new Date(thread.createdAt) >= fromDate
      );
    }

    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999); // End of day
      filtered = filtered.filter(thread => 
        new Date(thread.createdAt) <= toDate
      );
    }

    // Apply bookmarked filter
    if (filters.bookmarked !== null) {
      filtered = filtered.filter(thread => 
        Boolean(thread.bookmarked) === filters.bookmarked
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (filters.sortBy) {
        case "name":
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case "createdAt":
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case "lastMessageAt":
        default:
          aValue = new Date(a.lastMessageAt).getTime();
          bValue = new Date(b.lastMessageAt).getTime();
          break;
      }

      if (filters.sortOrder === "asc") {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [threads, initialThreads, filters]);

  console.log("🎭 CLIENT-SIDE FILTERING DEBUG:");
  console.log("  filters:", filters);
  console.log("  threads.length:", threads.length);
  console.log("  initialThreads.length:", initialThreads.length);
  console.log("  filteredThreads.length:", filteredThreads.length);

  // Callbacks following ActionToolbar pattern
  const handleSelectionChange = (newSelection: string[]) => {
    setSelectedThreads(newSelection);
    chatHistoryStore.selectedThreads = newSelection;
  };

  const handleFiltersChange = (newFilters: Partial<ChatHistoryFiltersState>) => {
    console.log("🎯 Filter change:", newFilters);
    setFilters(prevFilters => ({ ...prevFilters, ...newFilters }));
  };

  return (
    <div className="flex-1 flex flex-col bg-background">
      <div className="flex-shrink-0 px-4 py-8 max-w-7xl mx-auto w-full">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Chat History
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Manage and organize your chat conversations
          </p>
        </div>
      </div>
      
      <div className="flex-1 flex flex-col border-t border-border">
        <div className="flex-shrink-0 max-w-7xl mx-auto w-full px-4 py-4">
          <ChatHistoryFilters 
            filters={filters}
            onFiltersChange={handleFiltersChange}
            selectedThreads={selectedThreads}
            filteredThreads={filteredThreads as ChatThreadModel[]}
            onSelectionChange={handleSelectionChange}
          />
        </div>
        
        <div className="flex-shrink-0 max-w-7xl mx-auto w-full">
          <ChatHistoryActionToolbar 
            totalThreads={filteredThreads.length}
            selectedThreads={selectedThreads}
            onSelectionChange={handleSelectionChange}
            allThreadIds={filteredThreads.map((thread: any) => thread.id)}
            onOpenDeleteDialog={() => setShowBulkDeleteDialog(true)}
          />
        </div>
        
        <div className="flex-1 px-4 py-6 max-w-7xl mx-auto w-full">
          <ChatHistoryTable 
            displayThreads={filteredThreads as any}
            selectedThreads={selectedThreads}
            onSelectionChange={handleSelectionChange}
          />
        </div>
      </div>
      
      <div className="h-16 flex-shrink-0" /> {/* Bottom spacing for aesthetics */}
      
      <BulkDeleteDialog 
        selectedThreads={selectedThreads}
        onSelectionChange={handleSelectionChange}
        open={showBulkDeleteDialog}
        onOpenChange={setShowBulkDeleteDialog}
      />
    </div>
  );
};
