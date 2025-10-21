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
  onUpdateIcon: (id: string, x: number, y: number, shouldPropagate?: boolean) => void;
  onAddIcon: (type: PositionIcon["type"]) => void;
  onRemoveIcon: (id: string) => void;
  onNameIcon: (id: string, name: string) => void;
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
  onSelectIcon,
  onSelectMultiple,
  onNextLine,
  onPrevLine,
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

  const handleIconClick = (iconId: string, isCtrlClick: boolean = false) => {
    if (isCtrlClick) {
      onSelectIcon?.(iconId);
    } else {
      setSelectedIconId(iconId);
      setNameDialogOpen(true);
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

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <Card className="h-full flex flex-col overflow-hidden" id="position-sheet">
        <div className="p-2 border-b">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">Line {selectedLine + 1}</h3>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => onAddIcon("square")}>
                <Square className="h-3 w-3 mr-1" />
                Base
              </Button>
              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => onAddIcon("circle")}>
                <Circle className="h-3 w-3 mr-1" />
                Mid
              </Button>
              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => onAddIcon("x")}>
                <X className="h-3 w-3 mr-1" />
                Fly
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2"
                onClick={() => setAutoFollow(!autoFollow)}
              >
                {autoFollow ? <ToggleRight className="h-3 w-3" /> : <ToggleLeft className="h-3 w-3" />}
              </Button>
              <Button size="sm" variant="outline" className="h-7 px-1" onClick={handleUndo} disabled={historyIndex <= 0}>
                <Undo className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-1"
                onClick={handleRedo}
                disabled={historyIndex >= history.length - 1}
              >
                <Redo className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 p-2 overflow-auto">
          <div className="relative w-full h-full min-h-[400px] bg-background border border-border rounded">
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
