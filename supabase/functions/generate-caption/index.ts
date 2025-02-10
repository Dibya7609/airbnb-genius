
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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrls } = await req.json();
    if (!Array.isArray(imageUrls) || imageUrls.length === 0) {
      throw new Error("imageUrls must be a non-empty array.");
    }

    const results = [];

    for (const imageUrl of imageUrls) {
      console.log('Analyzing image:', imageUrl);

      const analysisResult = await analyzeImage(imageUrl);
      console.log('Analysis Result:', analysisResult);

      const caption = await generateCaption(analysisResult.room, analysisResult.visualDescription);
      console.log('Generated Caption:', caption);

      results.push({
        imageUrl,
        room: analysisResult.room,
        visualDescription: analysisResult.visualDescription,
        caption
      });
    }

    return new Response(
      JSON.stringify(results), 
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in image analysis:', error);
    return new Response(
      JSON.stringify({ error: error.message }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function analyzeImage(imageUrl) {
  try {
    const analysisResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
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
      const errorText = await analysisResponse.text();
      throw new Error(`OpenRouter API responded with status ${analysisResponse.status}: ${errorText}`);
    }

    const analysisData = await analysisResponse.json();
    console.log('Analysis Data:', analysisData);

    const analysis = analysisData.choices[0].message.content;
    console.log('Analysis Content:', analysis);

    // Parse the analysis to extract room and description
    const room = analysis.match(/Room\/Area: (.*)/i)?.[1]?.trim() || "Unspecified Room";
    const description = analysis.match(/Visual Description: (.*)/i)?.[1]?.trim() || "";

    return { room, visualDescription: description };
  } catch (error) {
    console.error('Error in analyzeImage:', error);
    throw error;
  }
}

async function generateCaption(room, description) {
  try {
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
      const errorText = await captionResponse.text();
      throw new Error(`OpenRouter API responded with status ${captionResponse.status}: ${errorText}`);
    }

    const captionData = await captionResponse.json();
    console.log('Caption Data:', captionData);

    return captionData.choices[0].message.content;
  } catch (error) {
    console.error('Error in generateCaption:', error);
    throw error;
  }
}
