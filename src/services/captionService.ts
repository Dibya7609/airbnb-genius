
import { supabase } from "@/integrations/supabase/client";

export const generateCaption = async (imageUrl: string) => {
  try {
    const { data, error } = await supabase.functions.invoke('generate-caption', {
      body: { imageUrls: [imageUrl] },
    });

    if (error) {
      console.error('Error generating caption:', error);
      return null;
    }

    if (!data || !Array.isArray(data) || data.length === 0) {
      console.error('Invalid response format:', data);
      return null;
    }

    const result = data[0];
    return {
      room: result.room,
      visualDescription: result.visualDescription,
      caption: result.caption
    };
  } catch (error) {
    console.error(`Error generating caption for ${imageUrl}:`, error);
    return null;
  }
};

export const generateCaptionsForImages = async (
  images: File[]
): Promise<Array<{ imageUrl: string; room: string; visualDescription: string; caption: string }>> => {
  const imageUrls = images.map(image => URL.createObjectURL(image));
  
  try {
    const { data, error } = await supabase.functions.invoke('generate-caption', {
      body: { imageUrls },
    });

    if (error) {
      console.error('Error generating captions:', error);
      return [];
    }

    if (!data || !Array.isArray(data)) {
      console.error('Invalid response format:', data);
      return [];
    }

    return data.map((result, index) => ({
      imageUrl: imageUrls[index],
      room: result.room,
      visualDescription: result.visualDescription,
      caption: result.caption
    }));
  } catch (error) {
    console.error('Error generating captions:', error);
    return [];
  }
}
