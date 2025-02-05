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
    

  try {
    const { imageUrl } = await req.json();
    console.log('Generating caption for image:', imageUrl);

    // First request: Visual Description
    const visualDescResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://lovable.ai',
        'X-Title': 'Lovable Image Caption Generator',
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a professional real estate photographer and interior designer. Analyze the image and provide a detailed, professional description of what you see, focusing on architectural features, design elements, and notable aspects that would be relevant for a property listing."
          },
          {
            role: "user",
            content: `Please analyze this image and provide a detailed visual description: ${imageUrl}`
          }
        ]
      }),
    });

    if (!visualDescResponse.ok) {
      throw new Error(`OpenRouter API responded with status ${visualDescResponse.status}`);
    }

    const visualDescData = await visualDescResponse.json();
    const visualDescription = visualDescData.choices[0].message.content;

    // Second request: Marketing Caption
    const captionResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://lovable.ai',
        'X-Title': 'Lovable Image Caption Generator',
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a professional real estate marketing expert. Based on the visual description provided, create a compelling, concise marketing caption that highlights the key selling points and creates emotional appeal."
          },
          {
            role: "user",
            content: `Based on this description of the image: "${visualDescription}", please create an engaging marketing caption that would appeal to potential renters or buyers.`
          }
        ]
      }),
    });

    if (!captionResponse.ok) {
      throw new Error(`OpenRouter API responded with status ${captionResponse.status}`);
    }

    const captionData = await captionResponse.json();
    const caption = captionData.choices[0].message.content;

    console.log('Generated visual description:', visualDescription);
    console.log('Generated caption:', caption);

    return new Response(
      JSON.stringify({ 
        visualDescription, 
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