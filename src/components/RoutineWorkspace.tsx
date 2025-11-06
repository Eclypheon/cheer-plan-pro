import { useState, useEffect, useRef, useCallback } from "react";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, DragMoveEvent, CollisionDetection, rectIntersection, closestCenter, DragOverEvent, useSensor, useSensors, PointerSensor } from "@dnd-kit/core";
import type { PlacedSkill, RoutineConfig, Skill, PositionIcon, CategoryStateData, SaveStateData } from "@/types/routine";
import { useSkills } from "@/hooks/useSkills";
import { useRoutineConfig } from "@/hooks/useRoutineConfig";
import { usePdfExport } from "@/hooks/usePdfExport";
import { useIsMobile } from "@/hooks/use-mobile";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { SkillsPanel } from "./SkillsPanel";
import { CountSheet } from "./CountSheet";
import { PositionSheet } from "./PositionSheet";
import { SkillCard } from "./SkillCard";
import { TrashDropZone } from "./TrashDropZone";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";

interface RoutineWorkspaceProps {
  config: RoutineConfig;
  placedSkills: PlacedSkill[];
  setPlacedSkills: React.Dispatch<React.SetStateAction<PlacedSkill[]>>;
  positionIcons: PositionIcon[];
  setPositionIcons: React.Dispatch<React.SetStateAction<PositionIcon[]>>;
  notes: Record<number, string>;
  setNotes: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  segmentNames: Record<number, string>;
  setSegmentNames: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  selectedLine: number | null;
  setSelectedLine: React.Dispatch<React.SetStateAction<number | null>>;
  lineHistories: {
    [saveStateSlot: number]: {
      [category: string]: {
        [lineIndex: number]: { history: PositionIcon[][]; index: number };
      };
    };
  };
  setLineHistories: React.Dispatch<React.SetStateAction<{
    [saveStateSlot: number]: {
      [category: string]: {
        [lineIndex: number]: { history: PositionIcon[][]; index: number };
      };
    };
  }>>;
  draggedSkill: Skill | null;
  setDraggedSkill: React.Dispatch<React.SetStateAction<Skill | null>>;
  isDraggingPlacedSkill: boolean;
  setIsDraggingPlacedSkill: React.Dispatch<React.SetStateAction<boolean>>;
  isResizing: boolean;
  setIsResizing: React.Dispatch<React.SetStateAction<boolean>>;
  draggedPlacedSkillId: string | null;
  setDraggedPlacedSkillId: React.Dispatch<React.SetStateAction<string | null>>;
  selectedSkillId: string | null;
  setSelectedSkillId: React.Dispatch<React.SetStateAction<string | null>>;
  showGrid: boolean;
  setShowGrid: React.Dispatch<React.SetStateAction<boolean>>;
  autoFollow: boolean;
  setAutoFollow: React.Dispatch<React.SetStateAction<boolean>>;
  isDraggingIcon: boolean;
  setIsDraggingIcon: React.Dispatch<React.SetStateAction<boolean>>;
  dragOffset: { x: number; y: number } | null;
  setDragOffset: React.Dispatch<React.SetStateAction<{ x: number; y: number } | null>>;
  draggedIconId: string | null;
  setDraggedIconId: React.Dispatch<React.SetStateAction<string | null>>;
  currentZoomLevel: number;
  setCurrentZoomLevel: React.Dispatch<React.SetStateAction<number>>;
  overCellId: string | null;
  setOverCellId: React.Dispatch<React.SetStateAction<string | null>>;
  hasLoadedState: boolean;
  initialLoadedCategoryRef: React.MutableRefObject<string | null>;
  currentSaveState: SaveStateData | null;
  setCurrentSaveState: React.Dispatch<React.SetStateAction<SaveStateData | null>>;
  loadedSaveStateSlot: 1 | 2 | 3 | null;
  keyboardSettings: any;
  skills: Skill[];
  updateSkillCounts: (id: string, counts: number) => void;
  addCustomSkill: (skill: Omit<Skill, "id">) => void;
  deleteSkill: (id: string) => void;
  updateConfig: (config: Partial<RoutineConfig>) => void;
  getUniquePositionConfigurations: () => {
    icons: PositionIcon[];
    lineIndex: number;
  }[];
  handleExportPDF: () => void;
  isGeneratingPdf: boolean;
  resetToDefault: () => void;
}

