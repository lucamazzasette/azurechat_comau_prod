"use server";
import "server-only";

import { ServerActionResponse } from "@/features/common/server-action-response";
import { OpenAIDALLEInstance } from "@/features/common/services/openai";
import { uniqueId } from "@/features/common/util";
import { GetImageUrl, UploadImageToStore } from "../chat-image-service";
import { ChatThreadModel } from "../models";

export const GetDefaultExtensions = async (props: {
  chatThread: ChatThreadModel;
  userMessage: string;
  signal: AbortSignal;
}): Promise<ServerActionResponse<Array<any>>> => {
  const defaultExtensions: Array<any> = [];

  // Add image creation Extension
  defaultExtensions.push({
    type: "function",
    function: {
      function: async (args: any) =>
        await executeCreateImage(
          args,
          props.chatThread.id,
          props.userMessage,
          props.signal
        ),
      parse: (input: string) => JSON.parse(input),
      parameters: {
        type: "object",
        properties: {
          prompt: { type: "string" },
        },
      },
      description:
        "You must only use this tool if the user asks you to create an image. You must only use this tool once per message.",
      name: "create_img",
    },
  });

  // Add any other default Extension here

  return {
    status: "OK",
    response: defaultExtensions,
  };
};

// Extension for image creation using DALL-E
async function executeCreateImage(
  args: { prompt: string },
  threadId: string,
  userMessage: string,
  signal: AbortSignal
) {
  if (!args.prompt) {
    return "No prompt provided";
  }

  // Check the prompt is < 4000 characters (DALL-E 3)
  if (args.prompt.length >= 4000) {
    return "Prompt is too long, it must be less than 4000 characters";
  }

  const openAI = OpenAIDALLEInstance();

  let response;

  try {
    response = await openAI.images.generate(
      {
        model: "dall-e-3",
        prompt: userMessage,
        response_format: "b64_json",
      },
      {
        signal,
      }
    );
  } catch (error) {
    console.error("DALL-E API error:", error);
    return {
      error:
        "There was an error creating the image: " +
        error +
        "Return this message to the user and halt execution.",
    };
  }

  // Check the response is valid
  if (!response.data || !response.data[0] || response.data[0].b64_json === undefined) {
    console.error("Invalid DALL-E API response");
    return {
      error:
        "There was an error creating the image: Invalid API response received. Return this message to the user and halt execution.",
    };
  }

  // upload image to blob storage
  const imageName = `${uniqueId()}.png`;

  try {
    const uploadResult = await UploadImageToStore(
      threadId,
      imageName,
      Buffer.from(response.data[0].b64_json, "base64")
    );
    
    if (uploadResult.status !== "OK") {
      console.error("Image upload failed:", uploadResult.errors);
      return {
        error:
          "There was an error uploading the image: " +
          uploadResult.errors[0].message +
          " Return this message to the user and halt execution.",
      };
    }

    // Generate the URL
    let imageUrl: string;
    try {
      const urlResult = GetImageUrl(threadId, imageName);
      
      // Handle case where GetImageUrl might return a Promise
      if (urlResult && typeof urlResult === 'object' && 'then' in urlResult) {
        imageUrl = await urlResult;
      } else {
        imageUrl = urlResult;
      }
      
      // Convert to string if it's not already
      imageUrl = String(imageUrl);
      
      // Validate the URL was generated properly
      if (!imageUrl || imageUrl === "undefined" || imageUrl === "null" || imageUrl.includes("undefined") || imageUrl.includes("null")) {
        console.error("Invalid image URL generated");
        return {
          error:
            "There was an error generating the image URL. Please check your NEXTAUTH_URL environment variable. Return this message to the user and halt execution.",
        };
      }
    } catch (error) {
      console.error("Error generating image URL:", error);
      return {
        error:
          "There was an error generating the image URL: " + error + " Return this message to the user and halt execution.",
      };
    }

    const updated_response = {
      revised_prompt: response.data[0].revised_prompt,
      url: imageUrl,
    };
    
    return updated_response;
  } catch (error) {
    console.error("Image storage error:", error);
    return {
      error:
        "There was an error storing the image: " +
        error +
        "Return this message to the user and halt execution.",
    };
  }
}
