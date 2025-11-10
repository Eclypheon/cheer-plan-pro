import { useState, useRef, useCallback, useEffect } from 'react';
import type { MusicFile, MusicState } from '@/types/routine';

export const useAudioPlayer = () => {
  const [musicState, setMusicState] = useState<MusicState>({
    file: null,
    isPlaying: false,
    currentTime: 0,
    detectedBpm: null,
    isSynced: false,
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Initialize audio element
  useEffect(() => {
    audioRef.current = new Audio();
    const audio = audioRef.current;

    const handleTimeUpdate = () => {
      setMusicState(prev => ({
        ...prev,
        currentTime: audio.currentTime,
      }));
    };

    const handleEnded = () => {
      setMusicState(prev => ({
        ...prev,
        isPlaying: false,
        currentTime: 0,
      }));
    };

    const handleLoadedMetadata = () => {
      if (musicState.file) {
        setMusicState(prev => ({
          ...prev,
          file: {
            ...prev.file!,
            duration: audio.duration,
          },
        }));
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Update audio source when file changes
  useEffect(() => {
    if (audioRef.current && musicState.file) {
      audioRef.current.src = musicState.file.url;
      audioRef.current.load();
    }
  }, [musicState.file?.url]);

  const loadMusicFile = useCallback((file: File, detectedBpm?: number) => {
    // Clean up previous file
    if (musicState.file?.url) {
      URL.revokeObjectURL(musicState.file.url);
    }

    const url = URL.createObjectURL(file);
    const musicFile: MusicFile = {
      file,
      url,
      name: file.name,
      detectedBpm,
      duration: 0, // Will be set when metadata loads
    };

    setMusicState(prev => ({
      ...prev,
      file: musicFile,
      detectedBpm,
      currentTime: 0,
      isPlaying: false,
    }));
  }, [musicState.file?.url]);

  const play = useCallback(async () => {
    if (!audioRef.current || !musicState.file) return;

    try {
      await audioRef.current.play();
      setMusicState(prev => ({
        ...prev,
        isPlaying: true,
      }));
    } catch (error) {
      console.error('Failed to play audio:', error);
    }
  }, [musicState.file]);

  const pause = useCallback(() => {
    if (!audioRef.current) return;

    audioRef.current.pause();
    setMusicState(prev => ({
      ...prev,
      isPlaying: false,
    }));
  }, []);

  const stop = useCallback(() => {
    if (!audioRef.current) return;

    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setMusicState(prev => ({
      ...prev,
      isPlaying: false,
      currentTime: 0,
    }));
  }, []);

  const setCurrentTime = useCallback((time: number) => {
    if (!audioRef.current) return;

    audioRef.current.currentTime = time;
    setMusicState(prev => ({
      ...prev,
      currentTime: time,
    }));
  }, []);

  const setDetectedBpm = useCallback((bpm: number | null) => {
    setMusicState(prev => ({
      ...prev,
      detectedBpm: bpm,
    }));
  }, []);

  const setSynced = useCallback((isSynced: boolean) => {
    setMusicState(prev => ({
      ...prev,
      isSynced,
    }));
  }, []);

  const clearMusic = useCallback(() => {
    if (musicState.file?.url) {
      URL.revokeObjectURL(musicState.file.url);
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }

    setMusicState({
      file: null,
      isPlaying: false,
      currentTime: 0,
      detectedBpm: null,
      isSynced: false,
    });
  }, [musicState.file?.url]);

  return {
    musicState,
    loadMusicFile,
    play,
    pause,
    stop,
    setCurrentTime,
    setDetectedBpm,
    setSynced,
    clearMusic,
  };
};
