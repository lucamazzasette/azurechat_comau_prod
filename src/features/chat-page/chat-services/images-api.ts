import {
  GetImageFromStore,
  GetThreadAndImageFromUrl,
} from "./chat-image-service";

export const ImageAPIEntry = async (request: Request): Promise<Response> => {
  const urlPath = request.url;

  try {
    let response = GetThreadAndImageFromUrl(urlPath);

    // Handle case where GetThreadAndImageFromUrl might return a Promise
    if (response && typeof response === 'object' && 'then' in response) {
      response = await response;
    }

    if (response.status !== "OK") {
      const errorMessage = response.errors && response.errors.length > 0 
        ? response.errors[0].message 
        : "Invalid image URL format";
      return new Response(errorMessage, { status: 404 });
    }

    const { threadId, imgName } = response.response;
    const imageData = await GetImageFromStore(threadId, imgName);
    
    if (imageData.status === "OK") {
      return new Response(imageData.response, {
        headers: { "content-type": "image/png" },
      });
    } else if (imageData.status === "NOT_FOUND") {
      const errorMessage = imageData.errors && imageData.errors.length > 0 
        ? imageData.errors[0].message 
        : "Image not found in storage";
      return new Response(errorMessage, { status: 404 });
    } else {
      // Handle ERROR status
      const errorMessage = imageData.errors && imageData.errors.length > 0 
        ? imageData.errors[0].message 
        : "Internal server error retrieving image";
      return new Response(errorMessage, { status: 500 });
    }
  } catch (error) {
    console.error("ImageAPIEntry error:", error);
    return new Response("Internal server error", { status: 500 });
  }
};
