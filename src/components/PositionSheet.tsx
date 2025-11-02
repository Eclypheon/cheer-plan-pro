import React, { useState, useRef, useCallback } from "react";
import { useDroppable } from "@dnd-kit/core";
import type { PositionIcon } from "@/types/routine";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Plus, Undo, Redo, ToggleLeft, ToggleRight, Square, Circle, Triangle, X, ZoomIn, ZoomOut } from "lucide-react";
import { PositionIcon as PositionIconComponent } from "./PositionIcon";
import { PositionIconNameDialog } from "./PositionIconNameDialog";

interface PositionSheetProps {
  icons: PositionIcon[];
  selectedLine: number | null;
  onUpdateIcon: (id: string, x: number, y: number, shouldPropagate?: boolean) => void;
  onAddIcon: (type: PositionIcon["type"]) => void;
  onRemoveIcon: (id: string) => void;
  onRemoveMultipleIcons?: (ids: string[]) => void;
  onNameIcon: (id: string, name: string) => void;
  onRestoreLineState?: (lineIndex: number, icons: PositionIcon[]) => void;
  lineHistories: { [lineIndex: number]: { history: PositionIcon[][], index: number } };
  onUndoLine?: (lineIndex: number) => void;
  onRedoLine?: (lineIndex: number) => void;
  showGrid?: boolean;
  autoFollow?: boolean;
  onToggleAutoFollow?: () => void;
  isDraggingIcon?: boolean;
  dragOffset?: { x: number; y: number } | null;
  draggedIconId?: string | null;
  onSelectIcon?: (id: string) => void;
  onSelectMultiple?: (ids: string[]) => void;
  onNextLine?: () => void;
  onPrevLine?: () => void;
  onIconDragStart?: () => void;
  onIconDragEnd?: () => void;
  onIconDrop?: (event: { active: any, delta: { x: number; y: number }, zoomLevel: number }) => void;
  onZoomChange?: (zoomLevel: number) => void;
  pdfIcons?: PositionIcon[]; // Override icons for PDF generation
}

