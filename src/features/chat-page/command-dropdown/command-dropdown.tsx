"use client";

import { Button } from "@/features/ui/button";
import { Card } from "@/features/ui/card";
import { FC, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface CommandDropdownProps {
  isVisible: boolean;
  commands: string[];
  query: string;
  onSelect: (command: string) => void;
  onClose: () => void;
  position?: { x: number; y: number };
}

interface CommandItem {
  text: string;
  type: 'standard' | 'starter';
}

export const CommandDropdown: FC<CommandDropdownProps> = ({
  isVisible,
  commands,
  query,
  onSelect,
  onClose,
  position = { x: 0, y: 0 },
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [dropdownPosition, setDropdownPosition] = useState({ x: 0, y: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  // Ensure component is mounted (for SSR compatibility)
  useEffect(() => {
    setMounted(true);
  }, []);

  // Standard commands for controlling starter prompts
  const standardCommands: CommandItem[] = [
    { text: "Show predefined prompts", type: "standard" },
    { text: "Hide predefined prompts", type: "standard" }
  ];

  // Convert starter prompts to CommandItem format
  const starterCommands: CommandItem[] = commands.map(cmd => ({
    text: cmd,
    type: "starter" as const
  }));

  // Combine all commands
  const allCommands = [...standardCommands, ...starterCommands];

  // Debug logging
  console.log('[CommandDropdown] Props received:', {
    isVisible,
    commands,
    query,
    commandsLength: commands.length,
    allCommandsLength: allCommands.length
  });

  // Filter commands based on query
  const filteredCommands = allCommands.filter(command =>
    command.text.toLowerCase().includes(query.toLowerCase())
  );

  console.log('[CommandDropdown] Filtered commands:', filteredCommands);
  console.log('[CommandDropdown] Should render?', isVisible && filteredCommands.length > 0);

  // Reset selection when commands change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredCommands.length, query]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isVisible) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < filteredCommands.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev > 0 ? prev - 1 : filteredCommands.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            onSelect(filteredCommands[selectedIndex].text);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, filteredCommands, selectedIndex, onSelect, onClose]);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isVisible, onClose]);

  if (!isVisible || filteredCommands.length === 0 || !mounted) {
    return null;
  }

  const dropdownContent = (
    <div
      ref={dropdownRef}
      className="fixed z-[9999] w-full max-w-md"
      style={{
        top: 'auto',
        bottom: '120px',
        left: '50%',
        transform: 'translateX(-50%)',
        maxWidth: '600px',
      }}
    >
      <Card className="border shadow-lg bg-background/95 backdrop-blur-sm">
        <div className="p-2">
          <div className="text-xs text-muted-foreground mb-2 px-2">
            Starter Prompts {query && `(filtered by "${query}")`}
          </div>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {filteredCommands.map((command, index) => (
              <Button
                key={index}
                variant="ghost"
                className={`w-full text-left p-2 h-auto justify-start whitespace-normal ${
                  index === selectedIndex ? 'bg-accent' : ''
                }`}
                onClick={() => onSelect(command.text)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <div className="flex items-start gap-2 w-full">
                  <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium mt-0.5 ${
                    command.type === 'standard' 
                      ? 'bg-blue-100 text-blue-600' 
                      : 'bg-primary/10 text-primary'
                  }`}>
                    {command.type === 'standard' ? '⚙' : index - 1}
                  </div>
                  <span className={`text-sm leading-relaxed ${
                    command.type === 'standard' ? 'italic text-blue-600' : ''
                  }`}>
                    {command.text}
                  </span>
                </div>
              </Button>
            ))}
          </div>
          <div className="text-xs text-muted-foreground mt-2 px-2 border-t pt-2">
            Use ↑↓ to navigate, Enter to select, Esc to close
          </div>
        </div>
      </Card>
    </div>
  );

  return createPortal(dropdownContent, document.body);
};
