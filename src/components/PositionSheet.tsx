import React, { useState, useRef, useCallback, useEffect } from "react";
import { useDroppable, Active } from "@dnd-kit/core";
import type { PositionIcon, Arrow } from "@/types/routine";
import { ArrowComponent } from "./Arrow";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Plus, Undo, Redo, ToggleLeft, ToggleRight, Square, Circle, Triangle, X, ZoomIn, ZoomOut, Trash2, ArrowRight } from "lucide-react";
import { PositionIcon as PositionIconComponent } from "./PositionIcon";
import { PositionIconNameDialog } from "./PositionIconNameDialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface PositionSheetProps {
  icons: PositionIcon[];
  arrows?: Arrow[];
  selectedLine: number | null;
  onUpdateIcon: (id: string, x: number, y: number, shouldPropagate?: boolean) => void;
  onAddIcon: (type: PositionIcon["type"]) => void;
  onRemoveIcon: (id: string) => void;
  onRemoveMultipleIcons?: (ids: string[]) => void;
  onNameIcon: (id: string, name: string) => void;
  onRestoreLineState?: (lineIndex: number, icons: PositionIcon[]) => void;
  lineHistories: { [lineIndex: number]: { iconHistory: PositionIcon[][], arrowHistory: Arrow[][], index: number } };
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
  onIconDrop?: (event: { active: Active, delta: { x: number; y: number }, zoomLevel: number }) => void;
  onZoomChange?: (zoomLevel: number) => void;
  // Arrow-related functions
  onAddArrow?: (arrow: Omit<Arrow, 'id'>) => void;
  onUpdateArrow?: (id: string, arrow: Partial<Arrow>) => void;
  onRemoveArrow?: (id: string) => void;
  onRemoveMultipleArrows?: (ids: string[]) => void;
  onSelectArrow?: (id: string) => void;
  onSelectMultipleArrows?: (ids: string[]) => void;
  segmentName?: string;
  onUpdateSegmentName?: (name: string) => void;
  pdfIcons?: PositionIcon[]; // Override icons for PDF generation
  pdfArrows?: Arrow[]; // Override arrows for PDF generation
  pdfSegmentName?: string;
  zoomLevel?: number; // Override zoom level for PDF generation
}

