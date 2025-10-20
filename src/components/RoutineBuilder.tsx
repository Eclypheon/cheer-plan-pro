import { useState } from "react";
import { DndContext, DragEndEvent, DragOverlay, useSensor, useSensors, PointerSensor, DragStartEvent } from "@dnd-kit/core";
import type { PlacedSkill, Position, RoutineConfig, Skill, PositionIcon } from "@/types/routine";
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
import { Download, Info, Library } from "lucide-react";
import { Link } from "react-router-dom";

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

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const skill = skills.find((s) => s.id === event.active.id);
    if (skill) {
      setDraggedSkill(skill);
      return;
    }
    
    // Check if dragging a placed skill
    if (event.active.data?.current?.type === "placed-skill") {
      setIsDraggingPlacedSkill(true);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setDraggedSkill(null);
    setIsDraggingPlacedSkill(false);
    
    const { active, over } = event;
    if (!over) return;

    // Handle deletion by dropping on trash
    if (over.id === "trash-zone") {
      if (active.data?.current?.type === "placed-skill") {
        handleRemoveSkill(active.data.current.placedSkill.id);
      }
      return;
    }

    const skill = skills.find((s) => s.id === active.id);
    
    // Handle dropping a new skill from library
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

    // Handle repositioning a placed skill
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
  };

  const handleAddPositionIcon = (type: PositionIcon["type"]) => {
    if (selectedLine === null) return;
    
    const newIcon: PositionIcon = {
      id: `icon-${Date.now()}-${Math.random()}`,
      type,
      x: 100,
      y: 100,
      lineIndex: selectedLine,
    };
    setPositionIcons([...positionIcons, newIcon]);
  };

  const handleUpdatePositionIcon = (id: string, x: number, y: number) => {
    setPositionIcons(
      positionIcons.map((icon) => (icon.id === id ? { ...icon, x, y } : icon))
    );
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
    
    // Export Count Sheet
    const countSheetElement = document.getElementById("count-sheet-table");
    if (countSheetElement) {
      const canvas = await html2canvas(countSheetElement);
      const imgData = canvas.toDataURL("image/png");
      const imgWidth = 280;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 10, 10, imgWidth, imgHeight);
    }

    // Export Position Sheet if team category
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
      {/* Header */}
      <header className="border-b bg-card p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Cheerleading Routine Builder</h1>
          <div className="flex gap-2">
            <Link to="/skills-editor">
              <Button variant="outline" size="sm">
                <Library className="h-4 w-4 mr-2" />
                Skills Editor
              </Button>
            </Link>
            <Link to="/about">
              <Button variant="outline" size="sm">
                <Info className="h-4 w-4 mr-2" />
                About
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={handleExportPDF}>
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
            <ThemeToggle />
          </div>
        </div>
        
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <Label>Length:</Label>
            <Select
              value={config.length.toString()}
              onValueChange={(v) => setConfig({ ...config, length: parseInt(v) })}
            >
              <SelectTrigger className="w-32">
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

          <div className="flex items-center gap-2">
            <Label>BPM:</Label>
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
              className="w-20"
            />
          </div>

          <div className="flex items-center gap-2">
            <Label>Category:</Label>
            <Select
              value={config.category}
              onValueChange={(v) => setConfig({ ...config, category: v as any })}
            >
              <SelectTrigger className="w-40">
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

          <div className="flex items-center gap-2">
            <Label>Level:</Label>
            <Select
              value={config.level}
              onValueChange={(v) => setConfig({ ...config, level: v as any })}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="premier">Premier</SelectItem>
                <SelectItem value="elite">Elite</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
                <SelectItem value="median">Median</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex-1 grid grid-cols-12 gap-0 overflow-hidden">
          {/* Skills Panel - Left */}
          <div className="col-span-4 overflow-hidden">
            <SkillsPanel 
              skills={skills} 
              onAddCustomSkill={addCustomSkill} 
              onDeleteSkill={(id) => {
                deleteSkill(id);
                setPlacedSkills(placedSkills.filter(ps => ps.skillId !== id));
              }} 
              onUpdateSkillCounts={updateSkillCounts} 
            />
          </div>

          {/* Count Sheet - Center/Right */}
          {(config.category === "team-16" || config.category === "team-24") ? (
            <div className="col-span-8 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-auto">
                <CountSheet
                  routineLength={config.length}
                  bpm={config.bpm}
                  placedSkills={placedSkills}
                  skills={skills}
                  onRemoveSkill={handleRemoveSkill}
                  onLineClick={setSelectedLine}
                  selectedLine={selectedLine}
                />
              </div>

              <div className="h-[400px] overflow-auto border-t">
                <PositionSheet
                  icons={positionIcons}
                  selectedLine={selectedLine}
                  onUpdateIcon={handleUpdatePositionIcon}
                  onAddIcon={handleAddPositionIcon}
                  onRemoveIcon={handleRemovePositionIcon}
                  onNameIcon={handleNamePositionIcon}
                />
              </div>
            </div>
          ) : (
            <div className="col-span-8 overflow-hidden">
              <CountSheet
                routineLength={config.length}
                bpm={config.bpm}
                placedSkills={placedSkills}
                skills={skills}
                onRemoveSkill={handleRemoveSkill}
                onLineClick={setSelectedLine}
                selectedLine={selectedLine}
              />
            </div>
          )}
        </div>

        <DragOverlay>
          {draggedSkill ? <SkillCard skill={draggedSkill} /> : null}
        </DragOverlay>
        <TrashDropZone isDragging={isDraggingPlacedSkill} />
      </DndContext>
    </div>
  );
};
