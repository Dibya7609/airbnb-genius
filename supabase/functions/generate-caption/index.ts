
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
if (!openAIApiKey) {
  throw new Error("OPENAI_API_KEY environment variable is not set.");
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

        // Common headers for all OpenAI requests
        const openAIHeaders = {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        };

        // Step 1: Room Identification with improved prompt
        console.log('Making request to OpenAI API...');
        const roomResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: openAIHeaders,
          body: JSON.stringify({
            model: "gpt-4-vision-preview",
            max_tokens: 1000,
            messages: [
              {
                role: "system",
                content: "You are a professional real estate photographer. Your task is to accurately identify the type of room or area shown in the image. Look for key indicators like furniture (beds, kitchen appliances, sofas), fixtures, and room layout. Be very precise in your identification. Format your response as 'Room: [type]'. Common room types include: Bedroom, Living Room, Kitchen, Bathroom, Dining Room, Office, etc."
              },
              {
                role: "user",
                content: [
                  { type: "text", text: "Look at this room carefully and identify what type of room it is based on the furniture and features visible. What is the specific room type?" },
                  { type: "image_url", url: imageUrl }
                ]
              }
            ]
          }),
        });

        if (!roomResponse.ok) {
          const errorText = await roomResponse.text();
          console.error('Room identification API error:', errorText);
          throw new Error(`Room identification failed: ${errorText}`);
        }

        const roomData = await roomResponse.json();
        console.log('Room identification response:', roomData);
        
        const roomType = roomData.choices[0].message.content
          .match(/Room:\s*([^.\n]+)/i)?.[1]?.trim() || 
          roomData.choices[0].message.content.trim();

        console.log('Step 2: Room identified as:', roomType);

        // Step 2: Visual Description with improved context
        const descriptionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: openAIHeaders,
          body: JSON.stringify({
            model: "gpt-4-vision-preview",
            max_tokens: 1000,
            messages: [
              {
                role: "system",
                content: "You are a professional real estate photographer creating detailed room descriptions. Focus on the actual features visible in the image, including furniture, lighting, colors, and architectural elements."
              },
              {
                role: "user",
                content: [
                  { type: "text", text: `Describe the key features and elements visible in this ${roomType}. Focus on the actual elements you can see in the image, including furniture, lighting, colors, and any distinctive features.` },
                  { type: "image_url", url: imageUrl }
                ]
              }
            ]
          }),
        });

        if (!descriptionResponse.ok) {
          const errorText = await descriptionResponse.text();
          console.error('Visual description API error:', errorText);
          throw new Error(`Visual description failed: ${errorText}`);
        }

        const descriptionData = await descriptionResponse.json();
        console.log('Visual description response:', descriptionData);
        
        const visualDescription = descriptionData.choices[0].message.content.trim();
        console.log('Step 3: Generated visual description');

        // Step 3: Generate Caption
        const captionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: openAIHeaders,
          body: JSON.stringify({
            model: "gpt-4-vision-preview",
            max_tokens: 1000,
            messages: [
              {
                role: "system",
                content: "Create a brief, engaging real estate caption that accurately describes the room's key features."
              },
              {
                role: "user",
                content: [
                  { type: "text", text: `Create a compelling, accurate caption (50-80 characters) for this ${roomType} highlighting its main features.` },
                  { type: "image_url", url: imageUrl }
                ]
              }
            ]
          }),
        });

        if (!captionResponse.ok) {
          const errorText = await captionResponse.text();
          console.error('Caption generation API error:', errorText);
          throw new Error(`Caption generation failed: ${errorText}`);
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
