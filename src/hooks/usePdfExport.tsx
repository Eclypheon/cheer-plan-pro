import { useState } from "react";
import { useTheme } from "next-themes";
import type { RoutineConfig, PositionIcon } from "@/types/routine";
import { PdfRenderer } from "@/components/PdfRenderer";

// Define global functions for TypeScript
declare global {
  interface Window {
    showPdfProgress: (totalSteps: number) => void;
    updatePdfProgress: (currentStep: number, message: string) => void;
    hidePdfProgress: () => void;
    pdfTotalSteps: number;
  }
}

interface UsePdfExportProps {
  config: RoutineConfig;
  getUniquePositionConfigurations: () => {
    icons: PositionIcon[];
    lineIndex: number;
  }[];
  segmentNames: Record<number, string>;
  setPdfBlob: (blob: Blob | null) => void;
  setShowPdfPreview: (show: boolean) => void;
}

export const usePdfExport = ({
  config,
  getUniquePositionConfigurations,
  segmentNames,
  setPdfBlob,
  setShowPdfPreview,
}: UsePdfExportProps) => {
  const { theme } = useTheme();
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const handleExportPDF = async () => {
    if (isGeneratingPdf) return; // Prevent double-clicks
    setIsGeneratingPdf(true);

    try {
      // --- PDF Generation Logic ---
      const jsPDF = (await import("jspdf")).default;
      const html2canvas = (await import("html2canvas")).default;
      const { createRoot } = (await import("react-dom/client"));

      // --- Progress Bar Setup ---
      const isTeamCategory =
        config.category === "team-16" || config.category === "team-24";
      const uniqueConfigurations = isTeamCategory
        ? getUniquePositionConfigurations()
        : [];
      // 1 (CountSheet) + N (PosSheets) + 1 (Assemble)
      const totalSteps =
        1 + (isTeamCategory ? uniqueConfigurations.length : 0) + 1;

      window.showPdfProgress(totalSteps);
      let currentStep = 0;

      // --- Theme & PDF Setup ---
      const isDarkMode = theme === "dark";
      const backgroundColor = isDarkMode ? "#020817" : "#ffffff";

      // Convert hex to RGB for jsPDF
      const hexToRgb = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result
          ? {
              r: parseInt(result[1], 16),
              g: parseInt(result[2], 16),
              b: parseInt(result[3], 16),
            }
          : { r: 255, g: 255, b: 255 };
      };
      const bgRgb = hexToRgb(backgroundColor);

      // Use portrait A4 (210mm x 297mm)
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 2; // Minimal margin
      const availableWidth = pageWidth - margin * 2;
      const availableHeight = pageHeight - margin * 2;

      // --- Step 1: Capture Count Sheet ---
      currentStep++;
      window.updatePdfProgress(currentStep, `Capturing Count Sheet...`);
      await new Promise(resolve => setTimeout(resolve, 50)); // Allow UI to update

      const countSheetElement = document.getElementById(
        "count-sheet-content-wrapper",
      );
      const countSheetContainer = document.getElementById("count-sheet-container");

      if (countSheetElement) {
        // Save current scroll position and scroll to top for proper header capture
        const originalScrollTop = countSheetContainer ? countSheetContainer.scrollTop : 0;
        if (countSheetContainer) {
          countSheetContainer.scrollTop = 0;
        }

        // Wait for DOM to update after scrolling
        await new Promise(resolve => setTimeout(resolve, 100));

        const canvas = await html2canvas(countSheetElement, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor,
          height: countSheetElement.scrollHeight,
          width: countSheetElement.scrollWidth,
        });

        // Restore original scroll position
        if (countSheetContainer) {
          countSheetContainer.scrollTop = originalScrollTop;
        }

        const imgData = canvas.toDataURL("image/png");
        const scaleX = availableWidth / canvas.width;
        const scaleY = availableHeight / canvas.height;
        const scale = Math.min(scaleX, scaleY);
        const imgWidth = canvas.width * scale;
        const imgHeight = canvas.height * scale;

        pdf.setFillColor(bgRgb.r, bgRgb.g, bgRgb.b);
        pdf.rect(0, 0, pageWidth, pageHeight, "F");
        const x = (pageWidth - imgWidth) / 2;
        const y = (pageHeight - imgHeight) / 2;
        pdf.addImage(imgData, "PNG", x, y, imgWidth, imgHeight);
      }

      // --- Step 2: Capture Position Sheets ---
      if (isTeamCategory) {
        // Create a hidden div to render into
        const renderDiv = document.createElement("div");
        renderDiv.id = "pdf-render-target";
        document.body.appendChild(renderDiv);

        // Use createRoot to render your hidden component
        const root = createRoot(renderDiv);
        root.render(
          <PdfRenderer
            configurations={uniqueConfigurations}
            segmentNames={segmentNames}
            zoomLevel={1.0} // Render at 100% zoom
          />,
        );

        // Wait for React to render
        await new Promise((resolve) => setTimeout(resolve, 50));

        // Find all rendered page wrappers
        const positionSheetElements = document.querySelectorAll(
          ".pdf-page-class",
        );

        for (let i = 0; i < positionSheetElements.length; i++) {
          currentStep++;
          window.updatePdfProgress(currentStep, `Capturing Position Sheet ${i + 1} of ${uniqueConfigurations.length}...`);
          await new Promise(resolve => setTimeout(resolve, 50)); // Allow UI to update

          const element = positionSheetElements[i];
          const contentToCapture = element.querySelector(
            "#position-sheet-content-wrapper",
          ) as HTMLElement;

          if (contentToCapture) {
             const canvas = await html2canvas(contentToCapture, {
              scale: 1,
              useCORS: true,
              allowTaint: true,
              backgroundColor,
              height: contentToCapture.scrollHeight,
              width: contentToCapture.scrollWidth,
            });

            pdf.addPage();
            pdf.setFillColor(bgRgb.r, bgRgb.g, bgRgb.b);
            pdf.rect(0, 0, pageWidth, pageHeight, "F");

            const imgData = canvas.toDataURL("image/png");
            const scaleX = availableWidth / canvas.width;
            const scaleY = availableHeight / canvas.height;
            const scale = Math.min(scaleX, scaleY);
            const imgWidth = canvas.width * scale;
            const imgHeight = canvas.height * scale;
            const x = (pageWidth - imgWidth) / 2;
            const y = (pageHeight - imgHeight) / 2;

            pdf.addImage(imgData, "PNG", x, y, imgWidth, imgHeight);
          }
        }

        // Cleanup
        root.unmount();
        if (document.body.contains(renderDiv)) {
          document.body.removeChild(renderDiv);
        }
      }

      // --- Step 3: Assemble & Show Preview ---
      currentStep++;
      window.updatePdfProgress(currentStep, "Assembling PDF...");
      await new Promise(resolve => setTimeout(resolve, 50)); // Allow UI to update

      const pdfArrayBuffer = pdf.output("arraybuffer");
      const pdfBlob = new Blob([pdfArrayBuffer], {
        type: "application/pdf; charset=utf-8",
      });

      setPdfBlob(pdfBlob);
      setShowPdfPreview(true); // Show React modal

    } catch (error) {
      console.error("Error generating PDF:", error);
      window.hidePdfProgress(); // Hide progress on error
    } finally {
      // Hide progress bar *after* React modal is ready
      setTimeout(() => {
          setIsGeneratingPdf(false);
          window.hidePdfProgress();
      }, 300); // Small delay to let modal animate in
    }
  };

  return {
    handleExportPDF,
    isGeneratingPdf,
  };
};
