import { useState, useEffect, useRef, useCallback } from "react";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, DragMoveEvent, CollisionDetection, rectIntersection, DragOverEvent, useSensor, useSensors, PointerSensor } from "@dnd-kit/core";
import { snapCenterToCursor } from "@dnd-kit/modifiers";
import type { PlacedSkill, RoutineConfig, Skill, PositionIcon, Arrow, CategoryStateData, SaveStateData } from "@/types/routine";
import { useSkills } from "@/hooks/useSkills";
import { useRoutineConfig } from "@/hooks/useRoutineConfig";
import { usePdfExport } from "@/hooks/usePdfExport";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useIsMobile } from "@/hooks/use-mobile";
import { exportCurrentSlot, importSlotData, validateImportedData, type ExportedData } from "@/lib/exportImport";
import AboutModal from "./AboutModal";
import { RoutineHeader } from "./RoutineHeader";
import { RoutineWorkspace } from "./RoutineWorkspace";
import { PdfPreviewDialog } from "./PdfPreviewDialog";
import { SaveRenameDialog } from "./SaveRenameDialog";
import { RoutineConfigModal } from "./RoutineConfigModal";
import { useTheme } from "next-themes";

// Define global functions for TypeScript
declare global {
  interface Window {
    showPdfProgress: (totalSteps: number) => void;
    updatePdfProgress: (currentStep: number, message: string) => void;
    hidePdfProgress: () => void;
    pdfTotalSteps: number;
  }
}

