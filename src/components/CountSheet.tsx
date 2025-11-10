import React, { useState } from "react";
import { useDroppable, useDraggable } from "@dnd-kit/core";
import type { PlacedSkill, Skill, SkillCategory, MusicState } from "@/types/routine";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { MusicControls } from "./MusicControls";
import { MusicProgressIndicator } from "./MusicProgressIndicator";
import { BpmSyncDialog } from "./BpmSyncDialog";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { useBpmDetection } from "@/hooks/useBpmDetection";

interface CountSheetProps {
  routineLength: number;
  bpm: number;
  placedSkills: PlacedSkill[];
  skills: Skill[];
  onRemoveSkill: (id: string) => void;
  onLineClick: (lineIndex: number) => void;
  selectedLine: number | null;
  selectedSkillId?: string | null;
  onSelectSkill?: (id: string | null) => void;
  onMoveSkill?: (id: string, newLineIndex: number, newStartCount: number) => void;
  onUpdateSkillCounts?: (id: string, counts: number) => void;
  isResizing?: boolean;
  draggedSkill?: Skill | null;
  overCellId?: string | null;
  notes?: Record<number, string>;
  onUpdateNote?: (lineIndex: number, note: string) => void;
  isPdfRender?: boolean;
  onToggleSkillsPanel?: () => void;
  skillsPanelCollapsed?: boolean;
  onBpmChange?: (newBpm: number) => void;
}

interface SkillPlacement {
  skill: Skill;
  placedSkill: PlacedSkill;
  startCount: number;
  endCount: number;
  lineIndex: number;
}

// Color mapping for different skill categories
const getSkillCategoryColors = (category: SkillCategory) => {
  switch (category) {
    case "mounts":
    case "on-hands":
      return {
        background: "bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/40 dark:to-purple-900/40",
        border: "border-blue-300 dark:border-blue-600",
        text: "text-blue-900 dark:text-blue-100",
        accent: "bg-blue-600 text-white"
      };
    case "dismounts":
      return {
        background: "bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/40 dark:to-purple-900/40",
        border: "border-blue-300 dark:border-blue-600",
        text: "text-blue-900 dark:text-blue-100",
        accent: "bg-blue-600 text-white"
      };
    case "pyramids":
      return {
        background: "bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/40 dark:to-emerald-900/40",
        border: "border-green-300 dark:border-green-600",
        text: "text-green-900 dark:text-green-100",
        accent: "bg-green-600 text-white"
      };
    case "baskets":
      return {
        background: "bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/40 dark:to-amber-900/40",
        border: "border-orange-300 dark:border-orange-600",
        text: "text-orange-900 dark:text-orange-100",
        accent: "bg-orange-600 text-white"
      };
    case "tumbling":
      return {
        background: "bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/40 dark:to-amber-900/40",
        border: "border-yellow-300 dark:border-yellow-600",
        text: "text-yellow-900 dark:text-yellow-100",
        accent: "bg-yellow-600 text-white"
      };
    case "transitions":
      return {
        background: "bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-900/40 dark:to-gray-900/40",
        border: "border-slate-300 dark:border-slate-600",
        text: "text-slate-900 dark:text-slate-100",
        accent: "bg-slate-600 text-white"
      };
    default:
      return {
        background: "bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-900/40 dark:to-slate-900/40",
        border: "border-gray-300 dark:border-gray-600",
        text: "text-gray-900 dark:text-gray-100",
        accent: "bg-gray-600 text-white"
      };
  }
};

// Update ResizeHandleProps to include placedSkill
interface ResizeHandleProps {
  direction: "left" | "right";
  skill: Skill;
  placedSkill: PlacedSkill; // Add this prop
  cellsToSpan: number;
  onResizeComplete: (newCounts: number) => void;
  isResizing?: boolean;
}

// Update ResizeHandle to use placedSkill in its drag data
const ResizeHandle = ({ direction, skill, placedSkill, cellsToSpan, isResizing }: ResizeHandleProps) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `resize-${direction}-${placedSkill.id}`, // Use placedSkill.id for a unique handle
    data: {
      type: "skill-resize",
      direction,
      skill,
      placedSkill, // Pass the specific placedSkill instance
      originalCellsToSpan: skill.counts, // Pass the skill's total count at drag start
    },
  });

  // This handle is being dragged**
  const isThisHandleDragging = isDragging;
  // Another handle is being dragged**
  const isAnotherHandleDragging = isResizing && !isThisHandleDragging;

  // Since handle is now positioned outside the flex container, remove flex positioning
