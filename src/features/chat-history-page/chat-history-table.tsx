"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/features/ui/table";
import { Button } from "@/features/ui/button";
import { Checkbox } from "@/features/ui/checkbox";
import { MessageCircle, Star, Calendar, Clock, Trash2 } from "lucide-react";
import { useChatHistory } from "./chat-history-store";
import { chatHistoryStore } from "./chat-history-store";
import Link from "next/link";
import { ChatThreadModel } from "@/features/chat-page/chat-services/models";

interface ChatHistoryTableProps {
  displayThreads: readonly ChatThreadModel[];
  selectedThreads: string[];
  onSelectionChange: (newSelection: string[]) => void;
}

export const ChatHistoryTable = ({ 
  displayThreads,
  selectedThreads, 
  onSelectionChange 
}: ChatHistoryTableProps) => {
  const snapshot = useChatHistory();
  const { 
    loading 
  } = snapshot;

  // Debug: Track component re-renders
  console.log("🎭 COMPONENT RENDER (HYBRID VERSION):");
  console.log("  selectedThreads:", selectedThreads);
  console.log("  selectedThreads.length:", selectedThreads.length);
  console.log("  displayThreads.length:", displayThreads.length);

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffMs = now.getTime() - dateObj.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffDays > 7) {
      return dateObj.toLocaleDateString();
    } else if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  };

  const formatFullDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString();
  };

  // 🚀 SHARED STATE FIX: Use shared state for checkbox logic
  const isSelected = (threadId: string) => selectedThreads.includes(threadId);

  // Handle individual checkbox toggle
  const handleToggleSelection = (threadId: string) => {
    console.log("🚀 SHARED STATE CHECKBOX TOGGLE:", threadId);
    
    const newSelection = selectedThreads.includes(threadId) 
      ? selectedThreads.filter(id => id !== threadId)
      : [...selectedThreads, threadId];
    
    console.log("🚀 Shared state updated:", newSelection);
    onSelectionChange(newSelection);
  };

  // Handle select all/clear all
  const handleSelectAll = () => {
    const allSelected = selectedThreads.length === displayThreads.length;
    if (allSelected) {
      // Clear all
      onSelectionChange([]);
    } else {
      // Select all
      const allIds = displayThreads.map(thread => thread.id);
      onSelectionChange(allIds);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-muted animate-pulse rounded" />
        ))}
      </div>
    );
  }

  if (displayThreads.length === 0) {
    return (
      <div className="text-center py-12">
        <MessageCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground mb-2">No conversations found</h3>
        <p className="text-sm text-muted-foreground">
          Create a new conversation to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="max-h-[70vh] overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedThreads.length === displayThreads.length && displayThreads.length > 0}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all conversations"
                />
              </TableHead>
            <TableHead>Conversation</TableHead>
            <TableHead className="hidden sm:table-cell">Persona</TableHead>
            <TableHead className="hidden md:table-cell">Created</TableHead>
            <TableHead className="hidden lg:table-cell">Last Activity</TableHead>
            <TableHead className="w-24">Status</TableHead>
            <TableHead className="w-24">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {displayThreads.map((thread) => (
            <TableRow 
              key={thread.id}
              className={isSelected(thread.id) ? "bg-muted/50" : ""}
            >
              <TableCell>
                <Checkbox
                  checked={isSelected(thread.id)}
                  onCheckedChange={() => handleToggleSelection(thread.id)}
                  aria-label={`Select conversation ${thread.name}`}
                />
              </TableCell>
              
              <TableCell>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Link 
                      href={`/chat/${thread.id}`}
                      className="font-medium hover:underline line-clamp-1"
                      title={thread.name}
                    >
                      {thread.name}
                    </Link>
                    {thread.bookmarked && (
                      <Star className="h-4 w-4 text-yellow-500 fill-current" />
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    ID: {thread.id.slice(0, 8)}...
                  </div>
                </div>
              </TableCell>
              
              <TableCell className="hidden sm:table-cell">
                <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                  {thread.personaMessageTitle || "Default"}
                </span>
              </TableCell>
              
              <TableCell className="hidden md:table-cell">
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span title={formatFullDate(thread.createdAt)}>
                    {formatDate(thread.createdAt)}
                  </span>
                </div>
              </TableCell>
              
              <TableCell className="hidden lg:table-cell">
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span title={formatFullDate(thread.lastMessageAt)}>
                    {formatDate(thread.lastMessageAt)}
                  </span>
                </div>
              </TableCell>
              
              <TableCell>
                <div className="flex flex-col gap-1">
                  {thread.bookmarked && (
                    <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold">
                      Bookmarked
                    </span>
                  )}
                  {thread.extension && thread.extension.length > 0 && (
                    <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold">
                      +{thread.extension.length} ext
                    </span>
                  )}
                </div>
              </TableCell>
              
              <TableCell>
                <div className="flex items-center gap-1">                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleSelection(thread.id)}
                    className="h-8 w-8 p-0"
                    title={isSelected(thread.id) ? "Deselect" : "Select for deletion"}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        </Table>
      </div>
    </div>
  );
};
