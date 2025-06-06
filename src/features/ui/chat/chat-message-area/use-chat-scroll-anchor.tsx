import { chatStore, useChat } from "@/features/chat-page/chat-store";
import { RefObject, useCallback, useEffect, useRef } from "react";

export const useChatScrollAnchor = (props: {
  ref: RefObject<HTMLDivElement>;
}) => {
  const { ref } = props;
  const { autoScroll, loading } = useChat();
  
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();
  const lastScrollTopRef = useRef<number>(0);
  const isScrollingRef = useRef<boolean>(false);
  const animationFrameRef = useRef<number>();

  // Smooth scroll function with easing
  const smoothScrollToBottom = useCallback(() => {
    if (!ref.current || !autoScroll) return;

    const element = ref.current;
    const targetScrollTop = element.scrollHeight - element.clientHeight;
    const currentScrollTop = element.scrollTop;
    const distance = targetScrollTop - currentScrollTop;

    // If we're already at the bottom or very close, don't scroll
    if (Math.abs(distance) < 5) return;

    // Use smooth behavior for better UX
    element.scrollTo({
      top: targetScrollTop,
      behavior: 'smooth'
    });
  }, [ref, autoScroll]);

  // Debounced scroll handler for better performance
  const debouncedScrollHandler = useCallback(() => {
    if (!ref.current) return;

    const element = ref.current;
    const scrollTop = element.scrollTop;
    const scrollHeight = element.scrollHeight;
    const clientHeight = element.clientHeight;
    
    // Calculate if user is near bottom (within 100px threshold like Claude)
    const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
    const isNearBottom = distanceFromBottom < 100;
    
    // Detect if user scrolled up intentionally
    const scrolledUp = scrollTop < lastScrollTopRef.current;
    const userInterrupted = scrolledUp && !isScrollingRef.current;
    
    // Update auto-scroll state based on user behavior
    if (userInterrupted) {
      chatStore.updateAutoScroll(false);
    } else if (isNearBottom && !autoScroll) {
      // Re-enable auto-scroll when user scrolls back near bottom
      chatStore.updateAutoScroll(true);
    }
    
    lastScrollTopRef.current = scrollTop;
    isScrollingRef.current = false;
  }, [ref, autoScroll]);

  // Throttled scroll event handler
  useEffect(() => {
    const handleScroll = () => {
      // Clear existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      // Mark as scrolling to distinguish from programmatic scrolls
      isScrollingRef.current = true;
      
      // Debounce the scroll handler
      scrollTimeoutRef.current = setTimeout(debouncedScrollHandler, 150);
    };

    const element = ref.current;
    if (element) {
      element.addEventListener("scroll", handleScroll, { passive: true });
      
      return () => {
        element.removeEventListener("scroll", handleScroll);
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
      };
    }
  }, [ref, debouncedScrollHandler]);

  // Enhanced auto-scroll with streaming awareness
  useEffect(() => {
    const handleContentChange = () => {
      if (!autoScroll || !ref.current) return;

      // Cancel any existing animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      // Use requestAnimationFrame for smooth scrolling during streaming
      animationFrameRef.current = requestAnimationFrame(() => {
        // If currently loading (streaming), scroll more gently
        if (loading === "loading") {
          smoothScrollToBottom();
        } else {
          // For final content, ensure we're at the exact bottom
          if (ref.current) {
            ref.current.scrollTop = ref.current.scrollHeight;
          }
        }
      });
    };

    const observer = new MutationObserver((mutations) => {
      // Only trigger on relevant content changes
      const hasContentChanges = mutations.some(mutation => 
        mutation.type === 'childList' && mutation.addedNodes.length > 0
      );
      
      if (hasContentChanges) {
        handleContentChange();
      }
    });

    if (ref.current) {
      observer.observe(ref.current, { 
        childList: true, 
        subtree: true,
        characterData: true // Watch for text changes during streaming
      });
    }

    return () => {
      observer.disconnect();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [ref, autoScroll, loading, smoothScrollToBottom]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);
};
