import { useDraggable } from "@dnd-kit/core";
import { Position } from "@/types/routine";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

interface PositionSheetProps {
  positions: Position[];
  selectedLine: number | null;
  onUpdatePosition: (id: string, x: number, y: number) => void;
  onAddPosition: () => void;
  onRemovePosition: (id: string) => void;
}

const PositionMarker = ({ 
  position, 
  onUpdate 
}: { 
  position: Position;
  onUpdate: (x: number, y: number) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: position.id,
    data: position,
  });

  const style = transform
    ? {
        left: `${position.x + transform.x}px`,
        top: `${position.y + transform.y}px`,
      }
    : {
        left: `${position.x}px`,
        top: `${position.y}px`,
      };

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className="absolute w-8 h-8 -ml-4 -mt-4 cursor-grab active:cursor-grabbing"
      style={style}
    >
      <div className="w-full h-full rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm border-2 border-background shadow-lg">
        X
      </div>
    </div>
  );
};

export const PositionSheet = ({
  positions,
  selectedLine,
  onUpdatePosition,
  onAddPosition,
  onRemovePosition,
}: PositionSheetProps) => {
  if (selectedLine === null) {
    return (
      <Card className="h-full flex items-center justify-center p-8">
        <p className="text-muted-foreground text-center">
          Click on a count line to view positions
        </p>
      </Card>
    );
  }

  const linePositions = positions.filter((p) => p.lineIndex === selectedLine);

  return (
    <Card className="h-full flex flex-col">
      <div className="p-4 border-b flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Positions - Line {selectedLine + 1}</h3>
          <p className="text-xs text-muted-foreground">7 Roll Mats Layout</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={onAddPosition}>
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
      </div>

      <div className="flex-1 p-4">
        <div className="relative w-full h-full bg-background border-2 border-border rounded-lg overflow-hidden">
          {/* 6 horizontal lines representing 7 mats */}
          {Array.from({ length: 6 }, (_, i) => (
            <div
              key={i}
              className="absolute left-0 right-0 border-t border-muted"
              style={{ top: `${((i + 1) / 7) * 100}%` }}
            />
          ))}

          {/* Position markers */}
          {linePositions.map((position) => (
            <PositionMarker
              key={position.id}
              position={position}
              onUpdate={(x, y) => onUpdatePosition(position.id, x, y)}
            />
          ))}
        </div>
      </div>

      {linePositions.length > 0 && (
        <div className="p-4 border-t">
          <h4 className="text-sm font-medium mb-2">Positions ({linePositions.length})</h4>
          <div className="flex flex-wrap gap-1">
            {linePositions.map((position) => (
              <Button
                key={position.id}
                size="sm"
                variant="outline"
                onClick={() => onRemovePosition(position.id)}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Remove X
              </Button>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};
