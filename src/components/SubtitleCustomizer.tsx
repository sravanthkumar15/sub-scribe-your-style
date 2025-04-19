
import React, { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const SubtitleCustomizer = () => {
  const { toast } = useToast();
  const [subtitleStyle, setSubtitleStyle] = useState({
    color: "#ffffff",
    backgroundColor: "#000000",
    backgroundOpacity: 75,
    fontSize: 24,
    highlightColor: "#ffff00",
  });

  // Check if we're in a browser extension context
  const isChromeExtension = typeof chrome !== 'undefined' && chrome.storage;

  // Load saved settings
  useEffect(() => {
    if (isChromeExtension) {
      chrome.storage.sync.get(['subtitleStyle'], (result) => {
        if (result.subtitleStyle) {
          setSubtitleStyle(result.subtitleStyle);
        }
      });
    }
  }, []);

  // Save settings and notify content script
  const handleStyleChange = (newStyle: typeof subtitleStyle) => {
    setSubtitleStyle(newStyle);
    if (isChromeExtension) {
      chrome.storage.sync.set({ subtitleStyle: newStyle });
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, {
            type: 'UPDATE_STYLES',
            styles: newStyle
          });
        }
      });
      toast({
        title: "Settings saved",
        description: "Your subtitle customization has been updated.",
      });
    }
  };

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
        </div>
      </Card>

      <p className="mt-4 text-sm text-gray-400 text-center">
        Open YouTube and play a video with subtitles to see your customizations
      </p>
    </div>
  );
};

export default SubtitleCustomizer;
