import React from "react";
import { PositionIcon as PositionIconType } from "@/types/routine";
import { PositionIcon } from "./PositionIcon";

interface MobileDragPreviewProps {
  isVisible: boolean;
  touchPosition: { x: number; y: number } | null;
  icons: PositionIconType[];
  zoomLevel: number;
  sheetRect: DOMRect | null;
}

export const MobileDragPreview: React.FC<MobileDragPreviewProps> = ({
  isVisible,
  touchPosition,
  icons,
  zoomLevel,
  sheetRect,
}) => {
  if (!isVisible || !touchPosition || !sheetRect) {
    return null;
  }

  // Calculate the center position relative to the sheet
  const sheetCenterX = sheetRect.left + sheetRect.width / 2;
  const sheetCenterY = sheetRect.top + sheetRect.height / 2;

  // Convert screen coordinates to sheet coordinates
  const relativeX = touchPosition.x - sheetCenterX;
  const relativeY = touchPosition.y - sheetCenterY;

  // Apply zoom scaling (divide by zoom to get actual coordinates)
  const sheetX = relativeX / zoomLevel + 400; // 400 is half of 800 (sheet width)
  const sheetY = relativeY / zoomLevel + 300; // 300 is half of 600 (sheet height)

  // Define viewport size and zoom level for the mini preview
  const viewportWidth = 200;
  const viewportHeight = 150;
  const miniZoom = 1.5; // Slightly zoomed in for better visibility

  // Calculate the view bounds (centered on touch position)
  const viewLeft = sheetX - (viewportWidth / 2) / miniZoom;
  const viewTop = sheetY - (viewportHeight / 2) / miniZoom;
  const viewRight = sheetX + (viewportWidth / 2) / miniZoom;
  const viewBottom = sheetY + (viewportHeight / 2) / miniZoom;

  // Filter icons that are visible in the mini viewport
  const visibleIcons = icons.filter(icon =>
    icon.x >= viewLeft && icon.x <= viewRight &&
    icon.y >= viewTop && icon.y <= viewBottom
  );

  return (
    <div
      className="fixed top-4 left-4 z-[9999] bg-background/95 backdrop-blur-sm border-2 border-border rounded-lg shadow-lg overflow-hidden"
      style={{
        width: `${viewportWidth}px`,
        height: `${viewportHeight}px`,
      }}
    >
      {/* Mini position sheet viewport */}
      <div
        className="relative w-full h-full bg-background border-4 border-border"
        style={{
          transform: `scale(${miniZoom})`,
          transformOrigin: 'top left',
          width: `${800 / miniZoom}px`,
          height: `${600 / miniZoom}px`,
        }}
      >
        {/* Grid overlay */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 5 }}>
          {Array.from({ length: 37 }, (_, i) => (
            <line
              key={`v-${i}`}
              x1={`${(i / 36) * 100}%`}
              y1="0"
              x2={`${(i / 36) * 100}%`}
              y2="100%"
              stroke="currentColor"
              strokeOpacity="0.3"
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
              strokeOpacity="0.3"
              strokeWidth="0.5"
            />
          ))}
        </svg>

        {/* Mat division lines */}
        {Array.from({ length: 9 }, (_, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0 border-l-2 border-muted pointer-events-none"
            style={{ left: `${(i / 9) * 100}%`, zIndex: 1 }}
          />
        ))}

        {/* Position icons in mini view */}
        {visibleIcons.map((icon) => (
          <PositionIcon
            key={icon.id}
            icon={icon}
            onUpdate={() => {}} // No-op for preview
            onClick={() => {}} // No-op for preview
            zoomLevel={1} // No additional zoom for preview icons
          />
        ))}

        {/* Touch position indicator */}
        <div
          className="absolute w-3 h-3 bg-red-500 rounded-full border-2 border-white shadow-lg pointer-events-none"
          style={{
            left: `${sheetX}px`,
            top: `${sheetY}px`,
            transform: 'translate(-50%, -50%)',
            zIndex: 10,
          }}
        />
      </div>

      {/* Touch position coordinates display */}
      <div className="absolute bottom-1 left-1 text-xs text-muted-foreground bg-background/80 px-1 rounded">
        {Math.round(sheetX)}, {Math.round(sheetY)}
      </div>
    </div>
  );
};
