
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

async function uploadImageAndGetUrl(file: File): Promise<string> {
  const timestamp = new Date().getTime();
  const fileExt = file.name.split('.').pop();
  const filePath = `${timestamp}-${Math.random().toString(36).substring(2)}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from('images')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    console.error('Error uploading image:', error);
    throw error;
  }

  const { data: { publicUrl } } = supabase.storage
    .from('images')
    .getPublicUrl(data.path);

  return publicUrl;
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
  const uploadedUrls: string[] = [];
  
  try {
    // Upload all images and get their public URLs
    const uploadPromises = images.map(image => uploadImageAndGetUrl(image));
    const publicUrls = await Promise.all(uploadPromises);
    
    const { data, error } = await supabase.functions.invoke<ApiResponse>('generate-caption', {
      body: { imageUrls: publicUrls },
    });

    if (error) {
      console.error('Function error:', error);
      return [];
    }

    return data?.results?.map((result, index) => ({
      ...result,
      imageUrl: publicUrls[index]
    })) || [];
  } catch (error) {
    console.error('Error generating captions:', error);
    for (const url of uploadedUrls) {
      try {
        const path = url.split('/').pop();
        if (path) {
          await supabase.storage.from('images').remove([path]);
        }
      } catch (e) {
        console.error('Error cleaning up uploaded image:', e);
      }
    }
    return [];
  }
}
