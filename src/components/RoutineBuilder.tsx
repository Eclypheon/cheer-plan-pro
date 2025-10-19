import { useState } from "react";
import { DndContext, DragEndEvent, DragOverlay, useSensor, useSensors, PointerSensor } from "@dnd-kit/core";
import { PlacedSkill, Position, RoutineConfig, Skill } from "@/types/routine";
import { useSkills } from "@/hooks/useSkills";
import { SkillsPanel } from "./SkillsPanel";
import { CountSheet } from "./CountSheet";
import { PositionSheet } from "./PositionSheet";
import { SkillCard } from "./SkillCard";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Download, Upload } from "lucide-react";

export const RoutineBuilder = () => {
  const { skills, importFromCSV, exportToCSV, addCustomSkill } = useSkills();
  const [config, setConfig] = useState<RoutineConfig>({
    length: 90,
    category: "partner-stunts",
    level: "premier",
    bpm: 154,
  });
  
  const [placedSkills, setPlacedSkills] = useState<PlacedSkill[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [selectedLine, setSelectedLine] = useState<number | null>(null);
  const [draggedSkill, setDraggedSkill] = useState<Skill | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: any) => {
    const skill = skills.find((s) => s.id === event.active.id);
    if (skill) {
      setDraggedSkill(skill);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setDraggedSkill(null);
    
    const { active, over } = event;
    if (!over) return;

    const skill = skills.find((s) => s.id === active.id);
    if (!skill) return;

    // Handle dropping on specific count cell
    if (over.id.toString().startsWith("cell-")) {
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
    }
  };

  const handleRemoveSkill = (id: string) => {
    setPlacedSkills(placedSkills.filter((ps) => ps.id !== id));
  };

  const handleAddPosition = () => {
    if (selectedLine === null) return;
    
    const newPosition: Position = {
      id: `position-${Date.now()}-${Math.random()}`,
      x: 100,
      y: 100,
      lineIndex: selectedLine,
    };
    setPositions([...positions, newPosition]);
  };

  const handleUpdatePosition = (id: string, x: number, y: number) => {
    setPositions(
      positions.map((p) => (p.id === id ? { ...p, x, y } : p))
    );
  };

  const handleRemovePosition = (id: string) => {
    setPositions(positions.filter((p) => p.id !== id));
  };

  const handleExportCSV = () => {
    const csv = exportToCSV();
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "skills.csv";
    a.click();
  };

  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      importFromCSV(text);
    };
    reader.readAsText(file);
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
            <Button variant="outline" size="sm" onClick={handleExportPDF}>
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export Skills
            </Button>
            <Button variant="outline" size="sm" asChild>
              <label className="cursor-pointer">
                <Upload className="h-4 w-4 mr-2" />
                Import Skills
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleImportCSV}
                />
              </label>
            </Button>
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
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
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
          <div className={config.category === "team-16" || config.category === "team-24" ? "col-span-4 overflow-hidden" : "col-span-4 overflow-hidden"}>
            <SkillsPanel skills={skills} onAddCustomSkill={addCustomSkill} />
          </div>

          {/* Count Sheet - Center/Right */}
          <div className={config.category === "team-16" || config.category === "team-24" ? "col-span-8 flex flex-col" : "col-span-8 overflow-hidden"}>
            <div className={config.category === "team-16" || config.category === "team-24" ? "flex-1 overflow-hidden" : "h-full overflow-hidden"}>
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

            {/* Position Sheet - Bottom Right (only for team categories) */}
            {(config.category === "team-16" || config.category === "team-24") && (
              <div className="h-[400px] border-t p-4">
                <PositionSheet
                  positions={positions}
                  selectedLine={selectedLine}
                  onUpdatePosition={handleUpdatePosition}
                  onAddPosition={handleAddPosition}
                  onRemovePosition={handleRemovePosition}
                />
              </div>
            )}
          </div>
        </div>

        <DragOverlay>
          {draggedSkill ? <SkillCard skill={draggedSkill} /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
};
