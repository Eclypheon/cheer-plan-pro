import { useState, useEffect, useRef } from "react";
  import { DndContext, DragEndEvent, DragOverlay, useSensor, useSensors, PointerSensor, DragStartEvent, DragMoveEvent, CollisionDetection, rectIntersection, closestCenter } from "@dnd-kit/core";
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
  const [selectedLine, setSelectedLine] = useState<number | null>(null);
  const [draggedSkill, setDraggedSkill] = useState<Skill | null>(null);
  const [isDraggingPlacedSkill, setIsDraggingPlacedSkill] = useState(false);
  const [draggedPlacedSkillId, setDraggedPlacedSkillId] = useState<string | null>(null);
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(false);
  const [autoFollow, setAutoFollow] = useState(true);
  const [isDraggingIcon, setIsDraggingIcon] = useState(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const [draggedIconId, setDraggedIconId] = useState<string | null>(null);
  const [hasLoadedState, setHasLoadedState] = useState(false);
  const initialLoadedCategoryRef = useRef<string | null>(null);
  const [currentSaveState, setCurrentSaveState] = useState<SaveStateData | null>(null);
  const [loadedSaveStateSlot, setLoadedSaveStateSlot] = useState<null | 1 | 2 | 3>(null);

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

  // Handle category changes - auto-save/load category states
  useEffect(() => {
    // Only handle category changes after initial load
    if (!hasLoadedState) return;

    // Save current category state before switching (only for user-initiated changes)
    if (initialLoadedCategoryRef.current !== null && initialLoadedCategoryRef.current !== config.category) {
      saveCategoryState(initialLoadedCategoryRef.current as RoutineConfig['category']);
    }

    // Load saved state for new category if it exists
    const savedCategoryData = loadCategoryState(config.category);
    if (savedCategoryData) {
      setPlacedSkills(savedCategoryData.placedSkills);
      setPositionIcons(savedCategoryData.positionIcons);
    } else {
      // No saved state - create default state for category
      setPlacedSkills([]);
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
        timestamp: Date.now()
      };
      localStorage.setItem(key, JSON.stringify(data));
      setCurrentSaveState(data);
    }
  }, [placedSkills, positionIcons, config, loadedSaveStateSlot]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
          if (selectedSkill.startCount > 1) {
            setPlacedSkills(prev => prev.map(ps =>
              ps.id === selectedSkillId ? { ...ps, startCount: ps.startCount - 1 } : ps
            ));
          }
          e.preventDefault();
        }
        
        if (e.key === keyboardSettings.moveRight || e.key === keyboardSettings.altMoveRight) {
          if (selectedSkill.startCount < 8) {
            setPlacedSkills(prev => prev.map(ps =>
              ps.id === selectedSkillId ? { ...ps, startCount: ps.startCount + 1 } : ps
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

        if (e.key === keyboardSettings.moveLeft || e.key === keyboardSettings.altMoveLeft) {
          if (selectedSkill.startCount > 1) {
            const skillsToMove = placedSkills.filter(ps =>
              ps.lineIndex > selectedSkill.lineIndex ||
              (ps.lineIndex === selectedSkill.lineIndex && ps.startCount > selectedSkill.startCount)
            );
            setPlacedSkills(prev => prev.map(ps =>
              skillsToMove.some(stm => stm.id === ps.id) ? { ...ps, startCount: ps.startCount - 1 } : ps
            ));
          }
          e.preventDefault();
        }

        if (e.key === keyboardSettings.moveRight || e.key === keyboardSettings.altMoveRight) {
          if (selectedSkill.startCount < 8) {
            const skillsToMove = placedSkills.filter(ps =>
              ps.lineIndex > selectedSkill.lineIndex ||
              (ps.lineIndex === selectedSkill.lineIndex && ps.startCount > selectedSkill.startCount)
            );
            setPlacedSkills(prev => prev.map(ps =>
              skillsToMove.some(stm => stm.id === ps.id) ? { ...ps, startCount: ps.startCount + 1 } : ps
            ));
          }
          e.preventDefault();
        }

        if (e.key === keyboardSettings.moveUp || e.key === keyboardSettings.altMoveUp) {
          if (selectedSkill.lineIndex > 0) {
            const skillsToMove = placedSkills.filter(ps =>
              ps.lineIndex > selectedSkill.lineIndex ||
              (ps.lineIndex === selectedSkill.lineIndex && ps.startCount > selectedSkill.startCount)
            );
            setPlacedSkills(prev => prev.map(ps =>
              skillsToMove.some(stm => stm.id === ps.id) ? { ...ps, lineIndex: ps.lineIndex - 1 } : ps
            ));
          }
          e.preventDefault();
        }

        if (e.key === keyboardSettings.moveDown || e.key === keyboardSettings.altMoveDown) {
          const totalLines = Math.ceil((config.length * config.bpm) / 60 / 8);
          if (selectedSkill.lineIndex < totalLines - 1) {
            const skillsToMove = placedSkills.filter(ps =>
              ps.lineIndex > selectedSkill.lineIndex ||
              (ps.lineIndex === selectedSkill.lineIndex && ps.startCount > selectedSkill.startCount)
            );
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

        if (e.key === keyboardSettings.moveLeft || e.key === keyboardSettings.altMoveLeft) {
          if (selectedSkill.startCount > 1) {
            const skillsToMove = placedSkills.filter(ps =>
              ps.lineIndex < selectedSkill.lineIndex ||
              (ps.lineIndex === selectedSkill.lineIndex && ps.startCount < selectedSkill.startCount)
            );
            setPlacedSkills(prev => prev.map(ps =>
              skillsToMove.some(stm => stm.id === ps.id) ? { ...ps, startCount: ps.startCount - 1 } : ps
            ));
          }
          e.preventDefault();
        }

        if (e.key === keyboardSettings.moveRight || e.key === keyboardSettings.altMoveRight) {
          if (selectedSkill.startCount < 8) {
            const skillsToMove = placedSkills.filter(ps =>
              ps.lineIndex < selectedSkill.lineIndex ||
              (ps.lineIndex === selectedSkill.lineIndex && ps.startCount < selectedSkill.startCount)
            );
            setPlacedSkills(prev => prev.map(ps =>
              skillsToMove.some(stm => stm.id === ps.id) ? { ...ps, startCount: ps.startCount + 1 } : ps
            ));
          }
          e.preventDefault();
        }

        if (e.key === keyboardSettings.moveUp || e.key === keyboardSettings.altMoveUp) {
          if (selectedSkill.lineIndex > 0) {
            const skillsToMove = placedSkills.filter(ps =>
              ps.lineIndex < selectedSkill.lineIndex ||
              (ps.lineIndex === selectedSkill.lineIndex && ps.startCount < selectedSkill.startCount)
            );
            setPlacedSkills(prev => prev.map(ps =>
              skillsToMove.some(stm => stm.id === ps.id) ? { ...ps, lineIndex: ps.lineIndex - 1 } : ps
            ));
          }
          e.preventDefault();
        }

        if (e.key === keyboardSettings.moveDown || e.key === keyboardSettings.altMoveDown) {
          const totalLines = Math.ceil((config.length * config.bpm) / 60 / 8);
          if (selectedSkill.lineIndex < totalLines - 1) {
            const skillsToMove = placedSkills.filter(ps =>
              ps.lineIndex < selectedSkill.lineIndex ||
              (ps.lineIndex === selectedSkill.lineIndex && ps.startCount < selectedSkill.startCount)
            );
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
   * Helper functions for category-based state management
   */
  const saveCategoryState = (category: RoutineConfig['category']) => {
    const key = `category-${category}`;
    const data: CategoryStateData = {
      placedSkills: [...placedSkills],
      positionIcons: [...positionIcons],
      timestamp: Date.now()
    };
    localStorage.setItem(key, JSON.stringify(data));
  };

  const loadCategoryState = (category: RoutineConfig['category']): CategoryStateData | null => {
    const key = `category-${category}`;
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : null;
  };

  const saveToSlot = (slotNumber: 1 | 2 | 3) => {
    const key = `save-state-${slotNumber}`;
    const data: SaveStateData = {
      placedSkills: [...placedSkills],
      positionIcons: [...positionIcons],
      config: { ...config },
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
      const data: SaveStateData = JSON.parse(saved);
      setPlacedSkills(data.placedSkills);
      setPositionIcons(data.positionIcons);
      setConfig(data.config);
      setCurrentSaveState(data);
      setLoadedSaveStateSlot(slotNumber);
      initialLoadedCategoryRef.current = data.config.category;
    }
  };

  /**
   * Custom collision detection function that prioritizes:
   * 1. Trash zone collisions using rectIntersection
   * 2. Position sheet grid when dragging position icons (uses rectIntersection)
   * 3. Falls back to closestCenter for count sheet cells
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

    // 3. Fall back to closestCenter for count sheet cells and other scenarios
    return closestCenter(args);
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

  const handleDragMove = (event: DragMoveEvent) => {
    console.log(`Drag Move: Type='${event.active.data?.current?.type || (skills.find(s => s.id === event.active.id) ? 'new skill' : 'unknown')}', ID='${event.active.id}'`);
    const { active, delta } = event;
    
    if (active.data?.current?.type === "position-icon") {
      setDragOffset({ x: delta.x, y: delta.y });
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
    setDraggedPlacedSkillId(null);
    setShowGrid(false);
    setIsDraggingIcon(false);
    setDragOffset(null);
    setDraggedIconId(null);
    // Re-enable scrolling
    document.body.style.overflow = '';

    const { active, over, delta } = event;
    // Exit if dropped outside a droppable area
    if (!over) return;

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
          const newX = Math.max(0, Math.min(800, selectedIcon.x + delta.x)); // Assuming 800 width
          const newY = Math.max(0, Math.min(600, selectedIcon.y + delta.y)); // Assuming 600 height
          handleUpdatePositionIcon(selectedIcon.id, newX, newY, autoFollow);
        });
      } else {
        // Single icon drag
        const newX = Math.max(0, Math.min(800, icon.x + delta.x));
        const newY = Math.max(0, Math.min(600, icon.y + delta.y));
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
    if (selectedLine === null) return;
    
    const gridSize = 800 / 36;
    const lineIcons = positionIcons.filter(i => i.lineIndex === selectedLine);
    const occupied = new Set(lineIcons.map(i => `${i.x},${i.y}`));
    
    let x = 100, y = 100;
    for (let row = 0; row < 36; row++) {
      for (let col = 0; col < 36; col++) {
        const testX = Math.round(col * gridSize);
        const testY = Math.round(row * gridSize);
        if (!occupied.has(`${testX},${testY}`)) {
          x = testX;
          y = testY;
          row = 36;
          break;
        }
      }
    }
    
    const newIcon: PositionIcon = {
      id: `icon-${Date.now()}-${Math.random()}`,
      type,
      x,
      y,
      lineIndex: selectedLine,
    };
    setPositionIcons([...positionIcons, newIcon]);
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

  const handleRemoveMultiplePositionIcons = (ids: string[]) => {
    setPositionIcons(positionIcons.filter((icon) => !ids.includes(icon.id)));
  };

  const handleNamePositionIcon = (id: string, name: string) => {
    setPositionIcons(
      positionIcons.map((icon) => (icon.id === id ? { ...icon, name } : icon))
    );
  };

  const handleExportPDF = async () => {
    const jsPDF = (await import("jspdf")).default;
    const html2canvas = (await import("html2canvas")).default;

    const pdf = new jsPDF("l", "mm", "a4");

    const countSheetElement = document.getElementById("count-sheet-table");
    if (countSheetElement) {
      const canvas = await html2canvas(countSheetElement);
      const imgData = canvas.toDataURL("image/png");
      const imgWidth = 280;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 10, 10, imgWidth, imgHeight);
    }

    if (config.category === "team-16" || config.category === "team-24") {
      const positionSheetElement = document.getElementById("position-sheet");
      if (positionSheetElement) {
        pdf.addPage();
        const canvas = await html2canvas(positionSheetElement);
        const imgData = canvas.toDataURL("image/png");
        const imgWidth = 280;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        pdf.addImage(imgData, "PNG", 10, 10, imgWidth, imgHeight);
      }
    }

    pdf.save("routine.pdf");
  };

  const handleReset = () => {
    // Reset to default state
    setPlacedSkills([]);
    setSelectedLine(null);
    setSelectedSkillId(null);

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
            <Button variant="outline" size="sm" onClick={handleExportPDF}>
              <Download className="h-4 w-4 mr-1" />
              Export PDF
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
        onDragEnd={handleDragEnd}
        autoScroll={false}
      >
        <ResizablePanelGroup direction="horizontal" className="flex-1 w-full">
          <ResizablePanel defaultSize={25} minSize={10} maxSize={40} collapsible>
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
                <ResizablePanel defaultSize={60}>
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
                  />
                </ResizablePanel>

                <ResizableHandle withHandle />

                <ResizablePanel defaultSize={40} minSize={30}>
                  <PositionSheet
                    icons={positionIcons}
                    selectedLine={selectedLine}
                    onUpdateIcon={handleUpdatePositionIcon}
                    onAddIcon={handleAddPositionIcon}
                    onRemoveIcon={handleRemovePositionIcon}
                    onRemoveMultipleIcons={handleRemoveMultiplePositionIcons}
                    onNameIcon={handleNamePositionIcon}
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
              />
            )}
          </ResizablePanel>
        </ResizablePanelGroup>

        <DragOverlay className="z-[3000]">
          {draggedSkill ? <SkillCard skill={draggedSkill} /> : null}
        </DragOverlay>
        <TrashDropZone isDragging={isDraggingPlacedSkill || draggedSkill !== null} />
      </DndContext>
    </div>
  );
};
