"use client";

import { useTheme } from "next-themes";
import Image from "next/image";
import { Avatar, AvatarImage, AvatarFallback } from "@/ui/avatar";

interface AssistantAvatarProps {
  className?: string;
  size?: number;
}

export const AssistantAvatar = ({ className, size = 32 }: AssistantAvatarProps) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  
  return (
    <Avatar className={className}>
      <AvatarImage 
        src={isDark ? "/ai-icon-w.png" : "/ai-icon.png"} 
        alt="Assistant"
        width={size}
        height={size}
        className="object-center"
      />
      <AvatarFallback>AI</AvatarFallback>
    </Avatar>
  );
};
