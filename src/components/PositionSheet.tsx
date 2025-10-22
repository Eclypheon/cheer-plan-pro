import { useState, useRef } from "react";
import { DndContext, DragEndEvent, useSensor, useSensors, PointerSensor } from "@dnd-kit/core";
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
  onNameIcon: (id: string, name: string) => void;
  showGrid?: boolean;
  autoFollow?: boolean;
  onToggleAutoFollow?: () => void;
  onSelectIcon?: (id: string) => void;
  onSelectMultiple?: (ids: string[]) => void;
  onNextLine?: () => void;
  onPrevLine?: () => void;
}

export const PositionSheet = ({
  icons,
  selectedLine,
  onUpdateIcon,
  onAddIcon,
  onRemoveIcon,
  onNameIcon,
  showGrid = false,
  autoFollow = true,
  onToggleAutoFollow,
  onSelectIcon,
  onSelectMultiple,
  onNextLine,
  onPrevLine,
}: PositionSheetProps) => {
  const [history, setHistory] = useState<PositionIcon[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [selectedIconId, setSelectedIconId] = useState<string | null>(null);
  const [nameDialogOpen, setNameDialogOpen] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  const [clickTimer, setClickTimer] = useState<NodeJS.Timeout | null>(null);
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<{ x: number; y: number } | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event;
    if (!delta) return;

    const icon = icons.find((i) => i.id === active.id);
    if (!icon) return;

    const container = sheetRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const newX = Math.max(0, Math.min(icon.x + delta.x, rect.width));
    const newY = Math.max(0, Math.min(icon.y + delta.y, rect.height));
    onUpdateIcon(active.id as string, newX, newY, autoFollow);

    // Save to history
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push([...icons]);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      // Apply history state
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      // Apply history state
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

  const handleSheetMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).closest('.sheet-background')) {
      const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
      setSelectionStart({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      setSelectionEnd(null);
    }
  };

  const handleSheetMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (selectionStart) {
      const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
      setSelectionEnd({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
  };

  const handleSheetMouseUp = () => {
    if (selectionStart && selectionEnd) {
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

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <Card className="h-full flex flex-col overflow-hidden" id="position-sheet">
        <div className="p-1.5 border-b">
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
            </div>
          </div>
        </div>

        <div className="flex-1 p-1.5 overflow-hidden">
          <div 
            ref={sheetRef}
            className="sheet-background relative w-full h-full bg-background border border-border rounded"
            style={{ aspectRatio: '4/3', maxHeight: '100%' }}
            onMouseDown={handleSheetMouseDown}
            onMouseMove={handleSheetMouseMove}
            onMouseUp={handleSheetMouseUp}
          >
            {/* Grid overlay */}
            {showGrid && (
              <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 5 }}>
                {Array.from({ length: 22 }, (_, i) => (
                  <line
                    key={`v-${i}`}
                    x1={`${(i / 21) * 100}%`}
                    y1="0"
                    x2={`${(i / 21) * 100}%`}
                    y2="100%"
                    stroke="currentColor"
                    strokeOpacity="0.2"
                    strokeWidth="1"
                  />
                ))}
                {Array.from({ length: 22 }, (_, i) => (
                  <line
                    key={`h-${i}`}
                    x1="0"
                    y1={`${(i / 21) * 100}%`}
                    x2="100%"
                    y2={`${(i / 21) * 100}%`}
                    stroke="currentColor"
                    strokeOpacity="0.2"
                    strokeWidth="1"
                  />
                ))}
              </svg>
            )}

            {/* 6 horizontal lines representing 7 mats */}
            {Array.from({ length: 6 }, (_, i) => (
              <div
                key={i}
                className="absolute left-0 right-0 border-t border-muted pointer-events-none"
                style={{ top: `${((i + 1) / 7) * 100}%`, zIndex: 1 }}
              />
            ))}

            {/* Selection rectangle */}
            {selectionStart && selectionEnd && (
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
    </DndContext>
  );
};
