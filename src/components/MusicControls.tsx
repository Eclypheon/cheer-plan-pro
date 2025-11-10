import React, { useRef } from 'react';
import { Music, Play, Pause, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { MusicState } from '@/types/routine';

interface MusicControlsProps {
  musicState: MusicState;
  onUpload: (file: File) => void;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
}

export const MusicControls = ({
  musicState,
  onUpload,
  onPlay,
  onPause,
  onStop,
}: MusicControlsProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ['audio/wav', 'audio/mpeg', 'audio/ogg', 'audio/mp4', 'audio/aac'];
      const fileExtension = file.name.toLowerCase().split('.').pop();

      if (!validTypes.includes(file.type) &&
          !['wav', 'mp3', 'ogg', 'm4a', 'aac'].includes(fileExtension || '')) {
        alert('Please select a valid audio file (.wav, .mp3, .ogg, .m4a, .aac)');
        return;
      }

      onUpload(file);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const hasMusic = !!musicState.file;

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleUploadClick}
        className="h-6 w-6 p-0"
        title="Upload music file"
      >
        <Music className="h-3 w-3" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={musicState.isPlaying ? onPause : onPlay}
        disabled={!hasMusic}
        className={cn(
          "h-6 w-6 p-0",
          !hasMusic && "opacity-50 cursor-not-allowed"
        )}
        title={musicState.isPlaying ? "Pause music" : "Play music"}
      >
        {musicState.isPlaying ? (
          <Pause className="h-3 w-3" />
        ) : (
          <Play className="h-3 w-3" />
        )}
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={onStop}
        disabled={!hasMusic || (!musicState.isPlaying && musicState.currentTime === 0)}
        className={cn(
          "h-6 w-6 p-0",
          (!hasMusic || (!musicState.isPlaying && musicState.currentTime === 0)) &&
          "opacity-50 cursor-not-allowed"
        )}
        title="Stop music"
      >
        <Square className="h-3 w-3" />
      </Button>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,.wav,.mp3,.ogg,.m4a,.aac"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
};
