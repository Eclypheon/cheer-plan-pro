import { useState, useEffect } from "react";
import { DndContext, DragEndEvent, DragOverlay, useSensor, useSensors, PointerSensor, DragStartEvent } from "@dnd-kit/core";
import type { PlacedSkill, RoutineConfig, Skill, PositionIcon } from "@/types/routine";
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
import { Download, Info, Library, Settings as SettingsIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";

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

      if (e.key === keyboardSettings.deleteIcon || e.key === "Delete") {
        const selectedIcons = positionIcons.filter(icon => icon.selected);
        if (selectedIcons.length > 0) {
          setPositionIcons(prev => prev.filter(icon => !icon.selected));
          e.preventDefault();
        }
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

  // Auto-populate position icons for Team categories
  useEffect(() => {
    if (config.category === "team-16" || config.category === "team-24") {
      const totalLines = Math.ceil((config.length * config.bpm) / 60 / 8);
      const existingLines = new Set(positionIcons.map(icon => icon.lineIndex));
      
      const newIcons: PositionIcon[] = [];
      
      for (let lineIndex = 0; lineIndex < totalLines; lineIndex++) {
        if (!existingLines.has(lineIndex)) {
          if (config.category === "team-16") {
            // 10 Bases in 2 rows - snap to 36x36 grid
            const gridSize = 800 / 36;
            for (let i = 0; i < 5; i++) {
              newIcons.push({
                id: `icon-${Date.now()}-${lineIndex}-base1-${i}`,
                type: "square",
                x: Math.round((114 + i * 152) / gridSize) * gridSize,
                y: Math.round(152 / gridSize) * gridSize,
                lineIndex,
              });
            }
            for (let i = 0; i < 5; i++) {
              newIcons.push({
                id: `icon-${Date.now()}-${lineIndex}-base2-${i}`,
                type: "square",
                x: Math.round((114 + i * 152) / gridSize) * gridSize,
                y: Math.round(266 / gridSize) * gridSize,
                lineIndex,
              });
            }
            // 2 Mid tiers
            newIcons.push({
              id: `icon-${Date.now()}-${lineIndex}-mid-0`,
              type: "circle",
              x: Math.round(228 / gridSize) * gridSize,
              y: Math.round(380 / gridSize) * gridSize,
              lineIndex,
            });
            newIcons.push({
              id: `icon-${Date.now()}-${lineIndex}-mid-1`,
              type: "circle",
              x: Math.round(532 / gridSize) * gridSize,
              y: Math.round(380 / gridSize) * gridSize,
              lineIndex,
            });
            // 4 Top flys
            for (let i = 0; i < 4; i++) {
              newIcons.push({
                id: `icon-${Date.now()}-${lineIndex}-fly-${i}`,
                type: "x",
                x: Math.round((152 + i * 152) / gridSize) * gridSize,
                y: Math.round(494 / gridSize) * gridSize,
                lineIndex,
              });
            }
          } else {
            // team-24: 16 Bases, 4 Mid Tiers, 4 Top Flys - snap to 36x36 grid
            const gridSize = 800 / 36;
            for (let i = 0; i < 8; i++) {
              newIcons.push({
                id: `icon-${Date.now()}-${lineIndex}-base1-${i}`,
                type: "square",
                x: Math.round((38 + i * 95) / gridSize) * gridSize,
                y: Math.round(152 / gridSize) * gridSize,
                lineIndex,
              });
            }
            for (let i = 0; i < 8; i++) {
              newIcons.push({
                id: `icon-${Date.now()}-${lineIndex}-base2-${i}`,
                type: "square",
                x: Math.round((38 + i * 95) / gridSize) * gridSize,
                y: Math.round(266 / gridSize) * gridSize,
                lineIndex,
              });
            }
            // 4 Mid tiers
            for (let i = 0; i < 4; i++) {
              newIcons.push({
                id: `icon-${Date.now()}-${lineIndex}-mid-${i}`,
                type: "circle",
                x: Math.round((152 + i * 152) / gridSize) * gridSize,
                y: Math.round(380 / gridSize) * gridSize,
                lineIndex,
              });
            }
            // 4 Top flys
            for (let i = 0; i < 4; i++) {
              newIcons.push({
                id: `icon-${Date.now()}-${lineIndex}-fly-${i}`,
                type: "x",
                x: Math.round((152 + i * 152) / gridSize) * gridSize,
                y: Math.round(494 / gridSize) * gridSize,
                lineIndex,
              });
            }
          }
        }
      }
      
      if (newIcons.length > 0) {
        setPositionIcons(prev => [...prev, ...newIcons]);
      }
    }
  }, [config.category, config.length, config.bpm]);

  const handleDragStart = (event: DragStartEvent) => {
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
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setDraggedSkill(null);
    setIsDraggingPlacedSkill(false);
    setDraggedPlacedSkillId(null);
    setShowGrid(false);
    setIsDraggingIcon(false);
    // Re-enable scrolling
    document.body.style.overflow = '';
    
    const { active, over } = event;
    if (!over) return;

    if (over.id === "trash-zone") {
      if (active.data?.current?.type === "placed-skill") {
        handleRemoveSkill(active.data.current.placedSkill.id);
      }
      return;
    }

    const skill = skills.find((s) => s.id === active.id);
    
    if (skill && over.id.toString().startsWith("cell-")) {
      const lineIndex = over.data?.current?.lineIndex;
      const count = over.data?.current?.count;
      if (typeof lineIndex === "number" && typeof count === "number") {
        const newPlacedSkill: PlacedSkill = {
          id: `placed-${Date.now()}-${Math.random()}`,
          skillId: skill.id,
          lineIndex,
          startCount: count,
        };
        setPlacedSkills([...placedSkills, newPlacedSkill]);
      }
      return;
    }

    if (active.data?.current?.type === "placed-skill" && over.id.toString().startsWith("cell-")) {
      const placedSkill = active.data.current.placedSkill;
      const lineIndex = over.data?.current?.lineIndex;
      const count = over.data?.current?.count;
      if (typeof lineIndex === "number" && typeof count === "number") {
        setPlacedSkills(
          placedSkills.map((ps) =>
            ps.id === placedSkill.id
              ? { ...ps, lineIndex, startCount: count }
              : ps
          )
        );
      }
    }
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

  return (
    <div className="h-screen flex flex-col">
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
        </div>
      </header>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
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
                    onNameIcon={handleNamePositionIcon}
                    showGrid={showGrid}
                    autoFollow={autoFollow}
                    onToggleAutoFollow={() => setAutoFollow(!autoFollow)}
                    isDraggingIcon={isDraggingIcon}
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

        <DragOverlay>
          {draggedSkill ? <SkillCard skill={draggedSkill} /> : null}
        </DragOverlay>
        <TrashDropZone isDragging={isDraggingPlacedSkill || draggedSkill !== null || isDraggingIcon} />
      </DndContext>
    </div>
  );
};
