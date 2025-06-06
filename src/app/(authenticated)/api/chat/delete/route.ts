import { NextRequest, NextResponse } from "next/server";
import { SoftDeleteChatThreadForCurrentUser } from "@/features/chat-page/chat-services/chat-thread-service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { threadId } = body;

    if (!threadId) {
      return NextResponse.json(
        { error: "Thread ID is required" },
        { status: 400 }
      );
    }

    console.log(`[API] /api/chat/delete - Deleting thread: ${threadId}`);

    // Call the server function to perform the deletion
    const result = await SoftDeleteChatThreadForCurrentUser(threadId);

    if (result.status === "OK") {
      console.log(`[API] /api/chat/delete - Successfully deleted thread: ${threadId}`);
      return NextResponse.json({ 
        success: true, 
        message: "Thread deleted successfully" 
      });
    } else {
      console.error(`[API] /api/chat/delete - Failed to delete thread:`, result.errors);
      return NextResponse.json(
        { 
          error: "Failed to delete thread", 
          details: result.errors 
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error(`[API] /api/chat/delete - Error:`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
