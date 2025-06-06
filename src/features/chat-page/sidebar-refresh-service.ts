"use client";

import { useRouter } from "next/navigation";
import { ChatThreadModel } from "./chat-services/models";
import { chatThreadsStore } from "./chat-threads-store";
import { titleRefreshService } from "./title-refresh-service";

/**
 * Sidebar Refresh Service
 * 
 * Provides intelligent sidebar management for operations like:
 * - Thread deletion with optimistic updates
 * - Smart navigation after operations
 * - Sidebar data synchronization
 * - Error handling with rollback capabilities
 */
class SidebarRefreshService {
  private pendingOperations = new Map<string, 'delete' | 'update'>();
  private backupData = new Map<string, ChatThreadModel>();
  private deletedThreadIds = new Set<string>();
  private isEnabled = true;

  /**
   * Handle thread deletion with optimistic updates and smart navigation
   */
  async handleThreadDelete(threadId: string, currentPath: string): Promise<boolean> {
    if (!this.isEnabled) {
      console.log(`[SidebarRefreshService] Service disabled, skipping delete`);
      return false;
    }

    console.log(`[SidebarRefreshService] 🗑️ Starting delete operation for thread ${threadId}`);
    console.log(`[SidebarRefreshService] Current path: ${currentPath}`);

    // 1. Backup thread data for potential rollback
    const threadToDelete = chatThreadsStore.getThread(threadId);
    if (threadToDelete) {
      this.backupData.set(threadId, { ...threadToDelete });
      console.log(`[SidebarRefreshService] 💾 Backed up thread data for rollback`);
    }

    // 2. Mark operation as pending
    this.pendingOperations.set(threadId, 'delete');

    try {
      // 3. Optimistic update - immediately remove from sidebar
      this.removeThreadFromSidebar(threadId);
      console.log(`[SidebarRefreshService] ✅ Optimistically removed thread from sidebar`);

      // 4. Trigger sidebar refresh
      this.refreshSidebar();

      // 5. Determine navigation strategy
      const shouldNavigate = this.shouldNavigateAfterDelete(threadId, currentPath);
      
      if (shouldNavigate) {
        console.log(`[SidebarRefreshService] 🧭 Navigation required, redirecting to /chat`);
        // Use Next.js router for client-side navigation
        const router = this.getRouter();
        if (router) {
          router.push('/chat');
        } else {
          // Fallback to window.location for edge cases
          window.location.href = '/chat';
        }
      } else {
        console.log(`[SidebarRefreshService] 🎯 Staying on current page, only refreshing sidebar`);
      }

      // 6. Call server-side deletion (without redirect)
      const success = await this.performServerDelete(threadId);
      
      if (success) {
        console.log(`[SidebarRefreshService] ✅ Server deletion completed successfully`);
        this.pendingOperations.delete(threadId);
        this.backupData.delete(threadId);
        return true;
      } else {
        throw new Error('Server deletion failed');
      }

    } catch (error) {
      console.error(`[SidebarRefreshService] ❌ Delete operation failed:`, error);
      
      // Rollback optimistic update
      await this.rollbackThreadRemoval(threadId);
      
      // Show user-friendly error
      alert('Failed to delete chat thread. Please try again.');
      
      return false;
    }
  }

  /**
   * Remove thread from sidebar immediately (optimistic update)
   */
  private removeThreadFromSidebar(threadId: string) {
    console.log(`[SidebarRefreshService] 🗑️ Starting optimistic removal of thread ${threadId}`);
    console.log(`[SidebarRefreshService] Threads before removal:`, Object.keys(chatThreadsStore.threads));
    
    // Always track the deleted thread ID, regardless of store state
    this.deletedThreadIds.add(threadId);
    console.log(`[SidebarRefreshService] 📝 Added ${threadId} to deleted threads tracking`);
    console.log(`[SidebarRefreshService] 🗑️ Currently deleted thread IDs:`, Array.from(this.deletedThreadIds));
    
    // Try to remove from store if it exists
    const storeThreadCount = Object.keys(chatThreadsStore.threads).length;
    if (storeThreadCount === 0) {
      console.warn(`[SidebarRefreshService] ⚠️ Store is empty, but tracking deletion locally`);
      return;
    }
    
    // Check if thread exists in store
    const threadExists = chatThreadsStore.getThread(threadId);
    if (!threadExists) {
      console.warn(`[SidebarRefreshService] ⚠️ Thread ${threadId} doesn't exist in store, but tracking deletion locally`);
      return;
    }
    
    // Remove from chatThreadsStore by creating new object without the thread
    console.log(`[SidebarRefreshService] 🗑️ Removing thread ${threadId} from store...`);
    const { [threadId]: removedThread, ...remainingThreads } = chatThreadsStore.threads;
    chatThreadsStore.threads = remainingThreads;
    chatThreadsStore.forceUpdate();
    chatThreadsStore.forceTitleUpdate();
    
    console.log(`[SidebarRefreshService] ✅ Thread ${threadId} removed from store`);
    console.log(`[SidebarRefreshService] Threads after removal:`, Object.keys(chatThreadsStore.threads));
    console.log(`[SidebarRefreshService] Store state updated at:`, Date.now());
  }

