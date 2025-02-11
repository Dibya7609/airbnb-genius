
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
    const { data, error } = await supabase.functions.invoke<ApiResponse>('generate-caption', {
      body: { imageUrls: [imageUrl] },
    });

    if (error) {
      console.error('Function error:', error);
      return null;
    }

    return data?.results?.[0] || null;
  } catch (error) {
    console.error('Error generating caption:', error);
    return null;
  }
};

export const generateCaptionsForImages = async (
  images: File[]
): Promise<CaptionResult[]> => {
  let createdImageUrls: string[] = [];
  
  try {
    createdImageUrls = images.map(image => URL.createObjectURL(image));
    
    const { data, error } = await supabase.functions.invoke<ApiResponse>('generate-caption', {
      body: { imageUrls: createdImageUrls },
    });

    if (error) {
      console.error('Function error:', error);
      return [];
    }

    return data?.results?.map((result, index) => ({
      ...result,
      imageUrl: createdImageUrls[index]
    })) || [];
  } catch (error) {
    console.error('Error generating captions:', error);
    return [];
  } finally {
    // Clean up object URLs to prevent memory leaks
    createdImageUrls.forEach(URL.revokeObjectURL);
  }
}
