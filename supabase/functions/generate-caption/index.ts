import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openRouterApiKey = Deno.env.get('OPENROUTER_API_KEY');
if (!openRouterApiKey) {
  throw new Error("OPENROUTER_API_KEY environment variable is not set.");
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Enhanced image analysis function
async function analyzeImage(imageUrl: string) {
  try {
    console.log('Analyzing image:', imageUrl);

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://lovable.ai',
        'X-Title': 'Lovable Real Estate Analyzer',
      },
      body: JSON.stringify({
        model: "qwen/qwen-vl-plus:free",
        messages: [
          {
            role: "system",
            content: `You are a professional real estate photo analyzer. For each image:
            1. Identify the room type (e.g., Kitchen, Living Room, Bedroom, Bathroom, etc.).
            2. Provide a detailed visual description of the room in exactly 200 characters.
            3. Focus on visible elements like furniture, layout, lighting, and materials.
            4. Do not make assumptions about things not visible in the image.
            
            Respond in this EXACT format:
            Room/Area: [room type]
            Visual Description: [200-character description]`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this real estate photo and provide the room type and visual description:"
              },
              {
                type: "image_url",
                image_url: {
                  url: imageUrl
                }
              }
            ]
          }
        ]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API error:', errorText);
      throw new Error(`OpenRouter API responded with status ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('Analysis response:', data);

    const analysisText = data.choices[0].message.content;
    console.log('Analysis content:', analysisText);

    // Parse the response
    const roomMatch = analysisText.match(/Room\/Area:\s*(.+)/i);
    const descMatch = analysisText.match(/Visual Description:\s*(.+)/i);

    if (!roomMatch || !descMatch) {
      throw new Error("Failed to parse analysis response. Invalid format.");
    }

    return {
      room: roomMatch[1].trim(),
      visualDescription: descMatch[1].trim()
    };

  } catch (error) {
    console.error('Error in analyzeImage:', error);
    throw new Error(`Image analysis failed: ${error.message}`);
  }
}

// Enhanced caption generation
async function generateCaption(room: string, description: string) {
  try {
    console.log('Generating caption for room:', room, 'with description:', description);

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://lovable.ai',
        'X-Title': 'Lovable Caption Generator',
      },
      body: JSON.stringify({
        model: "qwen/qwen-vl-plus:free",
        messages: [
          {
            role: "system",
            content: `You are a real estate caption writer. Create a caption that:
            1. Is exactly between 50-80 characters.
            2. Includes the room type.
            3. Focuses on the most striking visible feature.
            4. Uses neutral, descriptive language.
            
            Example: "Modern Kitchen with Marble Island Countertop"`
          },
          {
            role: "user",
            content: `Room: ${room}\nFeatures: ${description}\nCreate a caption:`
          }
        ]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API error:', errorText);
      throw new Error(`OpenRouter API responded with status ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('Caption response:', data);

    const caption = data.choices[0].message.content
      .replace(/["']/g, '')
      .trim()
      .substring(0, 80); // Ensure length limit

    return caption || "No caption generated";

  } catch (error) {
    console.error('Error in generateCaption:', error);
    throw new Error(`Caption generation failed: ${error.message}`);
  }
}

// Keep the rest of your serve() handler the same
// ... (your existing server setup and processing logic)
