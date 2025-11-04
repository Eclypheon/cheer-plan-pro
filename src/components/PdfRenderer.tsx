import React from "react";
import { PositionSheet } from "./PositionSheet";
import type { PositionIcon } from "@/types/routine";

interface PdfRendererProps {
  configurations: {
    icons: PositionIcon[];
    lineIndex: number;
  }[];
  segmentNames: Record<number, string>;
  zoomLevel: number;
}

/**
 * This component is designed to be rendered temporarily and off-screen.
 * It renders all unique position sheets at once so html2canvas can
 * capture them in parallel without waiting for React state updates.
 */
export const PdfRenderer = ({
  configurations,
  segmentNames,
  zoomLevel,
}: PdfRendererProps) => (
  <div
    style={{
      position: "absolute",
      left: "-9999px", // Hide it off-screen
      top: "-9999px",
      backgroundColor: "hsl(var(--background))",
    }}
  >
    {configurations.map((config, index) => (
      // This is the wrapper html2canvas will find
      <div
        key={config.lineIndex}
        id={`pdf-page-${index}`}
        className="pdf-page-class" // Class for html2canvas to find
        style={{
          backgroundColor: "hsl(var(--background))",
          // Let the content inside define the size
        }}
      >
        <PositionSheet
          // --- Props to satisfy TypeScript ---
          icons={config.icons} // Pass the icons for this sheet
          selectedLine={config.lineIndex}
          onUpdateIcon={() => {}} // Stub function
          onAddIcon={() => {}} // Stub function
          onRemoveIcon={() => {}} // Stub function
          onNameIcon={() => {}} // Stub function
          lineHistories={{}} // Stub empty object
          
          // --- Props for PDF rendering ---
          pdfIcons={config.icons} // This prop overrides live state
          pdfSegmentName={segmentNames[config.lineIndex] || ""}
          zoomLevel={zoomLevel}
          
          // --- Explicitly pass undefined/defaults for optional props ---
          onRemoveMultipleIcons={undefined}
          onRestoreLineState={undefined}
          onUndoLine={undefined}
          onRedoLine={undefined}
          showGrid={false}
          autoFollow={false}
          onToggleAutoFollow={undefined}
          isDraggingIcon={false}
          dragOffset={null}
          draggedIconId={null}
          onSelectIcon={undefined}
          onSelectMultiple={undefined}
          onNextLine={undefined}
          onPrevLine={undefined}
          onIconDragStart={undefined}
          onIconDragEnd={undefined}
          onIconDrop={undefined}
          onZoomChange={undefined}
          segmentName={segmentNames[config.lineIndex] || ""}
          onUpdateSegmentName={undefined}
        />
      </div>
    ))}
  </div>
);