
import { serve } from "https://deno.land/std@0.200.0/http/server.ts";

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

        const openAIHeaders = {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        };

        // Step 1: Room Identification
        const roomResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: openAIHeaders,
          body: JSON.stringify({
            model: "gpt-4o",
            max_tokens: 1000,
            messages: [
              {
                role: "system",
                content: "You are a professional real estate photographer identifying room types."
              },
              {
                role: "user",
                content: [
                  { type: "text", text: "Identify the room type in this image." },
                  { type: "image_url", url: imageUrl }
                ]
              }
            ]
          })
        });

        if (!roomResponse.ok) {
          const errorText = await roomResponse.text();
          throw new Error(`Room identification failed: ${errorText}`);
        }

        const roomData = await roomResponse.json();
        let roomType = roomData.choices[0].message.content.trim();
        const roomMatch = roomData.choices[0].message.content.match(/Room:\s*([^.\n]+)/i);
        if (roomMatch) {
          roomType = roomMatch[1].trim();
        }

        console.log('Room identified as:', roomType);

        // Step 2: Visual Description
        const descriptionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: openAIHeaders,
          body: JSON.stringify({
            model: "gpt-4o",
            max_tokens: 1000,
            messages: [
              {
                role: "system",
                content: "Describe room features like furniture, lighting, and colors."
              },
              {
                role: "user",
                content: [
                  { type: "text", text: `Describe the key elements of this ${roomType}.` },
                  { type: "image_url", url: imageUrl }
                ]
              }
            ]
          })
        });

        if (!descriptionResponse.ok) {
          const errorText = await descriptionResponse.text();
          throw new Error(`Description failed: ${errorText}`);
        }

        const descriptionData = await descriptionResponse.json();
        const visualDescription = descriptionData.choices[0].message.content.trim();

        // Step 3: Caption Generation
        const captionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: openAIHeaders,
          body: JSON.stringify({
            model: "gpt-4o",
            max_tokens: 100,
            messages: [
              {
                role: "system",
                content: "Generate a short real estate caption."
              },
              {
                role: "user",
                content: [
                  { type: "text", text: `Create a concise caption for this ${roomType}.` },
                  { type: "image_url", url: imageUrl }
                ]
              }
            ]
          })
        });

        if (!captionResponse.ok) {
          const errorText = await captionResponse.text();
          throw new Error(`Caption failed: ${errorText}`);
        }

        const captionData = await captionResponse.json();
        const caption = captionData.choices[0].message.content.trim();

        results.push({
          imageUrl,
          room: roomType,
          visualDescription,
          caption,
          success: true
        });

      } catch (error) {
        console.error(`Error processing ${imageUrl}:`, error);
        results.push({
          imageUrl,
          error: error.message,
          success: false
        });
      }
    }

    return new Response(
      JSON.stringify({ results, metadata: { total: results.length } }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Fatal error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
