import { ChatPage } from "@/features/chat-page/chat-page";
import { ChatHome } from "@/features/chat-home-page/chat-home";
import { FindAllChatDocuments } from "@/features/chat-page/chat-services/chat-document-service";
import { FindAllChatMessagesForCurrentUser } from "@/features/chat-page/chat-services/chat-message-service";
import { FindChatThreadForCurrentUser } from "@/features/chat-page/chat-services/chat-thread-service";
import { FindAllExtensionForCurrentUser } from "@/features/extensions-page/extension-services/extension-service";
import { FindAllPersonaForCurrentUser } from "@/features/persona-page/persona-services/persona-service";
import { AI_NAME, CHAT_DEFAULT_PERSONA } from "@/features/theme/theme-config";
import { DisplayError } from "@/features/ui/error/display-error";

export const metadata = {
  title: AI_NAME,
  description: AI_NAME,
};

interface HomeParams {
  params: {
    id: string;
  };
}

export default async function Home(props: HomeParams) {
  const { id } = props.params;
  const [chatResponse, chatThreadResponse, docsResponse, extensionResponse, personaResponse] =
    await Promise.all([
      FindAllChatMessagesForCurrentUser(id),
      FindChatThreadForCurrentUser(id),
      FindAllChatDocuments(id),
      FindAllExtensionForCurrentUser(),
      FindAllPersonaForCurrentUser(),
    ]);

  if (docsResponse.status !== "OK") {
    return <DisplayError errors={docsResponse.errors} />;
  }

  if (chatResponse.status !== "OK") {
    return <DisplayError errors={chatResponse.errors} />;
  }

  if (extensionResponse.status !== "OK") {
    return <DisplayError errors={extensionResponse.errors} />;
  }

  if (chatThreadResponse.status !== "OK") {
    return <DisplayError errors={chatThreadResponse.errors} />;
  }

  if (personaResponse.status !== "OK") {
    return <DisplayError errors={personaResponse.errors} />;
  }

  // Enhanced logic: Check for messages, persona, and documents
  const hasMessages = chatResponse.response.length > 0;
  const hasPersona = chatThreadResponse.response.personaMessage.trim() !== "" || 
    (chatThreadResponse.response.personaMessageTitle && 
     chatThreadResponse.response.personaMessageTitle !== CHAT_DEFAULT_PERSONA);
  const hasDocuments = docsResponse.response.length > 0;

  // Show ChatPage if chat contains ANY content (messages, persona, or documents)
  if (hasMessages || hasPersona || hasDocuments) {
    return (
      <ChatPage
        messages={chatResponse.response}
        chatThread={chatThreadResponse.response}
        chatDocuments={docsResponse.response}
        extensions={extensionResponse.response}
      />
    );
  }

  // Show ChatHome only for completely brand new chat threads (no content at all)
  return (
    <ChatHome
      personas={personaResponse.response}
      extensions={extensionResponse.response}
      chatThread={chatThreadResponse.response}
      messages={chatResponse.response}
      chatDocuments={docsResponse.response}
    />
  );
}
