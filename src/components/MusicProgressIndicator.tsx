import React, { useEffect, useRef } from 'react';
import type { MusicState } from '@/types/routine';

interface MusicProgressIndicatorProps {
  musicState: MusicState;
  routineLength: number;
  bpm: number;
  totalLines: number;
  onLineSelect?: (lineIndex: number) => void;
}

export const MusicProgressIndicator = ({
  musicState,
  routineLength,
  bpm,
  totalLines,
  onLineSelect,
}: MusicProgressIndicatorProps) => {
  const animationFrameRef = useRef<number | null>(null);
  const lastLineSelectedRef = useRef<number | null>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const beatMarkerRef = useRef<HTMLDivElement>(null);
  const beatNumberRef = useRef<HTMLDivElement>(null);
  const cellPositionsRef = useRef<Array<{ left: number; count: number }>>([]);

  // Pre-calculate all cell positions to avoid DOM queries during playback
  const calculateCellPositions = () => {
    const positions: Array<{ left: number; count: number }> = [];
    const countSheetContainer = document.getElementById('count-sheet-container');

    if (!countSheetContainer) return positions;

    const containerRect = countSheetContainer.getBoundingClientRect();

    for (let lineIndex = 0; lineIndex < totalLines; lineIndex++) {
      for (let count = 1; count <= 8; count++) {
        const cellSelector = `td[data-cell="${lineIndex}-${count}"]`;
        const targetCell = document.querySelector(cellSelector);

        if (targetCell) {
          const cellRect = targetCell.getBoundingClientRect();
          const indicatorLeft = cellRect.left + (cellRect.width / 2);
          const relativeLeft = indicatorLeft - containerRect.left;

          positions.push({
            left: relativeLeft,
            count: count
          });
        }
      }
    }

    return positions;
  };

  // Update cell positions when table structure changes
  useEffect(() => {
    cellPositionsRef.current = calculateCellPositions();
  }, [totalLines]); // Recalculate when totalLines changes

  // Calculate and update progress at fixed beat intervals (metronome style)
  useEffect(() => {
    if (!musicState.file || !musicState.isPlaying) {
      if (animationFrameRef.current) {
        clearInterval(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      // Hide indicators when not playing
      if (indicatorRef.current) indicatorRef.current.style.display = 'none';
      if (beatMarkerRef.current) beatMarkerRef.current.style.display = 'none';
      if (beatNumberRef.current) beatNumberRef.current.style.display = 'none';
      return;
    }

    // Calculate the exact interval between beats in milliseconds
    const beatInterval = (60 / bpm) * 1000; // milliseconds per beat

    // Initialize beat counter based on current music time
    let currentBeat = Math.floor((musicState.currentTime * bpm) / 60);

    const updateProgress = () => {
      const lineIndex = Math.floor(currentBeat / 8);
      const countInLine = (currentBeat % 8) + 1; // 1-indexed (1-8)

      // Auto-select current line if callback provided and line changed
      if (onLineSelect && lineIndex !== lastLineSelectedRef.current && lineIndex >= 0 && lineIndex < totalLines) {
        onLineSelect(lineIndex);
        lastLineSelectedRef.current = lineIndex;
      }

      // Only show indicator if we're within the routine bounds
      if (lineIndex >= totalLines) {
        if (indicatorRef.current) indicatorRef.current.style.display = 'none';
        if (beatMarkerRef.current) beatMarkerRef.current.style.display = 'none';
        if (beatNumberRef.current) beatNumberRef.current.style.display = 'none';
        return;
      }

      // Get pre-calculated position for this beat
      const beatIndex = currentBeat % (totalLines * 8);
      const position = cellPositionsRef.current[beatIndex];

      if (position) {
        // Update indicator positions directly in DOM using pre-calculated positions
        if (indicatorRef.current) {
          indicatorRef.current.style.display = 'block';
          indicatorRef.current.style.left = `${position.left}px`;
        }

        if (beatMarkerRef.current) {
          beatMarkerRef.current.style.display = 'block';
          beatMarkerRef.current.style.left = `${position.left}px`;
        }

        if (beatNumberRef.current) {
          beatNumberRef.current.style.display = 'block';
          beatNumberRef.current.textContent = position.count.toString();
        }
      }

      // Increment beat counter for next interval
      currentBeat++;
    };

    // Start the metronome-style updates at fixed intervals
    updateProgress(); // Update immediately
    animationFrameRef.current = window.setInterval(updateProgress, beatInterval);

    return () => {
      if (animationFrameRef.current) {
        clearInterval(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [musicState.isPlaying, musicState.currentTime, bpm, totalLines, onLineSelect]);

  // Reset when music stops
  useEffect(() => {
    if (!musicState.isPlaying) {
      lastLineSelectedRef.current = null;
    }
  }, [musicState.isPlaying]);

  // Don't render anything - we handle everything with direct DOM manipulation
  return (
    <>
      {/* Vertical progress line */}
      <div
        ref={indicatorRef}
        className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-50 pointer-events-none"
        style={{
          display: 'none',
          boxShadow: '0 0 4px rgba(239, 68, 68, 0.5)',
          willChange: 'left',
        }}
      />

      {/* Beat marker at the top */}
      <div
        ref={beatMarkerRef}
        className="absolute top-0 w-2 h-2 bg-red-500 rounded-full z-50 pointer-events-none transform -translate-x-1"
        style={{
          display: 'none',
          boxShadow: '0 0 6px rgba(239, 68, 68, 0.8)',
          willChange: 'left',
        }}
      />

      {/* Current beat number display */}
      <div
        ref={beatNumberRef}
        className="absolute top-1 left-1 bg-red-500 text-white text-xs px-1 py-0.5 rounded z-50 pointer-events-none font-mono"
        style={{
          display: 'none',
          fontSize: '10px',
          lineHeight: '1',
        }}
      />
    </>
  );
};
