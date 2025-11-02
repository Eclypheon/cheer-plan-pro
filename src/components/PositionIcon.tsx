import { useDraggable } from "@dnd-kit/core";
import { Circle, Square, X, Triangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PositionIcon as PositionIconType } from "@/types/routine";

interface PositionIconProps {
  icon: PositionIconType;
  onUpdate: (x: number, y: number) => void;
  onClick: () => void;
  onRemove?: (id: string) => void;
  dragOffset?: { x: number; y: number } | null;
  isMultiDrag?: boolean;
  zoomLevel?: number;
  getZoomedCoordinates?: (clientX: number, clientY: number) => { x: number; y: number };
  onDragEnd?: (event: { active: any, delta: { x: number, y: number } }) => void;
}

const IconComponent = ({ type }: { type: PositionIconType["type"] }) => {
  switch (type) {
    case "square":
      return <Square className="w-20 h-20" />;
    case "circle":
      return <Circle className="w-20 h-20" />;
    case "x":
      return <Triangle className="w-20 h-20" />;
  }
};

export const PositionIcon = ({ icon, onUpdate, onClick, onRemove, dragOffset, isMultiDrag = false, zoomLevel = 1.0, getZoomedCoordinates, onDragEnd }: PositionIconProps) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: icon.id,
    data: { type: "position-icon", icon },
  });

  const enhancedListeners = listeners;

  const style = transform
    ? {
        left: `${icon.x + transform.x * (1 / zoomLevel)}px`,
        top: `${icon.y + transform.y * (1 / zoomLevel)}px`,
      }
    : dragOffset && icon.selected
    ? {
        left: `${icon.x + dragOffset.x * (1 / zoomLevel)}px`,
        top: `${icon.y + dragOffset.y * (1 / zoomLevel)}px`,
      }
    : {
        left: `${icon.x}px`,
        top: `${icon.y}px`,
      };

  const iconContent = (
    <div
      ref={setNodeRef}
      {...enhancedListeners}
      {...attributes}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      data-position-icon
      data-dnd-handle="position-icon-drag"
      className={cn(
        "absolute w-32 h-32 -ml-16 -mt-16 cursor-grab active:cursor-grabbing z-[2000]",
        "flex items-center justify-center",
        "transition-colors",
        icon.selected
          ? "text-accent-foreground bg-accent rounded-full"
          : "text-primary hover:text-primary/70",
        isDragging && "opacity-50"
      )}
      style={style}
    >
      <IconComponent type={icon.type} />
      {icon.name && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-blue-900 dark:text-blue-100 text-xl font-medium text-center leading-tight max-w-full px-1">
            {icon.name}
          </span>
        </div>
      )}
    </div>
  );

  return iconContent;
};
