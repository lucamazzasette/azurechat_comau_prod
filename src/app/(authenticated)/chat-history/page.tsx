import { ChatHistoryPage } from "@/features/chat-history-page/chat-history-page";
import { FindAllChatThreadForCurrentUser } from "@/features/chat-page/chat-services/chat-thread-service";
import { DisplayError } from "@/features/ui/error/display-error";

export const dynamic = "force-dynamic";

export default async function Page() {
  const chatHistoryResponse = await FindAllChatThreadForCurrentUser();
  
  if (chatHistoryResponse.status !== "OK") {
    return <DisplayError errors={chatHistoryResponse.errors} />;
  }

  return <ChatHistoryPage threads={chatHistoryResponse.response} />;
}
