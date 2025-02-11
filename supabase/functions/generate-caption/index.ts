
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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrls } = await req.json();
    console.log('Received imageUrls:', imageUrls);

    if (!Array.isArray(imageUrls) || imageUrls.length === 0) {
      throw new Error("imageUrls must be a non-empty array");
    }

    // Validate image URLs
    for (const url of imageUrls) {
      if (!url || typeof url !== 'string') {
        throw new Error(`Invalid image URL: ${url}`);
      }
      try {
        new URL(url); // Validate URL format
      } catch {
        throw new Error(`Invalid URL format: ${url}`);
      }
    }

    const results = [];
    for (const imageUrl of imageUrls) {
      try {
        console.log(`Starting analysis for image: ${imageUrl}`);
        
        // First analysis: Room identification
        const roomAnalysis = await analyzeImage(imageUrl, {
          task: "room_identification",
          prompt: "Identify the room or area type in this real estate photo. Focus on clear indicators like fixtures, furniture, and layout."
        });
        console.log('Room analysis result:', roomAnalysis);

        if (!roomAnalysis.room) {
          throw new Error(`Failed to identify room for image: ${imageUrl}`);
        }

        // Second analysis: Detailed features
        const detailedAnalysis = await analyzeImage(imageUrl, {
          task: "detailed_analysis",
          prompt: `This is a ${roomAnalysis.room}. Describe its key features, materials, and layout in detail.`,
          context: roomAnalysis.room
        });
        console.log('Detailed analysis result:', detailedAnalysis);

        // Generate final caption
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
          error: error.message,
          success: false
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`Processed ${results.length} images, ${successCount} successful`);

    return new Response(JSON.stringify({ results, metadata: { total: results.length, successful: successCount } }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in main function:', error);
    return new Response(JSON.stringify({
      error: error.message,
      type: error.constructor.name,
      stack: error.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

interface AnalysisOptions {
  task: 'room_identification' | 'detailed_analysis';
  prompt: string;
  context?: string;
}

async function analyzeImage(imageUrl: string, options: AnalysisOptions) {
  try {
    console.log(`Analyzing image for ${options.task}:`, imageUrl);

    const systemMessage = options.task === 'room_identification' 
      ? `You are a professional real estate photographer. Your task is to:
         1. Identify the exact room/area type (e.g., Primary Bedroom, Guest Bathroom, Open-Concept Kitchen)
         2. Be specific and detailed in room identification
         3. Use standard real estate terminology
         
         Format your response EXACTLY as:
         Room/Area: [specific room type]`
      : `You are a professional real estate photographer describing a ${options.context}. Your task is to:
         1. Write a specific visual description in exactly 200 characters
         2. Focus on unique features, materials, and layout
         3. Use precise, descriptive terminology
         4. Avoid subjective or promotional language
         
         Format your response EXACTLY as:
         Visual Description: [your 200-character description]`;

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
          { role: "system", content: systemMessage },
          { role: "user", content: `${options.prompt}\nImage: ${imageUrl}` }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    console.log(`API response for ${options.task}:`, data);

    if (!data.choices?.[0]?.message?.content) {
      throw new Error('Invalid API response format');
    }

    const content = data.choices[0].message.content;
    
    if (options.task === 'room_identification') {
      const room = content.match(/Room\/Area:\s*(.+)/i)?.[1]?.trim();
      if (!room) {
        throw new Error('Failed to parse room from API response');
      }
      return { room, visualDescription: '' };
    } else {
      const description = content.match(/Visual Description:\s*(.+)/i)?.[1]?.trim();
      if (!description) {
        throw new Error('Failed to parse description from API response');
      }
      return { room: options.context || 'Unspecified', visualDescription: description };
    }
  } catch (error) {
    console.error(`Error in analyzeImage (${options.task}):`, error);
    throw error;
  }
}

async function generateCaption(room: string, description: string): Promise<string> {
  try {
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
            content: `Create a specific, compelling real estate caption that:
            1. Is exactly between 50-80 characters
            2. Includes the specific room type
            3. Highlights one standout feature
            4. Uses clear, descriptive language
            5. Avoids promotional terms
            
            Bad example: "Amazing kitchen with great features"
            Good example: "Modern Kitchen with Waterfall Marble Island"
            Good example: "Primary Bedroom Suite with Mountain-View Windows"`
          },
          {
            role: "user",
            content: `Room Type: ${room}\nFeatures: ${description}\n\nCreate a specific, compelling caption.`
          }
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Caption API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Caption API response:', data);

    if (!data.choices?.[0]?.message?.content) {
      throw new Error('Invalid caption API response format');
    }

    const caption = data.choices[0].message.content
      .replace(/["']/g, '')
      .trim();

    if (caption.length < 50 || caption.length > 80) {
      console.warn(`Caption length (${caption.length}) outside desired range: "${caption}"`);
    }

    return caption;
  } catch (error) {
    console.error('Error in generateCaption:', error);
    throw error;
  }
}
