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
    console.log('Generating caption for image:', imageUrl);

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
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
            content: "You are a helpful assistant that generates engaging and accurate captions for real estate listing images. Focus on highlighting key features and amenities visible in the images."
          },
          {
            role: "user",
            content: `Please generate a descriptive caption for this real estate listing image: ${imageUrl}`
          }
        ]
      }),
    });

    const data = await response.json();
    console.log('OpenRouter API response:', data);

    const caption = data.choices[0].message.content;
    
    // Store the caption in the database
    const { data: insertData, error: insertError } = await supabaseAdmin.from('captions').insert([
      {
        image_url: imageUrl,
        caption: caption,
        user_id: req.headers.get('x-user-id')
      }
    ]);

    if (insertError) {
      console.error('Error storing caption:', insertError);
      throw insertError;
    }

    return new Response(JSON.stringify({ caption }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-caption function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});