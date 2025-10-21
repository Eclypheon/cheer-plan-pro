import { useDroppable } from "@dnd-kit/core";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrashDropZoneProps {
  isDragging: boolean;
}

export const TrashDropZone = ({ isDragging }: TrashDropZoneProps) => {
  const { isOver, setNodeRef } = useDroppable({
    id: "trash-zone",
  });

  if (!isDragging) return null;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "fixed bottom-8 left-1/2 -translate-x-1/2 z-50 transition-all pointer-events-auto",
        "flex items-center justify-center",
        "w-32 h-32 rounded-full",
        "border-4 border-dashed",
        isOver
          ? "bg-destructive/30 border-destructive scale-110"
          : "bg-muted/80 border-muted-foreground/50 scale-100"
      )}
    >
      <Trash2 className={cn("h-12 w-12", isOver ? "text-destructive" : "text-muted-foreground")} />
    </div>
  );
};
