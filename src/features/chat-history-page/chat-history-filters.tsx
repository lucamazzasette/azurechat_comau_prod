"use client";

import { Input } from "@/features/ui/input";
import { Button } from "@/features/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/features/ui/select";
import { Card } from "@/features/ui/card";
import { Search, Filter, Trash2 } from "lucide-react";
import { ChatThreadModel } from "@/features/chat-page/chat-services/models";

interface ChatHistoryFiltersState {
  search: string;
  dateFrom: string;
  dateTo: string;
  bookmarked: boolean | null;
  sortBy: "createdAt" | "lastMessageAt" | "name";
  sortOrder: "asc" | "desc";
}

interface ChatHistoryFiltersProps {
  filters: ChatHistoryFiltersState;
  onFiltersChange: (newFilters: Partial<ChatHistoryFiltersState>) => void;
  selectedThreads: string[];
  filteredThreads: ChatThreadModel[];
  onSelectionChange: (newSelection: string[]) => void;
}

export const ChatHistoryFilters = ({ 
  filters, 
  onFiltersChange, 
  selectedThreads, 
  filteredThreads, 
  onSelectionChange 
}: ChatHistoryFiltersProps) => {

  const handleSearchChange = (value: string) => {
    onFiltersChange({ search: value });
  };

  const handleDateFromChange = (value: string) => {
    onFiltersChange({ dateFrom: value });
  };

  const handleDateToChange = (value: string) => {
    onFiltersChange({ dateTo: value });
  };

  const handleBookmarkedChange = (value: string) => {
    const bookmarked = value === "all" ? null : value === "bookmarked";
    onFiltersChange({ bookmarked });
  };

  const handleSortByChange = (value: string) => {
    onFiltersChange({ sortBy: value as "createdAt" | "lastMessageAt" | "name" });
  };

  const handleSortOrderChange = (value: string) => {
    onFiltersChange({ sortOrder: value as "asc" | "desc" });
  };

  const clearFilters = () => {
    onFiltersChange({
      search: "",
      dateFrom: "",
      dateTo: "",
      bookmarked: null,
      sortBy: "lastMessageAt",
      sortOrder: "desc"
    });
  };

  const handleSelectAll = () => {
    const allSelected = selectedThreads.length === filteredThreads.length;
    if (allSelected) {
      // Clear all
      onSelectionChange([]);
    } else {
      // Select all
      const allIds = filteredThreads.map(thread => thread.id);
      onSelectionChange(allIds);
    }
  };

  const isAllSelected = selectedThreads.length === filteredThreads.length && filteredThreads.length > 0;
  const isSomeSelected = selectedThreads.length > 0 && selectedThreads.length < filteredThreads.length;

  return (
    <Card className="p-4">
      <div className="space-y-4">
        {/* Search and Actions Row */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search conversations..."
              value={filters.search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              disabled={filteredThreads.length === 0}
            >
              {isAllSelected ? "Deselect All" : isSomeSelected ? "Select All" : "Select All"}
            </Button>
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="h-4 w-4" />
            <span>Filters:</span>
          </div>
          
          <div className="flex flex-wrap gap-4 flex-1">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">From Date</label>
              <Input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleDateFromChange(e.target.value)}
                className="w-40"
              />
            </div>
            
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">To Date</label>
              <Input
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleDateToChange(e.target.value)}
                className="w-40"
              />
            </div>
            
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Status</label>
              <Select value={filters.bookmarked === null ? "all" : filters.bookmarked ? "bookmarked" : "regular"} onValueChange={handleBookmarkedChange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="bookmarked">Bookmarked</SelectItem>
                  <SelectItem value="regular">Regular</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Sort By</label>
              <Select value={filters.sortBy} onValueChange={handleSortByChange}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lastMessageAt">Last Activity</SelectItem>
                  <SelectItem value="createdAt">Created Date</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Order</label>
              <Select value={filters.sortOrder} onValueChange={handleSortOrderChange}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Newest</SelectItem>
                  <SelectItem value="asc">Oldest</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={clearFilters}
            className="whitespace-nowrap"
          >
            Clear Filters
          </Button>
        </div>
      </div>
    </Card>
  );
};
