import React, { ForwardRefRenderFunction } from "react";
import { ScrollArea } from "../../scroll-area";

interface ChatMessageContainerProps {
  children?: React.ReactNode;
}

const ChatMessageContainer: ForwardRefRenderFunction<
  HTMLDivElement,
  ChatMessageContainerProps
> = (props, ref) => {
  return (
    <ScrollArea 
      ref={ref} 
      className="flex-1 h-full scroll-smooth" 
      type="always"
      style={{
        scrollBehavior: 'smooth',
        // Add CSS scroll snap for better control
        scrollPaddingTop: '1rem',
        scrollPaddingBottom: '1rem'
      }}
    >
      {props.children}
    </ScrollArea>
  );
};

export default React.forwardRef(ChatMessageContainer);
