
import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const SubtitleCustomizer = () => {
  const [subtitleStyle, setSubtitleStyle] = useState({
    color: "#ffffff",
    backgroundColor: "#000000",
    backgroundOpacity: 75,
    fontSize: 24,
    highlightColor: "#ffff00",
  });

  const [previewText, setPreviewText] = useState("This is a sample subtitle text for preview");
  const [highlightedWord, setHighlightedWord] = useState(-1);

  const handleOpacityChange = (value: number[]) => {
    setSubtitleStyle(prev => ({
      ...prev,
      backgroundOpacity: value[0],
    }));
  };

  const handleFontSizeChange = (value: number[]) => {
    setSubtitleStyle(prev => ({
      ...prev,
      fontSize: value[0],
    }));
  };

  const words = previewText.split(" ");

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">YouTube Subtitle Customizer</h1>
        
        <div className="grid gap-8 md:grid-cols-2">
          {/* Controls */}
          <Card className="p-6 bg-gray-800 border-gray-700">
            <h2 className="text-xl font-semibold mb-6">Customize Subtitles</h2>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>Text Color</Label>
                <Input
                  type="color"
                  value={subtitleStyle.color}
                  onChange={(e) => setSubtitleStyle(prev => ({ ...prev, color: e.target.value }))}
                  className="h-10 w-full"
                />
              </div>

              <div className="space-y-2">
                <Label>Background Color</Label>
                <Input
                  type="color"
                  value={subtitleStyle.backgroundColor}
                  onChange={(e) => setSubtitleStyle(prev => ({ ...prev, backgroundColor: e.target.value }))}
                  className="h-10 w-full"
                />
              </div>

              <div className="space-y-2">
                <Label>Background Opacity: {subtitleStyle.backgroundOpacity}%</Label>
                <Slider
                  value={[subtitleStyle.backgroundOpacity]}
                  onValueChange={handleOpacityChange}
                  min={0}
                  max={100}
                  step={1}
                />
              </div>

              <div className="space-y-2">
                <Label>Font Size: {subtitleStyle.fontSize}px</Label>
                <Slider
                  value={[subtitleStyle.fontSize]}
                  onValueChange={handleFontSizeChange}
                  min={12}
                  max={48}
                  step={1}
                />
              </div>

              <div className="space-y-2">
                <Label>Highlight Color</Label>
                <Input
                  type="color"
                  value={subtitleStyle.highlightColor}
                  onChange={(e) => setSubtitleStyle(prev => ({ ...prev, highlightColor: e.target.value }))}
                  className="h-10 w-full"
                />
              </div>

              <div className="space-y-2">
                <Label>Preview Text</Label>
                <Input
                  value={previewText}
                  onChange={(e) => setPreviewText(e.target.value)}
                  className="bg-gray-700 border-gray-600"
                  placeholder="Enter text to preview"
                />
              </div>
            </div>
          </Card>

          {/* Preview */}
          <Card className="p-6 bg-gray-800 border-gray-700">
            <h2 className="text-xl font-semibold mb-6">Preview</h2>
            <div className="aspect-video bg-black rounded-lg flex items-end justify-center p-4 mb-4">
              <div
                style={{
                  backgroundColor: `${subtitleStyle.backgroundColor}${Math.round(subtitleStyle.backgroundOpacity * 2.55).toString(16).padStart(2, '0')}`,
                  padding: '0.5rem 1rem',
                  borderRadius: '4px',
                  maxWidth: '90%',
                }}
              >
                <p style={{ fontSize: `${subtitleStyle.fontSize}px`, color: subtitleStyle.color }}>
                  {words.map((word, index) => (
                    <span
                      key={index}
                      style={{
                        backgroundColor: highlightedWord === index ? subtitleStyle.highlightColor : 'transparent',
                        padding: '0 2px',
                        transition: 'background-color 0.3s',
                      }}
                    >
                      {word}{' '}
                    </span>
                  ))}
                </p>
              </div>
            </div>
            
            <div className="space-y-4">
              <Label>Word Highlighting</Label>
              <div className="flex flex-wrap gap-2">
                {words.map((word, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    className={`text-sm ${highlightedWord === index ? 'bg-primary' : 'bg-gray-700'}`}
                    onClick={() => setHighlightedWord(highlightedWord === index ? -1 : index)}
                  >
                    {word}
                  </Button>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SubtitleCustomizer;
