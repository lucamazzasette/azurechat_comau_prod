"use client";

/**
 * Title Refresh Service
 * 
 * Provides manual control over title updates in header and sidebar
 * without affecting message content. Components register refresh callbacks
 * and service triggers them when needed.
 */
class TitleRefreshService {
  private callbacks = new Map<string, () => void>();
  private isEnabled = true;

  /**
   * Register a component's refresh function
   */
  register(componentId: string, refreshFn: () => void) {
    this.callbacks.set(componentId, refreshFn);
    console.log(`[TitleRefreshService] Registered ${componentId} (total: ${this.callbacks.size})`);
  }

  /**
   * Unregister a component (called on unmount)
   */
  unregister(componentId: string) {
    const existed = this.callbacks.delete(componentId);
    if (existed) {
      console.log(`[TitleRefreshService] Unregistered ${componentId} (remaining: ${this.callbacks.size})`);
    }
  }

  /**
   * Manual trigger - refreshes ALL registered components
   * This is the key method that ensures title updates happen
   */
  refreshAll() {
    if (!this.isEnabled) {
      console.log(`[TitleRefreshService] Refresh disabled, skipping`);
      return;
    }

    console.log(`[TitleRefreshService] 🔄 Refreshing ${this.callbacks.size} registered components`);
    
    let successCount = 0;
    let errorCount = 0;

    this.callbacks.forEach((refreshFn, componentId) => {
      try {
        refreshFn();
        successCount++;
        console.log(`[TitleRefreshService] ✅ Refreshed ${componentId}`);
      } catch (error) {
        errorCount++;
        console.error(`[TitleRefreshService] ❌ Failed to refresh ${componentId}:`, error);
      }
    });

    console.log(`[TitleRefreshService] 📊 Refresh complete: ${successCount} success, ${errorCount} errors`);
  }

  /**
   * Refresh a specific component by ID
   */
  refreshComponent(componentId: string) {
    const refreshFn = this.callbacks.get(componentId);
    if (refreshFn) {
      try {
        refreshFn();
        console.log(`[TitleRefreshService] ✅ Refreshed specific component: ${componentId}`);
      } catch (error) {
        console.error(`[TitleRefreshService] ❌ Failed to refresh ${componentId}:`, error);
      }
    } else {
      console.warn(`[TitleRefreshService] ⚠️ Component ${componentId} not registered`);
    }
  }

  /**
   * Enable/disable the service (useful for debugging)
   */
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    console.log(`[TitleRefreshService] Service ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get status information for debugging
   */
  getStatus() {
    return {
      isEnabled: this.isEnabled,
      registeredComponents: Array.from(this.callbacks.keys()),
      totalComponents: this.callbacks.size
    };
  }

  /**
   * Debug method to list all registered components
   */
  listRegisteredComponents() {
    console.log(`[TitleRefreshService] 📋 Registered components:`, Array.from(this.callbacks.keys()));
  }
}

// Export singleton instance
export const titleRefreshService = new TitleRefreshService();

// Global access for debugging (development only)
if (typeof window !== 'undefined') {
  (window as any).titleRefreshService = titleRefreshService;
}
