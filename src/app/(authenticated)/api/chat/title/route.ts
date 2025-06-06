"use server";

import { getCurrentUser, userHashedId } from "@/features/auth-page/helpers";
import { UpdateChatTitle } from "@/features/chat-page/chat-services/chat-thread-service";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // Ensure user is authenticated
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { chatThreadId, title } = body;

    // Validate required fields
    if (!chatThreadId || !title) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Call the existing server action to update the title
    const response = await UpdateChatTitle(chatThreadId, title);

    // Return the response
    return NextResponse.json(response);
  } catch (error) {
    console.error("Error updating chat title:", error);
    return NextResponse.json(
      { error: "Failed to update chat title" },
      { status: 500 }
    );
  }
}
