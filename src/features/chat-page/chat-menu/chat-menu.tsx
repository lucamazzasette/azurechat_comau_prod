"use client";
import { sortByTimestamp } from "@/features/common/util";
import { NEW_CHAT_NAME } from "@/features/theme/theme-config";
import { FC, useEffect, useState } from "react";
import {
  ChatThreadModel,
  MenuItemsGroup,
  MenuItemsGroupName,
} from "../chat-services/models";
import { chatThreadsStore, useChatThreads } from "../chat-threads-store";
import { titleRefreshService } from "../title-refresh-service";
import { sidebarRefreshService } from "../sidebar-refresh-service";
import { ChatGroup } from "./chat-group";
import { ChatMenuItem } from "./chat-menu-item";

interface ChatMenuProps {
  menuItems: Array<ChatThreadModel>;
}

export const ChatMenu: FC<ChatMenuProps> = (props) => {
  // Use local state instead of reactive store subscriptions
  const [currentMenuItems, setCurrentMenuItems] = useState(props.menuItems);
  // Track deleted threads independently of store state
  const [deletedThreadIds, setDeletedThreadIds] = useState(new Set<string>());
  
  // Initialize the chatThreadsStore with the menu items on component mount
  useEffect(() => {
    chatThreadsStore.initializeThreads(props.menuItems);
    console.log(`[ChatMenu] Initialized with ${props.menuItems.length} threads`);
  }, [props.menuItems]);
  
  // Register with title refresh service
  useEffect(() => {
    const componentId = 'chat-menu';
    
    // Define refresh function that updates local state
    const refreshMenu = () => {
      console.log(`[ChatMenu] 🔄 Starting menu refresh...`);
      console.log(`[ChatMenu] Props menu items:`, props.menuItems.length);
      console.log(`[ChatMenu] Store threads:`, Object.keys(chatThreadsStore.threads).length);
      
      // Check if store is properly initialized
      const storeThreadCount = Object.keys(chatThreadsStore.threads).length;
      console.log(`[ChatMenu] 🔍 Store analysis - Threads in store: ${storeThreadCount}`);
      console.log(`[ChatMenu] 🔍 First few store thread IDs:`, Object.keys(chatThreadsStore.threads).slice(0, 5));
      console.log(`[ChatMenu] 🔍 First few prop thread IDs:`, props.menuItems.slice(0, 5).map(item => item.id));
      
      // If store is empty but we have props, reinitialize the store with smart merging
      if (storeThreadCount === 0 && props.menuItems.length > 0) {
        console.log(`[ChatMenu] 🔄 Store is empty but props have ${props.menuItems.length} items - reinitializing with smart merge...`);
        
        // Smart reinitialization: preserve any existing updated data in store
        const mergedItems = props.menuItems.map(item => {
          // Check if there's existing updated data for this thread (e.g., from rename operation)
          const existingThread = chatThreadsStore.getThread(item.id);
          if (existingThread) {
            console.log(`[ChatMenu] 🔄 Preserving updated data for thread ${item.id}: "${existingThread.name}" (was "${item.name}")`);
            // Preserve the updated thread data, but use props as base
            return { ...item, ...existingThread };
          }
          return item;
        });
        
        chatThreadsStore.initializeThreads(mergedItems);
        console.log(`[ChatMenu] ✅ Store reinitialized with smart merge: ${Object.keys(chatThreadsStore.threads).length} threads`);
      }
      
      // Get deleted thread IDs from the sidebar refresh service
      const serviceDeletedIds = sidebarRefreshService.getDeletedThreadIds();
      console.log(`[ChatMenu] 🗑️ Service deleted thread IDs:`, Array.from(serviceDeletedIds));
      
      // Update local deleted threads state from service
      setDeletedThreadIds(serviceDeletedIds);
      
      // Update titles from store and filter out deleted threads using service tracking
      const updatedItems = props.menuItems
        .filter(item => {
          // Primary filter: Check if thread is marked as deleted by the service
          const isDeleted = serviceDeletedIds.has(item.id);
          if (isDeleted) {
            console.log(`[ChatMenu] 🗑️ Filtering out service-deleted thread: ${item.id} (${item.name})`);
            return false;
          }
          
          console.log(`[ChatMenu] ✅ Keeping thread: ${item.id} (${item.name})`);
          return true;
        })
        .map(item => {
          const storeThread = chatThreadsStore.getThread(item.id);
          const newTitle = storeThread?.name || item.name;
          
          // Ensure we never display an empty title
          const displayTitle = newTitle && newTitle.trim() !== '' 
            ? newTitle 
            : NEW_CHAT_NAME;
          
          return {
            ...item,
            name: displayTitle
          };
        });
      
      console.log(`[ChatMenu] ✅ Filtered menu items: ${props.menuItems.length} → ${updatedItems.length}`);
      setCurrentMenuItems(updatedItems);
    };
    
    // Register with service
    titleRefreshService.register(componentId, refreshMenu);
    console.log(`[ChatMenu] 📝 Registered with title refresh service`);
    
    // Cleanup on unmount
    return () => {
      titleRefreshService.unregister(componentId);
      console.log(`[ChatMenu] 🧹 Unregistered from title refresh service`);
    };
  }, [props.menuItems]);
  
  // Debug logging
  console.log(`[ChatMenu] Rendering with ${currentMenuItems.length} local menu items`);
  
  const menuItemsGrouped = GroupChatThreadByType(currentMenuItems);
  
  return (
    <div className="px-3 flex flex-col gap-8 overflow-hidden">
      {Object.entries(menuItemsGrouped).map(
        ([groupName, groupItems], index) => (
          <ChatGroup key={index} title={groupName}>
            {groupItems?.map((item) => {
              return (
                <ChatMenuItem
                  key={item.id} // Simple key since we're using local state
                  href={`/chat/${item.id}`}
                  chatThread={item}
                >
                  {item.name.replace("\n", "")}
                </ChatMenuItem>
              );
            })}
          </ChatGroup>
        )
      )}
    </div>
  );
};

export const GroupChatThreadByType = (menuItems: Array<ChatThreadModel>) => {
  const groupedMenuItems: Array<MenuItemsGroup> = [];

  // todays date
  const today = new Date();
  // 7 days ago
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  menuItems.sort(sortByTimestamp).forEach((el) => {
    if (el.bookmarked) {
      groupedMenuItems.push({
        ...el,
        groupName: "Bookmarked",
      });
    } else if (new Date(el.lastMessageAt) > sevenDaysAgo) {
      groupedMenuItems.push({
        ...el,
        groupName: "Past 7 days",
      });
    } else {
      groupedMenuItems.push({
        ...el,
        groupName: "Previous",
      });
    }
  });
  const menuItemsGrouped = groupedMenuItems.reduce((acc, el) => {
    const key = el.groupName;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(el);
    return acc;
  }, {} as Record<MenuItemsGroupName, Array<MenuItemsGroup>>);

  const records: Record<MenuItemsGroupName, Array<MenuItemsGroup>> = {
    Bookmarked: menuItemsGrouped["Bookmarked"]?.sort(sortByTimestamp),
    "Past 7 days": menuItemsGrouped["Past 7 days"]?.sort(sortByTimestamp),
    Previous: menuItemsGrouped["Previous"]?.sort(sortByTimestamp),
  };

  return records;
};
