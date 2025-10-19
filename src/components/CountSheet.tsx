import { useDroppable } from "@dnd-kit/core";
import { PlacedSkill, Skill } from "@/types/routine";
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

interface SkillPlacement {
  skill: Skill;
  placedSkill: PlacedSkill;
  startCount: number;
  endCount: number;
  lineIndex: number;
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

  // Process skills and handle overflow to next lines
  const getSkillPlacements = (): SkillPlacement[] => {
    const placements: SkillPlacement[] = [];
    
    placedSkills.forEach((ps) => {
      const skill = skills.find((s) => s.id === ps.skillId);
      if (!skill) return;

      let remainingCounts = skill.counts;
      let currentLine = ps.lineIndex;
      let currentStartCount = ps.startCount;

      while (remainingCounts > 0) {
        const countsInCurrentLine = Math.min(remainingCounts, 9 - currentStartCount);
        
        placements.push({
          skill,
          placedSkill: ps,
          startCount: currentStartCount,
          endCount: currentStartCount + countsInCurrentLine - 1,
          lineIndex: currentLine,
        });

        remainingCounts -= countsInCurrentLine;
        currentLine++;
        currentStartCount = 1;
      }
    });

    return placements;
  };

  const skillPlacements = getSkillPlacements();

  const getSkillsInCell = (lineIndex: number, count: number) => {
    return skillPlacements.filter(
      (sp) =>
        sp.lineIndex === lineIndex &&
        count >= sp.startCount &&
        count <= sp.endCount
    );
  };

  const CountCell = ({ lineIndex, count }: { lineIndex: number; count: number }) => {
    const { setNodeRef, isOver } = useDroppable({
      id: `cell-${lineIndex}-${count}`,
      data: { lineIndex, count },
    });

    const cellSkills = getSkillsInCell(lineIndex, count);
    const isFirstCountOfSkill = cellSkills.filter(sp => sp.startCount === count);

    return (
      <td
        ref={setNodeRef}
        className={`border border-border min-w-[100px] h-16 p-1 relative ${
          isOver ? "bg-accent" : "bg-card hover:bg-accent/50"
        }`}
      >
        {isFirstCountOfSkill.map((sp) => (
          <div key={sp.placedSkill.id} className="text-xs flex items-start gap-1 mb-1">
            <span className="flex-1">{sp.skill.name}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemoveSkill(sp.placedSkill.id);
              }}
              className="text-destructive hover:text-destructive/80"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </td>
    );
  };

  const CountLine = ({ lineIndex }: { lineIndex: number }) => {
    const isSelected = selectedLine === lineIndex;

    return (
      <tr
        onClick={() => onLineClick(lineIndex)}
        className={`cursor-pointer transition-colors ${
          isSelected ? "bg-accent/30" : "hover:bg-accent/20"
        }`}
      >
        <td className="border border-border bg-muted font-bold text-center px-4 py-2">
          {lineIndex + 1}
        </td>
        {Array.from({ length: 8 }, (_, i) => (
          <CountCell key={i} lineIndex={lineIndex} count={i + 1} />
        ))}
      </tr>
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
        <div className="p-4">
          <table className="w-full border-collapse" id="count-sheet-table">
            <thead>
              <tr>
                <th className="border border-border bg-muted font-bold text-center px-4 py-2">#</th>
                {Array.from({ length: 8 }, (_, i) => (
                  <th key={i} className="border border-border bg-muted font-bold text-center px-4 py-2">
                    {i + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: totalLines }, (_, i) => (
                <CountLine key={i} lineIndex={i} />
              ))}
            </tbody>
          </table>
        </div>
      </ScrollArea>
    </div>
  );
};
