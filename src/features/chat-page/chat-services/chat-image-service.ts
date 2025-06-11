"use server";
import "server-only";

import { ServerActionResponse } from "@/features/common/server-action-response";
import { GetBlob, UploadBlob } from "../../common/services/azure-storage";

const IMAGE_CONTAINER_NAME = "images";
const IMAGE_API_PATH = process.env.NEXTAUTH_URL + "/api/images";

export const GetBlobPath = async (threadId: string | any, blobName: string | any): Promise<string> => {
  // Ensure threadId and blobName are strings, not Promises
  let resolvedThreadId = threadId;
  let resolvedBlobName = blobName;
  
  // Handle case where parameters might be Promise-wrapped
  if (threadId && typeof threadId === 'object' && 'then' in threadId) {
    resolvedThreadId = await threadId;
  }
  
  if (blobName && typeof blobName === 'object' && 'then' in blobName) {
    resolvedBlobName = await blobName;
  }
  
  // Convert to strings for safety
  resolvedThreadId = String(resolvedThreadId);
  resolvedBlobName = String(resolvedBlobName);
  
  return `${resolvedThreadId}/${resolvedBlobName}`;
};

export const UploadImageToStore = async (
  threadId: string,
  fileName: string,
  imageData: Buffer
): Promise<ServerActionResponse<string>> => {
  return await UploadBlob(
    IMAGE_CONTAINER_NAME,
    `${threadId}/${fileName}`,
    imageData
  );
};

export const GetImageFromStore = async (
  threadId: string,
  fileName: string
): Promise<ServerActionResponse<ReadableStream>> => {
  // Ensure threadId and fileName are strings, not Promises
  let resolvedThreadId = threadId;
  let resolvedFileName = fileName;
  
  // Handle case where parameters might be Promise-wrapped
  if (threadId && typeof threadId === 'object' && 'then' in threadId) {
    resolvedThreadId = await threadId;
  }
  
  if (fileName && typeof fileName === 'object' && 'then' in fileName) {
    resolvedFileName = await fileName;
  }
  
  // Convert to strings for safety
  resolvedThreadId = String(resolvedThreadId);
  resolvedFileName = String(resolvedFileName);
  
  const blobPath = await GetBlobPath(resolvedThreadId, resolvedFileName);
  
  return await GetBlob(IMAGE_CONTAINER_NAME, blobPath);
};

export const GetImageUrl = (threadId: string, fileName: string): string => {
  // Validate inputs
  if (!threadId || !fileName) {
    console.error("GetImageUrl: Missing threadId or fileName");
    return "";
  }

  // Check if NEXTAUTH_URL is defined
  if (!process.env.NEXTAUTH_URL) {
    console.error("NEXTAUTH_URL environment variable is not defined");
    return "";
  }

  // add threadId and fileName as query parameters t and img respectively
  const params = `?t=${encodeURIComponent(threadId)}&img=${encodeURIComponent(fileName)}`;
  const fullUrl = `${IMAGE_API_PATH}${params}`;
  
  // Final validation
  if (fullUrl.includes("undefined") || fullUrl.includes("null")) {
    console.error("Invalid URL constructed");
    return "";
  }
  
  return fullUrl;
};

export const GetThreadAndImageFromUrl = (
  urlString: string
): ServerActionResponse<{ threadId: string; imgName: string }> => {
  try {
    // Get threadId and img from query parameters t and img
    const url = new URL(urlString);
    const threadId = url.searchParams.get("t");
    const imgName = url.searchParams.get("img");

    // Check if threadId and img are valid
    if (!threadId || !imgName) {
      return {
        status: "ERROR",
        errors: [
          {
            message:
              "Invalid URL, threadId and/or imgName not formatted correctly. Expected format: /api/images?t=threadId&img=imageName",
          },
        ],
      };
    }

    return {
      status: "OK",
      response: {
        threadId,
        imgName,
      },
    };
  } catch (error) {
    console.error("Error parsing image URL:", error);
    return {
      status: "ERROR",
      errors: [
        {
          message: "Invalid URL format: " + String(error),
        },
      ],
    };
  }
};