const baseClasses = `w-3 h-3 rounded flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-white/50 cursor-ew-resize transition-opacity ${
    isThisHandleDragging ? "opacity-0" : "opacity-0 group-hover:opacity-100"
  } ${
    isAnotherHandleDragging ? "opacity-0" : "" // Force hide if another handle is active
  }`;

  // Position differently based on direction
  const positionClasses = direction === "left"
    ? "bg-gray-100 hover:bg-white border border-gray-300"
    : "bg-gray-100 hover:bg-white border border-gray-300";

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={transform ? {
        transform: `translate3d(${transform.x}px, 0px, 0)`, // Lock to horizontal only movement
      } : undefined}
      className={`${baseClasses} ${positionClasses}`}
      data-dragging={isDragging ? "true" : "false"}
      title={`${direction === "left" ? "Decrease" : "Increase"} skill counts`}
    >
      {direction === "left" ? <ChevronLeft className="h-2.5 w-2.5" /> : <ChevronRight className="h-2.5 w-2.5" />}
    </div>
  );
};

export const CountSheet = ({
  routineLength,
  bpm,
  placedSkills,
  skills,
  onRemoveSkill,
  onLineClick,
  selectedLine,
  selectedSkillId,
  onSelectSkill,
  onMoveSkill,
  onUpdateSkillCounts,
  draggedSkill = null,
  overCellId = null,
  isResizing,
  notes = {},
  onUpdateNote,
  isPdfRender = false,
  onToggleSkillsPanel,
  skillsPanelCollapsed = false,
  onBpmChange,
}: CountSheetProps) => {
  // State for resizable panels
  const [countSheetWidth, setCountSheetWidth] = React.useState(60); // percentage
  const [isResizingPanels, setIsResizingPanels] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [editingNoteLine, setEditingNoteLine] = React.useState<number | null>(null);
  const [highlightedCell, setHighlightedCell] = React.useState<{ lineIndex: number; count: number } | null>(null);

  // Music functionality
  const { musicState, loadMusicFile, play, pause, stop, setDetectedBpm, setSynced } = useAudioPlayer();
  const { detectBpm } = useBpmDetection();
  const [showBpmSyncDialog, setShowBpmSyncDialog] = useState(false);
  const [pendingBpm, setPendingBpm] = useState<number | null>(null);

  // Music handlers
  const handleMusicUpload = async (file: File) => {
    try {
      // Detect BPM from the uploaded file
      const detectedBpm = await detectBpm(file);

      if (detectedBpm) {
        setPendingBpm(detectedBpm);
        setShowBpmSyncDialog(true);
      }

      // Load the music file regardless of BPM detection
      loadMusicFile(file, detectedBpm || undefined);
    } catch (error) {
      console.error('Error uploading music file:', error);
      // Still load the file even if BPM detection fails
      loadMusicFile(file);
    }
  };

  const handleBpmSync = () => {
    if (pendingBpm && onBpmChange) {
      onBpmChange(pendingBpm);
      setDetectedBpm(pendingBpm);
      setSynced(true);
    }
  };

  const handleBpmSkip = () => {
    setSynced(false);
  };

  // Check if we're currently dragging (passed from parent)
  const isDraggingAnySkill = draggedSkill !== null || isResizing;

  // Prevent default touch behavior when starting to drag placed skills
  React.useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      // Check if the touch is on a placed skill element
      const target = e.target as HTMLElement;
      const skillElement = target.closest('[data-skill-id]');

      if (skillElement) {
        // Prevent default touch behavior to avoid scrolling when starting drag
        e.preventDefault();
      }
    };

    const scrollableContainer = document.getElementById('count-sheet-container');
    if (scrollableContainer) {
      scrollableContainer.addEventListener('touchstart', handleTouchStart, { passive: false });
    }

    return () => {
      if (scrollableContainer) {
        scrollableContainer.removeEventListener('touchstart', handleTouchStart);
      }
    };
  }, []);

  // Auto-scroll to keep selected line in view during keyboard navigation
  React.useEffect(() => {
    if (selectedLine === null) return;

    // Find the count sheet container (the scrollable div)
    const countSheetContainer = document.getElementById('count-sheet-container') as HTMLElement;
    if (!countSheetContainer) return;

    // Find the specific line element for the selected line
    const lineElement = document.querySelector(`[data-line="${selectedLine}"]`) as HTMLElement;
    if (!lineElement) return;

    const containerRect = countSheetContainer.getBoundingClientRect();
    const lineRect = lineElement.getBoundingClientRect();

    // Calculate if the line is outside the visible area
    const isAboveViewport = lineRect.top < containerRect.top;
    const isBelowViewport = lineRect.bottom > containerRect.bottom;

    // If the line is outside the viewport, scroll to bring it into view
    if (isAboveViewport || isBelowViewport) {
      const currentScrollTop = countSheetContainer.scrollTop;

      // Calculate how much to scroll to center the line vertically
      let newScrollTop = currentScrollTop;
      if (isAboveViewport) {
        // Scroll up to show line at top of viewport (with small margin)
        newScrollTop = currentScrollTop + (lineRect.top - containerRect.top) - 20;
      } else if (isBelowViewport) {
        // Scroll down to show line at bottom of viewport (with small margin)
        newScrollTop = currentScrollTop + (lineRect.bottom - containerRect.bottom) + 20;
      }

      // Apply the scroll
      if (newScrollTop !== currentScrollTop) {
        countSheetContainer.scrollTo({
          top: Math.max(0, newScrollTop),
          behavior: "smooth",
        });
      }
    }
  }, [selectedLine]);

  // Handle panel resizing
  const handleMouseDown = React.useCallback((e: React.MouseEvent) => {
    setIsResizingPanels(true);
    e.preventDefault();
  }, []);

  const handleMouseMove = React.useCallback((e: MouseEvent) => {
    if (!isResizingPanels || !containerRef.current) return;

    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const newWidth = ((e.clientX - rect.left) / rect.width) * 100;

    // Constrain between 60% and 85%
    const constrainedWidth = Math.max(60, Math.min(85, newWidth));
    setCountSheetWidth(constrainedWidth);
  }, [isResizingPanels]);

  const handleMouseUp = React.useCallback(() => {
    setIsResizingPanels(false);
  }, []);

  React.useEffect(() => {
    if (isResizingPanels) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizingPanels, handleMouseMove, handleMouseUp]);

  // Calculate total lines needed
  const totalBeats = Math.ceil((routineLength * bpm) / 60);
  const totalLines = Math.ceil(totalBeats / 8);

  // Process skills and handle overflow to next lines
  const getSkillPlacements = (): SkillPlacement[] => {
    const placements: SkillPlacement[] = [];
    
    placedSkills.forEach((ps) => {
      const skill = skills.find((s) => s.id === ps.skillId);
      if (!skill) return;

      let remainingCounts = skill.counts;
      let currentLine = ps.lineIndex;
      let currentStartCount = ps.startCount;

      while (remainingCounts > 0) {
        const countsInCurrentLine = Math.min(remainingCounts, 9 - currentStartCount);
        
        placements.push({
          skill,
          placedSkill: ps,
          startCount: currentStartCount,
          endCount: currentStartCount + countsInCurrentLine - 1,
          lineIndex: currentLine,
        });

        remainingCounts -= countsInCurrentLine;
        currentLine++;
        currentStartCount = 1;
      }
    });

    return placements;
  };

