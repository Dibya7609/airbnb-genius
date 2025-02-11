
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

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
    console.log('Received imageUrls:', imageUrls);

    if (!Array.isArray(imageUrls) || imageUrls.length === 0) {
      throw new Error("imageUrls must be a non-empty array");
    }

    const results = [];
    for (const imageUrl of imageUrls) {
      try {
        // First analysis: Room identification
        const roomAnalysis = await analyzeImage(imageUrl, {
          task: "room_identification",
          prompt: "Identify the room or area type in this real estate photo."
        });

        // Second analysis: Detailed features
        const detailedAnalysis = await analyzeImage(imageUrl, {
          task: "detailed_analysis",
          prompt: `This is a ${roomAnalysis.room}. Describe its key features.`,
          context: roomAnalysis.room
        });

        // Generate caption
        const caption = await generateCaption(roomAnalysis.room, detailedAnalysis.visualDescription);

        results.push({
          imageUrl,
          room: roomAnalysis.room,
          visualDescription: detailedAnalysis.visualDescription,
          caption,
          success: true
        });
      } catch (error) {
        console.error(`Error processing image ${imageUrl}:`, error);
        results.push({
          imageUrl,
          error: error.message,
          success: false
        });
      }
    }

    return new Response(
      JSON.stringify({
        results,
        metadata: {
          total: results.length,
          successful: results.filter(r => r.success).length
        }
      }),
      {
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

interface AnalysisOptions {
  task: 'room_identification' | 'detailed_analysis';
  prompt: string;
  context?: string;
}

async function analyzeImage(imageUrl: string, options: AnalysisOptions) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
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
          content: options.task === 'room_identification' 
            ? 'You are a real estate photographer. Identify the room type. Format: Room/Area: [type]'
            : `You are describing a ${options.context}. Write a 200-character description. Format: Visual Description: [description]`
        },
        {
          role: "user",
          content: `${options.prompt}\nImage: ${imageUrl}`
        }
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('Invalid API response');
  }

  if (options.task === 'room_identification') {
    const room = content.match(/Room\/Area:\s*(.+)/i)?.[1]?.trim();
    return { room: room || 'Unspecified', visualDescription: '' };
  } else {
    const description = content.match(/Visual Description:\s*(.+)/i)?.[1]?.trim();
    return { room: options.context || 'Unspecified', visualDescription: description || '' };
  }
}

async function generateCaption(room: string, description: string): Promise<string> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
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
          content: "Create a 50-80 character real estate caption including room type and one key feature."
        },
        {
          role: "user",
          content: `Room: ${room}\nFeatures: ${description}`
        }
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Caption API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.replace(/["']/g, '').trim() || 'Caption unavailable';
}
