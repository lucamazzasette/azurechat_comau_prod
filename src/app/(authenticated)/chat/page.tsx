import { CreateChatThread, FindUnusedChatThreadForCurrentUser } from "@/features/chat-page/chat-services/chat-thread-service";
import { DisplayError } from "@/features/ui/error/display-error";
import { redirect } from "next/navigation";

export default async function Home() {
  // Try to find an unused chat thread first
  let chatThreadResponse = await FindUnusedChatThreadForCurrentUser();
  
  // If no unused thread found, create a new one
  if (chatThreadResponse.status !== "OK") {
    chatThreadResponse = await CreateChatThread();
    if (chatThreadResponse.status !== "OK") {
      return <DisplayError errors={chatThreadResponse.errors} />;
    }
  }
  
  // Get chat thread
  const chatThread = chatThreadResponse.response;
  
  // Redirect to the specific chat thread instead of rendering ChatHome
  // This ensures consistent URLs and prevents multiple thread creation on refresh
  redirect(`/chat/${chatThread.id}`);
}
