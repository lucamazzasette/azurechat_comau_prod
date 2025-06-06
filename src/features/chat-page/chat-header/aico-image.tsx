"use client";

import Image from "next/image";
import { useTheme } from "next-themes";

export const AicoImage = () => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  
  return (
    <div className="flex">
      <Image 
        src={isDark ? "/aico-white.png" : "/aico.png"} 
        alt="Aico"
        height={64}
        width={64}
        className="object-cover"
        priority
      />
    </div>
  );
};