  /**
   * Rollback thread removal (restore from backup)
   */
  private async rollbackThreadRemoval(threadId: string) {
    const backupThread = this.backupData.get(threadId);
    
    if (backupThread) {
      console.log(`[SidebarRefreshService] 🔄 Rolling back thread removal for ${threadId}`);
      
      // Remove from deleted tracking
      this.deletedThreadIds.delete(threadId);
      console.log(`[SidebarRefreshService] 📝 Removed ${threadId} from deleted threads tracking`);
      
      // Restore thread to store
      chatThreadsStore.addOrUpdateThread(backupThread);
      
      // Refresh sidebar
      this.refreshSidebar();
      
      console.log(`[SidebarRefreshService] ✅ Rollback completed for ${threadId}`);
    } else {
      console.warn(`[SidebarRefreshService] ⚠️ No backup data found for thread ${threadId}`);
    }
    
    // Clean up
    this.pendingOperations.delete(threadId);
    this.backupData.delete(threadId);
  }

  /**
   * Determine if navigation is needed after delete
   */
  private shouldNavigateAfterDelete(threadId: string, currentPath: string): boolean {
    // Navigate only if we're currently viewing the deleted thread
    const isViewingDeletedThread = currentPath === `/chat/${threadId}`;
    
    console.log(`[SidebarRefreshService] Navigation check: viewing deleted thread = ${isViewingDeletedThread}`);
    
    return isViewingDeletedThread;
  }

  /**
   * Perform server-side deletion without redirect
   */
  private async performServerDelete(threadId: string): Promise<boolean> {
    try {
      console.log(`[SidebarRefreshService] 🌐 Calling server deletion API for ${threadId}`);
      
      // Call server deletion via API endpoint
      const response = await fetch('/api/chat/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          threadId: threadId,
        }),
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log(`[SidebarRefreshService] ✅ Server deletion successful:`, result);
        return true;
      } else {
        console.error(`[SidebarRefreshService] ❌ Server deletion failed with status:`, response.status);
        return false;
      }
    } catch (error) {
      console.error(`[SidebarRefreshService] ❌ Error during server deletion:`, error);
      return false;
    }
  }

  /**
   * Get Next.js router instance
   */
  private getRouter() {
    try {
      // This will be set by components that use the service
      return (window as any).__sidebarRefreshRouter;
    } catch (error) {
      console.warn(`[SidebarRefreshService] Could not get router:`, error);
      return null;
    }
  }

  /**
   * Set router instance (called by components)
   */
  setRouter(router: any) {
    if (typeof window !== 'undefined') {
      (window as any).__sidebarRefreshRouter = router;
      console.log(`[SidebarRefreshService] 🧭 Router instance registered`);
    }
  }

  /**
   * Refresh sidebar components
   */
  refreshSidebar() {
    console.log(`[SidebarRefreshService] 🔄 Starting sidebar refresh...`);
    
    // Get service status for debugging
    const titleServiceStatus = titleRefreshService.getStatus();
    console.log(`[SidebarRefreshService] Title service status:`, titleServiceStatus);
    
    // Use the existing title refresh service to update sidebar
    titleRefreshService.refreshAll();
    
    // Also force a direct update to ensure reactivity
    setTimeout(() => {
      console.log(`[SidebarRefreshService] 🔄 Performing delayed refresh for additional reliability`);
      titleRefreshService.refreshAll();
    }, 100);
    
    console.log(`[SidebarRefreshService] ✅ Sidebar refresh triggered`);
  }

  /**
   * Handle thread rename (integrates with existing title service)
   */
  async handleThreadRename(threadId: string, newName: string): Promise<boolean> {
    try {
      console.log(`[SidebarRefreshService] ✏️ Handling rename: ${threadId} → "${newName}"`);
      
      // Use existing title update mechanism
      await chatThreadsStore.updateThreadTitle(threadId, newName);
      
      // Refresh sidebar
      this.refreshSidebar();
      
      console.log(`[SidebarRefreshService] ✅ Rename completed successfully`);
      return true;
      
    } catch (error) {
      console.error(`[SidebarRefreshService] ❌ Rename failed:`, error);
      return false;
    }
  }

  /**
   * Refresh all sidebar data from server (heavy operation)
   */
  async refreshSidebarData(): Promise<void> {
    try {
      console.log(`[SidebarRefreshService] 🔄 Refreshing all sidebar data from server`);
      
      // This would trigger a full data reload - use sparingly
      window.location.reload();
      
    } catch (error) {
      console.error(`[SidebarRefreshService] ❌ Failed to refresh sidebar data:`, error);
    }
  }

  /**
   * Get service status for debugging
   */
  getStatus() {
    return {
      isEnabled: this.isEnabled,
      pendingOperations: Array.from(this.pendingOperations.entries()),
      backupDataCount: this.backupData.size,
      hasRouter: !!(window as any).__sidebarRefreshRouter
    };
  }

  /**
   * Enable/disable service
   */
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    console.log(`[SidebarRefreshService] Service ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get deleted thread IDs for components to use in filtering
   */
  getDeletedThreadIds(): Set<string> {
    return new Set(this.deletedThreadIds);
  }

  /**
   * Clear all pending operations (emergency cleanup)
   */
  clearPendingOperations() {
    console.log(`[SidebarRefreshService] 🧹 Clearing ${this.pendingOperations.size} pending operations`);
    this.pendingOperations.clear();
    this.backupData.clear();
    this.deletedThreadIds.clear();
  }
}

// Export singleton instance
export const sidebarRefreshService = new SidebarRefreshService();

// Global access for debugging (development only)
if (typeof window !== 'undefined') {
  (window as any).sidebarRefreshService = sidebarRefreshService;
}
