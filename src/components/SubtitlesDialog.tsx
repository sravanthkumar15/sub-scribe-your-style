
import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface Subtitle {
  text: string;
  timestamp: string;
}

export function SubtitlesDialog() {
  const [isOpen, setIsOpen] = useState(true);
  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
  const [isEnabled, setIsEnabled] = useState(true);

  useEffect(() => {
    // Listen for subtitles from content script
    if (chrome?.runtime?.onMessage) {
      chrome.runtime.onMessage.addListener((message) => {
        if (message.type === 'SUBTITLE_TEXT') {
          setSubtitles(prev => [...prev, {
            text: message.text,
            timestamp: new Date().toISOString()
          }].slice(-5)); // Keep last 5 subtitles
        }
      });
    }
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[600px] bg-white dark:bg-gray-800">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold mb-2">Live Subtitles</DialogTitle>
          <DialogDescription className="text-sm text-gray-500 dark:text-gray-400">
            View subtitles captured from your current YouTube video.
          </DialogDescription>
          <div className="flex items-center space-x-2 my-4">
            <Switch
              id="subtitle-switch"
              checked={isEnabled}
              onCheckedChange={setIsEnabled}
            />
            <Label htmlFor="subtitle-switch">Enable Subtitles</Label>
          </div>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="h-[300px] overflow-y-auto space-y-2 p-4 bg-gray-50 dark:bg-gray-900 rounded-md">
            {subtitles.map((subtitle, index) => (
              <div 
                key={index} 
                className="p-3 bg-white dark:bg-gray-800 rounded-md shadow-sm"
              >
                <p className="text-sm text-gray-900 dark:text-gray-100">{subtitle.text}</p>
                <p className="text-xs text-gray-500 mt-1">{new Date(subtitle.timestamp).toLocaleTimeString()}</p>
              </div>
            ))}
            {subtitles.length === 0 && (
              <p className="text-center text-gray-500 dark:text-gray-400 py-4">
                No subtitles yet. Play a video with captions enabled.
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
