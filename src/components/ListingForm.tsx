
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Upload } from 'lucide-react';
import { generateCaption } from '@/services/captionService';

interface PhotoContent {
  imageUrl: string;
  room: string;
  visualDescription: string;
}

const ListingForm = () => {
  const { toast } = useToast();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzedPhoto, setAnalyzedPhoto] = useState<PhotoContent | null>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) {
      return;
    }

    const file = e.target.files[0];
    setIsAnalyzing(true);

    try {
      const result = await generateCaption(URL.createObjectURL(file));
      
      if (!result || !result.success) {
        throw new Error(result?.error || 'Failed to analyze image');
      }

      setAnalyzedPhoto({
        imageUrl: URL.createObjectURL(file),
        room: result.room,
        visualDescription: result.visualDescription
      });
    } catch (error) {
      toast({
        title: "Error Analyzing Image",
        description: error.message || "There was an error analyzing your image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <Card className="p-6">
          <h2 className="text-2xl font-semibold mb-6">Analyze Room Image</h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Upload Room Image</label>
              <div className="flex items-center gap-4">
                <Button asChild variant="outline" className="w-full" disabled={isAnalyzing}>
                  <label className="cursor-pointer">
                    <Upload className="mr-2 h-4 w-4" />
                    {isAnalyzing ? 'Analyzing...' : 'Upload Image'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                      disabled={isAnalyzing}
                    />
                  </label>
                </Button>
              </div>
            </div>

            {isAnalyzing && (
              <div className="flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            )}
          </div>
        </Card>

        {analyzedPhoto && (
          <Card className="p-6">
            <h3 className="text-xl font-semibold mb-4">Analysis Results</h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-3 bg-secondary rounded-lg">
                <div className="aspect-video relative">
                  <img
                    src={analyzedPhoto.imageUrl}
                    alt="Analyzed room"
                    className="absolute inset-0 w-full h-full object-cover rounded-lg"
                  />
                </div>
                <div className="space-y-2">
                  <h5 className="font-medium">Room/Area</h5>
                  <p className="text-sm">{analyzedPhoto.room}</p>
                </div>
                <div className="space-y-2">
                  <h5 className="font-medium">Visual Description</h5>
                  <p className="text-sm">{analyzedPhoto.visualDescription}</p>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ListingForm;
