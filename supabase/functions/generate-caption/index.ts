
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openRouterApiKey = Deno.env.get('OPENROUTER_API_KEY');
if (!openRouterApiKey) {
  throw new Error("OPENROUTER_API_KEY environment variable is not set.");
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrls } = await req.json();
    console.log('Processing image URLs:', imageUrls);

    if (!Array.isArray(imageUrls) || imageUrls.length === 0) {
      throw new Error("imageUrls must be a non-empty array");
    }

    const results = [];
    for (const imageUrl of imageUrls) {
      try {
        console.log('Step 1: Starting analysis for image:', imageUrl);

        // Step 1: Room Identification
        const roomResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openRouterApiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://lovable.ai',
            'X-Title': 'Lovable Real Estate Photo Analyzer',
          },
          body: JSON.stringify({
            model: "qwen/qwen-vl-plus:free",
            messages: [
              {
                role: "system",
                content: "You are a professional real estate photographer identifying room types. Respond ONLY with the room type in format: 'Room: [type]'"
              },
              {
                role: "user",
                content: `What type of room is shown in this image?\nImage: ${imageUrl}`
              }
            ],
          }),
        });

        if (!roomResponse.ok) {
          throw new Error(`Room identification failed: ${await roomResponse.text()}`);
        }

        const roomData = await roomResponse.json();
        console.log('Room identification response:', roomData);
        
        const roomType = roomData.choices[0].message.content
          .match(/Room:\s*([^.\n]+)/i)?.[1]?.trim() || 
          roomData.choices[0].message.content.trim();

        console.log('Step 2: Room identified as:', roomType);

        // Step 2: Visual Description
        const descriptionResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openRouterApiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://lovable.ai',
            'X-Title': 'Lovable Real Estate Photo Analyzer',
          },
          body: JSON.stringify({
            model: "qwen/qwen-vl-plus:free",
            messages: [
              {
                role: "system",
                content: `You are describing a ${roomType}. Provide a detailed description of the space and its features.`
              },
              {
                role: "user",
                content: `Describe this ${roomType}'s key features, focusing on design, lighting, and notable elements.\nImage: ${imageUrl}`
              }
            ],
          }),
        });

        if (!descriptionResponse.ok) {
          throw new Error(`Visual description failed: ${await descriptionResponse.text()}`);
        }

        const descriptionData = await descriptionResponse.json();
        console.log('Visual description response:', descriptionData);
        
        const visualDescription = descriptionData.choices[0].message.content.trim();
        console.log('Step 3: Generated visual description');

        // Step 3: Generate Caption
        const captionResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openRouterApiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://lovable.ai',
            'X-Title': 'Lovable Real Estate Caption Generator',
          },
          body: JSON.stringify({
            model: "qwen/qwen-vl-plus:free",
            messages: [
              {
                role: "system",
                content: "Create a brief, engaging real estate caption (50-80 characters) highlighting key features."
              },
              {
                role: "user",
                content: `Create a compelling caption for this ${roomType}.\nFeatures: ${visualDescription}`
              }
            ],
          }),
        });

        if (!captionResponse.ok) {
          throw new Error(`Caption generation failed: ${await captionResponse.text()}`);
        }

        const captionData = await captionResponse.json();
        console.log('Caption generation response:', captionData);
        
        const caption = captionData.choices[0].message.content.trim();
        console.log('Step 4: Generated final caption');

        results.push({
          imageUrl,
          room: roomType,
          visualDescription,
          caption,
          success: true
        });

        console.log('Successfully processed image:', {
          imageUrl,
          room: roomType,
          visualDescription: visualDescription.substring(0, 100) + '...',
          caption
        });

      } catch (error) {
        console.error(`Error processing image ${imageUrl}:`, error);
        results.push({
          imageUrl,
          error: `Failed to analyze image: ${error.message}`,
          success: false,
          room: 'Unknown',
          visualDescription: '',
          caption: ''
        });
      }
    }

    const response = {
      results,
      metadata: {
        total: results.length,
        successful: results.filter(r => r.success).length
      }
    };

    console.log('Final response:', response);

    return new Response(
      JSON.stringify(response),
      {
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
      }
    );
  } catch (error) {
    console.error('Fatal error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