export const RoutineWorkspace = ({
  config,
  placedSkills,
  setPlacedSkills,
  positionIcons,
  setPositionIcons,
  notes,
  setNotes,
  segmentNames,
  setSegmentNames,
  selectedLine,
  setSelectedLine,
  lineHistories,
  setLineHistories,
  draggedSkill,
  setDraggedSkill,
  isDraggingPlacedSkill,
  setIsDraggingPlacedSkill,
  isResizing,
  setIsResizing,
  draggedPlacedSkillId,
  setDraggedPlacedSkillId,
  selectedSkillId,
  setSelectedSkillId,
  showGrid,
  setShowGrid,
  autoFollow,
  setAutoFollow,
  isDraggingIcon,
  setIsDraggingIcon,
  dragOffset,
  setDragOffset,
  draggedIconId,
  setDraggedIconId,
  currentZoomLevel,
  setCurrentZoomLevel,
  overCellId,
  setOverCellId,
  hasLoadedState,
  initialLoadedCategoryRef,
  currentSaveState,
  setCurrentSaveState,
  loadedSaveStateSlot,
  keyboardSettings,
  skills,
  updateSkillCounts,
  addCustomSkill,
  deleteSkill,
  updateConfig,
  getUniquePositionConfigurations,
  handleExportPDF,
  isGeneratingPdf,
  resetToDefault,
}: RoutineWorkspaceProps) => {
  const isMobile = useIsMobile();

  // Touch event prevention during drag operations
  const touchEventListenersRef = useRef<{
    touchmove?: (e: TouchEvent) => void;
    touchstart?: (e: TouchEvent) => void;
    gesturestart?: (e: Event) => void;
    gesturechange?: (e: Event) => void;
    gestureend?: (e: Event) => void;
    contextmenu?: (e: Event) => void;
  }>({});

  // Add touch event prevention for mobile devices
  useEffect(() => {
    if (!isMobile) return;

    const preventTouchMove = (e: TouchEvent) => {
      // Only prevent if we're currently dragging
      if (draggedSkill || isDraggingPlacedSkill || isDraggingIcon || isResizing) {
        e.preventDefault();
      }
    };

    const preventTouchStart = (e: TouchEvent) => {
      // Prevent multi-touch gestures when dragging
      if ((draggedSkill || isDraggingPlacedSkill || isDraggingIcon || isResizing) && e.touches.length > 1) {
        e.preventDefault();
      }
    };

    const preventGesture = (e: Event) => {
      // Prevent gestures when dragging
      if (draggedSkill || isDraggingPlacedSkill || isDraggingIcon || isResizing) {
        e.preventDefault();
      }
    };

    const preventContextMenu = (e: Event) => {
      // Prevent context menu when dragging
      if (draggedSkill || isDraggingPlacedSkill || isDraggingIcon || isResizing) {
        e.preventDefault();
      }
    };

    // Store listener references
    touchEventListenersRef.current = {
      touchmove: preventTouchMove,
      touchstart: preventTouchStart,
      gesturestart: preventGesture,
      gesturechange: preventGesture,
      gestureend: preventGesture,
      contextmenu: preventContextMenu,
    };

    // Add listeners that are always active on mobile
    document.addEventListener('touchmove', preventTouchMove, { passive: false });
    document.addEventListener('touchstart', preventTouchStart, { passive: false });
    document.addEventListener('gesturestart', preventGesture, { passive: false });
    document.addEventListener('gesturechange', preventGesture, { passive: false });
    document.addEventListener('gestureend', preventGesture, { passive: false });
    document.addEventListener('contextmenu', preventContextMenu, { passive: false });

    // Cleanup function
    return () => {
      const listeners = touchEventListenersRef.current;
      if (listeners.touchmove) {
        document.removeEventListener('touchmove', listeners.touchmove);
      }
      if (listeners.touchstart) {
        document.removeEventListener('touchstart', listeners.touchstart);
      }
      if (listeners.gesturestart) {
        document.removeEventListener('gesturestart', listeners.gesturestart);
      }
      if (listeners.gesturechange) {
        document.removeEventListener('gesturechange', listeners.gesturechange);
      }
      if (listeners.gestureend) {
        document.removeEventListener('gestureend', listeners.gestureend);
      }
      if (listeners.contextmenu) {
        document.removeEventListener('contextmenu', listeners.contextmenu);
      }
      touchEventListenersRef.current = {};
    };
  }, [isMobile, draggedSkill, isDraggingPlacedSkill, isDraggingIcon, isResizing]);

  // State for panel sizes and toggle
  const [panelSizes, setPanelSizes] = useState([30, 70]); // [skillsPanel, mainPanel]
  const [skillsPanelCollapsed, setSkillsPanelCollapsed] = useState(false);
  const [previousSkillsSize, setPreviousSkillsSize] = useState(15);

  // Handle panel layout changes
  const handlePanelLayout = useCallback((sizes: number[]) => {
    setPanelSizes(sizes);
    // Update previous size when not collapsed
    if (sizes[0] > 1) {
      setPreviousSkillsSize(sizes[0]);
    }
  }, []);

  // Toggle skills panel collapse
  const toggleSkillsPanel = useCallback(() => {
    if (skillsPanelCollapsed) {
      // Expand to previous size
      setPanelSizes([previousSkillsSize, 100 - previousSkillsSize]);
      setSkillsPanelCollapsed(false);
    } else {
      // Collapse to 1%
      setPanelSizes([1, 99]);
      setSkillsPanelCollapsed(true);
    }
  }, [skillsPanelCollapsed, previousSkillsSize]);

  // Handle zoom level changes from PositionSheet
  const handleZoomChange = useCallback((zoomLevel: number) => {
    setCurrentZoomLevel(zoomLevel);
  }, []);

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
  ): { history: PositionIcon[][]; index: number } | undefined => {
    return lineHistories[saveStateSlot]?.[category]?.[lineIndex];
  };

  const setScopedHistory = (
    saveStateSlot: number,
    category: string,
    lineIndex: number,
    history: { history: PositionIcon[][]; index: number },
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
  ): { history: PositionIcon[][]; index: number } | undefined => {
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
    return saved ? JSON.parse(saved) : null;
  };

  const saveToSlot = (slotNumber: 1 | 2 | 3) => {
    const key = `save-state-${slotNumber}`;
    const data: SaveStateData = {
      placedSkills: [...placedSkills],
      positionIcons: [...positionIcons],
      config: { ...config },
      notes: { ...notes },
      segmentNames: { ...segmentNames },
      timestamp: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(data));
    setCurrentSaveState(data);
    // setLoadedSaveStateSlot(slotNumber); // Removed to avoid prop drilling

    // Save the current save names
    // localStorage.setItem("save-names", JSON.stringify(saveNames)); // Removed to avoid prop drilling
  };

  const loadFromSlot = (slotNumber: 1 | 2 | 3) => {
    const key = `save-state-${slotNumber}`;
    const saved = localStorage.getItem(key);

    if (saved) {
      // Load existing saved data
      const data: SaveStateData = JSON.parse(saved);
      setPlacedSkills(data.placedSkills);
      setPositionIcons(data.positionIcons);
      updateConfig(data.config);
      setNotes(data.notes || {});
      setSegmentNames(data.segmentNames || {});
      setCurrentSaveState(data);
      // setLoadedSaveStateSlot(slotNumber); // Removed to avoid prop drilling
      initialLoadedCategoryRef.current = data.config.category;
    } else {
      // Create default state for new slot
      const defaultPlacedSkills: PlacedSkill[] = [];
      const defaultNotes = {};
      const defaultSegmentNames = {};

      let defaultPositionIcons: PositionIcon[] = [];
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
        config: { ...config },
        notes: defaultNotes,
        segmentNames: defaultSegmentNames,
        timestamp: Date.now(),
      };

      // Apply the default state
      setPlacedSkills(defaultPlacedSkills);
      setPositionIcons(defaultPositionIcons);
      setNotes(defaultNotes);
      setSegmentNames(defaultSegmentNames);
      // Keep current config

      // Save as the initial state for this slot
      localStorage.setItem(key, JSON.stringify(defaultData));
      setCurrentSaveState(defaultData);
      // setLoadedSaveStateSlot(slotNumber); // Removed to avoid prop drilling
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
        // and the active rect overlaps with the droppable in the y-direction
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
      setScopedHistory(loadedSaveStateSlot, config.category, selectedLine, {
        history: [currentLineIcons],
        index: 0,
      });
    }
  }, [selectedLine, positionIcons, loadedSaveStateSlot, config.category]);

  // Record history state whenever icons change for the current line
  useEffect(() => {
    if (selectedLine !== null && loadedSaveStateSlot) {
      const lineHistory = getCurrentScopedHistory(selectedLine);
      if (!lineHistory) return;

      const currentState = positionIcons.filter(
        (i) => i.lineIndex === selectedLine,
      );

      // Check if the only changes are in 'selected' properties (UI state)
      const lastState = lineHistory.history[lineHistory.index];
      if (lastState && areStatesEqualIgnoringSelection(currentState, lastState)) {
        // If states are identical except for selection, don't record
        return;
      }

      // If states are different, add a new history entry
      const newHistory = [
        ...lineHistory.history.slice(0, lineHistory.index + 1),
        currentState,
      ];

      setScopedHistory(loadedSaveStateSlot, config.category, selectedLine, {
        history: newHistory,
        index: newHistory.length - 1,
      });
    }
  }, [positionIcons, selectedLine, loadedSaveStateSlot, config.category]);

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

      // Handle selection behavior when starting to drag an icon
      const draggedIconId = event.active.id as string;
      setPositionIcons((prev) => {
        const currentlySelected = prev.filter(icon => icon.selected && icon.lineIndex === selectedLine);
        const isDraggedIconSelected = currentlySelected.some(icon => icon.id === draggedIconId);

        if (!isDraggedIconSelected) {
          // Dragging an icon that's not selected: deselect all, select only this icon
          return prev.map((icon) => ({
            ...icon,
            selected: icon.id === draggedIconId,
          }));
        }
        // If the dragged icon is already selected, keep current selection
        return prev;
      });
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
          // If this was the currently selected skill and it moved to a different line, select that line
          if (selectedSkillId === originalPlacedSkillId) {
            setSelectedLine(lineIndex);
            // Deselect all position icons when moving a selected skill
            setPositionIcons(prev => prev.map(icon => ({ ...icon, selected: false })));
          }
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
    const prevState = lineHistory.history[lineHistory.index - 1];
    if (!prevState) return;

    // Store the current states of subsequent lines before undoing
    const totalLines = Math.ceil(((config.length * config.bpm) / 60 / 8));
    const preUndoStates: { [lineIndex: number]: PositionIcon[] } = {};

    if (autoFollow) {
      for (let line = lineIndex + 1; line < totalLines; line++) {
        const lineHistory = getCurrentScopedHistory(line);
        if (lineHistory && lineHistory.index > 0) {
          // Store the state that this line will be undone to
          preUndoStates[line] = lineHistory.history[lineHistory.index - 1];
        }
      }
    }

    // Restore the state for the main line
    handleRestoreLineState(lineIndex, prevState);

    // If auto-follow is enabled, undo subsequent lines to their pre-propagation states
    if (autoFollow) {
      for (let subsequentLine = lineIndex + 1; subsequentLine < totalLines; subsequentLine++) {
        const subsequentLineHistory = getCurrentScopedHistory(subsequentLine);
        if (subsequentLineHistory && subsequentLineHistory.index > 0) {
          // Restore this line to its state from before the propagation
          const prePropagationState = subsequentLineHistory.history[subsequentLineHistory.index - 1];
          handleRestoreLineState(subsequentLine, prePropagationState);

          // Update the history index for this line
          setScopedHistory(loadedSaveStateSlot, config.category, subsequentLine, {
            ...subsequentLineHistory,
            index: subsequentLineHistory.index - 1,
          });
        }
      }
    }

    // Update history index for the main line
    setScopedHistory(loadedSaveStateSlot, config.category, lineIndex, {
      ...lineHistory,
      index: lineHistory.index - 1,
    });
  };

  const handleRedoLine = (lineIndex: number) => {
    if (!loadedSaveStateSlot) return;
    const lineHistory = getCurrentScopedHistory(lineIndex);
    if (!lineHistory || lineHistory.index >= lineHistory.history.length - 1)
      return;

    // Get the next state for this line
    const nextState = lineHistory.history[lineHistory.index + 1];
    if (!nextState) return;

    // Store the current states of subsequent lines before redoing
    const totalLines = Math.ceil(((config.length * config.bpm) / 60 / 8));
    const preRedoStates: { [lineIndex: number]: PositionIcon[] } = {};

    if (autoFollow) {
      for (let line = lineIndex + 1; line < totalLines; line++) {
        const lineHistory = getCurrentScopedHistory(line);
        if (lineHistory && lineHistory.index < lineHistory.history.length - 1) {
          // Store the state that this line will be redone to
          preRedoStates[line] = lineHistory.history[lineHistory.index + 1];
        }
      }
    }

    // Restore the state for the main line
    handleRestoreLineState(lineIndex, nextState);

    // If auto-follow is enabled, redo subsequent lines to their post-propagation states
    if (autoFollow) {
      for (let subsequentLine = lineIndex + 1; subsequentLine < totalLines; subsequentLine++) {
        const subsequentLineHistory = getCurrentScopedHistory(subsequentLine);
        if (subsequentLineHistory && subsequentLineHistory.index < subsequentLineHistory.history.length - 1) {
          // Restore this line to its state from after the propagation
          const postPropagationState = subsequentLineHistory.history[subsequentLineHistory.index + 1];
          handleRestoreLineState(subsequentLine, postPropagationState);

          // Update the history index for this line
          setScopedHistory(loadedSaveStateSlot, config.category, subsequentLine, {
            ...subsequentLineHistory,
            index: subsequentLineHistory.index + 1,
          });
        }
      }
    }

    // Update history index for the main line
    setScopedHistory(loadedSaveStateSlot, config.category, lineIndex, {
      ...lineHistory,
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

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={customCollisionDetection}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      autoScroll={false}
    >
      {/* Chevron button for toggling skills panel - positioned at top level */}
      <button
        onClick={toggleSkillsPanel}
        className="absolute left-0 top-[47%] -translate-y-1/2 -translate-x-1/2 z-40 w-6 h-6 bg-card border border-border rounded-full shadow-md hover:bg-accent transition-colors flex items-center justify-center"
        title={skillsPanelCollapsed ? "Show skills panel" : "Hide skills panel"}
        style={{ left: `${panelSizes[0]}%` }}
      >
        {skillsPanelCollapsed ? (
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
        ) : (
          <ChevronLeft className="h-3 w-3 text-muted-foreground" />
        )}
      </button>

      <ResizablePanelGroup
        direction="horizontal"
        className="flex-1 w-full relative"
        onLayout={handlePanelLayout}
      >
        <ResizablePanel
          defaultSize={panelSizes[0]}
          minSize={skillsPanelCollapsed ? 0 : 25}
          maxSize={skillsPanelCollapsed ? 0 : 40}
          className={skillsPanelCollapsed ? "" : ""}
          onResize={(size) => {
            const newSizes = [size, 100 - size];
            setPanelSizes(newSizes);
            if (size > 1) {
              setPreviousSkillsSize(size);
            }
          }}
        >
          <SkillsPanel
            skills={skills}
            onAddCustomSkill={addCustomSkill}
            onDeleteSkill={(id) => {
              deleteSkill(id);
              setPlacedSkills(
                placedSkills.filter((ps) => ps.skillId !== id),
              );
            }}
            onUpdateSkillCounts={updateSkillCounts}
            currentLevel={config.level}
            onLevelChange={(level) => updateConfig({ level })}
            onResetToDefault={resetToDefault}
          />
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={panelSizes[1]} minSize={60}>
          {config.category === "team-16" ||
          config.category === "team-24" ? (
            <ResizablePanelGroup direction="vertical" className="h-full">
              <ResizablePanel defaultSize={50}>
                <CountSheet
                  routineLength={config.length}
                  bpm={config.bpm}
                  placedSkills={placedSkills.filter(
                    (ps) => ps.id !== draggedPlacedSkillId,
                  )}
                  skills={skills}
                  onRemoveSkill={handleRemoveSkill}
                  onLineClick={setSelectedLine}
                  selectedLine={selectedLine}
                  selectedSkillId={selectedSkillId}
                  onSelectSkill={(id) => {
                    setSelectedSkillId(id);
                    // Deselect all position icons when selecting a placed skill
                    setPositionIcons(prev => prev.map(icon => ({ ...icon, selected: false })));
                    // Also select the line that the first cell of the placed skill is on
                    if (id) {
                      const placedSkill = placedSkills.find(ps => ps.id === id);
                      if (placedSkill) {
                        setSelectedLine(placedSkill.lineIndex);
                      }
                    }
                  }}
                  onMoveSkill={(id, newLineIndex, newStartCount) => {
                    setPlacedSkills(
                      placedSkills.map((ps) =>
                        ps.id === id
                          ? {
                              ...ps,
                              lineIndex: newLineIndex,
                              startCount: newStartCount,
                            }
                          : ps,
                      ),
                    );
                  }}
                  onUpdateSkillCounts={updateSkillCounts}
                  draggedSkill={draggedSkill}
                  overCellId={overCellId}
                  notes={notes}
                  onUpdateNote={(lineIndex, note) => {
                    setNotes((prev) => ({ ...prev, [lineIndex]: note }));
                  }}
                  isPdfRender={isGeneratingPdf}
                  onToggleSkillsPanel={toggleSkillsPanel}
                  skillsPanelCollapsed={skillsPanelCollapsed}
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
                    setPositionIcons((prev) => {
                      const currentlySelected = prev.filter(icon => icon.selected);
                      const isCurrentlySelected = currentlySelected.some(icon => icon.id === id);

                      if (currentlySelected.length === 1 && !isCurrentlySelected) {
                        // Single icon selected, clicking another icon: deselect current, select new
                        return prev.map((icon) => ({
                          ...icon,
                          selected: icon.id === id,
                        }));
                      } else if (currentlySelected.length > 1 && !isCurrentlySelected) {
                        // Multiple icons selected, clicking an icon not in selection: deselect all, select new
                        return prev.map((icon) => ({
                          ...icon,
                          selected: icon.id === id,
                        }));
                      } else {
                        // Toggle behavior for clicking selected icon or when no icons selected
                        return prev.map((icon) => ({
                          ...icon,
                          selected: icon.id === id ? !icon.selected : false,
                        }));
                      }
                    });
                  }}
                  onSelectMultiple={(ids) => {
                    setPositionIcons((prev) =>
                      prev.map((icon) => ({
                        ...icon,
                        selected: ids.includes(icon.id),
                      })),
                    );
                  }}
                  onNextLine={() => {
                    const totalLines = Math.ceil(
                      ((config.length * config.bpm) / 60 / 8),
                    );
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
                  segmentName={
                    selectedLine !== null ? segmentNames[selectedLine] || "" : ""
                  }
                  onUpdateSegmentName={(name) => {
                    if (selectedLine !== null) {
                      handleUpdateSegmentName(selectedLine, name);
                    }
                  }}
                  // Pass the current zoom state to the visible sheet
                  zoomLevel={currentZoomLevel}
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
              onSelectSkill={(id) => {
                setSelectedSkillId(id);
                // Deselect all position icons when selecting a placed skill
                setPositionIcons(prev => prev.map(icon => ({ ...icon, selected: false })));
                // Also select the line that the first cell of the placed skill is on
                if (id) {
                  const placedSkill = placedSkills.find(ps => ps.id === id);
                  if (placedSkill) {
                    setSelectedLine(placedSkill.lineIndex);
                  }
                }
              }}
              onMoveSkill={(id, newLineIndex, newStartCount) => {
                setPlacedSkills(
                  placedSkills.map((ps) =>
                    ps.id === id
                      ? {
                          ...ps,
                          lineIndex: newLineIndex,
                          startCount: newStartCount,
                        }
                      : ps,
                  ),
                );
              }}
              onUpdateSkillCounts={updateSkillCounts}
              draggedSkill={draggedSkill}
              overCellId={overCellId}
              notes={notes}
              onUpdateNote={(lineIndex, note) => {
                setNotes((prev) => ({ ...prev, [lineIndex]: note }));
              }}
              isPdfRender={isGeneratingPdf}
              onToggleSkillsPanel={toggleSkillsPanel}
              skillsPanelCollapsed={skillsPanelCollapsed}
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
  );
};
