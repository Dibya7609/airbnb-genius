
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
            content: `You are a professional real estate photographer and interior designer. Analyze the image and provide:
            1. Room/Area identification (e.g., Kitchen, Living Room, etc.)
            2. A detailed visual description in exactly 200 characters or less, focusing on key features, materials, and layout.
            Format your response as:
            Room: [room type]
            Description: [200-char description]`
          },
          {
            role: "user",
            content: `Please analyze this real estate photo: ${imageUrl}`
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
    const room = analysis.match(/Room: (.*)/i)?.[1]?.trim() || "Unspecified Room";
    const description = analysis.match(/Description: (.*)/i)?.[1]?.trim() || "";

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
            content: `You are a professional real estate marketing expert. Create a compelling caption that:
            1. Is exactly between 50-80 characters
            2. Includes the room type
            3. Highlights the most striking feature
            4. Uses engaging but not overly promotional language`
          },
          {
            role: "user",
            content: `Create a 50-80 character caption for this ${room} with this description: "${description}"`
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
