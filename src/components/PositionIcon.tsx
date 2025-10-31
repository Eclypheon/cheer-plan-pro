import { useDraggable } from "@dnd-kit/core";
import { Circle, Square, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PositionIcon as PositionIconType } from "@/types/routine";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PositionIconProps {
  icon: PositionIconType;
  onUpdate: (x: number, y: number) => void;
  onClick: () => void;
  onRemove?: (id: string) => void;
  dragOffset?: { x: number; y: number } | null;
  isMultiDrag?: boolean;
  zoomLevel?: number;
  getZoomedCoordinates?: (clientX: number, clientY: number) => { x: number; y: number };
}

const IconComponent = ({ type }: { type: PositionIconType["type"] }) => {
  switch (type) {
    case "square":
      return <Square className="w-6 h-6" />;
    case "circle":
      return <Circle className="w-4 h-4" />;
    case "x":
      return <X className="w-6 h-6" />;
  }
};

export const PositionIcon = ({ icon, onUpdate, onClick, onRemove, dragOffset, isMultiDrag = false, zoomLevel = 1.0, getZoomedCoordinates }: PositionIconProps) => {
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
        "absolute w-8 h-8 -ml-4 -mt-4 cursor-grab active:cursor-grabbing z-[2000]",
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
    </div>
  );

  if (icon.name) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{iconContent}</TooltipTrigger>
          <TooltipContent>
            <p>{icon.name}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return iconContent;
};
