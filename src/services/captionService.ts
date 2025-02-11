
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
  console.log('Starting image upload for:', file.name);
  
  const timestamp = new Date().getTime();
  const fileExt = file.name.split('.').pop();
  const filePath = `${timestamp}-${Math.random().toString(36).substring(2)}.${fileExt}`;

  try {
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

    console.log('Successfully uploaded image:', data.path);

    const { data: { publicUrl } } = supabase.storage
      .from('images')
      .getPublicUrl(data.path);

    console.log('Generated public URL:', publicUrl);
    return publicUrl;
  } catch (error) {
    console.error('Failed to upload image:', error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }
}

export const generateCaption = async (imageUrl: string): Promise<CaptionResult | null> => {
  console.log('Generating caption for single image:', imageUrl);
  
  try {
    const { data, error } = await supabase.functions.invoke<ApiResponse>('generate-caption', {
      body: { imageUrls: [imageUrl] },
    });

    if (error) {
      console.error('Function error:', error);
      return null;
    }

    const result = data?.results?.[0];
    console.log('Caption generation result:', result);
    
    return result || null;
  } catch (error) {
    console.error('Error generating caption:', error);
    return null;
  }
};

export const generateCaptionsForImages = async (
  images: File[]
): Promise<CaptionResult[]> => {
  console.log('Starting caption generation for', images.length, 'images');
  
  const uploadedUrls: string[] = [];
  const results: CaptionResult[] = [];
  
  try {
    // Upload images sequentially to avoid overwhelming the storage
    for (const image of images) {
      try {
        const publicUrl = await uploadImageAndGetUrl(image);
        uploadedUrls.push(publicUrl);
      } catch (error) {
        console.error(`Failed to upload image ${image.name}:`, error);
        results.push({
          imageUrl: URL.createObjectURL(image),
          room: 'Upload Failed',
          visualDescription: '',
          caption: `Failed to upload: ${error.message}`,
          success: false,
          error: error.message
        });
      }
    }

    if (uploadedUrls.length === 0) {
      console.error('No images were successfully uploaded');
      return results;
    }

    console.log('Successfully uploaded images:', uploadedUrls);

    const { data, error } = await supabase.functions.invoke<ApiResponse>('generate-caption', {
      body: { imageUrls: uploadedUrls },
    });

    if (error) {
      console.error('Function invocation error:', error);
      throw error;
    }

    if (!data?.results) {
      console.error('Invalid response from function:', data);
      throw new Error('Invalid response from caption generation function');
    }

    console.log('Caption generation successful:', data.results);
    
    return data.results;
  } catch (error) {
    console.error('Error in caption generation process:', error);
    
    // Cleanup uploaded files in case of error
    for (const url of uploadedUrls) {
      try {
        const path = url.split('/').pop();
        if (path) {
          console.log('Cleaning up uploaded file:', path);
          await supabase.storage.from('images').remove([path]);
        }
      } catch (e) {
        console.error('Error cleaning up uploaded image:', e);
      }
    }

    // Return partial results if any, or error results for all images
    return results.length > 0 ? results : images.map(image => ({
      imageUrl: URL.createObjectURL(image),
      room: 'Error',
      visualDescription: '',
      caption: `Processing failed: ${error.message}`,
      success: false,
      error: error.message
    }));
  }
}