export const PositionSheet = ({
  icons,
  arrows = [],
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
  // Arrow-related props
  onAddArrow,
  onUpdateArrow,
  onRemoveArrow,
  onRemoveMultipleArrows,
  onSelectArrow,
  onSelectMultipleArrows,
  segmentName,
  onUpdateSegmentName,
  pdfIcons,
  pdfArrows,
  pdfSegmentName, // ----- ADD THIS LINE -----
  zoomLevel: propZoomLevel,
}: PositionSheetProps) => {
  const isMobile = useIsMobile();
  const [selectedIconId, setSelectedIconId] = useState<string | null>(null);
  const [nameDialogOpen, setNameDialogOpen] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  const [clickTimer, setClickTimer] = useState<NodeJS.Timeout | null>(null);
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<{ x: number; y: number } | null>(null);
  const [isDraggingSelection, setIsDraggingSelection] = useState(false);
  const [isArrowDrawingMode, setIsArrowDrawingMode] = useState(false);
  const [arrowDrawingStart, setArrowDrawingStart] = useState<{ x: number; y: number } | null>(null);
  const [arrowDrawingEnd, setArrowDrawingEnd] = useState<{ x: number; y: number } | null>(null);
  const [zoomLevel, setZoomLevel] = useState(0.55); // Default zoom level (55%)
  const [isPinching, setIsPinching] = useState(false);
  const [initialPinchDistance, setInitialPinchDistance] = useState(0);
  const [initialZoomLevel, setInitialZoomLevel] = useState(1.0);
  const [previewPosition, setPreviewPosition] = useState<{ x: number; y: number } | null>(null);
  const [previewSheetCoords, setPreviewSheetCoords] = useState<{ x: number; y: number } | null>(null);
  const [isOverflowingHorizontally, setIsOverflowingHorizontally] = useState(true);
  const sheetRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const handleArrowToolClick = useCallback(() => {
    setIsArrowDrawingMode(prev => !prev);
  }, []);

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

  // Use prop zoom level if provided, otherwise use internal state
  const effectiveZoomLevel = propZoomLevel ?? zoomLevel;

  // Check for horizontal overflow
  useEffect(() => {
    const checkOverflow = () => {
      if (containerRef.current) {
        const container = containerRef.current;
        const contentWidth = 800 * effectiveZoomLevel + 24; // 800px content + 24px padding (12px * 2)
        const containerWidth = container.clientWidth;
        setIsOverflowingHorizontally(contentWidth > containerWidth);
      }
    };

    checkOverflow();

    // Set up ResizeObserver to watch for container size changes
    const resizeObserver = new ResizeObserver(checkOverflow);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [effectiveZoomLevel, selectedLine]);

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

    // Update preview position during icon dragging on mobile
    if (isMobile && isDraggingIcon && e.touches.length === 1 && draggedIconId && dragOffset) {
      const touch = e.touches[0];
      const screenPos = { x: touch.clientX, y: touch.clientY };

      // Calculate the current position of the dragged icon based on dragOffset
      const draggedIcon = icons.find(icon => icon.id === draggedIconId);
      if (draggedIcon) {
        const currentX = draggedIcon.x + dragOffset.x / effectiveZoomLevel;
        const currentY = draggedIcon.y + dragOffset.y / effectiveZoomLevel;
        setPreviewSheetCoords({ x: currentX, y: currentY });
      }

      setPreviewPosition(screenPos);
    }
  }, [isPinching, initialPinchDistance, initialZoomLevel, getTouchDistance, onZoomChange, isMobile, isDraggingIcon, draggedIconId, dragOffset, icons, effectiveZoomLevel]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      setIsPinching(false);
      setInitialPinchDistance(0);
    }

    // Clear preview position when touch ends
    if (isMobile) {
      setPreviewPosition(null);
      setPreviewSheetCoords(null);
    }
  }, [isMobile]);

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
    const zoomedX = relativeX / effectiveZoomLevel;
    const zoomedY = relativeY / effectiveZoomLevel;

    // Convert back to absolute position within the 800x600 area
    const x = zoomedX + 400; // 800/2 = 400 (center offset)
    const y = zoomedY + 300; // 600/2 = 300 (center offset)

    // Clamp to the actual sheet boundaries
    return {
      x: Math.max(0, Math.min(800, x)),
      y: Math.max(0, Math.min(600, y))
    };
  }, [effectiveZoomLevel]);

  const handleSelectionMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const isIcon = target.closest('[data-position-icon]');
    const isArrow = target.closest('[data-arrow]');

    // If in arrow drawing mode, start drawing arrow instead of regular selection
    if (isArrowDrawingMode) {
      const coords = getZoomedCoordinates(e.clientX, e.clientY);

      if (!arrowDrawingStart) {
        // First click - set start point
        setArrowDrawingStart(coords);
        setArrowDrawingEnd(coords); // Initialize end to start position
      } else {
        // Second click - create the arrow
        if (onAddArrow && selectedLine !== null) {
          const newArrow: Omit<Arrow, 'id'> = {
            start: { ...arrowDrawingStart },
            end: { ...coords },
            lineIndex: selectedLine,
          };
          onAddArrow(newArrow);
        }
        // Reset arrow drawing state and exit arrow drawing mode
        setArrowDrawingStart(null);
        setArrowDrawingEnd(null);
        setIsArrowDrawingMode(false);
      }
      return; // Early return to prevent regular selection
    }

    // Only start selection if clicking on empty space (not on an icon or arrow) and not dragging
    if (!isIcon && !isArrow && !isDraggingIcon && (e.target === e.currentTarget || target.closest('.sheet-background'))) {
      const coords = getZoomedCoordinates(e.clientX, e.clientY);
      setSelectionStart(coords);
      setSelectionEnd(null);
      setIsDraggingSelection(true);
    }
  };

  const handleSelectionMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    // Update arrow preview if drawing arrow
    if (isArrowDrawingMode && arrowDrawingStart) {
      const coords = getZoomedCoordinates(e.clientX, e.clientY);
      setArrowDrawingEnd(coords);
    }
    // Only update selection rectangle if we're in selection mode (not dragging an icon)
    else if (selectionStart && isDraggingSelection) {
      const coords = getZoomedCoordinates(e.clientX, e.clientY);
      setSelectionEnd(coords);
    }
  };

  // Helper function to check if an arrow intersects with a rectangle
  const doesArrowIntersectRectangle = (arrow: Arrow, rect: { minX: number; maxX: number; minY: number; maxY: number }, zoomLevel: number): boolean => {
    // Calculate the arrow's visual bounding box (same as ArrowComponent)
    const angle = Math.atan2(arrow.end.y - arrow.start.y, arrow.end.x - arrow.start.x);
    const arrowheadLength = 15;

    // Calculate arrowhead extents (using the rotated angles)
    const angle1 = angle + Math.PI - (25 * Math.PI) / 180; // 180° - 25°
    const angle2 = angle + Math.PI + (25 * Math.PI) / 180; // 180° + 25°

    const arrowhead1X = arrow.end.x + arrowheadLength * Math.cos(angle1);
    const arrowhead1Y = arrow.end.y + arrowheadLength * Math.sin(angle1);
    const arrowhead2X = arrow.end.x + arrowheadLength * Math.cos(angle2);
    const arrowhead2Y = arrow.end.y + arrowheadLength * Math.sin(angle2);

    // Include arrowheads in bounding box
    const allX = [arrow.start.x, arrow.end.x, arrowhead1X, arrowhead2X];
    const allY = [arrow.start.y, arrow.end.y, arrowhead1Y, arrowhead2Y];

    const arrowMinX = Math.min(...allX);
    const arrowMaxX = Math.max(...allX);
    const arrowMinY = Math.min(...allY);
    const arrowMaxY = Math.max(...allY);

    // Add padding for stroke width (8px max stroke + some buffer)
    const padding = 10;
    const arrowLeft = arrowMinX - padding;
    const arrowTop = arrowMinY - padding;
    const arrowRight = arrowMaxX + padding;
    const arrowBottom = arrowMaxY + padding;

    // Check if the arrow bounding box intersects with the selection rectangle
    // Both are in the same unzoomed coordinate system
    return !(arrowRight < rect.minX || arrowLeft > rect.maxX || arrowBottom < rect.minY || arrowTop > rect.maxY);
  };

  const handleSelectionMouseUp = () => {
    // Handle arrow drawing completion if needed
    if (isArrowDrawingMode && !arrowDrawingStart) {
      // If we were in arrow drawing mode but didn't start drawing, exit arrow mode
      setIsArrowDrawingMode(false);
    }
    
    if (selectionStart && selectionEnd && isDraggingSelection) {
      const minX = Math.min(selectionStart.x, selectionEnd.x);
      const maxX = Math.max(selectionStart.x, selectionEnd.x);
      const minY = Math.min(selectionStart.y, selectionEnd.y);
      const maxY = Math.max(selectionStart.y, selectionEnd.y);

      // Select icons that are within the rectangle
      const selectedIconIds = lineIcons.filter(icon =>
        icon.x >= minX && icon.x <= maxX && icon.y >= minY && icon.y <= maxY
      ).map(icon => icon.id);

      // Select arrows that intersect with the rectangle
      const selectedArrowIds = lineArrows.filter(arrow =>
        doesArrowIntersectRectangle(arrow, { minX, maxX, minY, maxY }, effectiveZoomLevel)
      ).map(arrow => arrow.id);

      // Call the appropriate selection callbacks
      onSelectMultiple?.(selectedIconIds);
      onSelectMultipleArrows?.(selectedArrowIds);
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

  // Helper function to check if a point is close to a line segment (arrow)
  const isPointNearArrow = (point: { x: number; y: number }, arrow: Arrow, tolerance: number = 10): boolean => {
    const { start, end } = arrow;
    
    // Calculate distance from point to line segment
    // Using the formula for distance from point to line segment
    const A = point.x - start.x;
    const B = point.y - start.y;
    const C = end.x - start.x;
    const D = end.y - start.y;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    
    if (lenSq === 0) return Math.sqrt(A * A + B * B) < tolerance;

    let param = dot / lenSq;

    // Keep param within [0, 1] to stay within the segment
    param = Math.max(0, Math.min(1, param));

    const xx = start.x + param * C;
    const yy = start.y + param * D;

    const dx = point.x - xx;
    const dy = point.y - yy;

    return Math.sqrt(dx * dx + dy * dy) < tolerance;
  };

  // ----- MODIFY THESE LINES -----
  const isPdfRender = pdfIcons !== undefined;
  const lineIcons = isPdfRender ? pdfIcons : icons.filter((i) => i.lineIndex === selectedLine);
  const lineArrows = isPdfRender ? (pdfArrows || []) : arrows.filter((a) => a.lineIndex === selectedLine);
  const currentSegmentName = isPdfRender ? (pdfSegmentName || "") : (segmentName || "");
  // ----- END OF MODIFICATION -----

  // Handle keyboard events for arrow deletion
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if delete or backspace key was pressed
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedLine !== null) {
        // Delete selected position icons
        const selectedIcons = lineIcons.filter(icon => icon.selected);
        if (selectedIcons.length > 0) {
          const selectedIds = selectedIcons.map(icon => icon.id);
          // Use the bulk delete function if available
          if (onRemoveMultipleIcons) {
            onRemoveMultipleIcons(selectedIds);
          } else {
            // Fallback to individual deletions
            selectedIds.forEach(id => onRemoveIcon(id));
          }
        }

        // Delete selected arrows
        const selectedArrows = lineArrows.filter(arrow => arrow.selected);
        if (selectedArrows.length > 0) {
          const selectedArrowIds = selectedArrows.map(arrow => arrow.id);
          // Use the bulk delete function if available
          if (onRemoveMultipleArrows) {
            onRemoveMultipleArrows(selectedArrowIds);
          } else {
            // Fallback to individual deletions
            selectedArrowIds.forEach(id => onRemoveArrow?.(id));
          }
        }
      }
    };

    // Add event listener when component mounts
    window.addEventListener('keydown', handleKeyDown);

    // Cleanup event listener when component unmounts
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [lineIcons, lineArrows, selectedLine, onRemoveMultipleIcons, onRemoveMultipleArrows, onRemoveIcon, onRemoveArrow]);

  const handleSheetClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const isIcon = target.closest('[data-position-icon]');
    const isGridLine = target.closest('line'); // SVG grid lines
    const isMatLine = target.closest('.border-l'); // Mat division lines

    // Check if clicking on an arrow
    const clickCoords = getZoomedCoordinates(e.clientX, e.clientY);
    const clickedArrow = lineArrows.find(arrow => isPointNearArrow(clickCoords, arrow));
    
    // If clicking on an arrow
    if (clickedArrow && !isIcon && !isGridLine && !isMatLine) {
      onSelectArrow?.(clickedArrow.id);
      return; // Exit early to avoid deselecting
    }

    // If clicking on empty space (not on an icon, grid line, or mat line), deselect all
    // But only if we didn't just finish creating a selection rectangle
    if (!isIcon && !isGridLine && !isMatLine && (e.target === e.currentTarget || target.closest('.sheet-background'))) {
      // Don't deselect if we just finished creating a selection rectangle
      if (!selectionStart || !selectionEnd) {
        // Deselect all icons by updating their selected state to false
        icons.forEach(icon => {
          if (icon.selected) {
            onUpdateIcon(icon.id, icon.x, icon.y, false);
          }
        });

        // Also deselect all arrows
        lineArrows.forEach(arrow => {
          if (arrow.selected) {
            onUpdateArrow?.(arrow.id, { ...arrow, selected: false });
          }
        });
      }
    }
  };

  const handleSaveName = (name: string) => {
    if (selectedIconId) {
      onNameIcon(selectedIconId, name);
    }
  };

  if (selectedLine === null && !isPdfRender) { // Keep showing sheet for PDF render
    return (
      <Card className="h-full flex items-center justify-center p-8">
        <p className="text-muted-foreground text-center">
          Click on a count line to view positions
        </p>
      </Card>
    );
  }

  const selectedIcon = icons.find((i) => i.id === selectedIconId);
  const selectedIconsCount = lineIcons.filter(i => i.selected).length;
  const selectedArrowsCount = lineArrows.filter(a => a.selected).length;
  const totalSelectedCount = selectedIconsCount + selectedArrowsCount;
  const isMultiDrag = selectedIconsCount > 1 && dragOffset !== null;