export const PositionSheet = ({
  icons,
  selectedLine,
  onUpdateIcon,
  onAddIcon,
  onRemoveIcon,
  onRemoveMultipleIcons,
  onNameIcon,
  onRestoreLineState,
  lineHistories,
  onUndoLine,
  onRedoLine,
  showGrid = false,
  autoFollow = true,
  onToggleAutoFollow,
  isDraggingIcon = false,
  dragOffset = null,
  draggedIconId = null,
  onSelectIcon,
  onSelectMultiple,
  onNextLine,
  onPrevLine,
  onIconDragStart,
  onIconDragEnd,
  onIconDrop,
  onZoomChange,
  pdfIcons,
}: PositionSheetProps) => {
  const [selectedIconId, setSelectedIconId] = useState<string | null>(null);
  const [nameDialogOpen, setNameDialogOpen] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  const [clickTimer, setClickTimer] = useState<NodeJS.Timeout | null>(null);
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<{ x: number; y: number } | null>(null);
  const [isDraggingSelection, setIsDraggingSelection] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(0.55); // Default zoom level (55%)
  const [isPinching, setIsPinching] = useState(false);
  const [initialPinchDistance, setInitialPinchDistance] = useState(0);
  const [initialZoomLevel, setInitialZoomLevel] = useState(1.0);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Set up droppable area for the position sheet grid
  const { setNodeRef, isOver } = useDroppable({
    id: "position-sheet-grid",
    data: { type: "position-sheet-grid" },
  });

  // Zoom handlers
  const handleZoomChange = useCallback((value: number[]) => {
    const newZoomLevel = value[0];
    setZoomLevel(newZoomLevel);
    onZoomChange?.(newZoomLevel);
  }, [onZoomChange]);

  const handleZoomIn = useCallback(() => {
    setZoomLevel(prev => {
      const newZoomLevel = Math.min(1.0, prev + 0.1);
      onZoomChange?.(newZoomLevel);
      return newZoomLevel;
    });
  }, [onZoomChange]);

  const handleZoomOut = useCallback(() => {
    setZoomLevel(prev => {
      const newZoomLevel = Math.max(0.25, prev - 0.1);
      onZoomChange?.(newZoomLevel);
      return newZoomLevel;
    });
  }, [onZoomChange]);

  // Pinch gesture handlers
  const getTouchDistance = useCallback((touches: React.TouchList) => {
    if (touches.length < 2) return 0;
    const touch1 = touches[0];
    const touch2 = touches[1];
    return Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) +
      Math.pow(touch2.clientY - touch1.clientY, 2)
    );
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      setIsPinching(true);
      setInitialPinchDistance(getTouchDistance(e.touches));
      setInitialZoomLevel(zoomLevel);
    }
  }, [getTouchDistance, zoomLevel]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (isPinching && e.touches.length === 2) {
      e.preventDefault();
      const currentDistance = getTouchDistance(e.touches);
      if (initialPinchDistance > 0) {
        const scale = currentDistance / initialPinchDistance;
        const newZoomLevel = Math.max(0.25, Math.min(1.0, initialZoomLevel * scale));
        setZoomLevel(newZoomLevel);
        onZoomChange?.(newZoomLevel);
      }
    }
  }, [isPinching, initialPinchDistance, initialZoomLevel, getTouchDistance, onZoomChange]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      setIsPinching(false);
      setInitialPinchDistance(0);
    }
  }, []);

  // Convert screen coordinates to zoom-adjusted coordinates
  const getZoomedCoordinates = useCallback((clientX: number, clientY: number) => {
    if (!sheetRef.current) return { x: 0, y: 0 };

    const rect = sheetRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // Calculate the position relative to the center
    const relativeX = clientX - centerX;
    const relativeY = clientY - centerY;

    // Adjust for zoom scaling - divide to get the zoomed-in coordinate
    const zoomedX = relativeX / zoomLevel;
    const zoomedY = relativeY / zoomLevel;

    // Convert back to absolute position within the 800x600 area
    const x = zoomedX + 400; // 800/2 = 400 (center offset)
    const y = zoomedY + 300; // 600/2 = 300 (center offset)

    // Clamp to the actual sheet boundaries
    return {
      x: Math.max(0, Math.min(800, x)),
      y: Math.max(0, Math.min(600, y))
    };
  }, [zoomLevel]);

  const handleSelectionMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const isIcon = target.closest('[data-position-icon]');

    // Only start selection if clicking on empty space (not on an icon)
    if (!isIcon && (e.target === e.currentTarget || target.closest('.sheet-background'))) {
      const coords = getZoomedCoordinates(e.clientX, e.clientY);
      setSelectionStart(coords);
      setSelectionEnd(null);
      setIsDraggingSelection(true);
    }
  };

  const handleSelectionMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only update selection rectangle if we're in selection mode (not dragging an icon)
    if (selectionStart && isDraggingSelection) {
      const coords = getZoomedCoordinates(e.clientX, e.clientY);
      setSelectionEnd(coords);
    }
  };

  const handleSelectionMouseUp = () => {
    if (selectionStart && selectionEnd && isDraggingSelection) {
      const minX = Math.min(selectionStart.x, selectionEnd.x);
      const maxX = Math.max(selectionStart.x, selectionEnd.x);
      const minY = Math.min(selectionStart.y, selectionEnd.y);
      const maxY = Math.max(selectionStart.y, selectionEnd.y);

      const selectedIds = lineIcons.filter(icon =>
        icon.x >= minX && icon.x <= maxX && icon.y >= minY && icon.y <= maxY
      ).map(icon => icon.id);

      onSelectMultiple?.(selectedIds);
    }
    setSelectionStart(null);
    setSelectionEnd(null);
    setIsDraggingSelection(false);
  };

  const handleUndo = () => {
    if (selectedLine !== null && onUndoLine) {
      onUndoLine(selectedLine);
    }
  };

  const handleRedo = () => {
    if (selectedLine !== null && onRedoLine) {
      onRedoLine(selectedLine);
    }
  };

  const handleIconClick = (iconId: string) => {
    setClickCount(prev => prev + 1);

    if (clickTimer) {
      clearTimeout(clickTimer);
    }

    const timer = setTimeout(() => {
      if (clickCount === 0) {
        // Single click - select icon
        onSelectIcon?.(iconId);
      } else if (clickCount === 1) {
        // Double click - edit name
        setSelectedIconId(iconId);
        setNameDialogOpen(true);
      }
      setClickCount(0);
    }, 250);

    setClickTimer(timer);
  };

  const handleSheetClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const isIcon = target.closest('[data-position-icon]');
    const isGridLine = target.closest('line'); // SVG grid lines
    const isMatLine = target.closest('.border-l'); // Mat division lines

    // If clicking on empty space (not on an icon, grid line, or mat line), deselect all
    if (!isIcon && !isGridLine && !isMatLine && (e.target === e.currentTarget || target.closest('.sheet-background'))) {
      // Deselect all icons by updating their selected state to false
      icons.forEach(icon => {
        if (icon.selected) {
          onUpdateIcon(icon.id, icon.x, icon.y, false);
        }
      });
    }
  };

  const handleSaveName = (name: string) => {
    if (selectedIconId) {
      onNameIcon(selectedIconId, name);
    }
  };

  if (selectedLine === null) {
    return (
      <Card className="h-full flex items-center justify-center p-8">
        <p className="text-muted-foreground text-center">
          Click on a count line to view positions
        </p>
      </Card>
    );
  }

  const lineIcons = pdfIcons || icons.filter((i) => i.lineIndex === selectedLine);
  const selectedIcon = icons.find((i) => i.id === selectedIconId);
  const selectedIconsCount = lineIcons.filter(i => i.selected).length;
  const isMultiDrag = selectedIconsCount > 1 && dragOffset !== null;

