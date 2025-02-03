import axios from 'axios';

const DEEPSEEK_API_URL = 'https://api.deepseek.ai/generate-caption';

export const generateCaption = async (imageUrl: string, apiKey: string) => {
  try {
    const response = await axios.post(
      DEEPSEEK_API_URL,
      {
        image_url: imageUrl,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data.caption;
  } catch (error) {
    console.error(`Error generating caption for ${imageUrl}:`, error);
    return null;
  }
};

export const generateCaptionsForImages = async (
  images: File[],
  apiKey: string
): Promise<Array<{ imageUrl: string; caption: string }>> => {
  const captions = [];
  
  for (const image of images) {
    const imageUrl = URL.createObjectURL(image);
    const caption = await generateCaption(imageUrl, apiKey);
    if (caption) {
      captions.push({ imageUrl, caption });
    }
  }
  
  return captions;
};