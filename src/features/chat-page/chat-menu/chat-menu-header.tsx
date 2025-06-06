"use client";
import { CreateChatAndRedirect } from "../chat-services/chat-thread-service";
import { ChatContextMenu } from "./chat-context-menu";
import { NewChat } from "./new-chat";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export const ChatMenuHeader = () => {
  const router = useRouter();
  const pathname = usePathname();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittedRef = useRef(false);
  const lastPathRef = useRef(pathname);
  
  // Reset submission state when pathname changes (navigation complete)
  useEffect(() => {
    // If we were submitting and the path changed, reset state
    if (isSubmitting && pathname !== lastPathRef.current) {
      setIsSubmitting(false);
      submittedRef.current = false;
    }
    
    // Update the last path reference
    lastPathRef.current = pathname;
  }, [pathname, isSubmitting]);
  
  // Safety timeout to reset loading state after 3 seconds
  useEffect(() => {
    let safetyTimeout: NodeJS.Timeout | null = null;
    
    if (isSubmitting) {
      safetyTimeout = setTimeout(() => {
        console.log("Safety timeout: resetting submission state");
        setIsSubmitting(false);
        submittedRef.current = false;
        // Force redirect as fallback
        router.push('/chat');
      }, 3000);
    }
    
    return () => {
      if (safetyTimeout) clearTimeout(safetyTimeout);
    };
  }, [isSubmitting, router]);
  
  // Handle form submission with reliable client-side navigation
  const handleSubmit = async (formData: FormData) => {
    // Prevent multiple submissions using both state and ref
    // The ref helps with race conditions where state updates haven't processed yet
    if (isSubmitting || submittedRef.current) return;
    
    try {
      // Set both state and ref immediately
      setIsSubmitting(true);
      submittedRef.current = true;
      
      console.log("Submitting new chat request");
      
      // Call server action to create chat thread
      const result = await CreateChatAndRedirect();
      
      if (result.success && result.threadId) {
        // Navigate to the specific chat thread
        console.log("Navigating to chat thread:", result.threadId);
        router.push(`/chat/${result.threadId}`);
      } else {
        // Handle error case
        console.error("Failed to create chat thread:", result.error);
        // Fallback to general chat page
        router.push('/chat');
      }
      
    } catch (error) {
      console.error("Error creating new chat:", error);
      // Reset states
      setIsSubmitting(false);
      submittedRef.current = false;
      // Fallback redirect in case of error
      router.push('/chat');
    }
  };
  
  return (
    <div className="flex p-2 px-3 justify-end">
      <form action={handleSubmit} className="flex gap-2 pr-3">
        <NewChat disabled={isSubmitting} />
        <ChatContextMenu />
      </form>
    </div>
  );
};