return (
  <>
    <Card className="h-full flex flex-col relative z-10" id="position-sheet">
      {/* Header */}
      <div className="p-1.5 border-b relative z-10">
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1">
            <h3 className="text-sm font-semibold">Line {selectedLine + 1}</h3>
            <Button size="sm" variant="ghost" className="h-6 px-1.5 text-xs" onClick={() => onAddIcon("square")}>
              <Square className="h-3 w-3 mr-0.5" />
              Base
            </Button>
            <Button size="sm" variant="ghost" className="h-6 px-1.5 text-xs" onClick={() => onAddIcon("circle")}>
              <Circle className="h-2.5 w-2.5 mr-0.5" />
              Mid
            </Button>
            <Button size="sm" variant="ghost" className="h-6 px-1.5 text-xs" onClick={() => onAddIcon("x")}>
              <Triangle className="h-3 w-3 mr-0.5" />
              Fly
            </Button>
          </div>
          <div className="flex gap-1 items-center">
            <span className="text-xs text-muted-foreground">Auto follow</span>
            <Button
              size="sm"
              variant={autoFollow ? "default" : "outline"}
              className="h-6 px-1.5 text-xs"
              onClick={onToggleAutoFollow}
            >
              {autoFollow ? <ToggleRight className="h-3 w-3" /> : <ToggleLeft className="h-3 w-3" />}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-6 px-1"
              onClick={handleUndo}
              disabled={selectedLine === null || !lineHistories[selectedLine] || lineHistories[selectedLine].index <= 0}
            >
              <Undo className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-6 px-1"
              onClick={handleRedo}
              disabled={
                selectedLine === null ||
                !lineHistories[selectedLine] ||
                lineHistories[selectedLine].index >= lineHistories[selectedLine].history.length - 1
              }
            >
              <Redo className="h-3 w-3" />
            </Button>
            {selectedIconsCount > 0 && (
              <Button
                size="sm"
                variant="destructive"
                className="h-6 px-1.5 text-xs"
                onClick={() => {
                  const selectedIds = lineIcons.filter(i => i.selected).map(i => i.id);
                  // Use the bulk delete function if available
                  if (onRemoveMultipleIcons) {
                    onRemoveMultipleIcons(selectedIds);
                  } else {
                    // Fallback to individual deletions
                    selectedIds.forEach(id => onRemoveIcon(id));
                  }
                }}
              >
                <X className="h-3 w-3 mr-0.5" />
                Delete ({selectedIconsCount})
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content area with zoom controls and position sheet */}
      <div className="flex-1 flex overflow-hidden">
        {/* Zoom controls sidebar */}
        <div className="flex flex-col items-center justify-center p-2 border-r border-border bg-muted/20" style={{ width: '30px' }}>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 mb-1"
            onClick={handleZoomIn}
            disabled={zoomLevel >= 1.0}
            title="Zoom in"
          >
            <ZoomIn className="h-3 w-3" />
          </Button>
          <div className="flex flex-col items-center gap-2">
            <Slider
              value={[zoomLevel]}
              onValueChange={handleZoomChange}
              min={0.25}
              max={1.0}
              step={0.05}
              orientation="vertical"
              className="h-32 w-2"
            />
            <span className="text-xs text-muted-foreground leading-none font-medium">
              {Math.round(zoomLevel * 100)}%
            </span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 mt-1"
            onClick={handleZoomOut}
            disabled={zoomLevel <= 0.25}
            title="Zoom out"
          >
            <ZoomOut className="h-3 w-3" />
          </Button>
        </div>

        {/* Position sheet */}
        <div id="position-sheet-container" className="flex-1 p-1.5 flex flex-col items-center overflow-auto">
          {/* ----- START OF ADDED CODE ----- */}
          <div
            className="text-2xl font-medium text-foreground mb-1"
            style={{
              width: `${800 * zoomLevel}px`,
              textAlign: 'center',
              flexShrink: 0,
              transition: 'width 0.1s ease-out'
            }}
          >
            Audience
          </div>
          {/* ----- END OF ADDED CODE ----- */}

          {/* This is the wrapper div that fixes the scroll issue.
            Its size is what the scroll-container "sees".
            It shrinks and grows with the zoomLevel, eliminating empty scroll space.
          */}
          <div
            style={{
              width: `${800 * zoomLevel}px`,
              height: `${600 * zoomLevel}px`,
              flexShrink: 0,
              transition: 'width 0.1s ease-out, height 0.1s ease-out'
            }}
          >
            <div
              id="position-sheet-visual"
              ref={(node) => {
                sheetRef.current = node;
                setNodeRef(node);
              }}
              className={`sheet-background relative bg-background border-4 border-border rounded ${
                isOver ? "bg-accent/10" : ""
              }`}
              style={{
                width: '800px',
                height: '600px',
                flexShrink: 0,
                transform: `scale(${zoomLevel})`,
                transformOrigin: 'top left', // Scale from the top-left corner
                transition: 'transform 0.1s ease-out'
              }}
              onMouseDown={handleSelectionMouseDown}
              onMouseMove={handleSelectionMouseMove}
              onMouseUp={handleSelectionMouseUp}
              onClick={handleSheetClick}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {/* Grid overlay - 36x36 grid */}
              {(showGrid || isDraggingIcon) && (
                <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 5 }}>
                  {Array.from({ length: 37 }, (_, i) => (
                    <line
                      key={`v-${i}`}
                      x1={`${(i / 36) * 100}%`}
                      y1="0"
                      x2={`${(i / 36) * 100}%`}
                      y2="100%"
                      stroke="currentColor"
                      strokeOpacity="0.2"
                      strokeWidth="0.5"
                    />
                  ))}
                  {Array.from({ length: 37 }, (_, i) => (
                    <line
                      key={`h-${i}`}
                      x1="0"
                      y1={`${(i / 36) * 100}%`}
                      x2="100%"
                      y2={`${(i / 36) * 100}%`}
                      stroke="currentColor"
                      strokeOpacity="0.2"
                      strokeWidth="0.5"
                    />
                  ))}
                </svg>
              )}

              {/* 9 vertical lines representing roll mats */}
              {Array.from({ length: 9 }, (_, i) => (
                <div
                  key={i}
                  className="absolute top-0 bottom-0 border-l-2 border-muted pointer-events-none"
                  style={{ left: `${(i / 9) * 100}%`, zIndex: 1 }}
                />
              ))}

              {/* Selection rectangle - only show when dragging on empty space */}
              {selectionStart && selectionEnd && isDraggingSelection && (
                <div
                  className="absolute border-2 border-accent bg-accent/20 pointer-events-none"
                  style={{
                    left: Math.min(selectionStart.x, selectionEnd.x),
                    top: Math.min(selectionStart.y, selectionEnd.y),
                    width: Math.abs(selectionEnd.x - selectionStart.x),
                    height: Math.abs(selectionEnd.y - selectionStart.y),
                    zIndex: 10,
                  }}
                />
              )}

              {/* Position icons */}
              {lineIcons.map((icon) => (
                <PositionIconComponent
                  key={icon.id}
                  icon={icon}
                  onUpdate={(x, y) => onUpdateIcon(icon.id, x, y)}
                  onClick={() => handleIconClick(icon.id)}
                  onRemove={onRemoveIcon}
                  dragOffset={dragOffset}
                  isMultiDrag={isMultiDrag}
                  zoomLevel={zoomLevel}
                  getZoomedCoordinates={getZoomedCoordinates}
                  onDragEnd={(event) => {
                    if (onIconDrop) {
                      onIconDrop({ active: event.active, delta: event.delta, zoomLevel });
                    }
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </Card>

    <PositionIconNameDialog
      open={nameDialogOpen}
      onOpenChange={setNameDialogOpen}
      currentName={selectedIcon?.name || ""}
      onSave={handleSaveName}
    />
  </>
);
};