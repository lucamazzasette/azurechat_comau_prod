# Enhanced Image Generation with JSON API

This document describes the enhanced image generation capabilities implemented in the Azure Chat application.

## Overview

The application now supports advanced image generation and editing features using Azure OpenAI DALL-E with JSON-based API calls instead of form-data, providing better performance and more options.

## Features

### 1. Enhanced Image Generation (`generate_image`)

Generate multiple images with custom sizes and quality settings:

```json
{
  "body": {
    "prompt": "girl driving a sport car",
    "n": 4,
    "size": "1600x900",
    "quality": "hd",
    "style": "vivid"
  }
}
```

**Parameters:**
- `prompt` (required): Text description of the image to generate
- `n` (optional): Number of images to generate (1-4, default: 1)
- `size` (optional): Image size - supports standard and custom sizes:
  - `1024x1024` (default)
  - `1792x1024`
  - `1024x1792`
  - `1600x900` (custom widescreen)
  - `1920x1080` (custom HD)
- `quality` (optional): Image quality (`standard`, `hd`, `medium`)
- `style` (optional): Image style (`vivid`, `natural`)

### 2. Image Editing (`edit_image`)

Edit existing images based on text prompts:

```json
{
  "body": {
    "prompt": "add racing stripes",
    "image_url": "https://example.com/image.png",
    "n": 2,
    "size": "1024x1024",
    "quality": "hd"
  }
}
```

**Parameters:**
- `prompt` (required): Description of desired changes
- `image_url` (required): URL of the image to edit
- `mask_url` (optional): URL of mask image for selective editing
- `n` (optional): Number of edited images to generate (1-4)
- `size` (optional): Size of edited image
- `quality` (optional): Quality of edited image

### 3. Legacy Support (`create_img`)

The original `create_img` function is maintained for backward compatibility.

## Environment Variables

### Required Configuration

```env
# Enhanced GPT Image model configuration (primary)
AZURE_OPENAI_GPT_IMAGE_API_KEY=your-gpt-image-api-key
AZURE_OPENAI_GPT_IMAGE_API_INSTANCE_NAME=your-gpt-image-instance
AZURE_OPENAI_GPT_IMAGE_API_ENDPOINT=https://your-gpt-image-instance.cognitiveservices.azure.com
AZURE_OPENAI_GPT_IMAGE_API_DEPLOYMENT_NAME=gpt-image-1
AZURE_OPENAI_GPT_IMAGE_API_VERSION=2025-04-01-preview

# Legacy DALL-E configuration (fallback)
AZURE_OPENAI_DALLE_API_KEY=your-dalle-api-key
AZURE_OPENAI_DALLE_API_INSTANCE_NAME=your-dalle-instance
AZURE_OPENAI_DALLE_API_DEPLOYMENT_NAME=dall-e-3
AZURE_OPENAI_DALLE_API_VERSION=2023-12-01-preview
```

### Key Environment Variable Usage

The `AZURE_OPENAI_GPT_IMAGE_API_*` variables are used for enhanced features:

1. **URL Construction**: Uses `cognitiveservices.azure.com` domain instead of `openai.azure.com`
2. **Authentication**: Combined with API key for requests  
3. **Service Configuration**: Identifies the specific GPT Image model deployment
4. **Enhanced Features**: Supports custom sizes (1600x900, 1920x1080), multiple images, and advanced quality settings

## API Implementation

### JSON-Based Approach

The implementation uses pure JSON payloads instead of form-data:

- **Simpler**: No multipart encoding complexity
- **Faster**: More efficient serialization
- **Type-safe**: Better TypeScript support
- **Cacheable**: Standard HTTP JSON requests

### Error Handling

Comprehensive error handling with user-friendly messages:

```typescript
try {
  // API call
} catch (error) {
  const errorMessage = error.response?.data?.error?.message || 
                      error.message || 
                      "Unknown error occurred";
  return { error: errorMessage + " Please try again." };
}
```

### Multiple Image Support

Handles multiple image generation efficiently:

```typescript
// Generate multiple images sequentially for reliability
for (let i = 0; i < n; i++) {
  const requestBody = {
    prompt: prompt,
    n: 1, // One image per request for reliability
    size: size,
    quality: quality,
    style: style,
    output_format: "b64_json"
  };
  
  const response = await axios.post(url, requestBody, {
    headers: { 'Api-Key': apiKey, 'Content-Type': 'application/json' }
  });
}
```

## Usage Examples

### Chat Interface Usage

**Generate multiple widescreen images:**
```
"Generate 4 images of a futuristic city in 1600x900 resolution with high quality"
```

**Edit an existing image:**
```
"Edit this image to add a sunset background: [image_url]"
```

**Custom quality and style:**
```
"Create a natural style portrait in HD quality"
```

## Performance Benefits

1. **Reduced Dependencies**: Only requires `axios` instead of `form-data`
2. **Better Error Messages**: Direct JSON error responses
3. **Type Safety**: Full TypeScript support
4. **Caching**: Standard HTTP caching works better with JSON
5. **Debugging**: Easier to log and inspect JSON payloads

## Migration from Legacy

Existing `create_img` calls continue to work unchanged. New features are available through:

- `generate_image`: For enhanced generation with multiple images and custom sizes
- `edit_image`: For image editing capabilities

The system automatically detects and uses the appropriate function based on the request parameters.