return (
  <>
    <Card className="h-full flex flex-col relative z-10" id="position-sheet">
      {/* Header */}
      <div className="p-1.5 border-b relative z-10">
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-0.5">
            <h3 className="text-sm font-semibold">Line {selectedLine !== null ? selectedLine + 1 : 'PDF'}</h3>
            <Button size="sm" variant="ghost" className="h-6 px-0.25 text-xs" onClick={() => onAddIcon("square")}>
              <Square className="h-3 w-3 mr-0.5" />
              
            </Button>
            <Button size="sm" variant="ghost" className="h-6 px-0.25 text-xs" onClick={() => onAddIcon("circle")}>
              <Circle className="h-3 w-3 mr-0.5" />
              
            </Button>
            <Button size="sm" variant="ghost" className="h-6 px-0.25 text-xs" onClick={() => onAddIcon("x")}>
              <Triangle className="h-3 w-3 mr-0.5" />
              
            </Button>
          </div>
          <div className="flex gap-1 items-center">
            <span className="text-xs text-muted-foreground">Propagate Changes</span>
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
                lineHistories[selectedLine].index >= lineHistories[selectedLine].iconHistory.length - 1
              }
            >
              <Redo className="h-3 w-3" />
            </Button>
            {totalSelectedCount > 0 && (
              <Button
                size="sm"
                variant="destructive"
                className="h-6 px-1.5 text-xs"
                onClick={() => {
                  // Delete selected position icons
                  const selectedIconIds = lineIcons.filter(i => i.selected).map(i => i.id);
                  if (selectedIconIds.length > 0) {
                    // Use the bulk delete function if available
                    if (onRemoveMultipleIcons) {
                      onRemoveMultipleIcons(selectedIconIds);
                    } else {
                      // Fallback to individual deletions
                      selectedIconIds.forEach(id => onRemoveIcon(id));
                    }
                  }
                  
                  // Delete selected arrows
                  const selectedArrowIds = lineArrows.filter(a => a.selected).map(a => a.id);
                  if (selectedArrowIds.length > 0) {
                    // Use the bulk delete function if available
                    if (onRemoveMultipleArrows) {
                      onRemoveMultipleArrows(selectedArrowIds);
                    } else {
                      // Fallback to individual deletions
                      selectedArrowIds.forEach(id => onRemoveArrow?.(id));
                    }
                  }
                }}
              >
                <Trash2 className="h-3 w-3" />
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
            variant={isArrowDrawingMode ? "default" : "ghost"}
            className="h-6 w-6 p-0 mb-1"
            onClick={handleArrowToolClick}
            title="Arrow tool"
          >
            <ArrowRight className="h-3 w-3" />
          </Button>
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
        <div
          id="position-sheet-container"
          ref={containerRef}
          className={cn(
            "flex-1 p-1.5 flex flex-col overflow-auto",
            isOverflowingHorizontally ? "items-start" : "items-center"
          )}
        >
          <div id="position-sheet-content-wrapper" className="flex flex-col items-center">
          {/* ----- START OF MODIFIED CODE ----- */}
          <div
            className="flex justify-between items-center mb-1" // Use justify-between
            style={{
              width: `${800 * effectiveZoomLevel}px`,
              flexShrink: 0,
              transition: 'width 0.1s ease-out'
            }}
          >
            {/* 1. Segment Name (Top Left) */}
            <Input
              placeholder="Segment name"
              value={currentSegmentName}
              onChange={(e) => onUpdateSegmentName?.(e.target.value)}
              readOnly={isPdfRender}
              className={cn(
                "h-8 border-none bg-transparent p-0 shadow-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0",
                currentSegmentName ? "font-medium text-foreground" : "",
                "placeholder:font-medium placeholder:text-muted-foreground",
                isPdfRender ? "focus-visible:ring-0" : "" // Hide focus ring during PDF render
              )}
              style={{
                width: '33.33%',
                fontSize: `${(currentSegmentName ? 18 : 18) * effectiveZoomLevel}px`
              }}
            />

            {/* 2. Audience (Centered) */}
            <div
              className="font-medium text-foreground"
              style={{
                width: '33.33%',
                textAlign: 'center',
                fontSize: `${32 * effectiveZoomLevel}px`
              }}
            >
              Audience
            </div>

            {/* 3. Spacer (Top Right) */}
            <div style={{ width: '33.33%' }} />
          </div>
          {/* ----- END OF MODIFIED CODE ----- */}


          {/* This is the wrapper div that fixes the scroll issue.
            Its size is what the scroll-container "sees".
            It shrinks and grows with the zoomLevel, eliminating empty scroll space.
          */}
          <div
            style={{
              width: `${800 * effectiveZoomLevel}px`,
              height: `${600 * effectiveZoomLevel}px`,
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
                transform: `scale(${effectiveZoomLevel})`,
                transformOrigin: 'top left', // Scale from the top-left corner
                transition: 'transform 0.1s ease-out',
                cursor: isArrowDrawingMode ? 'crosshair' : 'default'
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

              {/* Temporary arrow preview - only show when drawing an arrow */}
              {isArrowDrawingMode && arrowDrawingStart && arrowDrawingEnd && (
                <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 8 }}>
                  <line
                    x1={arrowDrawingStart.x}
                    y1={arrowDrawingStart.y}
                    x2={arrowDrawingEnd.x}
                    y2={arrowDrawingEnd.y}
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeOpacity="0.7"
                  />
                  {/* Arrowhead - pointing in the direction from start to end */}
                  {(() => {
                    // Calculate angle for arrowhead
                    const angle = Math.atan2(
                      arrowDrawingEnd.y - arrowDrawingStart.y,
                      arrowDrawingEnd.x - arrowDrawingStart.x
                    ) * 180 / Math.PI;
                    
                    // Calculate endpoint with small offset for arrowhead placement
                    const endX = arrowDrawingEnd.x - 10 * Math.cos((angle * Math.PI) / 180);
                    const endY = arrowDrawingEnd.y - 10 * Math.sin((angle * Math.PI) / 180);
                    
                    return (
                      <>
                        {/* Arrowhead line 1 */}
                        <line
                          x1={endX}
                          y1={endY}
                          x2={arrowDrawingEnd.x}
                          y2={arrowDrawingEnd.y}
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeOpacity="0.7"
                          transform={`rotate(${angle - 25}, ${endX}, ${endY})`}
                        />
                        {/* Arrowhead line 2 */}
                        <line
                          x1={endX}
                          y1={endY}
                          x2={arrowDrawingEnd.x}
                          y2={arrowDrawingEnd.y}
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeOpacity="0.7"
                          transform={`rotate(${angle + 25}, ${endX}, ${endY})`}
                        />
                      </>
                    );
                  })()}
                </svg>
              )}

              {/* Arrows */}
              {lineArrows.map((arrow) => (
                <ArrowComponent
                  key={arrow.id}
                  arrow={arrow}
                  onSelectArrow={onSelectArrow}
                  zoomLevel={zoomLevel}
                />
              ))}

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
      </div>
    </Card>

    <PositionIconNameDialog
      open={nameDialogOpen}
      onOpenChange={setNameDialogOpen}
      currentName={selectedIcon?.name || ""}
      onSave={handleSaveName}
    />

    {/* Mobile drag preview */}
    {isMobile && isDraggingIcon && previewPosition && previewSheetCoords && (
      <div
        className="fixed top-4 left-4 w-32 h-32 bg-background border-2 border-border rounded-lg shadow-lg z-[9999] pointer-events-none overflow-hidden"
        style={{
          transform: 'translateZ(0)', // Force hardware acceleration
        }}
      >
        <div className="w-full h-full relative">
          {/* Segment name overlay - positioned outside scaled container */}
          <div
            className="absolute top-1 left-1 right-1 flex justify-between items-center z-10"
            style={{
              transform: 'scale(0.25)',
              transformOrigin: 'top left',
              width: `${800 / 0.25}px`,
            }}
          >
<div style={{ width: '33.33%', position: 'relative' }}>
  <div 
    className="text-lg font-medium" 
    style={{ fontSize: '18px' }}
  >
    {/* Segment name on the left */}
    <span style={{ position: 'absolute', left: 0 }}>
      {currentSegmentName || 'Segment name'}
    </span>
    
    {/* Audience in the center */}
    <span style={{ 
      position: 'absolute', 
      left: 190, 
    }}>
      Audience
    </span>
  </div>
</div>
            <div style={{ width: '33.33%' }} />
          </div>

          {/* Mini position sheet background */}
          <div
            className="absolute inset-0 bg-background rounded"
            style={{
              transform: `scale(0.25) translate(${200 - previewSheetCoords.x}px, ${150 - previewSheetCoords.y}px)`,
              transformOrigin: 'top left',
            }}
          >
            {/* Grid overlay */}
            {(showGrid || isDraggingIcon) && (
              <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 5, width:'640%', height: '500%' }}>
                {Array.from({ length: 37 }, (_, i) => (
                  <line
                    key={`preview-v-${i}`}
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
                    key={`preview-h-${i}`}
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

            {/* Mat lines */}
            {Array.from({ length: 9 }, (_, i) => (
              <div
                key={`preview-mat-${i}`}
                className="absolute top-0 bottom-0 border-l-2 border-muted pointer-events-none"
                style={{ left: `${(i / 9) * 640}%`, zIndex: 1, height: '500%' }}
              />
            ))}

            {/* Mini position icons - exclude dragged icon from static rendering */}
            {lineIcons.filter(icon => icon.id !== draggedIconId).map((icon) => (
              <div
                key={`preview-${icon.id}`}
                className="absolute w-20 h-20 -ml-12 -mt-12 flex items-center justify-center"
                style={{
                  left: `${icon.x}px`,
                  top: `${icon.y}px`,
                }}
              >
                {icon.type === "square" && <Square className="w-20 h-20" />}
                {icon.type === "circle" && <Circle className="w-20 h-20" />}
                {icon.type === "x" && <Triangle className="w-20 h-20" />}
                {icon.name && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="text-blue-900 dark:text-blue-100 text-base font-medium text-center leading-tight max-w-full px-1">
                      {icon.name}
                    </span>
                  </div>
                )}
              </div>
            ))}

            {/* Dragged icon positioned at current drag location */}
            {(() => {
              const draggedIcon = lineIcons.find(icon => icon.id === draggedIconId);
              if (!draggedIcon) return null;

              return (
                <div
                  className="absolute w-20 h-20 -ml-12 -mt-12 flex items-center justify-center z-10"
                  style={{
                    left: `${previewSheetCoords.x}px`,
                    top: `${previewSheetCoords.y}px`,
                  }}
                >
                  {draggedIcon.type === "square" && <Square className="w-20 h-20" />}
                  {draggedIcon.type === "circle" && <Circle className="w-20 h-20" />}
                  {draggedIcon.type === "x" && <Triangle className="w-20 h-20" />}
                  {draggedIcon.name && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span className="text-blue-900 dark:text-blue-100 text-base font-medium text-center leading-tight max-w-full px-1">
                        {draggedIcon.name}
                      </span>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    )}
  </>
);
};
