
import React, { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

// Define the type for our subtitle style
interface SubtitleStyleType {
  color: string;
  backgroundColor: string;
  backgroundOpacity: number;
  fontSize: number;
  highlightColor: string;
}

// Define storage result type
interface ChromeStorageResult {
  subtitleStyle?: SubtitleStyleType;
  [key: string]: any;
}

const SubtitleCustomizer = () => {
  const { toast } = useToast();
  const [subtitleStyle, setSubtitleStyle] = useState<SubtitleStyleType>({
    color: "#ffffff",
    backgroundColor: "#000000",
    backgroundOpacity: 75,
    fontSize: 24,
    highlightColor: "#ffff00",
  });
  const [status, setStatus] = useState<string>("Ready");

  // Check if we're in a browser extension context
  const isChromeExtension = typeof chrome !== 'undefined' && chrome.storage;

  // Load saved settings
  useEffect(() => {
    if (isChromeExtension) {
      chrome.storage.sync.get(['subtitleStyle'], (result: ChromeStorageResult) => {
        if (result.subtitleStyle) {
          setSubtitleStyle(result.subtitleStyle);
          setStatus("Settings loaded");
        }
      });
    }
  }, []);

  // Save settings and notify content script
  const handleStyleChange = (newStyle: SubtitleStyleType) => {
    setSubtitleStyle(newStyle);
    if (isChromeExtension) {
      chrome.storage.sync.set({ subtitleStyle: newStyle });
      setStatus("Saving settings...");
      
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, {
            type: 'UPDATE_STYLES',
            styles: newStyle
          }, () => {
            setStatus("Settings applied");
          });
        } else {
          setStatus("No YouTube tab found");
        }
      });
      
      toast({
        title: "Settings saved",
        description: "Your subtitle customization has been updated.",
      });
    }
  };

  // Debug UI to show if we're running as an extension
  const extensionStatus = isChromeExtension ? 
    "Running as extension" : 
    "Running in development mode";

  return (
    <div className="w-[400px] bg-gray-900 text-white p-4">
      <h1 className="text-xl font-bold mb-4 text-center">YouTube Subtitle Customizer</h1>
      
      <Card className="p-4 bg-gray-800 border-gray-700">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Text Color</Label>
            <Input
              type="color"
              value={subtitleStyle.color}
              onChange={(e) => handleStyleChange({ ...subtitleStyle, color: e.target.value })}
              className="h-10 w-full"
            />
          </div>

          <div className="space-y-2">
            <Label>Background Color</Label>
            <Input
              type="color"
              value={subtitleStyle.backgroundColor}
              onChange={(e) => handleStyleChange({ ...subtitleStyle, backgroundColor: e.target.value })}
              className="h-10 w-full"
            />
          </div>

          <div className="space-y-2">
            <Label>Background Opacity: {subtitleStyle.backgroundOpacity}%</Label>
            <Slider
              value={[subtitleStyle.backgroundOpacity]}
              onValueChange={(value) => handleStyleChange({ ...subtitleStyle, backgroundOpacity: value[0] })}
              min={0}
              max={100}
              step={1}
            />
          </div>

          <div className="space-y-2">
            <Label>Font Size: {subtitleStyle.fontSize}px</Label>
            <Slider
              value={[subtitleStyle.fontSize]}
              onValueChange={(value) => handleStyleChange({ ...subtitleStyle, fontSize: value[0] })}
              min={12}
              max={48}
              step={1}
            />
          </div>
          
          <div className="mt-4 text-xs text-gray-400">
            Status: {status} ({extensionStatus})
          </div>
        </div>
      </Card>

      <p className="mt-4 text-sm text-gray-400 text-center">
        Open YouTube and play a video with subtitles to see your customizations
      </p>
    </div>
  );
};

export default SubtitleCustomizer;
