import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Upload, MapPin, FileText, Sparkles } from 'lucide-react';

interface GeneratedContent {
  title: string;
  description: string;
  photoDescriptions: string[];
  neighborhood: {
    description: string;
    attractions: Array<{
      name: string;
      distance: string;
      duration: string;
      type: 'attraction' | 'restaurant' | 'bar';
    }>;
  };
  directions: string;
}

const ListingForm = () => {
  const { toast } = useToast();
  const [images, setImages] = useState<File[]>([]);
  const [address, setAddress] = useState('');
  const [knowledgeBase, setKnowledgeBase] = useState<File | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setImages(Array.from(e.target.files));
    }
  };

  const handleDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setKnowledgeBase(e.target.files[0]);
    }
  };

  const generateContent = async () => {
    if (!address || images.length === 0 || !knowledgeBase) {
      toast({
        title: "Missing Information",
        description: "Please provide all required information before generating content.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    
    // Simulated API call - replace with actual AI integration
    setTimeout(() => {
      setGeneratedContent({
        title: "Serene Beachfront Haven - Modern Luxury Meets Ocean Views",
        description: `Experience Paradise at Your Doorstep

Your Property:
Wake up to the gentle sound of waves in this stunning beachfront villa. Floor-to-ceiling windows frame breathtaking ocean views, while modern architecture seamlessly blends indoor and outdoor living. The open-concept design creates an airy, light-filled space perfect for both relaxation and entertainment.

Guest Access:
✓ Private beach access
✓ Fully equipped gourmet kitchen
✓ Heated infinity pool
✓ Smart home features
✓ Dedicated workspace
✓ High-speed WiFi throughout

Interaction with Guests:
Your privacy is our priority. Our 24/7 concierge service is just a message away, ready to assist with anything from restaurant reservations to local experiences. We'll greet you personally at check-in and remain available throughout your stay while respecting your space.

Other Details to Note:
• Self check-in available with smart locks
• Daily housekeeping included
• Beach essentials provided
• Pet-friendly (with prior approval)
• Quiet hours after 10 PM
• Enhanced cleaning protocol following all safety guidelines`,
        photoDescriptions: [
          "Spacious living room with panoramic ocean views and modern furnishings",
          "Gourmet kitchen featuring high-end appliances and breakfast bar",
          "Master bedroom suite with private balcony and ocean vistas"
        ],
        neighborhood: {
          description: "Located in the prestigious Palm Beach area, known for its pristine beaches and upscale dining. A perfect blend of privacy and convenience, with easy access to local attractions.",
          attractions: [
            {
              name: "Palm Beach Boardwalk",
              distance: "0.3 miles",
              duration: "5 minutes",
              type: "attraction"
            },
            {
              name: "Ocean Breeze Restaurant",
              distance: "0.5 miles",
              duration: "8 minutes",
              type: "restaurant"
            },
            {
              name: "Sunset Lounge",
              distance: "0.7 miles",
              duration: "12 minutes",
              type: "bar"
            }
          ]
        },
        directions: "From Palm Beach International Airport (PBI): Take I-95 South to Palm Beach Lakes Blvd. Turn east and continue for 3 miles. Turn right on Ocean Drive. The property will be on your left."
      });
      setIsGenerating(false);
    }, 3000);
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <Card className="p-6">
          <h2 className="text-2xl font-semibold mb-6">Create Your Airbnb Listing</h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Property Images</label>
              <div className="flex items-center gap-4">
                <Button asChild variant="outline" className="w-full">
                  <label className="cursor-pointer">
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Images
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                  </label>
                </Button>
                {images.length > 0 && (
                  <span className="text-sm text-muted-foreground">
                    {images.length} images selected
                  </span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Property Address</label>
              <div className="flex items-center gap-4">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Enter your property address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Knowledge Base Document</label>
              <div className="flex items-center gap-4">
                <Button asChild variant="outline">
                  <label className="cursor-pointer">
                    <FileText className="mr-2 h-4 w-4" />
                    Upload Document
                    <input
                      type="file"
                      accept=".doc,.docx,.pdf,.txt"
                      className="hidden"
                      onChange={handleDocUpload}
                    />
                  </label>
                </Button>
                {knowledgeBase && (
                  <span className="text-sm text-muted-foreground">
                    {knowledgeBase.name}
                  </span>
                )}
              </div>
            </div>

            <Button
              onClick={generateContent}
              disabled={isGenerating}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Content
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Listing Content
                </>
              )}
            </Button>
          </div>
        </Card>

        {generatedContent && (
          <Card className="p-6">
            <h3 className="text-xl font-semibold mb-4">Generated Content</h3>
            
            <div className="space-y-6">
              <div>
                <h4 className="font-medium mb-2">Title</h4>
                <p className="p-3 bg-secondary rounded-lg">{generatedContent.title}</p>
              </div>

              <div>
                <h4 className="font-medium mb-2">Description</h4>
                <p className="p-3 bg-secondary rounded-lg">{generatedContent.description}</p>
              </div>

              <div>
                <h4 className="font-medium mb-2">Photo Descriptions</h4>
                <ul className="space-y-2">
                  {generatedContent.photoDescriptions.map((desc, index) => (
                    <li key={index} className="p-3 bg-secondary rounded-lg">{desc}</li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-medium mb-2">Neighborhood</h4>
                <div className="p-3 bg-secondary rounded-lg">
                  <p className="mb-4">{generatedContent.neighborhood.description}</p>
                  <div className="space-y-3">
                    {generatedContent.neighborhood.attractions.map((attraction, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <span>{attraction.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {attraction.distance} • {attraction.duration}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Directions from Airport</h4>
                <p className="p-3 bg-secondary rounded-lg">{generatedContent.directions}</p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ListingForm;