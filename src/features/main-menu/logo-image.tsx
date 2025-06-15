"use client";

import Image from "next/image";
import { useTheme } from "next-themes";
import { menuIconProps } from "@/ui/menu";
import { useState, useEffect } from "react";

export const LogoImage = () => {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Ensure component is mounted on client side to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render anything until the component is mounted to prevent hydration issues
  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-8 w-8">
        <div className="h-8 w-8 bg-gray-300 rounded animate-pulse" />
      </div>
    );
  }

  const isDark = resolvedTheme === "dark";
  
  return (
    <div className="flex items-center justify-center h-8 w-8">
      <Image 
        src={isDark ? "/logo-white.png" : "/logo.png"} 
        alt="Logo"
        height={32}
        width={32}
        className="object-contain"
        priority
        onError={(e) => {
          // Fallback to default logo if white logo fails to load
          console.warn("Logo failed to load, falling back to default");
          e.currentTarget.src = "/logo.png";
        }}
      />
    </div>
  );
};
