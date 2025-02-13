
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

        // Step 1: Room Identification with improved prompt
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
                content: "You are a professional real estate photographer. Your task is to accurately identify the type of room or area shown in the image. Look for key indicators like furniture (beds, kitchen appliances, sofas), fixtures, and room layout. Be very precise in your identification. Format your response as 'Room: [type]'. Common room types include: Bedroom, Living Room, Kitchen, Bathroom, Dining Room, Office, etc."
              },
              {
                role: "user",
                content: `Look at this room carefully and identify what type of room it is based on the furniture and features visible. What is the specific room type?\nImage: ${imageUrl}`
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

        // Step 2: Visual Description with improved context
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
                content: "You are a professional real estate photographer creating detailed room descriptions. Focus on the actual features visible in the image, including furniture, lighting, colors, and architectural elements."
              },
              {
                role: "user",
                content: `Describe the key features and elements visible in this ${roomType}. Focus on the actual elements you can see in the image, including furniture, lighting, colors, and any distinctive features.\nImage: ${imageUrl}`
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
                content: "Create a brief, engaging real estate caption that accurately describes the room's key features."
              },
              {
                role: "user",
                content: `Create a compelling, accurate caption (50-80 characters) for this ${roomType} highlighting its main features.\nFeatures: ${visualDescription}`
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
