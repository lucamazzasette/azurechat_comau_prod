"use client";

import Image from "next/image";
import { useTheme } from "next-themes";
import { menuIconProps } from "@/ui/menu";

export const LogoImage = () => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  
  return (
    <div className="flex items-center justify-center" style={{ height: "32px", width: "32px" }}>
      <Image 
        src={isDark ? "/logo-white.png" : "/logo.png"} 
        alt="Logo"
        height={32}
        width={32}
        className="object-contain"
        priority
      />
    </div>
  );
};
