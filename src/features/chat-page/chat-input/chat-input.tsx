"use client";

import {
  ResetInputRows,
  onKeyDown,
  onKeyUp,
  useChatInputDynamicHeight,
} from "@/features/chat-page/chat-input/use-chat-input-dynamic-height";

import { AttachFile } from "@/features/ui/chat/chat-input-area/attach-file";
import {
  ChatInputActionArea,
  ChatInputForm,
  ChatInputPrimaryActionArea,
  ChatInputSecondaryActionArea,
} from "@/features/ui/chat/chat-input-area/chat-input-area";
import { ChatTextInput } from "@/features/ui/chat/chat-input-area/chat-text-input";
import { ImageInput } from "@/features/ui/chat/chat-input-area/image-input";
import { Microphone } from "@/features/ui/chat/chat-input-area/microphone";
import { StopChat } from "@/features/ui/chat/chat-input-area/stop-chat";
import { SubmitChat } from "@/features/ui/chat/chat-input-area/submit-chat";
import React, { useRef } from "react";
import { chatStore, useChat } from "../chat-store";
import { fileStore, useFileStore } from "./file/file-store";
import { PromptSlider } from "./prompt/prompt-slider";
import {
  speechToTextStore,
  useSpeechToText,
} from "./speech/use-speech-to-text";
import {
  textToSpeechStore,
  useTextToSpeech,
} from "./speech/use-text-to-speech";
import { Disclaimer } from "@/features/ui/disclaimer";
import { StarterPrompts } from "../starter-prompts";
import { CommandDropdown } from "../command-dropdown";
import { useState } from "react";

