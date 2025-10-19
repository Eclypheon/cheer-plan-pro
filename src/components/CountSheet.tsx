import { useDroppable } from "@dnd-kit/core";
import { PlacedSkill, Skill } from "@/types/routine";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CountSheetProps {
  routineLength: number;
  bpm: number;
  placedSkills: PlacedSkill[];
  skills: Skill[];
  onRemoveSkill: (id: string) => void;
  onLineClick: (lineIndex: number) => void;
  selectedLine: number | null;
}

export const CountSheet = ({
  routineLength,
  bpm,
  placedSkills,
  skills,
  onRemoveSkill,
  onLineClick,
  selectedLine,
}: CountSheetProps) => {
  // Calculate total lines needed
  const totalBeats = Math.ceil((routineLength * bpm) / 60);
  const totalLines = Math.ceil(totalBeats / 8);

  const getSkillsOnLine = (lineIndex: number) => {
    return placedSkills
      .filter((ps) => ps.lineIndex === lineIndex)
      .map((ps) => ({
        ...ps,
        skill: skills.find((s) => s.id === ps.skillId),
      }))
      .sort((a, b) => a.startCount - b.startCount);
  };

  const CountLine = ({ lineIndex }: { lineIndex: number }) => {
    const { setNodeRef, isOver } = useDroppable({
      id: `line-${lineIndex}`,
      data: { lineIndex },
    });

    const lineSkills = getSkillsOnLine(lineIndex);
    const isSelected = selectedLine === lineIndex;

    return (
      <div
        ref={setNodeRef}
        onClick={() => onLineClick(lineIndex)}
        className={`border rounded-lg p-3 transition-all cursor-pointer ${
          isOver ? "bg-accent border-primary" : isSelected ? "bg-accent/50 border-primary" : "bg-card hover:bg-accent/30"
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-16 text-sm font-mono text-muted-foreground">
            {Array.from({ length: 8 }, (_, i) => i + 1).join(" ")}
          </div>
          
          <div className="flex-1 min-h-[32px] flex items-center gap-2 flex-wrap">
            {lineSkills.length === 0 && (
              <span className="text-xs text-muted-foreground italic">
                Drop skills here
              </span>
            )}
            {lineSkills.map((ps) => (
              <Badge
                key={ps.id}
                variant="default"
                className="flex items-center gap-1"
              >
                <span className="text-xs">
                  {ps.skill?.name || "Unknown"} ({ps.startCount}-{ps.startCount + (ps.skill?.counts || 1) - 1})
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveSkill(ps.id);
                  }}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-card">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">Count Sheet</h2>
        <p className="text-sm text-muted-foreground">
          {totalLines} lines @ {bpm} BPM
        </p>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {Array.from({ length: totalLines }, (_, i) => (
            <CountLine key={i} lineIndex={i} />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
