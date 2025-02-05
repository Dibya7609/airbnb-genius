
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openRouterApiKey = Deno.env.get('OPENROUTER_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl } = await req.json();
    console.log('Analyzing image:', imageUrl);

    // First request: Room Identification and Visual Description
    const analysisResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://lovable.ai',
        'X-Title': 'Lovable Real Estate Photo Analyzer',
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a professional real estate photographer analyzing photos. For each image:
            1. Identify the room/area (e.g., Kitchen, Living Room, Bedroom)
            2. Write a neutral, specific visual description in exactly 200 characters that focuses on key features, materials, layout.
            3. Avoid subjective terms like "amazing" or "best"
            4. Focus on visible elements only, no assumptions
            
            Format your response exactly as:
            Room/Area: [room type]
            Visual Description: [200-char description]`
          },
          {
            role: "user",
            content: `Analyze this real estate photo: ${imageUrl}`
          }
        ]
      }),
    });

    if (!analysisResponse.ok) {
      throw new Error(`OpenRouter API responded with status ${analysisResponse.status}`);
    }

    const analysisData = await analysisResponse.json();
    const analysis = analysisData.choices[0].message.content;
    
    // Parse the analysis to extract room and description
    const room = analysis.match(/Room\/Area: (.*)/i)?.[1]?.trim() || "Unspecified Room";
    const description = analysis.match(/Visual Description: (.*)/i)?.[1]?.trim() || "";

    // Second request: Generate Marketing Caption
    const captionResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://lovable.ai',
        'X-Title': 'Lovable Real Estate Caption Generator',
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a real estate caption writer. Create a caption that:
            1. Is exactly between 50-80 characters
            2. Includes the room type
            3. Focuses on the most striking visible feature
            4. Uses neutral, descriptive language
            5. Avoids promotional terms like "amazing" or "best"
            
            Example format:
            "Modern Kitchen with Marble Island" (correct length, includes room, specific feature)
            "Bright Living Room with Floor-to-Ceiling Windows" (correct length, includes room, specific feature)`
          },
          {
            role: "user",
            content: `Create a 50-80 character caption for this ${room} with these features: "${description}"`
          }
        ]
      }),
    });

    if (!captionResponse.ok) {
      throw new Error(`OpenRouter API responded with status ${captionResponse.status}`);
    }

    const captionData = await captionResponse.json();
    const caption = captionData.choices[0].message.content;

    console.log('Analysis complete:', {
      room,
      visualDescription: description,
      caption
    });

    return new Response(
      JSON.stringify({ 
        room,
        visualDescription: description,
        caption 
      }), 
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in generate-caption function:', error);
    return new Response(
      JSON.stringify({ error: error.message }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