//Determine the highlight span
  let hoverLineIndex = -1;
  let hoverStartCount = -1;
  let skillSpan = 0;

  if (draggedSkill && overCellId && overCellId.startsWith('cell-')) {
    try {
      // Parse "cell-5-3" into line 5, count 3
      const [_, lineStr, countStr] = overCellId.split('-');
      hoverLineIndex = parseInt(lineStr);
      hoverStartCount = parseInt(countStr);
      skillSpan = draggedSkill.counts;
    } catch (e) {
      // If parsing fails, reset values
      hoverLineIndex = -1;
      hoverStartCount = -1;
      skillSpan = 0;
    }
  }
  // END of new logic

  const skillPlacements = getSkillPlacements();

  const getSkillsInCell = (lineIndex: number, count: number) => {
    return skillPlacements.filter(
      (sp) =>
        sp.lineIndex === lineIndex &&
        count >= sp.startCount &&
        count <= sp.endCount
    );
  };

  // Calculate overlap information for a skill across all cells it spans
  const getSkillOverlapInfo = (skillPlacement: SkillPlacement) => {
    const { placedSkill, lineIndex, startCount, endCount } = skillPlacement;
    let maxOverlapCount = 1; // At least the skill itself
    let skillIndexInMaxOverlap = 0;

    // Check all cells this skill spans
    for (let count = startCount; count <= endCount; count++) {
      const cellSkills = getSkillsInCell(lineIndex, count);
      if (cellSkills.length > maxOverlapCount) {
        maxOverlapCount = cellSkills.length;
        // Find this skill's index in the overlap group
        skillIndexInMaxOverlap = cellSkills.findIndex(sp => sp.placedSkill.id === placedSkill.id);
      }
    }

    return {
      maxOverlapCount,
      skillIndexInMaxOverlap,
      heightPercentage: maxOverlapCount > 1 ? 100 / maxOverlapCount : 100,
      topPercentage: maxOverlapCount > 1 ? skillIndexInMaxOverlap * (100 / maxOverlapCount) : 0
    };
  };

  const CountCell = ({ lineIndex, count }: { lineIndex: number; count: number }) => {
    const { setNodeRef, isOver } = useDroppable({
      id: `cell-${lineIndex}-${count}`,
      data: { lineIndex, count },
    });

    const cellSkills = getSkillsInCell(lineIndex, count);
    const isFirstCountOfSkill = cellSkills.filter(sp => sp.startCount === count);

    // Check if this cell is part of a skill span but not the first cell
    const isPartOfSkillSpan = cellSkills.length > 0 && isFirstCountOfSkill.length === 0;

    const isDropTarget =
      skillSpan > 0 && // Is a skill being dragged?
      lineIndex === hoverLineIndex && // Is this cell on the correct line?
      count >= hoverStartCount && // Is this cell at or after the start?
      count < (hoverStartCount + skillSpan); // Is this cell within the skill's count?

    const isLineSelected = selectedLine === lineIndex;
    const isCurrentBeat = highlightedCell && highlightedCell.lineIndex === lineIndex && highlightedCell.count === count;

    return (
      <td
        ref={setNodeRef}
        data-cell={`${lineIndex}-${count}`}
        className={`border border-border min-w-[80px] h-10 p-0.5 relative text-xs ${
          isDropTarget ? "bg-accent" : isCurrentBeat ? "bg-accent" : isPartOfSkillSpan ? "bg-card" : isLineSelected ? "bg-accent/20 hover:bg-accent/40" : "bg-card hover:bg-accent/50"
        }`}
      >
        {isFirstCountOfSkill.map((sp, skillIndex) => {
          const cellsToSpan = Math.min(sp.endCount - sp.startCount + 1, 9 - count);
          const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
            id: `placed-${sp.placedSkill.id}-${sp.lineIndex}-${sp.startCount}`,
            data: { type: "placed-skill", placedSkill: sp.placedSkill },
          });

          // Enhanced drag listeners to handle trash zone
          const enhancedListeners = {
            ...listeners,
            onDragEnd: (event: any) => {
              const { over } = event;
              if (over && (over.id === "trash-zone" || over.id === "trash-drop-zone")) {
                onRemoveSkill(sp.placedSkill.id);
                if (onSelectSkill) onSelectSkill(null);
              }
              // Call original drag end handler if it exists
              if (listeners?.onDragEnd) {
                listeners.onDragEnd(event);
              }
            }
          };

          // Calculate height and positioning for overlapping skills based on max overlaps across all spanned cells
          const overlapInfo = getSkillOverlapInfo(sp);
          const heightPercentage = overlapInfo.heightPercentage;
          const topPercentage = overlapInfo.topPercentage;

          const style = transform && !isDragging
            ? {
                transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
                width: `${100 * cellsToSpan}%`,
                height: `${heightPercentage}%`,
                top: `${topPercentage}%`
              }
            : {
                width: `${100 * cellsToSpan}%`,
                height: `${heightPercentage}%`,
                top: `${topPercentage}%`
              };

          const colors = getSkillCategoryColors(sp.skill.category);

          // Use responsive padding and gaps based on cell span
          const isCompact = cellsToSpan <= 2;
          const containerClass = isCompact
            ? "p-1 gap-0.5" // Normal padding for compact cells with resize handles
            : "p-1 gap-0.5"; // Normal padding for larger cells with resize handles

          return (
            <div
              key={sp.placedSkill.id}
              data-skill-id={sp.placedSkill.id}
              ref={setNodeRef}
              {...enhancedListeners}
              {...attributes}
              style={style}
              onClick={(e) => {
                e.stopPropagation();
                onSelectSkill?.(sp.placedSkill.id);
              }}
              className={`${colors.background} ${colors.border} border-2 rounded-md shadow-md absolute flex items-center cursor-grab active:cursor-grabbing z-[2000] text-sm transition-all duration-200 hover:shadow-lg overflow-visible group ${
                isDragging ? "opacity-50 shadow-xl" : "opacity-100"
              } ${selectedSkillId === sp.placedSkill.id ? "ring-2 ring-accent ring-offset-1" : ""} ${containerClass}`}
              data-dragging={isDragging ? "true" : "false"}
            >
{/* Left resize handle - positioned absolutely at left edge */}
              <div className="absolute -left-2 top-1/2 -translate-y-1/2 z-[2100]">
                <ResizeHandle
                  direction="left"
                  skill={sp.skill}
                  placedSkill={sp.placedSkill} // Pass the placedSkill
                  cellsToSpan={sp.skill.counts} // Pass the skill's total counts
                  onResizeComplete={(newCounts) => onUpdateSkillCounts?.(sp.skill.id, newCounts)}
                  isResizing={isResizing}
                />
              </div>
              <span className={`flex-1 font-semibold ${colors.text}`}>
                {sp.skill.name}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveSkill(sp.placedSkill.id);
                }}
                className={`p-0.5 rounded-full hover:bg-black/10 text-gray-500 hover:text-gray-700 transition-colors shrink-0 ${isCompact ? 'ml-2' : 'ml-2'}`}
                title="Remove skill"
              >
                <X className="h-3 w-3" />
              </button>
{/* Right resize handle - positioned absolutely at right edge */}
              <div className="absolute -right-2 top-1/2 -translate-y-1/2 z-[2100]">
                <ResizeHandle
                  direction="right"
                  skill={sp.skill}
                  placedSkill={sp.placedSkill} // Pass the placedSkill
                  cellsToSpan={sp.skill.counts} // Pass the skill's total counts
                  onResizeComplete={(newCounts) => onUpdateSkillCounts?.(sp.skill.id, newCounts)}
                  isResizing={isResizing}
                />
              </div>
            </div>
          );
        })}
      </td>
    );
  };

  const NotesCell = ({
  lineIndex,
  isEditing, // Added
  onSetEditingNoteLine, // Added
  onLineClick, // Pass down
  notes, // Pass down
  onUpdateNote, // Pass down
}: {
  lineIndex: number;
  isEditing: boolean; // Added
  onSetEditingNoteLine: (line: number | null) => void; // Added
  onLineClick: (lineIndex: number) => void; // Pass down
  notes: Record<number, string>; // Pass down
  onUpdateNote?: (lineIndex: number, note: string) => void; // Pass down
}) => {
    const [editValue, setEditValue] = React.useState(notes[lineIndex] || "");
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);

    React.useEffect(() => {
      if (isEditing && textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.select();
      }
    }, [isEditing]);

