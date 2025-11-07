import React from "react";
import { useDraggable } from "@dnd-kit/core";
import type { Arrow as ArrowType } from "@/types/routine";

interface ArrowProps {
  arrow: ArrowType;
  onSelectArrow?: (id: string) => void;
  zoomLevel?: number;
}

export const ArrowComponent: React.FC<ArrowProps> = ({ arrow, onSelectArrow, zoomLevel = 1.0 }) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: arrow.id,
    data: {
      type: "arrow",
      arrow,
    },
  });

  // Calculate the bounding box of the arrow including arrowheads
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

  const minX = Math.min(...allX);
  const maxX = Math.max(...allX);
  const minY = Math.min(...allY);
  const maxY = Math.max(...allY);

  const width = maxX - minX;
  const height = maxY - minY;

  // Add padding for stroke width (8px max stroke + some buffer)
  const padding = 10;
  const svgWidth = Math.max(width + padding * 2, 20);
  const svgHeight = Math.max(height + padding * 2, 20);

  const style = transform ? {
    left: `${minX - padding + transform.x * (1 / zoomLevel)}px`,
    top: `${minY - padding + transform.y * (1 / zoomLevel)}px`,
    width: `${svgWidth}px`,
    height: `${svgHeight}px`,
  } : {
    left: `${minX - padding}px`,
    top: `${minY - padding}px`,
    width: `${svgWidth}px`,
    height: `${svgHeight}px`,
  };

  // Calculate relative coordinates within the SVG (accounting for padding)
  const relativeStartX = arrow.start.x - minX + padding;
  const relativeStartY = arrow.start.y - minY + padding;
  const relativeEndX = arrow.end.x - minX + padding;
  const relativeEndY = arrow.end.y - minY + padding;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="absolute pointer-events-auto cursor-grab active:cursor-grabbing"
      data-arrow
      onClick={(e) => {
        // Prevent click from bubbling up when clicking on arrows
        e.stopPropagation();
        onSelectArrow?.(arrow.id);
      }}
      {...listeners}
      {...attributes}
    >
      <svg
        className="absolute inset-0 w-full h-full"
        style={{ zIndex: 6 }}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      >
        <line
          x1={relativeStartX}
          y1={relativeStartY}
          x2={relativeEndX}
          y2={relativeEndY}
          stroke={arrow.selected ? "blue" : "currentColor"}
          strokeWidth={arrow.selected ? "8" : "6"}
          strokeOpacity="0.8"
        />
        {(() => {
          // Calculate angle for arrowhead
          const angle = Math.atan2(
            relativeEndY - relativeStartY,
            relativeEndX - relativeStartX
          );

          // Arrowhead length
          const arrowheadLength = 15;

          // Calculate arrowhead points (15 pixels from end point at ±25 degrees, rotated 180°)
          const angle1 = angle + Math.PI - (25 * Math.PI) / 180; // 180° - 25°
          const angle2 = angle + Math.PI + (25 * Math.PI) / 180; // 180° + 25°

          const arrowhead1X = relativeEndX + arrowheadLength * Math.cos(angle1);
          const arrowhead1Y = relativeEndY + arrowheadLength * Math.sin(angle1);
          const arrowhead2X = relativeEndX + arrowheadLength * Math.cos(angle2);
          const arrowhead2Y = relativeEndY + arrowheadLength * Math.sin(angle2);

          return (
            <>
              {/* Arrowhead line 1 */}
              <line
                x1={relativeEndX}
                y1={relativeEndY}
                x2={arrowhead1X}
                y2={arrowhead1Y}
                stroke={arrow.selected ? "blue" : "currentColor"}
                strokeWidth={arrow.selected ? "8" : "6"}
                strokeLinecap="round"
              />
              {/* Arrowhead line 2 */}
              <line
                x1={relativeEndX}
                y1={relativeEndY}
                x2={arrowhead2X}
                y2={arrowhead2Y}
                stroke={arrow.selected ? "blue" : "currentColor"}
                strokeWidth={arrow.selected ? "8" : "6"}
                strokeLinecap="round"
              />
            </>
          );
        })()}
      </svg>
    </div>
  );
};
