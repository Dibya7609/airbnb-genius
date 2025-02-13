
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
    console.log('Processing image URLs:', imageUrls);

    if (!Array.isArray(imageUrls) || imageUrls.length === 0) {
      throw new Error("imageUrls must be a non-empty array");
    }

    const results = [];
    for (const imageUrl of imageUrls) {
      try {
        console.log(`Analyzing image: ${imageUrl}`);

        // Room identification with more specific prompt
        const roomAnalysis = await analyzeImage(imageUrl, {
          task: "room_identification",
          prompt: "You are a professional real estate photographer. Looking at this image, identify the specific room or area type. Be precise and specific in your identification. Respond with: Room/Area: [specific type]"
        });

        console.log('Room analysis result:', roomAnalysis);

        // Detailed visual analysis with more context
        const detailedAnalysis = await analyzeImage(imageUrl, {
          task: "detailed_analysis",
          prompt: `Analyze this ${roomAnalysis.room} and provide a visual description. Focus on key features, lighting, space, and design elements. Start your response with 'Visual Description:'`,
          context: roomAnalysis.room
        });

        console.log('Detailed analysis result:', detailedAnalysis);

        // Generate engaging caption
        const caption = await generateCaption(roomAnalysis.room, detailedAnalysis.visualDescription);
        console.log('Generated caption:', caption);

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

interface AnalysisOptions {
  task: 'room_identification' | 'detailed_analysis';
  prompt: string;
  context?: string;
}

async function analyzeImage(imageUrl: string, options: AnalysisOptions): Promise<{ room: string; visualDescription: string }> {
  console.log(`Starting ${options.task} for image:`, imageUrl);

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
            ? 'You are a professional real estate photographer. Identify the specific room or area type with precision.'
            : `You are describing a ${options.context}. Focus on distinctive features and architectural elements.`
        },
        {
          role: "user",
          content: `${options.prompt}\nImage: ${imageUrl}`
        }
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} - ${await response.text()}`);
  }

  const data = await response.json();
  console.log(`${options.task} API response:`, data);

  if (!data.choices?.[0]?.message?.content) {
    throw new Error('Invalid API response structure');
  }

  const content = data.choices[0].message.content;
  console.log(`Raw content for ${options.task}:`, content);

  if (options.task === 'room_identification') {
    // More flexible room extraction
    const roomMatch = content.match(/(?:room|area):\s*([^.\n]+)/i)?.[1]?.trim() ||
                     content.match(/this is (?:a|an)\s+([^.\n]+)/i)?.[1]?.trim() ||
                     content.split('\n')[0]?.trim();
    
    if (!roomMatch) {
      console.error('Failed to extract room from content:', content);
      throw new Error('Failed to extract room identification from response');
    }
    return { room: roomMatch, visualDescription: '' };
  } else {
    // More flexible visual description extraction
    const descriptionMatch = content.match(/visual description:\s*(.+)/is)?.[1]?.trim() ||
                           content.match(/description:\s*(.+)/is)?.[1]?.trim() ||
                           content.split('\n').slice(1).join(' ').trim() ||
                           content.trim();
    
    if (!descriptionMatch) {
      console.error('Failed to extract description from content:', content);
      throw new Error('Failed to extract visual description from response');
    }
    return { room: options.context || 'Unspecified', visualDescription: descriptionMatch };
  }
}

async function generateCaption(room: string, description: string): Promise<string> {
  console.log('Generating caption for:', { room, description });

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
          content: "Create an engaging, descriptive real estate caption that highlights the room type and key features."
        },
        {
          role: "user",
          content: `Create a compelling 50-80 character caption for this ${room}.\nKey features: ${description}`
        }
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Caption API error: ${response.status} - ${await response.text()}`);
  }

  const data = await response.json();
  console.log('Caption API response:', data);

  if (!data.choices?.[0]?.message?.content) {
    throw new Error('Invalid caption API response structure');
  }

  return data.choices[0].message.content.replace(/["']/g, '').trim();
}
