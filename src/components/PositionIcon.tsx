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

export const PositionIcon = ({ icon, onUpdate, onClick }: PositionIconProps) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: icon.id,
    data: { type: "position-icon", icon },
  });

  const style = transform
    ? {
        left: `${icon.x + transform.x}px`,
        top: `${icon.y + transform.y}px`,
      }
    : {
        left: `${icon.x}px`,
        top: `${icon.y}px`,
      };

  const iconContent = (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "absolute w-8 h-8 -ml-4 -mt-4 cursor-grab active:cursor-grabbing",
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
