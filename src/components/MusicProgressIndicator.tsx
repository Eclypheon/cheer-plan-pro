import React, { useEffect, useRef } from 'react';
import type { MusicState } from '@/types/routine';

interface MusicProgressIndicatorProps {
  musicState: MusicState;
  routineLength: number;
  bpm: number;
  totalLines: number;
  onLineSelect?: (lineIndex: number) => void;
  onCurrentCellChange?: (lineIndex: number, count: number) => void;
  onSetCurrentTime?: (time: number) => void;
  onCurrentBeatChange?: (lineIndex: number, count: number) => void;
}

export const MusicProgressIndicator = ({
  musicState,
  routineLength,
  bpm,
  totalLines,
  onLineSelect,
  onCurrentCellChange,
  onSetCurrentTime,
  onCurrentBeatChange,
}: MusicProgressIndicatorProps) => {
  const animationFrameRef = useRef<number | null>(null);
  const lastLineSelectedRef = useRef<number | null>(null);
  const lastHighlightedCellRef = useRef<{ lineIndex: number; count: number } | null>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const beatMarkerRef = useRef<HTMLDivElement>(null);

  const cellPositionsRef = useRef<Array<{ left: number; count: number }>>([]);

  // Pre-calculate all cell positions and update indicator height
  const calculateCellPositions = () => {
    const positions: Array<{ left: number; count: number }> = [];
    const countSheetContainer = document.getElementById('count-sheet-container');

    if (!countSheetContainer) return positions;

    const containerRect = countSheetContainer.getBoundingClientRect();
    const containerScrollHeight = countSheetContainer.scrollHeight;

    // Update the indicator height to match the full scrollable height
    if (indicatorRef.current) {
      indicatorRef.current.style.height = `${containerScrollHeight}px`;
    }

    for (let lineIndex = 0; lineIndex < totalLines; lineIndex++) {
      for (let count = 1; count <= 8; count++) {
        const cellSelector = `td[data-cell="${lineIndex}-${count}"]`;
        const targetCell = document.querySelector(cellSelector);

        if (targetCell) {
          const cellRect = targetCell.getBoundingClientRect();
          // Calculate position based on actual cell width, not fixed 80px
          const cellWidth = cellRect.width;
          const indicatorLeft = cellRect.left + (cellWidth / 2);
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

  // Also recalculate positions when window resizes or container changes
  useEffect(() => {
    const handleResize = () => {
      cellPositionsRef.current = calculateCellPositions();
    };

    window.addEventListener('resize', handleResize);

    // Also watch for DOM changes that might affect cell positions
    const observer = new MutationObserver(() => {
      cellPositionsRef.current = calculateCellPositions();
    });

    const countSheetContainer = document.getElementById('count-sheet-container');
    if (countSheetContainer) {
      observer.observe(countSheetContainer, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class']
      });
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      observer.disconnect();
    };
  }, [totalLines]);

  // Simple metronome-style progress indicator - moves every 60/bpm seconds regardless of music
  useEffect(() => {
    if (!musicState.file) {
      if (animationFrameRef.current) {
        clearInterval(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      // Hide indicators when no music file
      if (indicatorRef.current) indicatorRef.current.style.display = 'none';
      if (beatMarkerRef.current) beatMarkerRef.current.style.display = 'none';
      // Clear cell highlighting when no music
      if (onCurrentCellChange) {
        onCurrentCellChange(-1, -1);
      }
      return;
    }

    // If not playing, check if it's paused (currentTime > 0) or stopped (currentTime = 0)
    if (!musicState.isPlaying) {
      if (animationFrameRef.current) {
        clearInterval(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      // If stopped (currentTime is 0), hide indicators and clear highlighting
      if (musicState.currentTime === 0) {
        if (indicatorRef.current) indicatorRef.current.style.display = 'none';
        if (beatMarkerRef.current) beatMarkerRef.current.style.display = 'none';
        // Clear cell highlighting when music stops
        if (onCurrentCellChange) {
          onCurrentCellChange(-1, -1);
        }
      }
      // If paused (currentTime > 0), keep indicators visible but don't update
      return;
    }

    // Calculate the exact interval between beats in milliseconds
    const beatInterval = (60 / bpm) * 1000; // milliseconds per beat

    // Start beat counter from the current music position, snapped to beat intervals
    let currentBeat = Math.floor(musicState.currentTime / (60 / bpm));

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
        // Clear cell highlight when out of bounds
        if (onCurrentCellChange && lastHighlightedCellRef.current) {
          onCurrentCellChange(-1, -1);
          lastHighlightedCellRef.current = null;
        }
        return;
      }

      // Notify parent of current cell change for highlighting
      if (onCurrentCellChange) {
        const currentCell = { lineIndex, count: countInLine };
        // Only call if the cell actually changed
        if (!lastHighlightedCellRef.current ||
            lastHighlightedCellRef.current.lineIndex !== lineIndex ||
            lastHighlightedCellRef.current.count !== countInLine) {
          onCurrentCellChange(lineIndex, countInLine);
          lastHighlightedCellRef.current = currentCell;
        }
      }

      // Notify parent of current beat change for header display
      if (onCurrentBeatChange) {
        onCurrentBeatChange(lineIndex, countInLine);
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
      }

      // Increment beat counter for next interval
      currentBeat++;
    };

    // Start the metronome-style updates at perfect intervals
    updateProgress(); // Update immediately
    animationFrameRef.current = window.setInterval(updateProgress, beatInterval);

    return () => {
      if (animationFrameRef.current) {
        clearInterval(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [musicState.isPlaying, bpm, totalLines, onLineSelect]);

  // Handle pause snapping and reset when music stops
  const wasPlayingRef = useRef(false);

  useEffect(() => {
    // Detect when music was paused (changed from playing to not playing)
    if (wasPlayingRef.current && !musicState.isPlaying && musicState.currentTime > 0) {
      // Music was just paused - snap to closest beat interval
      const beatIntervalSeconds = 60 / bpm;
      const snappedTime = Math.round(musicState.currentTime / beatIntervalSeconds) * beatIntervalSeconds;

      // Only snap if the difference is significant (more than 0.1 seconds)
      if (Math.abs(musicState.currentTime - snappedTime) > 0.1 && onSetCurrentTime) {
        onSetCurrentTime(snappedTime);
      }
    }

    // Update the ref for next render
    wasPlayingRef.current = musicState.isPlaying;

    // Handle stop/reset logic
    if (!musicState.isPlaying) {
      // If stopped (currentTime is 0), reset everything
      if (musicState.currentTime === 0) {
        lastLineSelectedRef.current = null;
        lastHighlightedCellRef.current = null;
      }
    }
  }, [musicState.isPlaying, musicState.currentTime, bpm, onSetCurrentTime]);

  // Don't render anything - we handle everything with direct DOM manipulation
  return (
    <>
      {/* Vertical progress line */}
      <div
        ref={indicatorRef}
        className="absolute top-0 w-0.5 bg-red-500 z-50 pointer-events-none"
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


    </>
  );
};
