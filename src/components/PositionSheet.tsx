import { useState, useRef } from "react";
import type { PositionIcon } from "@/types/routine";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Undo, Redo, ToggleLeft, ToggleRight, Square, Circle, X } from "lucide-react";
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
}

export const PositionSheet = ({
  icons,
  selectedLine,
  onUpdateIcon,
  onAddIcon,
  onRemoveIcon,
  onRemoveMultipleIcons,
  onNameIcon,
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
}: PositionSheetProps) => {
  const [history, setHistory] = useState<{ icons: PositionIcon[], lineIndex: number }[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [selectedIconId, setSelectedIconId] = useState<string | null>(null);
  const [nameDialogOpen, setNameDialogOpen] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  const [clickTimer, setClickTimer] = useState<NodeJS.Timeout | null>(null);
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<{ x: number; y: number } | null>(null);
  const [isDraggingSelection, setIsDraggingSelection] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  const handleSelectionMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const isIcon = target.closest('[data-position-icon]');

    // Only start selection if clicking on empty space (not on an icon)
    if (!isIcon && (e.target === e.currentTarget || target.closest('.sheet-background'))) {
      const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
      setSelectionStart({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      setSelectionEnd(null);
      setIsDraggingSelection(true);
    }
  };

  const handleSelectionMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only update selection rectangle if we're in selection mode (not dragging an icon)
    if (selectionStart && isDraggingSelection) {
      const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
      setSelectionEnd({ x: e.clientX - rect.left, y: e.clientY - rect.top });
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
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      if (prevState && prevState.lineIndex === selectedLine) {
        // Restore only icons for the current line
        const otherLineIcons = icons.filter(i => i.lineIndex !== selectedLine);
        const restoredLineIcons = prevState.icons.filter(i => i.lineIndex === selectedLine);

        // Remove current line icons first
        const currentLineIconIds = icons.filter(i => i.lineIndex === selectedLine).map(i => i.id);
        currentLineIconIds.forEach(id => onRemoveIcon(id));

        // Add restored icons
        restoredLineIcons.forEach(icon => {
          onUpdateIcon(icon.id, icon.x, icon.y, false);
        });

        setHistoryIndex(historyIndex - 1);
      }
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      if (nextState && nextState.lineIndex === selectedLine) {
        // Restore only icons for the current line
        const currentLineIconIds = icons.filter(i => i.lineIndex === selectedLine).map(i => i.id);
        // Remove current line icons first
        currentLineIconIds.forEach(id => onRemoveIcon(id));

        // Add restored icons
        const restoredLineIcons = nextState.icons.filter(i => i.lineIndex === selectedLine);
        restoredLineIcons.forEach(icon => {
          onUpdateIcon(icon.id, icon.x, icon.y, false);
        });

        setHistoryIndex(historyIndex + 1);
      }
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

  const lineIcons = icons.filter((i) => i.lineIndex === selectedLine);
  const selectedIcon = icons.find((i) => i.id === selectedIconId);
  const selectedIconsCount = lineIcons.filter(i => i.selected).length;
  const isMultiDrag = selectedIconsCount > 1 && dragOffset !== null;

return (
  <>
    <Card className="h-full flex flex-col relative z-10" id="position-sheet">
      <div className="p-1.5 border-b relative z-10">
        <div className="flex items-center justify-between gap-1.5">
          <h3 className="text-sm font-semibold">Line {selectedLine + 1}</h3>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" className="h-6 px-1.5 text-xs" onClick={() => onAddIcon("square")}>
              <Square className="h-3 w-3 mr-0.5" />
              Base
            </Button>
            <Button size="sm" variant="ghost" className="h-6 px-1.5 text-xs" onClick={() => onAddIcon("circle")}>
              <Circle className="h-2.5 w-2.5 mr-0.5" />
              Mid
            </Button>
            <Button size="sm" variant="ghost" className="h-6 px-1.5 text-xs" onClick={() => onAddIcon("x")}>
              <X className="h-3 w-3 mr-0.5" />
              Fly
            </Button>
            <Button
              size="sm"
              variant={autoFollow ? "default" : "outline"}
              className="h-6 px-1.5 text-xs"
              onClick={onToggleAutoFollow}
            >
              {autoFollow ? <ToggleRight className="h-3 w-3" /> : <ToggleLeft className="h-3 w-3" />}
            </Button>
            <Button size="sm" variant="outline" className="h-6 px-1" onClick={handleUndo} disabled={historyIndex <= 0}>
              <Undo className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-6 px-1"
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
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

      <div className="flex-1 p-1.5 flex items-center justify-center overflow-auto">
        <div
          ref={sheetRef}
          className="sheet-background relative bg-background border border-border rounded"
          style={{ width: '800px', height: '600px', flexShrink: 0 }}
          onMouseDown={handleSelectionMouseDown}
          onMouseMove={handleSelectionMouseMove}
          onMouseUp={handleSelectionMouseUp}
          onClick={handleSheetClick}
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
              className="absolute top-0 bottom-0 border-l border-muted pointer-events-none"
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
            />
          ))}
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
