"use client";

import { proxy, useSnapshot } from "valtio";
import { ChatThreadModel } from "@/features/chat-page/chat-services/models";
import { showError, showSuccess } from "@/features/globals/global-message-store";
import { SoftDeleteChatThreadForCurrentUser } from "@/features/chat-page/chat-services/chat-thread-service";

interface ChatHistoryFilters {
  search: string;
  dateFrom: string;
  dateTo: string;
  bookmarked: boolean | null;
  sortBy: "createdAt" | "lastMessageAt" | "name";
  sortOrder: "asc" | "desc";
}

interface ChatHistoryState {
  threads: ChatThreadModel[];
  selectedThreads: string[];
  loading: boolean;
  showBulkDeleteDialog: boolean;
  lastUpdated: number; // Track state changes to force reactivity
  filters: ChatHistoryFilters;
  filteredThreads: ChatThreadModel[];
  
  // Actions
  initializeWithData: (threads: ChatThreadModel[]) => void;
  toggleThreadSelection: (threadId: string) => void;
  selectAllThreads: () => void;
  clearSelection: () => void;
  openBulkDeleteDialog: () => void;
  closeBulkDeleteDialog: () => void;
  bulkDeleteSelectedThreads: (selectedThreadIds?: string[]) => Promise<void>;
  setFilters: (newFilters: Partial<ChatHistoryFilters>) => void;
}

class ChatHistoryStateImpl implements ChatHistoryState {
  threads: ChatThreadModel[] = [];
  selectedThreads: string[] = [];
  loading: boolean = false;
  showBulkDeleteDialog: boolean = false;
  lastUpdated: number = Date.now();
  filters: ChatHistoryFilters = {
    search: "",
    dateFrom: "",
    dateTo: "",
    bookmarked: null,
    sortBy: "lastMessageAt",
    sortOrder: "desc"
  };

  get filteredThreads(): ChatThreadModel[] {
    let filtered = [...this.threads];

    // Apply search filter
    if (this.filters.search.trim()) {
      const searchTerm = this.filters.search.toLowerCase().trim();
      filtered = filtered.filter(thread => 
        thread.name.toLowerCase().includes(searchTerm)
      );
    }

    // Apply date filters
    if (this.filters.dateFrom) {
      const fromDate = new Date(this.filters.dateFrom);
      filtered = filtered.filter(thread => 
        new Date(thread.createdAt) >= fromDate
      );
    }

    if (this.filters.dateTo) {
      const toDate = new Date(this.filters.dateTo);
      toDate.setHours(23, 59, 59, 999); // End of day
      filtered = filtered.filter(thread => 
        new Date(thread.createdAt) <= toDate
      );
    }

    // Apply bookmarked filter
    if (this.filters.bookmarked !== null) {
      filtered = filtered.filter(thread => 
        Boolean(thread.bookmarked) === this.filters.bookmarked
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (this.filters.sortBy) {
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

      if (this.filters.sortOrder === "asc") {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }

  initializeWithData = (threads: ChatThreadModel[]) => {
    console.log("🏪 STORE initializeWithData called with", threads.length, "threads");
    this.threads = threads;
    this.lastUpdated = Date.now(); // Force reactivity
    console.log("🏪 STORE initialized - threads:", this.threads.length);
  };

  toggleThreadSelection = (threadId: string) => {
    console.log("🔧 STORE toggleThreadSelection:");
    console.log("  threadId:", threadId);
    console.log("  Before - selectedThreads:", this.selectedThreads);
    console.log("  threads count:", this.threads.length);
    
    const index = this.selectedThreads.indexOf(threadId);
    if (index > -1) {
      // Remove: create new array without this threadId
      this.selectedThreads = this.selectedThreads.filter(id => id !== threadId);
      console.log("  Action: REMOVED");
    } else {
      // Add: create new array with this threadId
      this.selectedThreads = [...this.selectedThreads, threadId];
      console.log("  Action: ADDED");
    }
    this.lastUpdated = Date.now(); // Force reactivity
    console.log("  After - selectedThreads:", this.selectedThreads);
    console.log("  lastUpdated:", this.lastUpdated);
  };

  selectAllThreads = () => {
    this.selectedThreads = [...this.filteredThreads.map(thread => thread.id)];
    this.lastUpdated = Date.now(); // Force reactivity
  };

  clearSelection = () => {
    this.selectedThreads = [];
    this.lastUpdated = Date.now(); // Force reactivity
  };

  openBulkDeleteDialog = () => {
    this.showBulkDeleteDialog = true;
  };

  closeBulkDeleteDialog = () => {
    this.showBulkDeleteDialog = false;
  };

  bulkDeleteSelectedThreads = async (selectedThreadIds?: string[]) => {
    // Use provided selectedThreadIds or fall back to store state
    const threadsToDelete = selectedThreadIds || [...this.selectedThreads];
    if (threadsToDelete.length === 0) return;

    console.log("🗑️ BULK DELETE with threads:", threadsToDelete);
    
    this.loading = true;
    const selectedCount = threadsToDelete.length;
    
    try {
      // Delete threads one by one using the existing service
      let deletedCount = 0;
      const errors: string[] = [];

      for (const threadId of threadsToDelete) {
        try {
          const response = await SoftDeleteChatThreadForCurrentUser(threadId);
          if (response.status === "OK") {
            deletedCount++;
          } else {
            errors.push(`Failed to delete thread ${threadId}`);
          }
        } catch (error) {
          errors.push(`Error deleting thread ${threadId}: ${error}`);
        }
      }

      // Update local state - remove successfully deleted threads
      this.threads = this.threads.filter(thread => 
        !threadsToDelete.includes(thread.id)
      );
      this.clearSelection();
      this.closeBulkDeleteDialog();
      
      if (deletedCount === selectedCount) {
        showSuccess({
          title: "Success",
          description: `Successfully deleted ${deletedCount} chat(s)`
        });
      } else if (deletedCount > 0) {
        showSuccess({
          title: "Partial Success",
          description: `Deleted ${deletedCount} of ${selectedCount} chats. Some deletions failed.`
        });
      } else {
        showError("Failed to delete selected chats");
      }

      if (errors.length > 0) {
        console.error("Bulk delete errors:", errors);
      }
    } catch (error) {
      showError("Error deleting chats");
      console.error("Error deleting chats:", error);
    } finally {
      this.loading = false;
    }
  };

  setFilters = (newFilters: Partial<ChatHistoryFilters>) => {
    this.filters = { ...this.filters, ...newFilters };
    this.lastUpdated = Date.now(); // Force reactivity
  };
}

export const chatHistoryStore = proxy<ChatHistoryState>(new ChatHistoryStateImpl());

export const useChatHistory = () => {
  return useSnapshot(chatHistoryStore, { sync: true });
};