const handleClick = (e: React.MouseEvent) => {
  e.stopPropagation(); // Stop the click from bubbling to the <tr>
  onLineClick(lineIndex); // Explicitly select the line

  if (!isEditing) {
    setEditValue(notes[lineIndex] || "");
    onSetEditingNoteLine(lineIndex); // Set this line as editing in the parent
  }
};

    const handleSave = () => {
      onUpdateNote?.(lineIndex, editValue.trim());
      onSetEditingNoteLine(null);;
    };

    const handleCancel = () => {
      setEditValue(notes[lineIndex] || "");
      onSetEditingNoteLine(null);;
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSave();
      } else if (e.key === "Escape") {
        handleCancel();
      }
    };

    const handleBlur = () => {
      handleSave();
    };

    const currentNote = notes[lineIndex] || "";

    return (
      <td
        className="border border-border bg-card hover:bg-accent/50 h-10 p-1 text-xs cursor-text line-clamp-2 break-words"
        onClick={handleClick}
      >
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            className="w-full h-full bg-transparent border-none outline-none resize-none text-xs p-0 line-clamp-2 break-words"
            placeholder="Add note..."
          />
        ) : (
          <div className={`w-full line-clamp-2 break-words ${currentNote ? "text-foreground" : "text-muted-foreground"}`}>
            {currentNote || ""}
          </div>
        )}
      </td>
    );
  };

  const CountLine = ({ lineIndex }: { lineIndex: number }) => {
    const isSelected = selectedLine === lineIndex;

    return (
      <tr
        data-line={lineIndex}
        onClick={() => onLineClick(lineIndex)}
        className={`cursor-pointer transition-colors ${
          isSelected ? "bg-accent/30" : "hover:bg-accent/20"
        }`}
      >
        <td className="border border-border bg-muted font-bold text-center px-2 py-1 text-xs">
          {lineIndex + 1}
        </td>
        {Array.from({ length: 8 }, (_, i) => (
          <CountCell key={i} lineIndex={lineIndex} count={i + 1} />
        ))}
      </tr>
    );
  };

  const NotesLine = ({ lineIndex }: { lineIndex: number }) => {
    const isSelected = selectedLine === lineIndex;

    return (
      <tr
        onClick={() => onLineClick(lineIndex)}
        className={`cursor-pointer transition-colors ${
          isSelected ? "bg-accent/30" : "hover:bg-accent/20"
        }`}
      >
        <NotesCell
  lineIndex={lineIndex}
  isEditing={editingNoteLine === lineIndex}
  onSetEditingNoteLine={setEditingNoteLine}
  onLineClick={onLineClick}
  notes={notes}
  onUpdateNote={onUpdateNote}
/>
      </tr>
    );
  };

  return (
    <div className="h-full flex flex-col bg-card relative z-10 overflow-hidden">
      <div className="p-1.5 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">Count Sheet</h2>
            {!isPdfRender && (
              <MusicControls
                musicState={musicState}
                onUpload={handleMusicUpload}
                onPlay={play}
                onPause={pause}
                onStop={stop}
              />
            )}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {totalLines} lines @ {bpm} BPM
          </p>
          {musicState.file && (
            <p className="text-xs text-muted-foreground">
              {musicState.detectedBpm ? `${musicState.detectedBpm} BPM detected` : 'BPM detection failed'}
              {musicState.isSynced && ' • Synced'}
            </p>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto relative" id="count-sheet-container">
        {/* Music Progress Indicator */}
        {!isPdfRender && (
          <MusicProgressIndicator
            musicState={musicState}
            routineLength={routineLength}
            bpm={bpm}
            totalLines={totalLines}
            onLineSelect={onLineClick}
            onCurrentCellChange={(lineIndex, count) => {
              setHighlightedCell(lineIndex === -1 && count === -1 ? null : { lineIndex, count });
            }}
          />
        )}

        <div ref={containerRef} id="count-sheet-content-wrapper" className={`${!isPdfRender ? 'flex min-w-max relative' : 'flex w-1576px relative'}`}>
          {/* Count Sheet Table */}
          <div
  style={!isPdfRender ? { width: `${countSheetWidth}%`, minWidth: '690px' } : { width: '1000px' }}
  className="flex-shrink-0"
>
            <table className="border-collapse relative z-10 w-full" id="count-sheet-table">
              <thead className="sticky top-0 bg-card z-[4000]">
                <tr>
                  <th className="border border-border bg-muted font-bold text-center px-2 py-1 text-xs">#</th>
                  {Array.from({ length: 8 }, (_, i) => (
                    <th key={i} className="border border-border bg-muted font-bold text-center px-2 py-1 text-xs">
                      {i + 1}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: totalLines }, (_, i) => (
                  <CountLine key={i} lineIndex={i} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Resize Handle */}
{!isPdfRender && (
  <div
    className="w-0.5 bg-border hover:bg-accent cursor-col-resize flex-shrink-0 relative z-30"
    onMouseDown={handleMouseDown}
    title="Drag to resize panels"
  >
    <div className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-border hover:bg-accent transition-colors" />
  </div>
)}

          {/* Notes Table */}
          <div
  style={!isPdfRender ? { width: `${100 - countSheetWidth}%` } : { width: `300px` }}
  className="flex-shrink-0"
>
            <table className={cn(
              "border-collapse relative z-10",
              isPdfRender ? "w-full" : "w-full" // <-- EDIT THIS "max-w-xl" (e.g., max-w-lg, max-w-2xl) FOR THE PDF
            )}>
              <thead className="sticky top-0 bg-card z-[4000]">
                <tr>
                  <th className="border border-border bg-muted font-bold text-center px-2 py-1 text-xs">Notes</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: totalLines }, (_, i) => (
                  <NotesLine key={i} lineIndex={i} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* BPM Sync Dialog */}
      {!isPdfRender && (
        <BpmSyncDialog
          isOpen={showBpmSyncDialog}
          onOpenChange={setShowBpmSyncDialog}
          detectedBpm={pendingBpm || 0}
          currentRoutineBpm={bpm}
          onSync={handleBpmSync}
          onSkip={handleBpmSkip}
        />
      )}
    </div>
  );
};
