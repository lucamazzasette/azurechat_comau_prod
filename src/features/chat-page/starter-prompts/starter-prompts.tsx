"use client";

import { Button } from "@/features/ui/button";
import { Card } from "@/features/ui/card";
import { FC } from "react";

interface StarterPromptsProps {
  prompts: string[];
  onPromptClick: (prompt: string) => void;
  personaName: string;
  isVisible: boolean;
}

export const StarterPrompts: FC<StarterPromptsProps> = ({
  prompts,
  onPromptClick,
  personaName,
  isVisible,
}) => {
  if (!isVisible || !prompts || prompts.length === 0) {
    return null;
  }

  return (
    <div className="absolute bottom-32 w-full px-4 pb-6 space-y-3">
      <div className="container max-w-3xl mx-auto">
        <div className="text-sm text-muted-foreground text-left">
          Here are some ways to get started with {personaName}:
        </div>
        <div className="grid gap-3 sm:grid-cols-1 md:grid-cols-3">
          {prompts.map((prompt, index) => (
            <Card
              key={index}
              className="p-0 cursor-pointer hover:bg-accent/50 transition-colors border-muted-foreground/20"
            >
              <Button
                variant="ghost"
                className="w-full h-auto text-left p-3 justify-start whitespace-normal"
                onClick={() => onPromptClick(prompt)}
              >
                <div className="flex items-start gap-2 w-full">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-xs text-primary font-medium mt-0.5">
                    {index + 1}
                  </div>
                  <span className="text-sm leading-relaxed text-foreground/90">
                    {prompt}
                  </span>
                </div>
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
