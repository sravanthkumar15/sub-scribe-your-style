
import React from "react";
import { SubtitlesDialog } from "@/components/SubtitlesDialog";
import SubtitleCustomizer from "@/components/SubtitleCustomizer";

export default function Index() {
  return (
    <div className="min-h-screen w-full bg-background">
      <div className="container mx-auto py-4 space-y-4">
        <SubtitleCustomizer />
        <SubtitlesDialog />
      </div>
    </div>
  );
}