interface ChatInputProps {
  starterPrompts?: string[];
  personaName?: string;
  showStarterPrompts?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ 
  starterPrompts = [], 
  personaName = "", 
  showStarterPrompts = false 
}) => {
  const { loading, input, chatThreadId } = useChat();
  const [showCommandDropdown, setShowCommandDropdown] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [forceShowStarterPrompts, setForceShowStarterPrompts] = useState(false);
  const [forceHideStarterPrompts, setForceHideStarterPrompts] = useState(false);
  const [inputPosition, setInputPosition] = useState({ x: 0, y: 0 });
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Calculate final starter prompts visibility
  const shouldShowStarterPrompts = forceShowStarterPrompts || 
    (showStarterPrompts && !forceHideStarterPrompts);
  const { uploadButtonLabel } = useFileStore();
  const { isPlaying } = useTextToSpeech();
  const { isMicrophoneReady } = useSpeechToText();
  const { rows } = useChatInputDynamicHeight();

  const submitButton = React.useRef<HTMLButtonElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const submit = () => {
    if (formRef.current) {
      formRef.current.requestSubmit();
    }
  };

  const handlePromptClick = (prompt: string) => {
    // Set the input value and submit
    chatStore.updateInput(prompt);
    // Use a small delay to ensure the input is updated before submitting
    setTimeout(() => {
      submit();
    }, 100);
  };

  const handleInputChange = (value: string) => {
    chatStore.updateInput(value);
    
    console.log('[ChatInput] Input changed:', value);
    console.log('[ChatInput] Starter prompts length:', starterPrompts.length);
    
    // Check for "@" command trigger
    const lastAtIndex = value.lastIndexOf('@');
    console.log('[ChatInput] Last @ index:', lastAtIndex);
    
    if (lastAtIndex >= 0) {
      const textAfterAt = value.slice(lastAtIndex + 1);
      // Only show dropdown if "@" is at start of word or after space
      const charBeforeAt = lastAtIndex > 0 ? value[lastAtIndex - 1] : ' ';
      
      console.log('[ChatInput] Text after @:', textAfterAt);
      console.log('[ChatInput] Char before @:', charBeforeAt);
      
      if (charBeforeAt === ' ' || lastAtIndex === 0) {
        console.log('[ChatInput] Setting showCommandDropdown to true');
        setCommandQuery(textAfterAt);
        setShowCommandDropdown(true);
      } else {
        console.log('[ChatInput] Setting showCommandDropdown to false - not at word boundary');
        setShowCommandDropdown(false);
      }
    } else {
      console.log('[ChatInput] Setting showCommandDropdown to false - no @ found');
      setShowCommandDropdown(false);
    }
  };

  const handleCommandSelect = (command: string) => {
    console.log('[ChatInput] Command selected:', command);
    
    // Handle standard commands
    if (command === "Show predefined prompts") {
      setForceShowStarterPrompts(true);
      setForceHideStarterPrompts(false);
      // Clear the "@" from input
      const lastAtIndex = input.lastIndexOf('@');
      if (lastAtIndex >= 0) {
        const beforeAt = input.slice(0, lastAtIndex);
        chatStore.updateInput(beforeAt);
      }
      setShowCommandDropdown(false);
      return;
    }
    
    if (command === "Hide predefined prompts") {
      setForceShowStarterPrompts(false);
      setForceHideStarterPrompts(true);
      // Clear the "@" from input
      const lastAtIndex = input.lastIndexOf('@');
      if (lastAtIndex >= 0) {
        const beforeAt = input.slice(0, lastAtIndex);
        chatStore.updateInput(beforeAt);
      }
      setShowCommandDropdown(false);
      return;
    }
    
    // Handle starter prompt commands - replace "@query" with the selected prompt
    const lastAtIndex = input.lastIndexOf('@');
    if (lastAtIndex >= 0) {
      const beforeAt = input.slice(0, lastAtIndex);
      const newValue = beforeAt + command;
      chatStore.updateInput(newValue);
    }
    setShowCommandDropdown(false);
  };

  const handleCommandClose = () => {
    setShowCommandDropdown(false);
  };

  return (
    <>
    <StarterPrompts
      prompts={starterPrompts}
      onPromptClick={handlePromptClick}
      personaName={personaName}
      isVisible={shouldShowStarterPrompts}
    />
    <ChatInputForm
      ref={formRef}
      onSubmit={(e) => {
        e.preventDefault();
        chatStore.submitChat(e);
      }}
      status={uploadButtonLabel}
    >
      <div className="relative">
        <ChatTextInput
          onBlur={(e) => {
            if (e.currentTarget.value.replace(/\s/g, "").length === 0) {
              ResetInputRows();
            }
          }}
          onKeyDown={(e) => {
            onKeyDown(e, submit);
          }}
          onKeyUp={(e) => {
            onKeyUp(e);
          }}
          value={input}
          rows={rows}
          onChange={(e) => {
            handleInputChange(e.currentTarget.value);
          }}
        />
        <CommandDropdown
          isVisible={showCommandDropdown}
          commands={starterPrompts}
          query={commandQuery}
          onSelect={handleCommandSelect}
          onClose={handleCommandClose}
        />
      </div>
      <ChatInputActionArea>
        <ChatInputSecondaryActionArea>
          <AttachFile
            onClick={(formData) =>
              fileStore.onFileChange({ formData, chatThreadId })
            }
          />
          {/* <PromptSlider /> */}
          <ImageInput />
        </ChatInputSecondaryActionArea>
        <ChatInputPrimaryActionArea>
          {/* <ImageInput /> */}
          <Microphone
            startRecognition={() => speechToTextStore.startRecognition()}
            stopRecognition={() => speechToTextStore.stopRecognition()}
            isPlaying={isPlaying}
            stopPlaying={() => textToSpeechStore.stopPlaying()}
            isMicrophoneReady={isMicrophoneReady}
          />
          {loading === "loading" ? (
            <StopChat stop={() => chatStore.stopGeneratingMessages()} />
          ) : (
            <SubmitChat ref={submitButton} />
          )}
        </ChatInputPrimaryActionArea>
      </ChatInputActionArea>
    </ChatInputForm>
          <Disclaimer />
    </>
    
  );
};
