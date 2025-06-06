"use client";

import { proxy, useSnapshot } from "valtio";
import { ChatThreadModel } from "./chat-services/models";

interface ChatThreadsState {
  threads: Record<string, ChatThreadModel>;
  currentThreadId: string | null;
  lastUpdate: number;
  titleUpdated: boolean;
  lastTitleUpdateTime: number;
  initializeThreads: (threads: ChatThreadModel[]) => void;
  updateThreadTitle: (threadId: string, newTitle: string) => Promise<void>;
  addOrUpdateThread: (thread: ChatThreadModel) => void;
  getThread: (threadId: string) => ChatThreadModel | undefined;
  getCurrentThread: () => ChatThreadModel | undefined;
  setCurrentThread: (threadId: string) => void;
  revertThreadTitle: (threadId: string, originalTitle: string) => void;
  forceUpdate: () => void;
  forceTitleUpdate: () => void;
}

class ChatThreadsStateImpl implements ChatThreadsState {
  threads: Record<string, ChatThreadModel> = {};
  currentThreadId: string | null = null;
  lastUpdate: number = Date.now();
  titleUpdated: boolean = false;
  lastTitleUpdateTime: number = Date.now();

  initializeThreads = (threads: ChatThreadModel[]) => {
    console.log(`[ChatThreadsStore] Initializing threads store with ${threads.length} threads`);
    
    // Use object instead of Map for better Valtio reactivity
    const newThreads: Record<string, ChatThreadModel> = { ...this.threads };
    
    // Add or update threads
    threads.forEach(thread => {
      newThreads[thread.id] = thread;
    });
    
    this.threads = newThreads;
    this.lastUpdate = Date.now();
    
    console.log(`[ChatThreadsStore] Threads store now has ${Object.keys(this.threads).length} threads`);
  };

  updateThreadTitle = async (threadId: string, newTitle: string): Promise<void> => {
    console.log(`[ChatThreadsStore] Updating thread title: ${threadId} -> "${newTitle}"`);
    
    const thread = this.threads[threadId];
    const originalTitle = thread?.name || '';
    
    // Optimistic update
    if (thread) {
      this.threads = {
        ...this.threads,
        [threadId]: { ...thread, name: newTitle }
      };
      this.lastUpdate = Date.now();
      console.log(`[ChatThreadsStore] Thread ${threadId} title updated optimistically`);
    } else {
      console.warn(`[ChatThreadsStore] Thread ${threadId} not found, creating placeholder`);
      this.threads = {
        ...this.threads,
        [threadId]: {
          id: threadId,
          name: newTitle,
          userId: '',
          createdAt: new Date(),
          lastMessageAt: new Date(),
          bookmarked: false,
          isDeleted: false,
          type: 'CHAT_THREAD',
          personaMessage: '',
          personaMessageTitle: '',
          extension: [],
          useName: ''
        } as ChatThreadModel
      };
      this.lastUpdate = Date.now();
    }

    // 🔥 CRITICAL: Force reactivity trigger for title updates
    this.forceTitleUpdate();
    
    console.log(`[ChatThreadsStore] Triggered title reactivity update for ${threadId}`);

    // Server sync
    try {
      const response = await fetch('/api/chat/title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatThreadId: threadId,
          title: newTitle,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      console.log(`[ChatThreadsStore] Successfully synced title to server for ${threadId}`);
    } catch (error) {
      console.error(`[ChatThreadsStore] Failed to sync title to server:`, error);
      
      // Revert optimistic update
      this.revertThreadTitle(threadId, originalTitle);
      
      // Re-throw for caller to handle
      throw new Error('Failed to update thread title on server');
    }
  };

  revertThreadTitle = (threadId: string, originalTitle: string) => {
    console.log(`[ChatThreadsStore] Reverting thread ${threadId} title to "${originalTitle}"`);
    
    const thread = this.threads[threadId];
    if (thread) {
      this.threads = {
        ...this.threads,
        [threadId]: { ...thread, name: originalTitle }
      };
      this.lastUpdate = Date.now();
    }
  };

  addOrUpdateThread = (thread: ChatThreadModel) => {
    console.log(`[ChatThreadsStore] Adding/updating thread: ${thread.id} with name "${thread.name}"`);
    
    this.threads = {
      ...this.threads,
      [thread.id]: thread
    };
    this.lastUpdate = Date.now();
  };

  getThread = (threadId: string) => {
    return this.threads[threadId];
  };

  getCurrentThread = () => {
    return this.currentThreadId ? this.threads[this.currentThreadId] : undefined;
  };

  setCurrentThread = (threadId: string) => {
    console.log(`[ChatThreadsStore] Setting current thread to ${threadId}`);
    this.currentThreadId = threadId;
    this.lastUpdate = Date.now();
  };

  forceUpdate = () => {
    // Force a reactivity trigger by updating timestamp
    this.lastUpdate = Date.now();
    console.log(`[ChatThreadsStore] Forced update at ${this.lastUpdate}`);
  };

  forceTitleUpdate = () => {
    // Force title-specific reactivity trigger
    this.titleUpdated = !this.titleUpdated;
    this.lastTitleUpdateTime = Date.now();
    console.log(`[ChatThreadsStore] Forced title update trigger: ${this.titleUpdated} at ${this.lastTitleUpdateTime}`);
  };
}

export const chatThreadsStore = proxy<ChatThreadsState>(new ChatThreadsStateImpl());

export const useChatThreads = () => {
  return useSnapshot(chatThreadsStore);
};
