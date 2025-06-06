"use client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/features/ui/dropdown-menu";
import { LoadingIndicator } from "@/features/ui/loading";
import { cn } from "@/ui/lib";
import { BookmarkCheck, MoreVertical, Pencil, Trash } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { FC, useState, useEffect } from "react";
import { ChatThreadModel } from "../chat-services/models";
import { chatThreadsStore } from "../chat-threads-store";
import { chatStore } from "../chat-store";
import { sidebarRefreshService } from "../sidebar-refresh-service";
import {
  BookmarkChatThread,
  DeleteChatThreadByID,
  UpdateChatThreadTitle,
} from "./chat-menu-service";

interface ChatMenuItemProps {
  href: string;
  chatThread: ChatThreadModel;
  children?: React.ReactNode;
}

export const ChatMenuItem: FC<ChatMenuItemProps> = (props) => {
  const path = usePathname();
  const { isLoading, handleAction } = useDropdownAction({
    chatThread: props.chatThread,
  });

  return (
    <div className="flex group hover:bg-muted pr-3 text-muted-foreground rounded-sm hover:text-muted-foreground">
      <Link
        href={props.href}
        className={cn(
          "flex-1 flex items-center gap-2 p-3 overflow-hidden",
          path.startsWith(props.href) && props.href !== "/"
            ? "text-primary"
            : ""
        )}
      >
        {props.children}
      </Link>
      <DropdownMenu>
        <DropdownMenuTrigger disabled={isLoading}>
          {isLoading ? (
            <LoadingIndicator isLoading={isLoading} />
          ) : (
            <MoreVertical size={18} aria-label="Chat Menu Item Dropdown Menu" />
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start">
          <DropdownMenuItemWithIcon
            onClick={async () => await handleAction("bookmark")}
          >
            <BookmarkCheck size={18} />
            <span>
              {props.chatThread.bookmarked ? "Remove bookmark" : "Bookmark"}
            </span>
          </DropdownMenuItemWithIcon>
          <DropdownMenuItemWithIcon
            onClick={async () => await handleAction("rename")}
          >
            <Pencil size={18} />
            <span>Rename</span>
          </DropdownMenuItemWithIcon>
          <DropdownMenuSeparator />
          <DropdownMenuItemWithIcon
            onClick={async () => await handleAction("delete")}
          >
            <Trash size={18} />
            <span>Delete</span>
          </DropdownMenuItemWithIcon>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

type DropdownAction = "bookmark" | "rename" | "delete";

const useDropdownAction = (props: { chatThread: ChatThreadModel }) => {
  const { chatThread } = props;
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Register router with sidebar refresh service
  useEffect(() => {
    sidebarRefreshService.setRouter(router);
  }, [router]);

  const handleAction = async (action: DropdownAction) => {
    setIsLoading(true);
    
    try {
      switch (action) {
        case "bookmark":
          await BookmarkChatThread({ chatThread });
          // Refresh sidebar after bookmark change
          sidebarRefreshService.refreshSidebar();
          break;
          
        case "rename":
          const name = window.prompt("Enter the new name for the chat thread:");
          if (name !== null && name.trim() !== "") {
            const trimmedName = name.trim();
            
            console.log(`[ChatMenuItem] Starting rename operation: ${chatThread.id} → "${trimmedName}"`);
            
            // Use sidebar refresh service for rename
            const success = await sidebarRefreshService.handleThreadRename(chatThread.id, trimmedName);
            
            if (success) {
              // Also update chatStore if this is the active thread
              chatStore.updateThreadTitle(chatThread.id, trimmedName);
              console.log(`[ChatMenuItem] ✅ Rename completed successfully`);
            } else {
              console.error(`[ChatMenuItem] ❌ Rename operation failed`);
            }
          }
          break;
          
        case "delete":
          console.log(`[ChatMenuItem] 🗑️ DELETE CLICKED - Action triggered for thread ${chatThread.id}`);
          console.log(`[ChatMenuItem] Sidebar refresh service available:`, !!sidebarRefreshService);
          console.log(`[ChatMenuItem] Sidebar refresh service methods:`, Object.keys(sidebarRefreshService));
          
          if (window.confirm("Are you sure you want to delete this chat thread?")) {
            console.log(`[ChatMenuItem] 🗑️ DELETE CONFIRMED - User confirmed deletion`);
            console.log(`[ChatMenuItem] Thread to delete:`, chatThread.id, chatThread.name);
            console.log(`[ChatMenuItem] Current pathname:`, pathname);
            
            try {
              console.log(`[ChatMenuItem] 🗑️ CALLING SIDEBAR SERVICE - About to call handleThreadDelete...`);
              
              // Use sidebar refresh service for intelligent delete
              const success = await sidebarRefreshService.handleThreadDelete(chatThread.id, pathname);
              
              console.log(`[ChatMenuItem] 🗑️ SERVICE RETURNED - Result:`, success);
              
              if (success) {
                console.log(`[ChatMenuItem] ✅ Delete completed successfully`);
              } else {
                console.error(`[ChatMenuItem] ❌ Delete operation failed`);
              }
            } catch (error) {
              console.error(`[ChatMenuItem] ❌ EXCEPTION during delete:`, error);
              console.error(`[ChatMenuItem] Error stack:`, (error as Error)?.stack);
            }
          } else {
            console.log(`[ChatMenuItem] 🗑️ DELETE CANCELLED - User cancelled deletion`);
          }
          break;
      }
    } catch (error) {
      console.error(`[ChatMenuItem] ❌ Action "${action}" failed:`, error);
      
      // Show user-friendly error message
      const actionName = action === "bookmark" ? "bookmark" : action === "rename" ? "rename" : "delete";
      alert(`Failed to ${actionName} chat thread. Please try again.`);
    }
    
    setIsLoading(false);
  };

  return {
    isLoading,
    handleAction,
  };
};

export const DropdownMenuItemWithIcon: FC<{
  children?: React.ReactNode;
  onClick?: () => void;
}> = (props) => {
  return (
    <DropdownMenuItem className="flex gap-2" onClick={props.onClick}>
      {props.children}
    </DropdownMenuItem>
  );
};
