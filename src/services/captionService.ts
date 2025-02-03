import { supabase } from "@/integrations/supabase/client";

export const generateCaption = async (imageUrl: string) => {
  try {
    const { data, error } = await supabase.functions.invoke('generate-caption', {
      body: { imageUrl },
    });

    if (error) {
      console.error('Error generating caption:', error);
      return null;
    }

    return data.caption;
  } catch (error) {
    console.error(`Error generating caption for ${imageUrl}:`, error);
    return null;
  }
};

export const generateCaptionsForImages = async (
  images: File[]
): Promise<Array<{ imageUrl: string; caption: string }>> => {
  const captions = [];
  
  for (const image of images) {
    const imageUrl = URL.createObjectURL(image);
    const caption = await generateCaption(imageUrl);
    if (caption) {
      captions.push({ imageUrl, caption });
    }
  }
  
  return captions;
};