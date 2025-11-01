import { useState, useEffect, useRef, useCallback } from "react";
  import { DndContext, DragEndEvent, DragOverlay, useSensor, useSensors, PointerSensor, DragStartEvent, DragMoveEvent, CollisionDetection, rectIntersection, closestCenter, DragOverEvent } from "@dnd-kit/core";
import { snapCenterToCursor } from "@dnd-kit/modifiers";
import type { PlacedSkill, RoutineConfig, Skill, PositionIcon, CategoryStateData, SaveStateData } from "@/types/routine";
import { useSkills } from "@/hooks/useSkills";
import { SkillsPanel } from "./SkillsPanel";
import { CountSheet } from "./CountSheet";
import { PositionSheet } from "./PositionSheet";
import { SkillCard } from "./SkillCard";
import { TrashDropZone } from "./TrashDropZone";
import { ThemeToggle } from "./ThemeToggle";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Download, Info, Library, RotateCcw, Settings as SettingsIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { lineBreak } from "html2canvas/dist/types/css/property-descriptors/line-break";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export const RoutineBuilder = () => {
  const { skills, exportToCSV, addCustomSkill, deleteSkill, updateSkillCounts } = useSkills();
  const [config, setConfig] = useState<RoutineConfig>({
    length: 90,
    category: "partner-stunts",
    level: "premier",
    bpm: 154,
  });

  const [placedSkills, setPlacedSkills] = useState<PlacedSkill[]>([]);
  const [positionIcons, setPositionIcons] = useState<PositionIcon[]>([]);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [selectedLine, setSelectedLine] = useState<number | null>(null);
  const [lineHistories, setLineHistories] = useState<{ [saveStateSlot: number]: { [category: string]: { [lineIndex: number]: { history: PositionIcon[][], index: number } } } }>({});
  const [draggedSkill, setDraggedSkill] = useState<Skill | null>(null);
  const [isDraggingPlacedSkill, setIsDraggingPlacedSkill] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [draggedPlacedSkillId, setDraggedPlacedSkillId] = useState<string | null>(null);
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(false);
  const [autoFollow, setAutoFollow] = useState(true);
  const [isDraggingIcon, setIsDraggingIcon] = useState(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const [draggedIconId, setDraggedIconId] = useState<string | null>(null);
  const [currentZoomLevel, setCurrentZoomLevel] = useState<number>(0.55);
  const [overCellId, setOverCellId] = useState<string | null>(null);

  // Handle zoom level changes from PositionSheet
  const handleZoomChange = useCallback((zoomLevel: number) => {
    setCurrentZoomLevel(zoomLevel);
  }, []);
  const [hasLoadedState, setHasLoadedState] = useState(false);
  const initialLoadedCategoryRef = useRef<string | null>(null);
  const [currentSaveState, setCurrentSaveState] = useState<SaveStateData | null>(null);
  const [loadedSaveStateSlot, setLoadedSaveStateSlot] = useState<null | 1 | 2 | 3>(null);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [shouldGeneratePdf, setShouldGeneratePdf] = useState(false);
  const [pdfIcons, setPdfIcons] = useState<PositionIcon[] | undefined>(undefined);

  // Load keyboard settings
  const [keyboardSettings] = useState(() => {
    const saved = localStorage.getItem("keyboardSettings");
    return saved ? JSON.parse(saved) : {
      nextLine: "ArrowDown",
      prevLine: "ArrowUp",
      undo: "z",
      redo: "y",
      toggleAutoFollow: "f",
      deleteIcon: "Delete",
      moveLeft: "ArrowLeft",
      moveRight: "ArrowRight",
      moveUp: "ArrowUp",
      moveDown: "ArrowDown",
      altMoveLeft: "a",
      altMoveRight: "d",
      altMoveUp: "w",
      altMoveDown: "s",
    };
  });

  // Load saved state on component mount - auto-load State 1 if available
  useEffect(() => {
    const state1Key = 'save-state-1';
    const savedState1 = localStorage.getItem(state1Key);
    if (savedState1) {
      try {
        const data: SaveStateData = JSON.parse(savedState1);
        setPlacedSkills(data.placedSkills);
        setPositionIcons(data.positionIcons);
        setNotes(data.notes || {});
        setConfig(data.config);
        setCurrentSaveState(data);
        setLoadedSaveStateSlot(1);
        // Store the initially loaded category so we know when user manually changes it
        initialLoadedCategoryRef.current = data.config.category;
      } catch (e) {
        console.error('Failed to load State 1:', e);
      }
    } else {
      // No State 1 exists - start fresh but default to State 1
      setLoadedSaveStateSlot(1);
    }
    // Mark that we've attempted to load saved state
    setHasLoadedState(true);
  }, []);

  // Manage PDF blob URL creation and cleanup
  useEffect(() => {
    if (pdfBlob && !pdfBlobUrl) {
      const url = URL.createObjectURL(pdfBlob);
      setPdfBlobUrl(url);
    }

    // Cleanup function
    return () => {
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
      }
    };
  }, [pdfBlob, pdfBlobUrl]);

  // Cleanup blob URL when dialog closes
  useEffect(() => {
    if (!showPdfPreview && pdfBlobUrl) {
      URL.revokeObjectURL(pdfBlobUrl);
      setPdfBlobUrl(null);
      setPdfBlob(null);
    }
  }, [showPdfPreview, pdfBlobUrl]);

  // Helper function to get unique position sheet configurations
  const getUniquePositionConfigurations = (): PositionIcon[][] => {
    const totalLines = Math.ceil((config.length * config.bpm) / 60 / 8);
    const configurations: PositionIcon[][] = [];
    const seenConfigurations = new Set<string>();

    for (let lineIndex = 0; lineIndex < totalLines; lineIndex++) {
      const lineIcons = positionIcons.filter(icon => icon.lineIndex === lineIndex);

      // Create a normalized representation of the configuration
      // Sort icons by position and create a hash string
      const normalizedIcons = lineIcons
        .map(icon => ({
          type: icon.type,
          x: icon.x,
          y: icon.y,
          name: icon.name || ''
        }))
        .sort((a, b) => {
          if (a.y !== b.y) return a.y - b.y;
          if (a.x !== b.x) return a.x - b.x;
          return a.type.localeCompare(b.type);
        });

      const configHash = JSON.stringify(normalizedIcons);

      // Only add if we haven't seen this configuration before
      if (!seenConfigurations.has(configHash)) {
        seenConfigurations.add(configHash);
        configurations.push(lineIcons);
      }
    }

    return configurations;
  };

  // Generate PDF when shouldGeneratePdf flag is set
  useEffect(() => {
    if (shouldGeneratePdf) {
      const generatePDF = async () => {
        try {
          const jsPDF = (await import("jspdf")).default;
          const html2canvas = (await import("html2canvas")).default;

          // Use portrait A4 (210mm x 297mm)
          const pdf = new jsPDF("p", "mm", "a4");
          const pageWidth = 210;
          const pageHeight = 297;
          const margin = 2; // Minimal margin for maximum content fit

          const countSheetElement = document.getElementById("count-sheet-container");
          if (countSheetElement) {
            // Store original styles to restore later
            const originalOverflow = countSheetElement.style.overflow;
            const originalHeight = countSheetElement.style.height;

            // Temporarily make all content visible without scrolling
            countSheetElement.style.overflow = 'visible';
            countSheetElement.style.height = 'auto';

            const canvas = await html2canvas(countSheetElement, {
              scale: 2, // Higher quality
              useCORS: true,
              allowTaint: true,
              backgroundColor: '#ffffff',
              // Capture the full scrollable area
              height: countSheetElement.scrollHeight,
              width: countSheetElement.scrollWidth,
            });

            // Restore original styles
            countSheetElement.style.overflow = originalOverflow;
            countSheetElement.style.height = originalHeight;

            const imgData = canvas.toDataURL("image/png");

            // Calculate scaling to fit within portrait page
            const availableWidth = pageWidth - (margin * 2);
            const availableHeight = pageHeight - (margin * 2);

            const scaleX = availableWidth / canvas.width;
            const scaleY = availableHeight / canvas.height;
            const scale = Math.min(scaleX, scaleY);

            const imgWidth = canvas.width * scale;
            const imgHeight = canvas.height * scale;

            // Center the image on the page
            const x = (pageWidth - imgWidth) / 2;
            const y = (pageHeight - imgHeight) / 2;

            pdf.addImage(imgData, "PNG", x, y, imgWidth, imgHeight);
          }

          if (config.category === "team-16" || config.category === "team-24") {
            const uniqueConfigurations = getUniquePositionConfigurations();

            for (const configIcons of uniqueConfigurations) {
              pdf.addPage();

              // Temporarily set the pdfIcons to show this configuration
              setPdfIcons(configIcons);

              // Wait for React to update the DOM
              await new Promise(resolve => setTimeout(resolve, 100));

              const positionSheetElement = document.getElementById("position-sheet-visual");
              if (positionSheetElement) {
                const canvas = await html2canvas(positionSheetElement, {
                  scale: 2, // Higher quality
                  useCORS: true,
                  allowTaint: true,
                  backgroundColor: '#ffffff',
                });
                const imgData = canvas.toDataURL("image/png");

                // Calculate scaling to fit within portrait page
                const availableWidth = pageWidth - (margin * 2);
                const availableHeight = pageHeight - (margin * 2);

                const scaleX = availableWidth / canvas.width;
                const scaleY = availableHeight / canvas.height;
                const scale = Math.min(scaleX, scaleY);

                const imgWidth = canvas.width * scale;
                const imgHeight = canvas.height * scale;

                // Center the image on the page
                const x = (pageWidth - imgWidth) / 2;
                const y = (pageHeight - imgHeight) / 2;

                pdf.addImage(imgData, "PNG", x, y, imgWidth, imgHeight);
              }
            }

            // Clear the pdfIcons to restore normal operation
            setPdfIcons(undefined);
          }

          // Generate blob for preview - use arraybuffer first then convert to blob
          const pdfArrayBuffer = pdf.output('arraybuffer');
          const pdfBlob = new Blob([pdfArrayBuffer], { type: 'application/pdf; charset=utf-8' });

          setPdfBlob(pdfBlob);
          setShowPdfPreview(true);
        } catch (error) {
          console.error('Error generating PDF:', error);
        } finally {
          setIsGeneratingPdf(false);
          setShouldGeneratePdf(false);
        }
      };

      generatePDF();
    }
  }, [shouldGeneratePdf, config.category, config.length, config.bpm, positionIcons, selectedLine]);

  // Handle category changes - auto-save/load category states
  useEffect(() => {
    // Only handle category changes after initial load
    if (!hasLoadedState) return;

    // Save current category state before switching (only for user-initiated changes)
    if (initialLoadedCategoryRef.current !== null && initialLoadedCategoryRef.current !== config.category) {
      saveCategoryState(initialLoadedCategoryRef.current as RoutineConfig['category']);
    }

    // Always start with fresh history when changing categories to ensure complete isolation
    if (loadedSaveStateSlot) {
      setLineHistories(prev => {
        if (!prev[loadedSaveStateSlot]) {
          return prev;
        }
        const newSaveStateHistories = { ...prev[loadedSaveStateSlot] };
        // Clear history for all categories in this save state to ensure complete isolation
        delete newSaveStateHistories[initialLoadedCategoryRef.current as string];
        delete newSaveStateHistories[config.category]; // Clear new category history too
        return {
          ...prev,
          [loadedSaveStateSlot]: newSaveStateHistories
        };
      });
    }

    // Load saved state for new category if it exists
    const savedCategoryData = loadCategoryState(config.category);
    if (savedCategoryData) {
      setPlacedSkills(savedCategoryData.placedSkills);
      setPositionIcons(savedCategoryData.positionIcons);
      setNotes(savedCategoryData.notes || {});
    } else {
      // No saved state - create default state for category
      setPlacedSkills([]);
      setNotes({});
      if (config.category === "team-16" || config.category === "team-24") {
        // Generate default team icons
        const totalLines = Math.ceil((config.length * config.bpm) / 60 / 8);
        const newIcons: PositionIcon[] = [];
        for (let lineIndex = 0; lineIndex < totalLines; lineIndex++) {
          newIcons.push(...generateTeamIcons(config.category, lineIndex));
        }
        setPositionIcons(newIcons);
      } else {
        // For individual categories, start with empty position sheet
        setPositionIcons([]);
      }
    }

    // Update the reference
    initialLoadedCategoryRef.current = config.category;
  }, [config.category, config.length, config.bpm, hasLoadedState]);

  // Auto-save to current slot whenever state changes
  useEffect(() => {
    if (loadedSaveStateSlot) {
      const key = `save-state-${loadedSaveStateSlot}`;
      const data: SaveStateData = {
        placedSkills: [...placedSkills],
        positionIcons: [...positionIcons],
        config: { ...config },
        notes: { ...notes },
        timestamp: Date.now()
      };
      localStorage.setItem(key, JSON.stringify(data));
      setCurrentSaveState(data);

      // Also save to current category state if we have loaded state
      if (hasLoadedState) {
        saveCategoryState(config.category);
      }
    }
  }, [placedSkills, positionIcons, config, loadedSaveStateSlot, hasLoadedState]);

  // Auto-scroll to keep selected skill in view after keyboard movement
  useEffect(() => {
    if (!selectedSkillId) return;

    const selectedSkill = placedSkills.find(ps => ps.id === selectedSkillId);
    if (!selectedSkill) return;

    // Find the count sheet container (the scrollable div)
    const countSheetContainer = document.querySelector('.flex-1.overflow-auto.relative') as HTMLElement;
    if (!countSheetContainer) return;

    // Find the specific skill element for the selected skill
    const skillElement = document.querySelector(`[data-skill-id="${selectedSkillId}"]`) as HTMLElement;
    if (!skillElement) return;

    const containerRect = countSheetContainer.getBoundingClientRect();
    const skillRect = skillElement.getBoundingClientRect();

    // Calculate if the skill is outside the visible area
    const isAboveViewport = skillRect.top < containerRect.top;
    const isBelowViewport = skillRect.bottom > containerRect.bottom;
    const isLeftOfViewport = skillRect.left < containerRect.left;
    const isRightOfViewport = skillRect.right > containerRect.right;

    // If any part of the skill is outside the viewport, scroll to bring it into view
    if (isAboveViewport || isBelowViewport || isLeftOfViewport || isRightOfViewport) {
      const currentScrollTop = countSheetContainer.scrollTop;
      const currentScrollLeft = countSheetContainer.scrollLeft;

      // Calculate how much to scroll to center the skill vertically
      let newScrollTop = currentScrollTop;
      if (isAboveViewport) {
        // Scroll up to show skill at top of viewport (with small margin)
        newScrollTop = currentScrollTop + (skillRect.top - containerRect.top) - 20;
      } else if (isBelowViewport) {
        // Scroll down to show skill at bottom of viewport (with small margin)
        newScrollTop = currentScrollTop + (skillRect.bottom - containerRect.bottom) + 20;
      }

      // For horizontal scrolling, we need to scroll the cell table itself
      let newScrollLeft = currentScrollLeft;
      if (isLeftOfViewport) {
        newScrollLeft = currentScrollLeft + (skillRect.left - containerRect.left) - 20;
      } else if (isRightOfViewport) {
        newScrollLeft = currentScrollLeft + (skillRect.right - containerRect.right) + 20;
      }

      // Apply the scroll
      if (newScrollTop !== currentScrollTop || newScrollLeft !== currentScrollLeft) {
        countSheetContainer.scrollTo({
          top: Math.max(0, newScrollTop),
          left: Math.max(0, newScrollLeft),
          behavior: 'smooth'
        });
      }
    }
  }, [selectedSkillId, placedSkills]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip keyboard shortcuts if user is typing in an input field
      const activeElement = document.activeElement;
      if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || (activeElement as HTMLElement).contentEditable === 'true')) {
        return;
      }

      // Position sheet shortcuts
      if (e.key === keyboardSettings.nextLine && !e.ctrlKey && !e.shiftKey) {
        const totalLines = Math.ceil((config.length * config.bpm) / 60 / 8);
        if (selectedLine !== null && selectedLine < totalLines - 1) {
          setSelectedLine(selectedLine + 1);
          e.preventDefault();
        }
      }
      
      if (e.key === keyboardSettings.prevLine && !e.ctrlKey && !e.shiftKey) {
        if (selectedLine !== null && selectedLine > 0) {
          setSelectedLine(selectedLine - 1);
          e.preventDefault();
        }
      }

      if (e.key === keyboardSettings.toggleAutoFollow) {
        setAutoFollow(!autoFollow);
        e.preventDefault();
      }

      // Undo/Redo shortcuts (no modifier keys required)
      if (e.key === keyboardSettings.undo && selectedLine !== null) {
        handleUndoLine(selectedLine);
        e.preventDefault();
      }

      if (e.key === keyboardSettings.redo && selectedLine !== null) {
        handleRedoLine(selectedLine);
        e.preventDefault();
      }

      if (e.key === keyboardSettings.deleteIcon || e.key === "Delete" || e.key === "Backspace") {
        const selectedIcons = positionIcons.filter(icon => icon.selected);
        if (selectedIcons.length > 0) {
          setPositionIcons(prev => prev.filter(icon => !icon.selected));
          e.preventDefault();
        }
      }

      // Delete key for selected skills in count sheet
      if ((e.key === "Delete" || e.key === "Backspace") && selectedSkillId && !e.ctrlKey && !e.shiftKey) {
        handleRemoveSkill(selectedSkillId);
        setSelectedSkillId(null);
        e.preventDefault();
      }

      // Count sheet shortcuts
      if (selectedSkillId) {
        const selectedSkill = placedSkills.find(ps => ps.id === selectedSkillId);
        if (!selectedSkill) return;

        const totalLines = Math.ceil((config.length * config.bpm) / 60 / 8);

        if (e.key === keyboardSettings.moveLeft || e.key === keyboardSettings.altMoveLeft) {
          const skill = skills.find(s => s.id === selectedSkill.skillId);
          if (!skill) return;

          // Calculate absolute start position (0-indexed)
          const absoluteStartPos = selectedSkill.lineIndex * 8 + selectedSkill.startCount - 1;

          // Try to move left by 1 count
          const newAbsoluteStartPos = absoluteStartPos - 1;

          if (newAbsoluteStartPos >= 0) {
            // Calculate new line and start count
            const newLineIndex = Math.floor(newAbsoluteStartPos / 8);
            const newStartCount = (newAbsoluteStartPos % 8) + 1;

            setPlacedSkills(prev => prev.map(ps =>
              ps.id === selectedSkillId ? { ...ps, lineIndex: newLineIndex, startCount: newStartCount } : ps
            ));
          }
          e.preventDefault();
        }

        if (e.key === keyboardSettings.moveRight || e.key === keyboardSettings.altMoveRight) {
          const skill = skills.find(s => s.id === selectedSkill.skillId);
          if (!skill) return;

          // Calculate absolute start position (0-indexed)
          const absoluteStartPos = selectedSkill.lineIndex * 8 + selectedSkill.startCount - 1;

          // Try to move right by 1 count
          const newAbsoluteStartPos = absoluteStartPos + 1;

          // Calculate total available positions
          const totalAvailablePositions = totalLines * 8;
          const skillEndPos = newAbsoluteStartPos + skill.counts - 1;

          if (skillEndPos < totalAvailablePositions) {
            // Calculate new line and start count
            const newLineIndex = Math.floor(newAbsoluteStartPos / 8);
            const newStartCount = (newAbsoluteStartPos % 8) + 1;

            setPlacedSkills(prev => prev.map(ps =>
              ps.id === selectedSkillId ? { ...ps, lineIndex: newLineIndex, startCount: newStartCount } : ps
            ));
          }
          e.preventDefault();
        }
        
        if (e.key === keyboardSettings.moveUp || e.key === keyboardSettings.altMoveUp) {
          if (selectedSkill.lineIndex > 0) {
            setPlacedSkills(prev => prev.map(ps =>
              ps.id === selectedSkillId ? { ...ps, lineIndex: ps.lineIndex - 1 } : ps
            ));
          }
          e.preventDefault();
        }
        
        if (e.key === keyboardSettings.moveDown || e.key === keyboardSettings.altMoveDown) {
          if (selectedSkill.lineIndex < totalLines - 1) {
            setPlacedSkills(prev => prev.map(ps =>
              ps.id === selectedSkillId ? { ...ps, lineIndex: ps.lineIndex + 1 } : ps
            ));
          }
          e.preventDefault();
        }
      }

      // Advanced keyboard shortcuts for bulk skill movement
      if (selectedSkillId && e.shiftKey && !e.ctrlKey) {
        // Shift + Arrow keys: Move selected skill and all skills after it
        const selectedSkill = placedSkills.find(ps => ps.id === selectedSkillId);
        if (!selectedSkill) return;

        const totalLines = Math.ceil((config.length * config.bpm) / 60 / 8);

        if (e.key === keyboardSettings.moveLeft || e.key === keyboardSettings.altMoveLeft) {
          // Check if we can move left - calculate absolute positions for all affected skills
          const skillsToMove = placedSkills.filter(ps =>
            ps.lineIndex > selectedSkill.lineIndex ||
            (ps.lineIndex === selectedSkill.lineIndex && ps.startCount > selectedSkill.startCount)
          );

          // Check if all skills to move can be moved left by calculating their new absolute positions
          const canMoveLeft = skillsToMove.every(ps => {
            const skill = skills.find(s => s.id === ps.skillId);
            if (!skill) return false;

            // Calculate absolute start position (0-indexed)
            const absoluteStartPos = ps.lineIndex * 8 + ps.startCount - 1;
            const newAbsoluteStartPos = absoluteStartPos - 1;

            // Must be within bounds
            return newAbsoluteStartPos >= 0;
          });

          if (canMoveLeft) {
            setPlacedSkills(prev => prev.map(ps => {
              if (skillsToMove.some(stm => stm.id === ps.id)) {
                // Calculate absolute start position (0-indexed)
                const absoluteStartPos = ps.lineIndex * 8 + ps.startCount - 1;
                const newAbsoluteStartPos = absoluteStartPos - 1;

                // Calculate new line and start count
                const newLineIndex = Math.floor(newAbsoluteStartPos / 8);
                const newStartCount = (newAbsoluteStartPos % 8) + 1;

                return { ...ps, lineIndex: newLineIndex, startCount: newStartCount };
              }
              return ps;
            }));
          }
          e.preventDefault();
        }

        if (e.key === keyboardSettings.moveRight || e.key === keyboardSettings.altMoveRight) {
          // Check if we can move right - calculate absolute positions for all affected skills
          const skillsToMove = placedSkills.filter(ps =>
            ps.lineIndex > selectedSkill.lineIndex ||
            (ps.lineIndex === selectedSkill.lineIndex && ps.startCount > selectedSkill.startCount)
          );

          // Check if all skills to move can be moved right by calculating their new absolute end positions
          const canMoveRight = skillsToMove.every(ps => {
            const skill = skills.find(s => s.id === ps.skillId);
            if (!skill) return false;

            // Calculate absolute start position (0-indexed) and new position
            const absoluteStartPos = ps.lineIndex * 8 + ps.startCount - 1;
            const newAbsoluteStartPos = absoluteStartPos + 1;

            // Calculate total available positions
            const totalAvailablePositions = totalLines * 8;
            const skillEndPos = newAbsoluteStartPos + skill.counts - 1;

            // Must not exceed total available positions
            return skillEndPos < totalAvailablePositions;
          });

          if (canMoveRight) {
            setPlacedSkills(prev => prev.map(ps => {
              if (skillsToMove.some(stm => stm.id === ps.id)) {
                // Calculate absolute start position (0-indexed) and new position
                const absoluteStartPos = ps.lineIndex * 8 + ps.startCount - 1;
                const newAbsoluteStartPos = absoluteStartPos + 1;

                // Calculate new line and start count
                const newLineIndex = Math.floor(newAbsoluteStartPos / 8);
                const newStartCount = (newAbsoluteStartPos % 8) + 1;

                return { ...ps, lineIndex: newLineIndex, startCount: newStartCount };
              }
              return ps;
            }));
          }
          e.preventDefault();
        }

        if (e.key === keyboardSettings.moveUp || e.key === keyboardSettings.altMoveUp) {
          // Check if all skills to move can actually move up (not in first line)
          const skillsToMove = placedSkills.filter(ps =>
            ps.lineIndex > selectedSkill.lineIndex ||
            (ps.lineIndex === selectedSkill.lineIndex && ps.startCount > selectedSkill.startCount)
          );

          const canAllSkillsMoveUp = skillsToMove.every(ps => ps.lineIndex > 0);

          if (canAllSkillsMoveUp) {
            setPlacedSkills(prev => prev.map(ps =>
              skillsToMove.some(stm => stm.id === ps.id) ? { ...ps, lineIndex: ps.lineIndex - 1 } : ps
            ));
          }
          e.preventDefault();
        }

        if (e.key === keyboardSettings.moveDown || e.key === keyboardSettings.altMoveDown) {
          // Check if all skills to move can actually move down (not in last line)
          const skillsToMove = placedSkills.filter(ps =>
            ps.lineIndex > selectedSkill.lineIndex ||
            (ps.lineIndex === selectedSkill.lineIndex && ps.startCount > selectedSkill.startCount)
          );

          const canAllSkillsMoveDown = skillsToMove.every(ps => ps.lineIndex < totalLines - 1);

          if (canAllSkillsMoveDown) {
            setPlacedSkills(prev => prev.map(ps =>
              skillsToMove.some(stm => stm.id === ps.id) ? { ...ps, lineIndex: ps.lineIndex + 1 } : ps
            ));
          }
          e.preventDefault();
        }
      }

      if (selectedSkillId && e.ctrlKey && !e.shiftKey) {
        // Ctrl + Arrow keys: Move selected skill and all skills before it
        const selectedSkill = placedSkills.find(ps => ps.id === selectedSkillId);
        if (!selectedSkill) return;

        const totalLines = Math.ceil((config.length * config.bpm) / 60 / 8);

        if (e.key === keyboardSettings.moveLeft || e.key === keyboardSettings.altMoveLeft) {
          // Check if we can move left - calculate absolute positions for all affected skills
          const skillsToMove = placedSkills.filter(ps =>
            ps.lineIndex < selectedSkill.lineIndex ||
            (ps.lineIndex === selectedSkill.lineIndex && ps.startCount < selectedSkill.startCount)
          );

          // Check if all skills to move can be moved left by calculating their new absolute positions
          const canMoveLeft = skillsToMove.every(ps => {
            const skill = skills.find(s => s.id === ps.skillId);
            if (!skill) return false;

            // Calculate absolute start position (0-indexed)
            const absoluteStartPos = ps.lineIndex * 8 + ps.startCount - 1;
            const newAbsoluteStartPos = absoluteStartPos - 1;

            // Must be within bounds
            return newAbsoluteStartPos >= 0;
          });

          if (canMoveLeft) {
            setPlacedSkills(prev => prev.map(ps => {
              if (skillsToMove.some(stm => stm.id === ps.id)) {
                // Calculate absolute start position (0-indexed)
                const absoluteStartPos = ps.lineIndex * 8 + ps.startCount - 1;
                const newAbsoluteStartPos = absoluteStartPos - 1;

                // Calculate new line and start count
                const newLineIndex = Math.floor(newAbsoluteStartPos / 8);
                const newStartCount = (newAbsoluteStartPos % 8) + 1;

                return { ...ps, lineIndex: newLineIndex, startCount: newStartCount };
              }
              return ps;
            }));
          }
          e.preventDefault();
        }

        if (e.key === keyboardSettings.moveRight || e.key === keyboardSettings.altMoveRight) {
          // Check if we can move right - calculate absolute positions for all affected skills
          const skillsToMove = placedSkills.filter(ps =>
            ps.lineIndex < selectedSkill.lineIndex ||
            (ps.lineIndex === selectedSkill.lineIndex && ps.startCount < selectedSkill.startCount)
          );

          // Check if all skills to move can be moved right by calculating their new absolute end positions
          const canMoveRight = skillsToMove.every(ps => {
            const skill = skills.find(s => s.id === ps.skillId);
            if (!skill) return false;

            // Calculate absolute start position (0-indexed) and new position
            const absoluteStartPos = ps.lineIndex * 8 + ps.startCount - 1;
            const newAbsoluteStartPos = absoluteStartPos + 1;

            // Calculate total available positions
            const totalAvailablePositions = totalLines * 8;
            const skillEndPos = newAbsoluteStartPos + skill.counts - 1;

            // Must not exceed total available positions
            return skillEndPos < totalAvailablePositions;
          });

          if (canMoveRight) {
            setPlacedSkills(prev => prev.map(ps => {
              if (skillsToMove.some(stm => stm.id === ps.id)) {
                // Calculate absolute start position (0-indexed) and new position
                const absoluteStartPos = ps.lineIndex * 8 + ps.startCount - 1;
                const newAbsoluteStartPos = absoluteStartPos + 1;

                // Calculate new line and start count
                const newLineIndex = Math.floor(newAbsoluteStartPos / 8);
                const newStartCount = (newAbsoluteStartPos % 8) + 1;

                return { ...ps, lineIndex: newLineIndex, startCount: newStartCount };
              }
              return ps;
            }));
          }
          e.preventDefault();
        }

        if (e.key === keyboardSettings.moveUp || e.key === keyboardSettings.altMoveUp) {
          // Check if all skills to move can actually move up (not in first line)
          const skillsToMove = placedSkills.filter(ps =>
            ps.lineIndex < selectedSkill.lineIndex ||
            (ps.lineIndex === selectedSkill.lineIndex && ps.startCount < selectedSkill.startCount)
          );

          const canAllSkillsMoveUp = skillsToMove.every(ps => ps.lineIndex > 0);

          if (canAllSkillsMoveUp) {
            setPlacedSkills(prev => prev.map(ps =>
              skillsToMove.some(stm => stm.id === ps.id) ? { ...ps, lineIndex: ps.lineIndex - 1 } : ps
            ));
          }
          e.preventDefault();
        }

        if (e.key === keyboardSettings.moveDown || e.key === keyboardSettings.altMoveDown) {
          // Check if all skills to move can actually move down (not in last line)
          const skillsToMove = placedSkills.filter(ps =>
            ps.lineIndex < selectedSkill.lineIndex ||
            (ps.lineIndex === selectedSkill.lineIndex && ps.startCount < selectedSkill.startCount)
          );

          const canAllSkillsMoveDown = skillsToMove.every(ps => ps.lineIndex < totalLines - 1);

          if (canAllSkillsMoveDown) {
            setPlacedSkills(prev => prev.map(ps =>
              skillsToMove.some(stm => stm.id === ps.id) ? { ...ps, lineIndex: ps.lineIndex + 1 } : ps
            ));
          }
          e.preventDefault();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedLine, config, autoFollow, positionIcons, selectedSkillId, placedSkills, keyboardSettings]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  /**
   * Generate position icons for team categories (team-16 or team-24) in evenly distributed positions
   */
  const generateTeamIcons = (category: string, lineIndex: number): PositionIcon[] => {
    const gridSize = 800 / 36; // ≈22.222 units per cell
    const icons: PositionIcon[] = [];
    const timestamp = Date.now();

    if (category === "team-16") {
      // 5 bases per row, evenly distributed across 36 columns
      // Spacing of ~6.9 columns between each (36 total / 6 gaps = 6 per gap)
      const basePositions = [4, 11, 18, 25, 32]; // Evenly spaced across grid
      for (let i = 0; i < 5; i++) {
        icons.push({
          id: `icon-${timestamp}-${lineIndex}-base1-${i}`,
          type: "square",
          x: Math.round((basePositions[i] * gridSize)),
          y: Math.round(6 * gridSize), // Row 6
          lineIndex,
        });
      }
      for (let i = 0; i < 5; i++) {
        icons.push({
          id: `icon-${timestamp}-${lineIndex}-base2-${i}`,
          type: "square",
          x: Math.round((basePositions[i] * gridSize)),
          y: Math.round(12 * gridSize), // Row 12
          lineIndex,
        });
      }
      // 2 Mid tiers evenly spaced between bases
      const midPositions = [10, 26]; // Centered between base groups
      for (let i = 0; i < 2; i++) {
        icons.push({
          id: `icon-${timestamp}-${lineIndex}-mid-${i}`,
          type: "circle",
          x: Math.round((midPositions[i] * gridSize)),
          y: Math.round(17 * gridSize), // Row 17
          lineIndex,
        });
      }
      // 4 Top flys evenly distributed like bases
      const flyPositions = [5, 14, 22, 31]; // Even spacing like bases but slightly offset
      for (let i = 0; i < 4; i++) {
        icons.push({
          id: `icon-${timestamp}-${lineIndex}-fly-${i}`,
          type: "x",
          x: Math.round((flyPositions[i] * gridSize)),
          y: Math.round(22 * gridSize), // Row 22
          lineIndex,
        });
      }
    } else if (category === "team-24") {
      // 8 bases per row, evenly distributed across 36 columns
      // Spacing of ~4.3 columns between each (36 total / 9 gaps ≈ 4 per gap)
      const basePositions = [4, 8, 12, 16, 20, 24, 28, 32]; // Evenly spaced
      for (let i = 0; i < 8; i++) {
        icons.push({
          id: `icon-${timestamp}-${lineIndex}-base1-${i}`,
          type: "square",
          x: Math.round((basePositions[i] * gridSize)),
          y: Math.round(6 * gridSize), // Row 6
          lineIndex,
        });
      }
      for (let i = 0; i < 8; i++) {
        icons.push({
          id: `icon-${timestamp}-${lineIndex}-base2-${i}`,
          type: "square",
          x: Math.round((basePositions[i] * gridSize)),
          y: Math.round(12 * gridSize), // Row 12
          lineIndex,
        });
      }
      // 4 Mid tiers evenly spaced between base groups
      const midPositions = [5, 14, 22, 31]; // Between base clusters
      for (let i = 0; i < 4; i++) {
        icons.push({
          id: `icon-${timestamp}-${lineIndex}-mid-${i}`,
          type: "circle",
          x: Math.round((midPositions[i] * gridSize)),
          y: Math.round(17 * gridSize), // Row 17
          lineIndex,
        });
      }
      // 4 Top flys evenly distributed
      const flyPositions = [5, 14, 22, 31]; // Even spacing across formation
      for (let i = 0; i < 4; i++) {
        icons.push({
          id: `icon-${timestamp}-${lineIndex}-fly-${i}`,
          type: "x",
          x: Math.round((flyPositions[i] * gridSize)),
          y: Math.round(22 * gridSize), // Row 22
          lineIndex,
        });
      }
    }

    return icons;
  };

  /**
   * Helper functions for scoped history management
   * History is now scoped by saveStateSlot -> category -> lineIndex to avoid conflicts between contexts
   */
  const getScopedHistory = (saveStateSlot: number, category: string, lineIndex: number): { history: PositionIcon[][], index: number } | undefined => {
    return lineHistories[saveStateSlot]?.[category]?.[lineIndex];
  };

  const setScopedHistory = (saveStateSlot: number, category: string, lineIndex: number, history: { history: PositionIcon[][], index: number }) => {
    setLineHistories(prev => ({
      ...prev,
      [saveStateSlot]: {
        ...prev[saveStateSlot],
        [category]: {
          ...prev[saveStateSlot]?.[category],
          [lineIndex]: history
        }
      }
    }));
  };

  const getCurrentScopedHistory = (lineIndex: number): { history: PositionIcon[][], index: number } | undefined => {
    if (!loadedSaveStateSlot) return undefined;
    return getScopedHistory(loadedSaveStateSlot, config.category, lineIndex);
  };

  // Computed history data for the current context (save state + category)
  const currentContextLineHistories = loadedSaveStateSlot ? lineHistories[loadedSaveStateSlot]?.[config.category] || {} : {};

  /**
   * Helper functions for category-based state management
   * Category states are now scoped per save state to avoid conflicts
   */
  const saveCategoryState = (category: RoutineConfig['category']) => {
    if (!loadedSaveStateSlot) return; // Shouldn't happen, but safety check
    const key = `category-${loadedSaveStateSlot}-${category}`;
    const data: CategoryStateData = {
      placedSkills: [...placedSkills],
      positionIcons: [...positionIcons],
      notes: { ...notes },
      timestamp: Date.now()

    };
    localStorage.setItem(key, JSON.stringify(data));
  };

  const loadCategoryState = (category: RoutineConfig['category']): CategoryStateData | null => {
    if (!loadedSaveStateSlot) return null; // Shouldn't happen, but safety check
    const key = `category-${loadedSaveStateSlot}-${category}`;
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : null;
  };

  const saveToSlot = (slotNumber: 1 | 2 | 3) => {
    const key = `save-state-${slotNumber}`;
    const data: SaveStateData = {
      placedSkills: [...placedSkills],
      positionIcons: [...positionIcons],
      config: { ...config },
      notes: { ...notes },
      timestamp: Date.now()
    };
    localStorage.setItem(key, JSON.stringify(data));
    setCurrentSaveState(data);
    setLoadedSaveStateSlot(slotNumber);
  };

  const loadFromSlot = (slotNumber: 1 | 2 | 3) => {
    const key = `save-state-${slotNumber}`;
    const saved = localStorage.getItem(key);

    if (saved) {
      // Load existing saved data
      const data: SaveStateData = JSON.parse(saved);
      setPlacedSkills(data.placedSkills);
      setPositionIcons(data.positionIcons);
      setConfig(data.config);
      setCurrentSaveState(data);
      setLoadedSaveStateSlot(slotNumber);
      initialLoadedCategoryRef.current = data.config.category;
    } else {
      // Create default state for new slot
      const defaultPlacedSkills: PlacedSkill[] = [];

      let defaultPositionIcons: PositionIcon[] = [];
      if (config.category === "team-16" || config.category === "team-24") {
        // Generate default team icons
        const totalLines = Math.ceil((config.length * config.bpm) / 60 / 8);
        for (let lineIndex = 0; lineIndex < totalLines; lineIndex++) {
          defaultPositionIcons.push(...generateTeamIcons(config.category, lineIndex));
        }
      }
      // For individual categories, positionIcons remains empty

      // Create default save state data
      const defaultData: SaveStateData = {
        placedSkills: defaultPlacedSkills,
        positionIcons: defaultPositionIcons,
        config: { ...config },
        notes: {},
        timestamp: Date.now()
      };

      // Apply the default state
      setPlacedSkills(defaultPlacedSkills);
      setPositionIcons(defaultPositionIcons);
      // Keep current config

      // Save as the initial state for this slot
      localStorage.setItem(key, JSON.stringify(defaultData));
      setCurrentSaveState(defaultData);
      setLoadedSaveStateSlot(slotNumber);
      initialLoadedCategoryRef.current = config.category;
    }
  };

  /**
   * Custom collision detection function that prioritizes:
   * 1. Trash zone collisions using rectIntersection
   * 2. Position sheet grid when dragging position icons (uses rectIntersection)
   * 3. Left-edge collision for placed skills being dragged back onto countsheet
   * 4. Falls back to rectIntersection for count sheet cells (new skills) and other scenarios
   */
  const customCollisionDetection: CollisionDetection = (args) => {
    // 1. Check for collisions using rectIntersection (for trash zone and prioritized areas)
    const rectCollisions = rectIntersection(args);
    const trashCollision = rectCollisions.find(collision =>
      collision.id === 'trash-zone' ||
      (collision.data?.current?.type === 'trash-zone')
    );

    // If we have a collision with the trash zone, only return that.
    if (trashCollision) {
        return [trashCollision];
    }

    // 2. When dragging position icons, prioritize the position sheet grid
    if (args.active.data?.current?.type === "position-icon") {
      const positionSheetGridCollision = rectCollisions.find(collision =>
        collision.id === 'position-sheet-grid'
      );

      // If dragging a position icon over the position sheet grid, prioritize it
      if (positionSheetGridCollision) {
        return [positionSheetGridCollision];
      }
    }

    // 3. Use left-edge collision detection only for placed skills being dragged back onto countsheet
    if (setIsDraggingPlacedSkill) {
      return rectCollisions.filter(collision => {
        const activeRect = args.active.rect.current?.translated;
        const droppableRect = args.droppableRects.get(collision.id);

        if (!activeRect || !droppableRect) return false;

        // Check if the left edge (vertical line at activeRect.left) intersects with the droppable
        // This means the left edge x-position is within the droppable's bounds
        const leftEdgeX = activeRect.left;

        // The left edge intersects if its x-position is within the droppable's width
        // and the active rect overlaps with the droppable in the y-direction
        const xIntersects = leftEdgeX >= droppableRect.left && leftEdgeX <= droppableRect.right;
        const yIntersects = activeRect.top < droppableRect.bottom && activeRect.bottom > droppableRect.top;

        return xIntersects && yIntersects;
      });
    }

    // 4. Fall back to closestCenter for count sheet cells (new skills) and other scenarios
    return rectIntersection(args);
  };

  // Auto-populate position icons for Team categories (only when not loaded from saved state)
  useEffect(() => {
    if (!hasLoadedState && (config.category === "team-16" || config.category === "team-24") && positionIcons.length === 0) {
      const totalLines = Math.ceil((config.length * config.bpm) / 60 / 8);

      const newIcons: PositionIcon[] = [];

      for (let lineIndex = 0; lineIndex < totalLines; lineIndex++) {
        newIcons.push(...generateTeamIcons(config.category, lineIndex));
      }

      setPositionIcons(newIcons);
    }
  }, [hasLoadedState, config.category, config.length, config.bpm, positionIcons.length]);

  // Initialize history for the selected line when it changes
  useEffect(() => {
    if (selectedLine !== null && loadedSaveStateSlot && !getCurrentScopedHistory(selectedLine)) {
      const currentLineIcons = positionIcons.filter(i => i.lineIndex === selectedLine);
      setScopedHistory(loadedSaveStateSlot, config.category, selectedLine, {
        history: [currentLineIcons],
        index: 0
      });
    }
  }, [selectedLine, positionIcons, loadedSaveStateSlot, config.category]);

  // Record history state whenever icons change for the current line
  useEffect(() => {
    if (selectedLine !== null && loadedSaveStateSlot) {
      const lineHistory = getCurrentScopedHistory(selectedLine);
      if (!lineHistory) return;

      const currentState = positionIcons.filter(i => i.lineIndex === selectedLine);

      // Don't record if state hasn't changed from current history position
      const lastState = lineHistory.history[lineHistory.index];
      if (lastState && JSON.stringify(lastState) === JSON.stringify(currentState)) {
        // If states are identical, check if we got here because of undo - don't record in that case
        return;
      }

      // If states are different, add a new history entry
      const newHistory = [...lineHistory.history.slice(0, lineHistory.index + 1), currentState];

      setScopedHistory(loadedSaveStateSlot, config.category, selectedLine, {
        history: newHistory,
        index: newHistory.length - 1
      });
    }
  }, [positionIcons, selectedLine, loadedSaveStateSlot, config.category]);

const handleDragMove = (event: DragMoveEvent) => {
    console.log(`Drag Move: Type='${event.active.data?.current?.type || (skills.find(s => s.id === event.active.id) ? 'new skill' : 'unknown')}', ID='${event.active.id}'`);
    const { active, delta, over } = event; // Add 'over' here
    
    if (active.data?.current?.type === "position-icon") {
      setDragOffset({ x: delta.x, y: delta.y });
    }

    // --- Add This New Logic Block for Skill Resize ---
    if (active.data?.current?.type === "skill-resize" && over && over.id.toString().startsWith("cell-")) {
      const { skill, placedSkill, direction } = active.data.current as { skill: Skill, placedSkill: PlacedSkill, direction: 'left' | 'right', originalCellsToSpan: number };
      const { lineIndex: overLine, count: overCount } = over.data.current as { lineIndex: number, count: number };

      // Find the placed skill's starting position *at the beginning of the drag*
      const { lineIndex: startLine, startCount: startCol } = placedSkill;
      
      // Calculate the absolute start position (0-indexed) *at the beginning of the drag*
      const absoluteStartPos = startLine * 8 + (startCol - 1);
      
      // Calculate the absolute position of the cell we're hovering over (0-indexed)
      const absoluteOverPos = overLine * 8 + (overCount - 1);

      let newCounts: number;
      let newAbsoluteStartPos = -1; // -1 to indicate no change unless left handle

      if (direction === "right") {
        // New count is the difference from the start pos to the over pos
        newCounts = absoluteOverPos - absoluteStartPos + 1;
      } else { // direction === "left"
        // The skill's original end position (at drag start)
        const originalAbsoluteEndPos = absoluteStartPos + skill.counts - 1;
        
        // New count is the difference from the original end pos to the new start pos
        newCounts = originalAbsoluteEndPos - absoluteOverPos + 1;
        
        // The new start position is the cell we're over
        newAbsoluteStartPos = absoluteOverPos;
      }

      // Clamp newCounts to be at least 1
      newCounts = Math.max(1, newCounts);

      // --- Update State (with checks to prevent thrashing) ---

      // 1. Update the base skill's counts if it has changed
      const currentSkill = skills.find(s => s.id === skill.id);
      if (currentSkill && currentSkill.counts !== newCounts) {
        updateSkillCounts(skill.id, newCounts);
      }

      // 2. If it's the left handle, update the placedSkill's position if it has changed
      if (direction === "left" && newAbsoluteStartPos !== -1) {
        const currentPlacedSkill = placedSkills.find(ps => ps.id === placedSkill.id);
        const newLineIndex = Math.floor(newAbsoluteStartPos / 8);
        const newStartCount = (newAbsoluteStartPos % 8) + 1;

        if (currentPlacedSkill && (currentPlacedSkill.lineIndex !== newLineIndex || currentPlacedSkill.startCount !== newStartCount)) {
          setPlacedSkills(prev => prev.map(ps =>
            ps.id === placedSkill.id
              ? { ...ps, lineIndex: newLineIndex, startCount: newStartCount }
              : ps
          ));
        }
      }
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    console.log(`Drag Start: Type='${event.active.data?.current?.type || (skills.find(s => s.id === event.active.id) ? 'new skill' : 'unknown')}', ID='${event.active.id}'`);
    const skill = skills.find((s) => s.id === event.active.id);
    if (skill) {
      setDraggedSkill(skill);
      // Prevent scrolling during drag
      document.body.style.overflow = 'hidden';
      return;
    }

    if (event.active.data?.current?.type === "placed-skill") {
      setIsDraggingPlacedSkill(true);
      setDraggedPlacedSkillId(event.active.data.current.placedSkill.id);
      setDraggedSkill(skills.find(s => s.id === event.active.data.current.placedSkill.skillId) || null);
      // Prevent scrolling during drag
      document.body.style.overflow = 'hidden';
    }

    if (event.active.data?.current?.type === "position-icon") {
      setShowGrid(true);
      setIsDraggingIcon(true);
      setDraggedIconId(event.active.id as string);
      setDragOffset({ x: 0, y: 0 });
    }

    if (event.active.data?.current?.type === "skill-resize") {
      // Skill resize drag started - no special handling needed at start
      setIsResizing(true);
    }
  };

const handleDragOver = (event: DragOverEvent) => {
    const overId = event.over?.id.toString();
    if (overId && overId.startsWith('cell-')) {
      setOverCellId(overId);
    } else {
      setOverCellId(null);
    }
  };

const handleDragEnd = (event: DragEndEvent) => {
    // Console log using state variables for accurate type reporting
    console.log(`Drag End: Type='${isDraggingPlacedSkill ? 'placed skill' : isDraggingIcon ? 'position icon' : (skills.find(s => s.id === event.active.id) ? 'new skill' : 'unknown')}', ID='${event.active.id}', Over='${event.over?.id}', Over Data Type='${event.over?.data?.current?.type || 'N/A'}'`);

    // Store state before resetting, as we need it for logic below
    const wasDraggingPlacedSkill = isDraggingPlacedSkill;
    const originalPlacedSkillId = draggedPlacedSkillId;
    const wasDraggingIcon = isDraggingIcon; // Added for completeness, might be useful later

    // Reset drag state immediately
    setDraggedSkill(null);
    setIsDraggingPlacedSkill(false);
    setIsResizing(false);
    setDraggedPlacedSkillId(null);
    setShowGrid(false);
    setIsDraggingIcon(false);
    setDragOffset(null);
    setDraggedIconId(null);
    setOverCellId(null);
    // Re-enable scrolling
    document.body.style.overflow = '';

    const { active, over, delta } = event;
    // Exit if dropped outside a droppable area
    if (!over) return;

// --- Skill Resize Handle Logic ---
    if (active.data?.current?.type === "skill-resize") {
      // All logic is now handled in onDragMove.
      // We just need to stop further processing here.
      return; 
    }

    // --- Trash Zone Logic ---
    // Check for trash zone drop with robust detection
    if (over.id === "trash-zone" || over.id === "trash-drop-zone" || over.data?.current?.type === "trash-zone") {
      // Use stored state to check if it was a placed skill
      if (wasDraggingPlacedSkill && originalPlacedSkillId) {
        handleRemoveSkill(originalPlacedSkillId);
        setSelectedSkillId(null); // Deselect if the deleted skill was selected
      } else if (active.data?.current?.type === "position-icon") { // Check original data for icon type
        // Handle position icon deletion
        const iconId = active.id as string;
        handleRemovePositionIcon(iconId); // Assuming you have this function
      }
      return; // Stop further processing after deleting
    }

    // --- Position Icon Drag Logic ---
    // Use the original active.data.current.type for icons as overlay isn't used for them
    if (active.data?.current?.type === "position-icon") {
      const icon = positionIcons.find(i => i.id === active.id);
      if (!icon) return;

      // Handle multi-icon drag
      const selectedIcons = positionIcons.filter(i => i.selected && i.lineIndex === selectedLine);
      if (selectedIcons.length > 1 && selectedIcons.some(i => i.id === active.id)) {
        // Multi-icon drag - update all selected icons and propagate if autoFollow is on
        selectedIcons.forEach(selectedIcon => {
          // Calculate new position based on delta, ensuring it stays within bounds (e.g., 0 to 800/600)
          // Scale delta by zoom level to account for visual scaling
          const scaledDeltaX = delta.x * (1 / currentZoomLevel);
          const scaledDeltaY = delta.y * (1 / currentZoomLevel);
          const newX = Math.max(0, Math.min(800, selectedIcon.x + scaledDeltaX)); // Assuming 800 width
          const newY = Math.max(0, Math.min(600, selectedIcon.y + scaledDeltaY)); // Assuming 600 height
          handleUpdatePositionIcon(selectedIcon.id, newX, newY, autoFollow);
        });
      } else {
        // Single icon drag - scale delta by zoom level to account for visual scaling
        const scaledDeltaX = delta.x * (1 / currentZoomLevel);
        const scaledDeltaY = delta.y * (1 / currentZoomLevel);
        const newX = Math.max(0, Math.min(800, icon.x + scaledDeltaX));
        const newY = Math.max(0, Math.min(600, icon.y + scaledDeltaY));
        handleUpdatePositionIcon(active.id as string, newX, newY, autoFollow);
      }
      // PositionSheet handles history, no need to add here.
      return; // Stop further processing for icons
    }

    // --- Position Sheet Grid Drop Logic ---
    // Handle dropping items onto the position sheet grid
    if (over.id === "position-sheet-grid" && over.rect) {
      const positionSheetElement = document.getElementById("position-sheet");
      if (positionSheetElement) {
        const rect = positionSheetElement.getBoundingClientRect();
        // Calculate coordinates relative to the position sheet grid area
        // The position sheet has padding and the grid area is offset by p-1.5 (6px on each side)
        const offsetX = delta.x + (active.rect?.current?.initial?.width || 0) / 2;
        const offsetY = delta.y + (active.rect?.current?.initial?.height || 0) / 2;

        // Ensure coordinates are within grid bounds (0-800, 0-600)
        const dropX = Math.max(0, Math.min(800, offsetX));
        const dropY = Math.max(0, Math.min(600, offsetY));

        if (active.data?.current?.type === "position-icon") {
          // Moving existing position icon
          const iconId = active.id as string;
          handleUpdatePositionIcon(iconId, dropX, dropY, autoFollow);
        } else if (active.data?.current && !active.data.current.type) {
          // Dropping a new position icon from somewhere else (could be from a tool button or other source)
          // For now, we'll create a default type, but this could be enhanced to handle different drop sources
          const newIcon: PositionIcon = {
            id: `icon-${Date.now()}-${Math.random()}`,
            type: "square", // Default type
            x: dropX,
            y: dropY,
            lineIndex: selectedLine || 0,
          };
          // Add the icon using the existing handler
          const tempIcons = [...positionIcons, newIcon];
          setPositionIcons(tempIcons);
          // Mark the new icon as selected
          setPositionIcons(prev => prev.map(icon =>
            icon.id === newIcon.id ? { ...icon, selected: true } : { ...icon, selected: false }
          ));
        }
      }
      return; // Stop further processing
    }


    // --- Skill Drop Logic ---
    // Check if dropping onto a valid cell
    if (over.id.toString().startsWith("cell-")) {
        const lineIndex = over.data?.current?.lineIndex;
        const count = over.data?.current?.count;

        if (typeof lineIndex === "number" && typeof count === "number") {
            // Check if we *started* dragging a PLACED skill
            if (wasDraggingPlacedSkill && originalPlacedSkillId) {
                setPlacedSkills(
                    (prevSkills) => prevSkills.map((ps) =>
                        ps.id === originalPlacedSkillId // Use the ID stored from drag start
                        ? { ...ps, lineIndex, startCount: count }
                        : ps
                    )
                );
            } else {
                // Check if we are dropping a NEW skill from the panel
                const skillFromPanel = skills.find((s) => s.id === active.id);
                if (skillFromPanel) {
                    const newPlacedSkill: PlacedSkill = {
                        id: `placed-${Date.now()}-${Math.random()}`,
                        skillId: skillFromPanel.id,
                        lineIndex,
                        startCount: count,
                    };
                    setPlacedSkills((prevSkills) => [...prevSkills, newPlacedSkill]);
                }
            }
        }
    }
    // No further actions if not dropped on a cell or trash
  };


  const handleRemoveSkill = (id: string) => {
    setPlacedSkills(placedSkills.filter((ps) => ps.id !== id));
    if (selectedSkillId === id) {
      setSelectedSkillId(null);
    }
  };

  const handleAddPositionIcon = (type: PositionIcon["type"]) => {
    console.log(`handleAddPositionIcon called with type: ${type}, selectedLine: ${selectedLine}`);
    if (selectedLine === null) {
      console.log("selectedLine is null, returning early");
      return;
    }

    const gridSize = 800 / 36;
    const lineIcons = positionIcons.filter(i => i.lineIndex === selectedLine);
    console.log(`Found ${lineIcons.length} icons already on line ${selectedLine}`);
    const occupied = new Set(lineIcons.map(i => `${i.x},${i.y}`));

    // Start from a visible middle-left area, like where team formations typically start
    let x = Math.round(2 * gridSize); // Column 2 - left side but not edge
    let y = Math.round(6 * gridSize); // Row 6 - top formation row
    let found = false;

    // Try common formation positions first (rows 6, 12, 17, 22)
    const preferredRows = [6, 12, 17, 22, 9, 15, 21, 27];
    for (let rowIndex = 0; rowIndex < preferredRows.length && !found; rowIndex++) {
      const row = preferredRows[rowIndex];
      for (let col = 1; col < 35 && !found; col++) {
        const testX = Math.round(col * gridSize);
        const testY = Math.round(row * gridSize);
        if (!occupied.has(`${testX},${testY}`)) {
          x = testX;
          y = testY;
          found = true;
        }
      }
    }

    // If still not found, search anywhere from row 1 onward (avoiding very top edge)
    if (!found) {
      for (let row = 1; row < 36 && !found; row++) {
        for (let col = 0; col < 36 && !found; col++) {
          const testX = Math.round(col * gridSize);
          const testY = Math.round(row * gridSize);
          if (!occupied.has(`${testX},${testY}`)) {
            x = testX;
            y = testY;
            found = true;
          }
        }
      }
    }

    console.log(`Adding icon at position (${x}, ${y}) for line ${selectedLine}. Found free position: ${found}`);
    const newIcon: PositionIcon = {
      id: `icon-${Date.now()}-${Math.random()}`,
      type,
      x,
      y,
      lineIndex: selectedLine,
    };
    setPositionIcons(prev => {
      const newIcons = [...prev, newIcon];
      console.log(`Total positionIcons after adding: ${newIcons.length}`);
      return newIcons;
    });
  };

  const handleUpdatePositionIcon = (id: string, x: number, y: number, shouldPropagate: boolean = false) => {
    const icon = positionIcons.find(i => i.id === id);
    if (!icon) return;

    const gridSize = 800 / 36;
    const snappedX = Math.round(x / gridSize) * gridSize;
    const snappedY = Math.round(y / gridSize) * gridSize;

    setPositionIcons(prev => {
      const updated = prev.map((i) => (i.id === id ? { ...i, x: snappedX, y: snappedY } : i));
      
      if (shouldPropagate && autoFollow) {
        const currentLine = icon.lineIndex;
        const totalLines = Math.ceil((config.length * config.bpm) / 60 / 8);
        
        // Get all icons at current line with their new positions
        const currentLineIcons = updated.filter(i => i.lineIndex === currentLine);
        
        // For each subsequent line, copy the entire icon layout from current line
        const result = [...updated];
        for (let line = currentLine + 1; line < totalLines; line++) {
          // Remove existing icons at this line
          const otherIcons = result.filter(i => i.lineIndex !== line);
          
          // Copy current line icons to this line
          const copiedIcons = currentLineIcons.map(i => ({
            ...i,
            id: `icon-${Date.now()}-${Math.random()}-${line}`,
            lineIndex: line,
          }));
          
          result.length = 0;
          result.push(...otherIcons, ...copiedIcons);
        }
        
        return result;
      }
      
      return updated;
    });
  };

  const handleRemovePositionIcon = (id: string) => {
    setPositionIcons(positionIcons.filter((icon) => icon.id !== id));
  };

  const handleRestoreLineState = (lineIndex: number, newLineIcons: PositionIcon[]) => {
    // Replace all icons for the specified line with the new state
    setPositionIcons(prev => {
      // Remove all existing icons for this line
      const filteredIcons = prev.filter(icon => icon.lineIndex !== lineIndex);
      // Add the new line icons
      return [...filteredIcons, ...newLineIcons];
    });
  };

  const handleUndoLine = (lineIndex: number) => {
    if (!loadedSaveStateSlot) return;
    const lineHistory = getCurrentScopedHistory(lineIndex);
    if (!lineHistory || lineHistory.index <= 0) return;

    // Get the previous state for this line
    const prevState = lineHistory.history[lineHistory.index - 1];
    if (!prevState) return;

    // Restore the state
    handleRestoreLineState(lineIndex, prevState);

    // If auto-follow is enabled, propagate the undo to subsequent lines
    if (autoFollow) {
      const totalLines = Math.ceil((config.length * config.bpm) / 60 / 8);
      const currentLineIcons = prevState;

      // Restore subsequent lines to match the undone state
      for (let subsequentLine = lineIndex + 1; subsequentLine < totalLines; subsequentLine++) {
        // Create copied icons for this subsequent line
        const copiedIcons = currentLineIcons.map(icon => ({
          ...icon,
          id: `icon-${Date.now()}-${Math.random()}-${subsequentLine}`,
          lineIndex: subsequentLine,
        }));

        // Replace icons for this line
        setPositionIcons(prev => {
          const otherIcons = prev.filter(icon => icon.lineIndex !== subsequentLine);
          return [...otherIcons, ...copiedIcons];
        });
      }
    }

    // Update history index
    setScopedHistory(loadedSaveStateSlot, config.category, lineIndex, {
      ...lineHistory,
      index: lineHistory.index - 1
    });
  };

  const handleRedoLine = (lineIndex: number) => {
    if (!loadedSaveStateSlot) return;
    const lineHistory = getCurrentScopedHistory(lineIndex);
    if (!lineHistory || lineHistory.index >= lineHistory.history.length - 1) return;

    // Get the next state for this line
    const nextState = lineHistory.history[lineHistory.index + 1];
    if (!nextState) return;

    // Restore the state
    handleRestoreLineState(lineIndex, nextState);

    // If auto-follow is enabled, propagate the redo to subsequent lines
    if (autoFollow) {
      const totalLines = Math.ceil((config.length * config.bpm) / 60 / 8);
      const currentLineIcons = nextState;

      // Restore subsequent lines to match the redone state
      for (let subsequentLine = lineIndex + 1; subsequentLine < totalLines; subsequentLine++) {
        // Create copied icons for this subsequent line
        const copiedIcons = currentLineIcons.map(icon => ({
          ...icon,
          id: `icon-${Date.now()}-${Math.random()}-${subsequentLine}`,
          lineIndex: subsequentLine,
        }));

        // Replace icons for this line
        setPositionIcons(prev => {
          const otherIcons = prev.filter(icon => icon.lineIndex !== subsequentLine);
          return [...otherIcons, ...copiedIcons];
        });
      }
    }

    // Update history index
    setScopedHistory(loadedSaveStateSlot, config.category, lineIndex, {
      ...lineHistory,
      index: lineHistory.index + 1
    });
  };

  const handleRemoveMultiplePositionIcons = (ids: string[]) => {
    setPositionIcons(positionIcons.filter((icon) => !ids.includes(icon.id)));
  };

  const handleNamePositionIcon = (id: string, name: string) => {
    setPositionIcons(prev => {
      const updated = prev.map((icon) => (icon.id === id ? { ...icon, name } : icon));

      if (autoFollow) {
        const namedIcon = updated.find(i => i.id === id);
        if (!namedIcon) return updated;

        const totalLines = Math.ceil((config.length * config.bpm) / 60 / 8);
        const currentLine = namedIcon.lineIndex;

        // For each subsequent line, find icons with matching position and type
        const result = [...updated];
        for (let line = currentLine + 1; line < totalLines; line++) {
          const matchingIconIndex = result.findIndex(i =>
            i.lineIndex === line &&
            i.x === namedIcon.x &&
            i.y === namedIcon.y &&
            i.type === namedIcon.type
          );

          if (matchingIconIndex !== -1) {
            result[matchingIconIndex] = { ...result[matchingIconIndex], name };
          }
        }

        return result;
      }

      return updated;
    });
  };

  const handleExportPDF = () => {
    setIsGeneratingPdf(true);
    setShouldGeneratePdf(true);
  };

  const handleReset = () => {
    // Reset to default state
    setPlacedSkills([]);
    setSelectedLine(null);
    setSelectedSkillId(null);
    setLineHistories({}); // Clear all history states

    // For team categories, reset icons to default positions
    if (config.category === "team-16" || config.category === "team-24") {
      const totalLines = Math.ceil((config.length * config.bpm) / 60 / 8);
      const resetIcons: PositionIcon[] = [];

      for (let lineIndex = 0; lineIndex < totalLines; lineIndex++) {
        resetIcons.push(...generateTeamIcons(config.category, lineIndex));
      }

      setPositionIcons(resetIcons);
    } else {
      // For non-team categories, clear icons (no auto-population happens)
      setPositionIcons([]);
    }

    // Don't clear auto-saved states - reset is just for clearing current work
    // The current state will auto-save as empty if the auto-save effect runs again
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <header className="border-b bg-card p-2">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-xl font-bold">Cheerleading Routine Builder</h1>
          <div className="flex gap-1">
            <Link to="/skills-editor">
              <Button variant="outline" size="sm">
                <Library className="h-4 w-4 mr-1" />
                Skills Editor
              </Button>
            </Link>
            <Link to="/settings">
              <Button variant="outline" size="sm">
                <SettingsIcon className="h-4 w-4 mr-1" />
                Settings
              </Button>
            </Link>
            <Button variant="destructive" size="sm" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset
            </Button>
            <Link to="/about">
              <Button variant="outline" size="sm">
                <Info className="h-4 w-4 mr-1" />
                About
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPDF}
              disabled={isGeneratingPdf}
            >
              <Download className="h-4 w-4 mr-1" />
              {isGeneratingPdf ? "Generating..." : "Export PDF"}
            </Button>
            <ThemeToggle />
          </div>
        </div>
        
        <div className="flex gap-3 items-center">
          <div className="flex items-center gap-1">
            <Label className="text-xs">Length:</Label>
            <Select
              value={config.length.toString()}
              onValueChange={(v) => setConfig({ ...config, length: parseInt(v) })}
            >
              <SelectTrigger className="w-24 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="60">1:00</SelectItem>
                <SelectItem value="90">1:30</SelectItem>
                <SelectItem value="120">2:00</SelectItem>
                <SelectItem value="135">2:15</SelectItem>
                <SelectItem value="150">2:30</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1">
            <Label className="text-xs">BPM:</Label>
            <Input
              type="number"
              min="120"
              max="160"
              value={config.bpm}
              onChange={(e) => {
                const bpm = parseInt(e.target.value);
                if (!isNaN(bpm) && bpm >= 120 && bpm <= 160) {
                  setConfig({ ...config, bpm });
                }
              }}
              className="w-[80px] h-8"
            />
          </div>

          <div className="flex items-center gap-1">
            <Label className="text-xs">Category:</Label>
            <Select
              value={config.category}
              onValueChange={(v) => setConfig({ ...config, category: v as any })}
            >
              <SelectTrigger className="w-40 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="partner-stunts">Partner Stunts</SelectItem>
                <SelectItem value="group-stunts">Group Stunts</SelectItem>
                <SelectItem value="team-16">Team (16)</SelectItem>
                <SelectItem value="team-24">Team (24)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1">
            <Label className="text-xs">Save State:</Label>
            <Select
              value={loadedSaveStateSlot?.toString() || "1"}
              onValueChange={(slot) => {
                const newSlot = parseInt(slot) as 1 | 2 | 3;
                // Auto-save current state before switching to new slot
                if (loadedSaveStateSlot) {
                  const key = `save-state-${loadedSaveStateSlot}`;
                  const data: SaveStateData = {
                    placedSkills: [...placedSkills],
                    positionIcons: [...positionIcons],
                    config: { ...config },
                    notes: { ...notes },
                    timestamp: Date.now()
                  };
                  localStorage.setItem(key, JSON.stringify(data));
                }
                // Load the new slot
                loadFromSlot(newSlot);
              }}
            >
              <SelectTrigger className="w-60 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {([1, 2, 3] as const).map(slot => {
                  const key = `save-state-${slot}`;
                  const saved = localStorage.getItem(key);
                  let label = `State ${slot}`;
                  if (saved) {
                    try {
                      const data = JSON.parse(saved) as SaveStateData;
                      const category = data.config.category.replace('-', ' ').toUpperCase();
                      label += ` (${category})`;
                    } catch (e) {
                      // Keep default label if parsing fails
                    }
                  }
                  return (
                    <SelectItem key={slot} value={slot.toString()}>
                      {label}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>

      <DndContext
        sensors={sensors}
        collisionDetection={customCollisionDetection}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        autoScroll={false}
        modifiers={[snapCenterToCursor]}
      >
        <ResizablePanelGroup direction="horizontal" className="flex-1 w-full">
          <ResizablePanel defaultSize={15} minSize={10} maxSize={40} collapsible>
            <SkillsPanel
              skills={skills}
              onAddCustomSkill={addCustomSkill}
              onDeleteSkill={(id) => {
                deleteSkill(id);
                setPlacedSkills(placedSkills.filter(ps => ps.skillId !== id));
              }}
              onUpdateSkillCounts={updateSkillCounts}
              currentLevel={config.level}
              onLevelChange={(level) => setConfig({ ...config, level })}
            />
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel defaultSize={75}>
            {(config.category === "team-16" || config.category === "team-24") ? (
              <ResizablePanelGroup direction="vertical" className="h-full">
                <ResizablePanel defaultSize={50}>
                  <CountSheet
                    routineLength={config.length}
                    bpm={config.bpm}
                    placedSkills={placedSkills.filter(ps => ps.id !== draggedPlacedSkillId)}
                    skills={skills}
                    onRemoveSkill={handleRemoveSkill}
                    onLineClick={setSelectedLine}
                    selectedLine={selectedLine}
                    selectedSkillId={selectedSkillId}
                    onSelectSkill={setSelectedSkillId}
                    onMoveSkill={(id, newLineIndex, newStartCount) => {
                      setPlacedSkills(placedSkills.map(ps =>
                        ps.id === id ? { ...ps, lineIndex: newLineIndex, startCount: newStartCount } : ps
                      ));
                    }}
                    onUpdateSkillCounts={updateSkillCounts}
                    draggedSkill={draggedSkill}
                    overCellId={overCellId}
                    notes={notes}
                    onUpdateNote={(lineIndex, note) => {
                      setNotes(prev => ({ ...prev, [lineIndex]: note }));
                    }}
                  />
                </ResizablePanel>

                <ResizableHandle withHandle />

                <ResizablePanel defaultSize={50} minSize={30}>
                  <PositionSheet
                    icons={positionIcons}
                    selectedLine={selectedLine}
                    onUpdateIcon={handleUpdatePositionIcon}
                    onAddIcon={handleAddPositionIcon}
                    onRemoveIcon={handleRemovePositionIcon}
                    onRemoveMultipleIcons={handleRemoveMultiplePositionIcons}
                    onNameIcon={handleNamePositionIcon}
                    onRestoreLineState={handleRestoreLineState}
                    lineHistories={currentContextLineHistories}
                    onUndoLine={handleUndoLine}
                    onRedoLine={handleRedoLine}
                    showGrid={showGrid}
                    autoFollow={autoFollow}
                    onToggleAutoFollow={() => setAutoFollow(!autoFollow)}
                    isDraggingIcon={isDraggingIcon}
                    dragOffset={dragOffset}
                    draggedIconId={draggedIconId}
                    onSelectIcon={(id) => {
                      setPositionIcons(prev => prev.map(icon =>
                        ({ ...icon, selected: icon.id === id ? !icon.selected : false })
                      ));
                    }}
                    onSelectMultiple={(ids) => {
                      setPositionIcons(prev => prev.map(icon =>
                        ({ ...icon, selected: ids.includes(icon.id) })
                      ));
                    }}
                    onNextLine={() => {
                      const totalLines = Math.ceil((config.length * config.bpm) / 60 / 8);
                      if (selectedLine !== null && selectedLine < totalLines - 1) {
                        setSelectedLine(selectedLine + 1);
                      }
                    }}
                    onPrevLine={() => {
                      if (selectedLine !== null && selectedLine > 0) {
                        setSelectedLine(selectedLine - 1);
                      }
                    }}
                    onIconDragStart={() => {
                      setShowGrid(true);
                      setIsDraggingIcon(true);
                    }}
                    onIconDragEnd={() => {
                      setShowGrid(false);
                      setIsDraggingIcon(false);
                    }}
                    onIconDrop={(event) => {
                      // Receive zoom level info and potentially handle scaled drag end
                      setCurrentZoomLevel(event.zoomLevel);
                    }}
                    onZoomChange={(zoomLevel) => setCurrentZoomLevel(zoomLevel)}
                    pdfIcons={pdfIcons}
                  />
                </ResizablePanel>
              </ResizablePanelGroup>
            ) : (
              <CountSheet
                routineLength={config.length}
                bpm={config.bpm}
                placedSkills={placedSkills}
                skills={skills}
                onRemoveSkill={handleRemoveSkill}
                onLineClick={setSelectedLine}
                selectedLine={selectedLine}
                selectedSkillId={selectedSkillId}
                onSelectSkill={setSelectedSkillId}
                onMoveSkill={(id, newLineIndex, newStartCount) => {
                  setPlacedSkills(placedSkills.map(ps =>
                    ps.id === id ? { ...ps, lineIndex: newLineIndex, startCount: newStartCount } : ps
                  ));
                }}
                onUpdateSkillCounts={updateSkillCounts}
                draggedSkill={draggedSkill}
                overCellId={overCellId}
              />
            )}
          </ResizablePanel>
        </ResizablePanelGroup>

<DragOverlay className="z-[3000]">

{draggedSkill ? (
<div className={isDraggingPlacedSkill ? "" : ""}>
<SkillCard skill={draggedSkill} showDescription={false} />
</div>
) : null}
</DragOverlay>
        <TrashDropZone isDragging={isDraggingPlacedSkill} />
      </DndContext>

      {/* PDF Preview Dialog */}
      <Dialog open={showPdfPreview} onOpenChange={setShowPdfPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>PDF Preview</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-4">
            {pdfBlobUrl && (
              <object
                data={pdfBlobUrl}
                type="application/pdf"
                className="w-full h-[600px] border rounded"
                title="PDF Preview"
              >
                <p>Your browser doesn't support PDF preview. <a href={pdfBlobUrl} download="routine.pdf">Download the PDF</a> instead.</p>
              </object>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPdfPreview(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (pdfBlobUrl) {
                  const a = document.createElement('a');
                  a.href = pdfBlobUrl;
                  a.download = 'routine.pdf';
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  setShowPdfPreview(false);
                }
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
