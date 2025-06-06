"use client";

import { Button } from "@/features/ui/button";
import { LoadingIndicator } from "@/features/ui/loading";
import { Plus } from "lucide-react";
import { useFormStatus } from "react-dom";

interface NewChatProps {
  disabled?: boolean;
}

export const NewChat = ({ disabled = false }: NewChatProps) => {
  // Only use the form's pending state to determine loading
  const { pending } = useFormStatus();
  const isDisabled = pending || disabled;

  return (
    <Button
      type="submit"
      aria-disabled={isDisabled}
      disabled={isDisabled}
      size={"default"}
      className="flex gap-2"
      variant={"outline"}
    >
      {isDisabled ? <LoadingIndicator isLoading={true} /> : <Plus size={18} />}
      New Chat
    </Button>
  );
};