export const RoutineBuilder = () => {
  const { theme } = useTheme();
  const isMobile = useIsMobile();
  const { config, updateLength, updateCategory, updateLevel, updateBpm, updateConfig } = useRoutineConfig();

  const [placedSkills, setPlacedSkills] = useState<PlacedSkill[]>([]);
  const { skills, exportToCSV, addCustomSkill, deleteSkill, updateSkillCounts, resetToDefault } =
    useSkills(placedSkills);
  const [positionIcons, setPositionIcons] = useState<PositionIcon[]>([]);
  const [arrows, setArrows] = useState<Arrow[]>([]);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [segmentNames, setSegmentNames] = useState<Record<number, string>>({});
  const [selectedLine, setSelectedLine] = useState<number | null>(null);
  const [lineHistories, setLineHistories] = useState<{
    [saveStateSlot: number]: {
      [category: string]: {
        [lineIndex: number]: {
          iconHistory: PositionIcon[][];
          arrowHistory: Arrow[][];
          index: number;
        };
      };
    };
  }>({});
  const [draggedSkill, setDraggedSkill] = useState<Skill | null>(null);
  const [isDraggingPlacedSkill, setIsDraggingPlacedSkill] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [draggedPlacedSkillId, setDraggedPlacedSkillId] = useState<string | null>(
    null,
  );
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(false);
  const [autoFollow, setAutoFollow] = useState(true);
  const [isDraggingIcon, setIsDraggingIcon] = useState(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [draggedIconId, setDraggedIconId] = useState<string | null>(null);
  const [currentZoomLevel, setCurrentZoomLevel] = useState<number>(0.55);
  const [overCellId, setOverCellId] = useState<string | null>(null);

  // Handle zoom level changes from PositionSheet
  const handleZoomChange = useCallback((zoomLevel: number) => {
    setCurrentZoomLevel(zoomLevel);
  }, []);
  const [hasLoadedState, setHasLoadedState] = useState(false);
  const initialLoadedCategoryRef = useRef<string | null>(null);
  const [currentSaveState, setCurrentSaveState] =
    useState<SaveStateData | null>(null);
  const [loadedSaveStateSlot, setLoadedSaveStateSlot] = useState<
    null | 1 | 2 | 3
  >(null);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  // const [shouldGeneratePdf, setShouldGeneratePdf] = useState(false); // <-- REMOVED
  const [saveNames, setSaveNames] = useState<Record<1 | 2 | 3, string>>({
    1: "Save 1",
    2: "Save 2",
    3: "Save 3",
  });
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [renameInput, setRenameInput] = useState("");
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);

  // Load keyboard settings
  const keyboardSettings = {
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
  };

  // Load saved state on component mount - auto-load State 1 if available
  useEffect(() => {
    // Load save names
    const savedNames = localStorage.getItem("save-names");
    if (savedNames) {
      try {
        const names = JSON.parse(savedNames);
        setSaveNames((prev) => ({ ...prev, ...names }));
      } catch (e) {
        console.error("Failed to load save names:", e);
      }
    }

    const state1Key = "save-state-1";
    const savedState1 = localStorage.getItem(state1Key);
    if (savedState1) {
      try {
        const data: SaveStateData = JSON.parse(savedState1);
        setPlacedSkills(data.placedSkills);
        setPositionIcons(data.positionIcons);
        setNotes(data.notes || {});
        setSegmentNames(data.segmentNames || {});
        updateConfig(data.config);
        setCurrentSaveState(data);
        setLoadedSaveStateSlot(1);
        // Store the initially loaded category so we know when user manually changes it
        initialLoadedCategoryRef.current = data.config.category;
      } catch (e) {
        console.error("Failed to load State 1:", e);
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
  // ----- MODIFY THIS FUNCTION -----
  const getUniquePositionConfigurations = (): {
    icons: PositionIcon[];
    arrows: Arrow[];
    lineIndex: number;
  }[] => {
    const totalLines = Math.ceil(((config.length * config.bpm) / 60 / 8));
    const configurations: { icons: PositionIcon[]; arrows: Arrow[]; lineIndex: number }[] = [];
    const seenConfigurations = new Set<string>();

    for (let lineIndex = 0; lineIndex < totalLines; lineIndex++) {
      const lineIcons = positionIcons.filter(
        (icon) => icon.lineIndex === lineIndex,
      );
      const lineArrows = arrows.filter(
        (arrow) => arrow.lineIndex === lineIndex,
      );

      // Create a normalized representation of the configuration
      // Sort icons by position and create a hash string
      const normalizedIcons = lineIcons
        .map((icon) => ({
          type: icon.type,
          x: icon.x,
          y: icon.y,
          name: icon.name || "",
        }))
        .sort((a, b) => {
          if (a.y !== b.y) return a.y - b.y;
          if (a.x !== b.x) return a.x - b.x;
          return a.type.localeCompare(b.type);
        });

      // Create a normalized representation of arrows
      const normalizedArrows = lineArrows
        .map((arrow) => ({
          startX: arrow.start.x,
          startY: arrow.start.y,
          endX: arrow.end.x,
          endY: arrow.end.y,
        }))
        .sort((a, b) => {
          if (a.startY !== b.startY) return a.startY - b.startY;
          if (a.startX !== b.startX) return a.startX - b.startX;
          return 0;
        });

      const configHash = JSON.stringify({
        icons: normalizedIcons,
        arrows: normalizedArrows
      });

      // Only add if we haven't seen this configuration before
      if (!seenConfigurations.has(configHash)) {
        seenConfigurations.add(configHash);
        // Clear selected state on all icons and arrows for PDF generation
        const iconsForPdf = lineIcons.map(icon => ({ ...icon, selected: false }));
        const arrowsForPdf = lineArrows.map(arrow => ({ ...arrow, selected: false }));
        configurations.push({ 
          icons: iconsForPdf, 
          arrows: arrowsForPdf,
          lineIndex 
        }); // Store lineIndex
      }
    }

    return configurations;
  };

  const { handleExportPDF, isGeneratingPdf } = usePdfExport({
    config,
    placedSkills,
    skills,
    notes,
    getUniquePositionConfigurations,
    segmentNames,
    setPdfBlob,
    setShowPdfPreview,
    onClearSelections: () => {
      setSelectedLine(null);
      setSelectedSkillId(null);
      setPositionIcons(prev => prev.map(icon => ({ ...icon, selected: false })));
      setArrows(prev => prev.map(arrow => ({ ...arrow, selected: false })));
    },
  });

  // Handle category changes - auto-save/load category states
  useEffect(() => {
    // Only handle category changes after initial load
    if (!hasLoadedState) return;

    // Save current category state before switching (only for user-initiated changes)
    if (
      initialLoadedCategoryRef.current !== null &&
      initialLoadedCategoryRef.current !== config.category
    ) {
      saveCategoryState(
        initialLoadedCategoryRef.current as RoutineConfig["category"],
      );
    }

    // Always start with fresh history when changing categories to ensure complete isolation
    if (loadedSaveStateSlot) {
      setLineHistories((prev) => {
        if (!prev[loadedSaveStateSlot]) {
          return prev;
        }
        const newSaveStateHistories = { ...prev[loadedSaveStateSlot] };
        // Clear history for all categories in this save state to ensure complete isolation
        delete newSaveStateHistories[initialLoadedCategoryRef.current as string];
        delete newSaveStateHistories[config.category]; // Clear new category history too
        return {
          ...prev,
          [loadedSaveStateSlot]: newSaveStateHistories,
        };
      });
    }

    // Load saved state for new category if it exists
    const savedCategoryData = loadCategoryState(config.category);
    if (savedCategoryData) {
      setPlacedSkills(savedCategoryData.placedSkills);
      setPositionIcons(savedCategoryData.positionIcons);
      setArrows(savedCategoryData.arrows || []); // Handle backwards compatibility
      setNotes(savedCategoryData.notes || {});
      setSegmentNames(savedCategoryData.segmentNames || {});
    } else {
      // No saved state - create default state for category
      setPlacedSkills([]);
      setArrows([]); // Start with empty arrows
      setNotes({});
      setSegmentNames({});
      if (config.category === "team-16" || config.category === "team-24") {
        // Generate default team icons
        const totalLines = Math.ceil(((config.length * config.bpm) / 60 / 8));
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
        arrows: [...arrows],
        config: { ...config },
        notes: { ...notes },
        segmentNames: { ...segmentNames },
        timestamp: Date.now(),
      };
      localStorage.setItem(key, JSON.stringify(data));
      setCurrentSaveState(data);

      // Also save to current category state if we have loaded state
      if (hasLoadedState) {
        saveCategoryState(config.category);
      }
    }
  }, [
    placedSkills,
    positionIcons,
    arrows,
    config,
    loadedSaveStateSlot,
    hasLoadedState,
    notes,
    segmentNames,
  ]);

  // Auto-scroll to keep selected skill in view after keyboard movement
  useEffect(() => {
    if (!selectedSkillId) return;

    const selectedSkill = placedSkills.find((ps) => ps.id === selectedSkillId);
    if (!selectedSkill) return;

    // Find the count sheet container (the scrollable div)
    const countSheetContainer = document.querySelector(
      ".flex-1.overflow-auto.relative",
    ) as HTMLElement;
    if (!countSheetContainer) return;

    // Find the specific skill element for the selected skill
    const skillElement = document.querySelector(
      `[data-skill-id="${selectedSkillId}"]`,
    ) as HTMLElement;
    if (!skillElement) return;

    const containerRect = countSheetContainer.getBoundingClientRect();
    const skillRect = skillElement.getBoundingClientRect();

    // Calculate if the skill is outside the visible area
    const isAboveViewport = skillRect.top < containerRect.top;
    const isBelowViewport = skillRect.bottom > containerRect.bottom;
    const isLeftOfViewport = skillRect.left < containerRect.left;
    const isRightOfViewport = skillRect.right > containerRect.right;

    // If any part of the skill is outside the viewport, scroll to bring it into view
    if (
      isAboveViewport ||
      isBelowViewport ||
      isLeftOfViewport ||
      isRightOfViewport
    ) {
      const currentScrollTop = countSheetContainer.scrollTop;
      const currentScrollLeft = countSheetContainer.scrollLeft;

      // Calculate how much to scroll to center the skill vertically
      let newScrollTop = currentScrollTop;
      if (isAboveViewport) {
        // Scroll up to show skill at top of viewport (with small margin)
        newScrollTop = currentScrollTop + (skillRect.top - containerRect.top) - 20;
      } else if (isBelowViewport) {
        // Scroll down to show skill at bottom of viewport (with small margin)
        newScrollTop =
          currentScrollTop + (skillRect.bottom - containerRect.bottom) + 20;
      }

      // For horizontal scrolling, we need to scroll the cell table itself
      let newScrollLeft = currentScrollLeft;
      if (isLeftOfViewport) {
        newScrollLeft =
          currentScrollLeft + (skillRect.left - containerRect.left) - 20;
      } else if (isRightOfViewport) {
        newScrollLeft =
          currentScrollLeft + (skillRect.right - containerRect.right) + 20;
      }

      // Apply the scroll
      if (
        newScrollTop !== currentScrollTop ||
        newScrollLeft !== currentScrollLeft
      ) {
        countSheetContainer.scrollTo({
          top: Math.max(0, newScrollTop),
          left: Math.max(0, newScrollLeft),
          behavior: "smooth",
        });
      }
    }
  }, [selectedSkillId, placedSkills]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: isMobile
        ? {
            delay: 200,
            tolerance: 5,
          }
        : {
            distance: 8,
          },
    }),
  );

  /**
   * Generate position icons for team categories (team-16 or team-24) in evenly distributed positions
   */
  const generateTeamIcons = (
    category: string,
    lineIndex: number,
  ): PositionIcon[] => {
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
          x: Math.round(basePositions[i] * gridSize),
          y: Math.round(6 * gridSize), // Row 6
          lineIndex,
        });
      }
      for (let i = 0; i < 5; i++) {
        icons.push({
          id: `icon-${timestamp}-${lineIndex}-base2-${i}`,
          type: "square",
          x: Math.round(basePositions[i] * gridSize),
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
          x: Math.round(midPositions[i] * gridSize),
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
          x: Math.round(flyPositions[i] * gridSize),
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
          x: Math.round(basePositions[i] * gridSize),
          y: Math.round(6 * gridSize), // Row 6
          lineIndex,
        });
      }
      for (let i = 0; i < 8; i++) {
        icons.push({
          id: `icon-${timestamp}-${lineIndex}-base2-${i}`,
          type: "square",
          x: Math.round(basePositions[i] * gridSize),
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
          x: Math.round(midPositions[i] * gridSize),
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
          x: Math.round(flyPositions[i] * gridSize),
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
  const getScopedHistory = (
    saveStateSlot: number,
    category: string,
    lineIndex: number,
  ): { iconHistory: PositionIcon[][]; arrowHistory: Arrow[][]; index: number } | undefined => {
    return lineHistories[saveStateSlot]?.[category]?.[lineIndex];
  };

  const setScopedHistory = (
    saveStateSlot: number,
    category: string,
    lineIndex: number,
    history: { iconHistory: PositionIcon[][]; arrowHistory: Arrow[][]; index: number },
  ) => {
    setLineHistories((prev) => ({
      ...prev,
      [saveStateSlot]: {
        ...prev[saveStateSlot],
        [category]: {
          ...prev[saveStateSlot]?.[category],
          [lineIndex]: history,
        },
      },
    }));
  };

  const getCurrentScopedHistory = (
    lineIndex: number,
  ): { iconHistory: PositionIcon[][]; arrowHistory: Arrow[][]; index: number } | undefined => {
    if (!loadedSaveStateSlot) return undefined;
    return getScopedHistory(loadedSaveStateSlot, config.category, lineIndex);
  };

  // Computed history data for the current context (save state + category)
  const currentContextLineHistories = loadedSaveStateSlot
    ? lineHistories[loadedSaveStateSlot]?.[config.category] || {}
    : {};

  /**
   * Helper function to normalize position icons for history comparison
   * Excludes UI-only properties like 'selected' that shouldn't be part of undo/redo
   */
  const normalizeIconsForHistory = (icons: PositionIcon[]): PositionIcon[] => {
    return icons.map(({ selected, ...icon }) => icon);
  };

  /**
   * Helper function to check if two icon states are equal, ignoring selection differences
   */
  const areStatesEqualIgnoringSelection = (state1: PositionIcon[], state2: PositionIcon[]): boolean => {
    if (state1.length !== state2.length) return false;

    // Create normalized versions for comparison
    const normalized1 = normalizeIconsForHistory(state1);
    const normalized2 = normalizeIconsForHistory(state2);

    return JSON.stringify(normalized1) === JSON.stringify(normalized2);
  };

  /**
   * Helper functions for category-based state management
   * Category states are now scoped per save state to avoid conflicts
   */
  const saveCategoryState = (category: RoutineConfig["category"]) => {
    if (!loadedSaveStateSlot) return; // Shouldn't happen, but safety check
    const key = `category-${loadedSaveStateSlot}-${category}`;
    const data: CategoryStateData = {
      placedSkills: [...placedSkills],
      positionIcons: [...positionIcons],
      arrows: [...arrows],
      notes: { ...notes },
      segmentNames: { ...segmentNames },
      timestamp: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(data));
  };

  const loadCategoryState = (
    category: RoutineConfig["category"],
  ): CategoryStateData | null => {
    if (!loadedSaveStateSlot) return null; // Shouldn't happen, but safety check
    const key = `category-${loadedSaveStateSlot}-${category}`;
    const saved = localStorage.getItem(key);
    const data = saved ? JSON.parse(saved) : null;
    
    // Handle backwards compatibility: if arrows don't exist in saved data, add empty array
    if (data && !data.arrows) {
      data.arrows = [];
    }
    
    return data;
  };

  const saveToSlot = (slotNumber: 1 | 2 | 3) => {
    const key = `save-state-${slotNumber}`;
    const data: SaveStateData = {
      placedSkills: [...placedSkills],
      positionIcons: [...positionIcons],
      arrows: [...arrows],
      config: { ...config },
      notes: { ...notes },
      segmentNames: { ...segmentNames },
      timestamp: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(data));
    setCurrentSaveState(data);
    setLoadedSaveStateSlot(slotNumber);

    // Save the current save names
    localStorage.setItem("save-names", JSON.stringify(saveNames));
  };

  const loadFromSlot = (slotNumber: 1 | 2 | 3) => {
    const key = `save-state-${slotNumber}`;
    const saved = localStorage.getItem(key);

    if (saved) {
      // Load existing saved data
      const data: SaveStateData = JSON.parse(saved);
      setPlacedSkills(data.placedSkills);
      setPositionIcons(data.positionIcons);
      setArrows(data.arrows || []); // Handle backwards compatibility with older saves
      updateConfig(data.config);
      setNotes(data.notes || {});
      setSegmentNames(data.segmentNames || {});
      setCurrentSaveState(data);
      setLoadedSaveStateSlot(slotNumber);
      initialLoadedCategoryRef.current = data.config.category;
    } else {
      // Create default state for new slot
      const defaultPlacedSkills: PlacedSkill[] = [];
      const defaultNotes = {};
      const defaultSegmentNames = {};
      const defaultArrows: Arrow[] = []; // Default to empty arrows array

      const defaultPositionIcons: PositionIcon[] = [];
      if (config.category === "team-16" || config.category === "team-24") {
        // Generate default team icons
        const totalLines = Math.ceil(((config.length * config.bpm) / 60 / 8));
        for (let lineIndex = 0; lineIndex < totalLines; lineIndex++) {
          defaultPositionIcons.push(
            ...generateTeamIcons(config.category, lineIndex),
          );
        }
      }
      // For individual categories, positionIcons remains empty

      // Create default save state data
      const defaultData: SaveStateData = {
        placedSkills: defaultPlacedSkills,
        positionIcons: defaultPositionIcons,
        arrows: defaultArrows,
        config: { ...config },
        notes: defaultNotes,
        segmentNames: defaultSegmentNames,
        timestamp: Date.now(),
      };

      // Apply the default state
      setPlacedSkills(defaultPlacedSkills);
      setPositionIcons(defaultPositionIcons);
      setArrows(defaultArrows);
      setNotes(defaultNotes);
      setSegmentNames(defaultSegmentNames);
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
    const trashCollision = rectCollisions.find(
      (collision) =>
        collision.id === "trash-zone" ||
        collision.data?.current?.type === "trash-zone",
    );

    // If we have a collision with the trash zone, only return that.
    if (trashCollision) {
      return [trashCollision];
    }

    // 2. When dragging position icons, prioritize the position sheet grid
    if (args.active.data?.current?.type === "position-icon") {
      const positionSheetGridCollision = rectCollisions.find(
        (collision) => collision.id === "position-sheet-grid",
      );

      // If dragging a position icon over the position sheet grid, prioritize it
      if (positionSheetGridCollision) {
        return [positionSheetGridCollision];
      }
    }

    // 3. Use left-edge collision detection only for placed skills being dragged back onto countsheet
    if (setIsDraggingPlacedSkill) {
      return rectCollisions.filter((collision) => {
        const activeRect = args.active.rect.current?.translated;
        const droppableRect = args.droppableRects.get(collision.id);

        if (!activeRect || !droppableRect) return false;

        // Check if the left edge (vertical line at activeRect.left) intersects with the droppable
        // This means the left edge x-position is within the droppable's bounds
        const leftEdgeX = activeRect.left;

        // The left edge intersects if its x-position is within the droppable's width
        // and the active rect overlaps with the droppable in the y-direction
        const xIntersects =
          leftEdgeX >= droppableRect.left && leftEdgeX <= droppableRect.right;
        const yIntersects =
          activeRect.top < droppableRect.bottom &&
          activeRect.bottom > droppableRect.top;

        return xIntersects && yIntersects;
      });
    }

    // 4. Fall back to closestCenter for count sheet cells (new skills) and other scenarios
    return rectIntersection(args);
  };

  // Auto-populate position icons for Team categories (only when not loaded from saved state)
  useEffect(() => {
    if (
      !hasLoadedState &&
      (config.category === "team-16" || config.category === "team-24") &&
      positionIcons.length === 0
    ) {
      const totalLines = Math.ceil(((config.length * config.bpm) / 60 / 8));

      const newIcons: PositionIcon[] = [];

      for (let lineIndex = 0; lineIndex < totalLines; lineIndex++) {
        newIcons.push(...generateTeamIcons(config.category, lineIndex));
      }

      setPositionIcons(newIcons);
    }
  }, [
    hasLoadedState,
    config.category,
    config.length,
    config.bpm,
    positionIcons.length,
  ]);

  // Initialize history for the selected line when it changes
  useEffect(() => {
    if (
      selectedLine !== null &&
      loadedSaveStateSlot &&
      !getCurrentScopedHistory(selectedLine)
    ) {
      const currentLineIcons = positionIcons.filter(
        (i) => i.lineIndex === selectedLine,
      );
      const currentLineArrows = arrows.filter(
        (a) => a.lineIndex === selectedLine,
      );
      setScopedHistory(loadedSaveStateSlot, config.category, selectedLine, {
        iconHistory: [currentLineIcons],
        arrowHistory: [currentLineArrows],
        index: 0,
      });
    }
  }, [selectedLine, positionIcons, arrows, loadedSaveStateSlot, config.category]);

  // Record history state whenever icons or arrows change for the current line
  useEffect(() => {
    if (selectedLine !== null && loadedSaveStateSlot) {
      const lineHistory = getCurrentScopedHistory(selectedLine);
      if (!lineHistory) return;

      const currentIconState = positionIcons.filter(
        (i) => i.lineIndex === selectedLine,
      );
      const currentArrowState = arrows.filter(
        (a) => a.lineIndex === selectedLine,
      );

      // Check if the only changes are in 'selected' properties (UI state)
      const lastIconState = lineHistory.iconHistory[lineHistory.index];
      if (lastIconState && areStatesEqualIgnoringSelection(currentIconState, lastIconState)) {
        // If states are identical except for selection, don't record
        return;
      }

      // If states are different, add a new history entry
      const newIconHistory = [
        ...lineHistory.iconHistory.slice(0, lineHistory.index + 1),
        currentIconState,
      ];
      const newArrowHistory = [
        ...lineHistory.arrowHistory.slice(0, lineHistory.index + 1),
        currentArrowState,
      ];

      setScopedHistory(loadedSaveStateSlot, config.category, selectedLine, {
        iconHistory: newIconHistory,
        arrowHistory: newArrowHistory,
        index: newIconHistory.length - 1,
      });
    }
  }, [positionIcons, arrows, selectedLine, loadedSaveStateSlot, config.category]);

  const handleDragMove = (event: DragMoveEvent) => {
    console.log(
      `Drag Move: Type='${
        event.active.data?.current?.type ||
        (skills.find((s) => s.id === event.active.id) ? "new skill" : "unknown")
      }', ID='${event.active.id}'`,
    );
    const { active, delta, over } = event; // Add 'over' here

    if (active.data?.current?.type === "position-icon") {
      setDragOffset({ x: delta.x, y: delta.y });
    }

    // --- Add This New Logic Block for Skill Resize ---
    if (
      active.data?.current?.type === "skill-resize" &&
      over &&
      over.id.toString().startsWith("cell-")
    ) {
      const {
        skill,
        placedSkill,
        direction,
      } = active.data.current as {
        skill: Skill;
        placedSkill: PlacedSkill;
        direction: "left" | "right";
        originalCellsToSpan: number;
      };
      const { lineIndex: overLine, count: overCount } =
        over.data.current as { lineIndex: number; count: number };

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
      } else {
        // direction === "left"
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
      const currentSkill = skills.find((s) => s.id === skill.id);
      if (currentSkill && currentSkill.counts !== newCounts) {
        updateSkillCounts(skill.id, newCounts);
      }

      // 2. If it's the left handle, update the placedSkill's position if it has changed
      if (direction === "left" && newAbsoluteStartPos !== -1) {
        const currentPlacedSkill = placedSkills.find(
          (ps) => ps.id === placedSkill.id,
        );
        const newLineIndex = Math.floor(newAbsoluteStartPos / 8);
        const newStartCount = (newAbsoluteStartPos % 8) + 1;

        if (
          currentPlacedSkill &&
          (currentPlacedSkill.lineIndex !== newLineIndex ||
            currentPlacedSkill.startCount !== newStartCount)
        ) {
          setPlacedSkills((prev) =>
            prev.map((ps) =>
              ps.id === placedSkill.id
                ? {
                    ...ps,
                    lineIndex: newLineIndex,
                    startCount: newStartCount,
                  }
                : ps,
            ),
          );
        }
      }
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    console.log(
      `Drag Start: Type='${
        event.active.data?.current?.type ||
        (skills.find((s) => s.id === event.active.id) ? "new skill" : "unknown")
      }', ID='${event.active.id}'`,
    );
    const skill = skills.find((s) => s.id === event.active.id);
    if (skill) {
      setDraggedSkill(skill);
      // Prevent scrolling during drag
      document.body.style.overflow = "hidden";
      return;
    }

    if (event.active.data?.current?.type === "placed-skill") {
      setIsDraggingPlacedSkill(true);
      setDraggedPlacedSkillId(event.active.data.current.placedSkill.id);
      setDraggedSkill(
        skills.find(
          (s) => s.id === event.active.data.current.placedSkill.skillId,
        ) || null,
      );
      // Prevent scrolling during drag
      document.body.style.overflow = "hidden";
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
    if (overId && overId.startsWith("cell-")) {
      setOverCellId(overId);
    } else {
      setOverCellId(null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    // Console log using state variables for accurate type reporting
    console.log(
      `Drag End: Type='${
        isDraggingPlacedSkill
          ? "placed skill"
          : isDraggingIcon
          ? "position icon"
          : skills.find((s) => s.id === event.active.id)
          ? "new skill"
          : "unknown"
      }', ID='${event.active.id}', Over='${
        event.over?.id
      }', Over Data Type='${event.over?.data?.current?.type || "N/A"}'`,
    );

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
    document.body.style.overflow = "";

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
    if (
      over.id === "trash-zone" ||
      over.id === "trash-drop-zone" ||
      over.data?.current?.type === "trash-zone"
    ) {
      // Use stored state to check if it was a placed skill
      if (wasDraggingPlacedSkill && originalPlacedSkillId) {
        handleRemoveSkill(originalPlacedSkillId);
        setSelectedSkillId(null); // Deselect if the deleted skill was selected
      } else if (active.data?.current?.type === "position-icon") {
        // Check original data for icon type
        // Handle position icon deletion
        const iconId = active.id as string;
        handleRemovePositionIcon(iconId); // Assuming you have this function
      }
      return; // Stop further processing after deleting
    }

    // --- Position Icon Drag Logic ---
    // Use the original active.data.current.type for icons as overlay isn't used for them
    if (active.data?.current?.type === "position-icon") {
      const icon = positionIcons.find((i) => i.id === active.id);
      if (!icon) return;

      // Handle multi-icon drag
      const selectedIcons = positionIcons.filter(
        (i) => i.selected && i.lineIndex === selectedLine,
      );
      if (
        selectedIcons.length > 1 &&
        selectedIcons.some((i) => i.id === active.id)
      ) {
        // Multi-icon drag - update all selected icons and propagate if autoFollow is on
        selectedIcons.forEach((selectedIcon) => {
          // Calculate new position based on delta, ensuring it stays within bounds (e.g., 0 to 800/600)
          // Scale delta by zoom level to account for visual scaling
          const scaledDeltaX = delta.x * (1 / currentZoomLevel);
          const scaledDeltaY = delta.y * (1 / currentZoomLevel);
          const newX = Math.max(
            0,
            Math.min(800, selectedIcon.x + scaledDeltaX),
          ); // Assuming 800 width
          const newY = Math.max(
            0,
            Math.min(600, selectedIcon.y + scaledDeltaY),
          ); // Assuming 600 height
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
        const offsetY =
          delta.y + (active.rect?.current?.initial?.height || 0) / 2;

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
          setPositionIcons((prev) =>
            prev.map((icon) =>
              icon.id === newIcon.id
                ? { ...icon, selected: true }
                : { ...icon, selected: false },
            ),
          );
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
          setPlacedSkills((prevSkills) =>
            prevSkills.map((ps) =>
              ps.id === originalPlacedSkillId // Use the ID stored from drag start
                ? { ...ps, lineIndex, startCount: count }
                : ps,
            ),
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
    console.log(
      `handleAddPositionIcon called with type: ${type}, selectedLine: ${selectedLine}`,
    );
    if (selectedLine === null) {
      console.log("selectedLine is null, returning early");
      return;
    }

    const gridSize = 800 / 36;
    const lineIcons = positionIcons.filter(
      (i) => i.lineIndex === selectedLine,
    );
    console.log(
      `Found ${lineIcons.length} icons already on line ${selectedLine}`,
    );
    const occupied = new Set(lineIcons.map((i) => `${i.x},${i.y}`));

    // Start from a visible middle-left area, like where team formations typically start
    let x = Math.round(2 * gridSize); // Column 2 - left side but not edge
    let y = Math.round(6 * gridSize); // Row 6 - top formation row
    let found = false;

    // Try common formation positions first (rows 6, 12, 17, 22)
    const preferredRows = [6, 12, 17, 22, 9, 15, 21, 27];
    for (
      let rowIndex = 0;
      rowIndex < preferredRows.length && !found;
      rowIndex++
    ) {
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

    console.log(
      `Adding icon at position (${x}, ${y}) for line ${selectedLine}. Found free position: ${found}`,
    );
    const newIcon: PositionIcon = {
      id: `icon-${Date.now()}-${Math.random()}`,
      type,
      x,
      y,
      lineIndex: selectedLine,
    };
    setPositionIcons((prev) => {
      const newIcons = [...prev, newIcon];
      console.log(`Total positionIcons after adding: ${newIcons.length}`);
      return newIcons;
    });
  };

  const handleUpdatePositionIcon = (
    id: string,
    x: number,
    y: number,
    shouldPropagate: boolean = false,
  ) => {
    const icon = positionIcons.find((i) => i.id === id);
    if (!icon) return;

    const gridSize = 800 / 36;
    const snappedX = Math.round(x / gridSize) * gridSize;
    const snappedY = Math.round(y / gridSize) * gridSize;

    setPositionIcons((prev) => {
      const updated = prev.map((i) =>
        i.id === id ? { ...i, x: snappedX, y: snappedY } : i,
      );

      if (shouldPropagate && autoFollow) {
        const currentLine = icon.lineIndex;
        const totalLines = Math.ceil(((config.length * config.bpm) / 60 / 8));

        // Get all icons at current line with their new positions
        const currentLineIcons = updated.filter(
          (i) => i.lineIndex === currentLine,
        );

        // For each subsequent line, copy the entire icon layout from current line
        const result = [...updated];
        for (let line = currentLine + 1; line < totalLines; line++) {
          // Remove existing icons at this line
          const otherIcons = result.filter((i) => i.lineIndex !== line);

          // Copy current line icons to this line
          const copiedIcons = currentLineIcons.map((i) => ({
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

  const handleRestoreLineState = (
    lineIndex: number,
    newLineIcons: PositionIcon[],
  ) => {
    // Replace all icons for the specified line with the new state
    setPositionIcons((prev) => {
      // Remove all existing icons for this line
      const filteredIcons = prev.filter(
        (icon) => icon.lineIndex !== lineIndex,
      );
      // Add the new line icons
      return [...filteredIcons, ...newLineIcons];
    });
  };

  const handleUndoLine = (lineIndex: number) => {
    if (!loadedSaveStateSlot) return;
    const lineHistory = getCurrentScopedHistory(lineIndex);
    if (!lineHistory || lineHistory.index <= 0) return;

    // Get the previous state for this line
    const prevIconState = lineHistory.iconHistory[lineHistory.index - 1];
    const prevArrowState = lineHistory.arrowHistory[lineHistory.index - 1];
    if (!prevIconState || !prevArrowState) return;

    // Restore the icon state
    handleRestoreLineState(lineIndex, prevIconState);

    // Restore the arrow state
    setArrows(prev => {
      // Remove all existing arrows for this line
      const filteredArrows = prev.filter(arrow => arrow.lineIndex !== lineIndex);
      // Add the restored arrow state
      return [...filteredArrows, ...prevArrowState];
    });

    // If auto-follow is enabled, propagate the undo to subsequent lines
    if (autoFollow) {
      const totalLines = Math.ceil(((config.length * config.bpm) / 60 / 8));
      const currentLineIcons = prevIconState;
      const currentLineArrows = prevArrowState;

      // Restore subsequent lines to match the undone state
      for (
        let subsequentLine = lineIndex + 1;
        subsequentLine < totalLines;
        subsequentLine++
      ) {
        // Create copied icons for this subsequent line
        const copiedIcons = currentLineIcons.map((icon) => ({
          ...icon,
          id: `icon-${Date.now()}-${Math.random()}-${subsequentLine}`,
          lineIndex: subsequentLine,
        }));

        // Replace icons for this line
        setPositionIcons((prev) => {
          const otherIcons = prev.filter(
            (icon) => icon.lineIndex !== subsequentLine,
          );
          return [...otherIcons, ...copiedIcons];
        });

        // Create copied arrows for this subsequent line
        const copiedArrows = currentLineArrows.map((arrow) => ({
          ...arrow,
          id: `arrow-${Date.now()}-${Math.random()}-${subsequentLine}`,
          lineIndex: subsequentLine,
        }));

        // Replace arrows for this line
        setArrows((prev) => {
          const otherArrows = prev.filter(
            (arrow) => arrow.lineIndex !== subsequentLine,
          );
          return [...otherArrows, ...copiedArrows];
        });
      }
    }

    // Update history index
    setScopedHistory(loadedSaveStateSlot, config.category, lineIndex, {
      iconHistory: lineHistory.iconHistory,
      arrowHistory: lineHistory.arrowHistory,
      index: lineHistory.index - 1,
    });
  };

  const handleRedoLine = (lineIndex: number) => {
    if (!loadedSaveStateSlot) return;
    const lineHistory = getCurrentScopedHistory(lineIndex);
    if (!lineHistory || lineHistory.index >= lineHistory.iconHistory.length - 1)
      return;

    // Get the next state for this line
    const nextIconState = lineHistory.iconHistory[lineHistory.index + 1];
    const nextArrowState = lineHistory.arrowHistory[lineHistory.index + 1];
    if (!nextIconState || !nextArrowState) return;

    // Restore the icon state
    handleRestoreLineState(lineIndex, nextIconState);

    // Restore the arrow state
    setArrows(prev => {
      // Remove all existing arrows for this line
      const filteredArrows = prev.filter(arrow => arrow.lineIndex !== lineIndex);
      // Add the restored arrow state
      return [...filteredArrows, ...nextArrowState];
    });

    // If auto-follow is enabled, propagate the redo to subsequent lines
    if (autoFollow) {
      const totalLines = Math.ceil(((config.length * config.bpm) / 60 / 8));
      const currentLineIcons = nextIconState;
      const currentLineArrows = nextArrowState;

      // Restore subsequent lines to match the redone state
      for (
        let subsequentLine = lineIndex + 1;
        subsequentLine < totalLines;
        subsequentLine++
      ) {
        // Create copied icons for this subsequent line
        const copiedIcons = currentLineIcons.map((icon) => ({
          ...icon,
          id: `icon-${Date.now()}-${Math.random()}-${subsequentLine}`,
          lineIndex: subsequentLine,
        }));

        // Replace icons for this line
        setPositionIcons((prev) => {
          const otherIcons = prev.filter(
            (icon) => icon.lineIndex !== subsequentLine,
          );
          return [...otherIcons, ...copiedIcons];
        });

        // Create copied arrows for this subsequent line
        const copiedArrows = currentLineArrows.map((arrow) => ({
          ...arrow,
          id: `arrow-${Date.now()}-${Math.random()}-${subsequentLine}`,
          lineIndex: subsequentLine,
        }));

        // Replace arrows for this line
        setArrows((prev) => {
          const otherArrows = prev.filter(
            (arrow) => arrow.lineIndex !== subsequentLine,
          );
          return [...otherArrows, ...copiedArrows];
        });
      }
    }

    // Update history index
    setScopedHistory(loadedSaveStateSlot, config.category, lineIndex, {
      iconHistory: lineHistory.iconHistory,
      arrowHistory: lineHistory.arrowHistory,
      index: lineHistory.index + 1,
    });
  };

  const handleRemoveMultiplePositionIcons = (ids: string[]) => {
    setPositionIcons(positionIcons.filter((icon) => !ids.includes(icon.id)));
  };

  const handleNamePositionIcon = (id: string, name: string) => {
    setPositionIcons((prev) => {
      const updated = prev.map((icon) =>
        icon.id === id ? { ...icon, name } : icon,
      );

      if (autoFollow) {
        const namedIcon = updated.find((i) => i.id === id);
        if (!namedIcon) return updated;

        const totalLines = Math.ceil(((config.length * config.bpm) / 60 / 8));
        const currentLine = namedIcon.lineIndex;

        // For each subsequent line, find icons with matching position and type
        const result = [...updated];
        for (let line = currentLine + 1; line < totalLines; line++) {
          const matchingIconIndex = result.findIndex(
            (i) =>
              i.lineIndex === line &&
              i.x === namedIcon.x &&
              i.y === namedIcon.y &&
              i.type === namedIcon.type,
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

  const handleUpdateSegmentName = (lineIndex: number, name: string) => {
    if (lineIndex === null) return;

    setSegmentNames((prev) => {
      const newSegmentNames = { ...prev, [lineIndex]: name };

      if (autoFollow) {
        const totalLines = Math.ceil(((config.length * config.bpm) / 60 / 8));
        for (let line = lineIndex + 1; line < totalLines; line++) {
          newSegmentNames[line] = name;
        }
      }
      return newSegmentNames;
    });
  };



  const handleReset = () => {
    // Reset to default state
    setPlacedSkills([]);
    setSelectedLine(null);
    setSelectedSkillId(null);
    setLineHistories({}); // Clear all history states
    setNotes({});
    setSegmentNames({});
    setArrows([]); // Clear all arrows

    // For team categories, reset icons to default positions
    if (config.category === "team-16" || config.category === "team-24") {
      const totalLines = Math.ceil(((config.length * config.bpm) / 60 / 8));
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

  const handleRenameSave = () => {
    if (!loadedSaveStateSlot || !renameInput.trim()) return;

    const trimmedName = renameInput.trim();
    setSaveNames((prev) => ({
      ...prev,
      [loadedSaveStateSlot]: trimmedName,
    }));

    // Save to localStorage
    localStorage.setItem(
      "save-names",
      JSON.stringify({
        ...saveNames,
        [loadedSaveStateSlot]: trimmedName,
      }),
    );

    setShowRenameDialog(false);
    setRenameInput("");
  };

  // Handle click outside to deselect placed skills
  const handleContainerClick = (e: React.MouseEvent) => {
    // Only deselect if clicking on the main container background and a skill is selected
    if (selectedSkillId) {
      setSelectedSkillId(null);
    }
  };

  // Export/Import handlers
  const handleExportData = () => {
    if (!loadedSaveStateSlot) return;

    const slotName = saveNames[loadedSaveStateSlot];
    exportCurrentSlot(
      loadedSaveStateSlot,
      slotName,
      placedSkills,
      positionIcons,
      arrows,
      config,
      notes,
      segmentNames
    );
  };

  const handleImportData = () => {
    if (!loadedSaveStateSlot) return;

    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const importedData = await importSlotData(file);
        const validation = validateImportedData(importedData);

        if (!validation.isValid) {
          alert(`Invalid file: ${validation.errors.join(", ")}`);
          return;
        }

        // Update the save slot name to match the imported data
        setSaveNames(prev => ({
          ...prev,
          [loadedSaveStateSlot]: importedData.slotName
        }));

        // Update localStorage for save names
        const updatedSaveNames = {
          ...saveNames,
          [loadedSaveStateSlot]: importedData.slotName
        };
        localStorage.setItem("save-names", JSON.stringify(updatedSaveNames));

        // Save all category data for this save slot
        Object.entries(importedData.categories).forEach(([category, categoryData]) => {
          const categoryKey = `category-${loadedSaveStateSlot}-${category}`;
          const categoryStateData = {
            placedSkills: categoryData.placedSkills || [],
            positionIcons: categoryData.positionIcons || [],
            arrows: categoryData.arrows || [],
            notes: categoryData.notes || {},
            segmentNames: categoryData.segmentNames || {},
            timestamp: Date.now(),
          };
          localStorage.setItem(categoryKey, JSON.stringify(categoryStateData));
        });

        // Load the current category's data to update the UI
        const currentCategoryData = importedData.categories[config.category];
        if (currentCategoryData) {
          setPlacedSkills(currentCategoryData.placedSkills || []);
          setPositionIcons(currentCategoryData.positionIcons || []);
          setArrows(currentCategoryData.arrows || []);
          setNotes(currentCategoryData.notes || {});
          setSegmentNames(currentCategoryData.segmentNames || {});
        } else {
          // If current category doesn't exist in imported data, clear it
          setPlacedSkills([]);
          setPositionIcons([]);
          setArrows([]);
          setNotes({});
          setSegmentNames({});
        }

        alert(`Successfully imported data to "${importedData.slotName}"`);
      } catch (error) {
        alert(`Failed to import file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };

    input.click();
  };

  // Use keyboard shortcuts hook
  useKeyboardShortcuts({
    config,
    selectedLine,
    selectedSkillId,
    placedSkills,
    positionIcons,
    skills,
    autoFollow,
    keyboardSettings,
    setSelectedLine,
    setAutoFollow,
    setPositionIcons,
    setPlacedSkills,
    setSelectedSkillId,
    handleUndoLine,
    handleRedoLine,
    handleRemoveSkill,
  });

  return (
    <div className="h-screen flex flex-col overflow-x-auto overflow-y-hidden" onClick={handleContainerClick}>
      <div className="flex-shrink-0 sticky top-0 z-10 bg-card border-b">
        <RoutineHeader
        config={config}
        saveNames={saveNames}
        loadedSaveStateSlot={loadedSaveStateSlot}
        showAboutModal={showAboutModal}
        updateLength={updateLength}
        updateBpm={updateBpm}
        updateCategory={updateCategory}
        updateLevel={updateLevel}
        handleReset={handleReset}
        handleExportPDF={handleExportPDF}
        isGeneratingPdf={isGeneratingPdf}
        setShowAboutModal={setShowAboutModal}
        setShowConfigModal={setShowConfigModal}
        loadFromSlot={loadFromSlot}
        setShowRenameDialog={setShowRenameDialog}
        setRenameInput={setRenameInput}
        placedSkills={placedSkills}
        positionIcons={positionIcons}
        notes={notes}
        segmentNames={segmentNames}
        onExportData={handleExportData}
        onImportData={handleImportData}
      />
      </div>

      <RoutineWorkspace
        config={config}
        placedSkills={placedSkills}
        setPlacedSkills={setPlacedSkills}
        positionIcons={positionIcons}
        setPositionIcons={setPositionIcons}
        arrows={arrows}
        setArrows={setArrows}
        notes={notes}
        setNotes={setNotes}
        segmentNames={segmentNames}
        setSegmentNames={setSegmentNames}
        selectedLine={selectedLine}
        setSelectedLine={setSelectedLine}
        lineHistories={lineHistories}
        setLineHistories={setLineHistories}
        draggedSkill={draggedSkill}
        setDraggedSkill={setDraggedSkill}
        isDraggingPlacedSkill={isDraggingPlacedSkill}
        setIsDraggingPlacedSkill={setIsDraggingPlacedSkill}
        isResizing={isResizing}
        setIsResizing={setIsResizing}
        draggedPlacedSkillId={draggedPlacedSkillId}
        setDraggedPlacedSkillId={setDraggedPlacedSkillId}
        selectedSkillId={selectedSkillId}
        setSelectedSkillId={setSelectedSkillId}
        showGrid={showGrid}
        setShowGrid={setShowGrid}
        autoFollow={autoFollow}
        setAutoFollow={setAutoFollow}
        isDraggingIcon={isDraggingIcon}
        setIsDraggingIcon={setIsDraggingIcon}
        dragOffset={dragOffset}
        setDragOffset={setDragOffset}
        draggedIconId={draggedIconId}
        setDraggedIconId={setDraggedIconId}
        currentZoomLevel={currentZoomLevel}
        setCurrentZoomLevel={setCurrentZoomLevel}
        overCellId={overCellId}
        setOverCellId={setOverCellId}
        hasLoadedState={hasLoadedState}
        initialLoadedCategoryRef={initialLoadedCategoryRef}
        currentSaveState={currentSaveState}
        setCurrentSaveState={setCurrentSaveState}
        loadedSaveStateSlot={loadedSaveStateSlot}
        keyboardSettings={keyboardSettings}
        skills={skills}
        updateSkillCounts={updateSkillCounts}
        addCustomSkill={addCustomSkill}
        deleteSkill={deleteSkill}
        updateConfig={updateConfig}
        getUniquePositionConfigurations={getUniquePositionConfigurations}
        handleExportPDF={handleExportPDF}
        isGeneratingPdf={isGeneratingPdf}
        resetToDefault={resetToDefault}
      />

      <PdfPreviewDialog
        showPdfPreview={showPdfPreview}
        pdfBlobUrl={pdfBlobUrl}
        setShowPdfPreview={setShowPdfPreview}
      />

      <SaveRenameDialog
        showRenameDialog={showRenameDialog}
        renameInput={renameInput}
        loadedSaveStateSlot={loadedSaveStateSlot}
        saveNames={saveNames}
        setShowRenameDialog={setShowRenameDialog}
        setRenameInput={setRenameInput}
        handleRenameSave={handleRenameSave}
      />

      {/* About Modal */}
      <AboutModal open={showAboutModal} onOpenChange={setShowAboutModal} />

      {/* Config Modal */}
      <RoutineConfigModal
        isOpen={showConfigModal}
        onOpenChange={setShowConfigModal}
        config={config}
        updateLength={updateLength}
        updateBpm={updateBpm}
        updateCategory={updateCategory}
      />
    </div>
  );
};
