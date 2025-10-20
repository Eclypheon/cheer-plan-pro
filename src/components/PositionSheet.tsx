import { useState } from "react";
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
  onUpdateIcon: (id: string, x: number, y: number) => void;
  onAddIcon: (type: PositionIcon["type"]) => void;
  onRemoveIcon: (id: string) => void;
  onNameIcon: (id: string, name: string) => void;
}

export const PositionSheet = ({
  icons,
  selectedLine,
  onUpdateIcon,
  onAddIcon,
  onRemoveIcon,
  onNameIcon,
}: PositionSheetProps) => {
  const [history, setHistory] = useState<PositionIcon[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [autoFollow, setAutoFollow] = useState(true);
  const [selectedIconId, setSelectedIconId] = useState<string | null>(null);
  const [nameDialogOpen, setNameDialogOpen] = useState(false);

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

    const newX = Math.max(0, Math.min(icon.x + delta.x, 800));
    const newY = Math.max(0, Math.min(icon.y + delta.y, 600));
    onUpdateIcon(active.id as string, newX, newY);

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
    setSelectedIconId(iconId);
    setNameDialogOpen(true);
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
      <Card className="h-full flex flex-col" id="position-sheet">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-lg font-semibold">Positions - Line {selectedLine + 1}</h3>
              <p className="text-xs text-muted-foreground">7 Roll Mats Layout</p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAutoFollow(!autoFollow)}
              >
                {autoFollow ? (
                  <>
                    <ToggleRight className="h-4 w-4 mr-1" />
                    Auto-Follow On
                  </>
                ) : (
                  <>
                    <ToggleLeft className="h-4 w-4 mr-1" />
                    Auto-Follow Off
                  </>
                )}
              </Button>
              <Button size="sm" variant="outline" onClick={handleUndo} disabled={historyIndex <= 0}>
                <Undo className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleRedo}
                disabled={historyIndex >= history.length - 1}
              >
                <Redo className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex gap-2">
            <Button size="sm" onClick={() => onAddIcon("square")}>
              <Square className="h-4 w-4 mr-1" />
              Add Base
            </Button>
            <Button size="sm" onClick={() => onAddIcon("circle")}>
              <Circle className="h-4 w-4 mr-1" />
              Add Mid Tier
            </Button>
            <Button size="sm" onClick={() => onAddIcon("x")}>
              <X className="h-4 w-4 mr-1" />
              Add Top Fly
            </Button>
          </div>

          <div className="mt-3 p-2 bg-muted rounded text-xs space-y-1">
            <div className="font-semibold mb-1">Legend:</div>
            <div className="flex items-center gap-2">
              <Square className="h-4 w-4" /> Base
            </div>
            <div className="flex items-center gap-2">
              <Circle className="h-4 w-4" /> Mid Tier
            </div>
            <div className="flex items-center gap-2">
              <X className="h-4 w-4" /> Top Fly
            </div>
          </div>
        </div>

        <div className="flex-1 p-4 overflow-auto">
          <div className="relative w-full h-[500px] bg-background border-2 border-border rounded-lg">
            {/* 6 horizontal lines representing 7 mats */}
            {Array.from({ length: 6 }, (_, i) => (
              <div
                key={i}
                className="absolute left-0 right-0 border-t border-muted"
                style={{ top: `${((i + 1) / 7) * 100}%` }}
              />
            ))}

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

      {selectedIcon && (
        <PositionIconNameDialog
          open={nameDialogOpen}
          onOpenChange={setNameDialogOpen}
          currentName={selectedIcon.name || ""}
          onSave={handleSaveName}
        />
      )}
    </DndContext>
  );
};
