
import { supabase } from "@/integrations/supabase/client";

interface CaptionResult {
  imageUrl: string;
  room: string;
  visualDescription: string;
  caption: string;
  success: boolean;
  error?: string;
}

interface ApiResponse {
  results: CaptionResult[];
  metadata: {
    total: number;
    successful: number;
  };
}

export const generateCaption = async (imageUrl: string): Promise<CaptionResult | null> => {
  try {
    console.log('Generating caption for image:', imageUrl);

    const { data, error } = await supabase.functions.invoke<ApiResponse>('generate-caption', {
      body: { imageUrls: [imageUrl] },
    });

    if (error) {
      console.error('Supabase function error:', error);
      throw error;
    }

    if (!data?.results?.[0]) {
      console.error('Invalid response format:', data);
      throw new Error('Invalid response format from caption service');
    }

    const result = data.results[0];
    if (!result.success) {
      console.error('Caption generation failed:', result.error);
      throw new Error(result.error || 'Caption generation failed');
    }

    return result;
  } catch (error) {
    console.error('Error in generateCaption:', error);
    return null;
  }
};

export const generateCaptionsForImages = async (
  images: File[]
): Promise<CaptionResult[]> => {
  try {
    console.log('Generating captions for images:', images.length);
    
    const imageUrls = images.map(image => URL.createObjectURL(image));
    
    const { data, error } = await supabase.functions.invoke<ApiResponse>('generate-caption', {
      body: { imageUrls },
    });

    if (error) {
      console.error('Supabase function error:', error);
      throw error;
    }

    if (!data?.results) {
      console.error('Invalid response format:', data);
      throw new Error('Invalid response format from caption service');
    }

    console.log('Caption generation results:', data.metadata);
    
    return data.results.map((result, index) => ({
      ...result,
      imageUrl: imageUrls[index]
    }));
  } catch (error) {
    console.error('Error in generateCaptionsForImages:', error);
    return [];
  }
}
