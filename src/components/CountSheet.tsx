import { useDroppable, useDraggable } from "@dnd-kit/core";
import type { PlacedSkill, Skill, SkillCategory } from "@/types/routine";
import { X } from "lucide-react";

interface CountSheetProps {
  routineLength: number;
  bpm: number;
  placedSkills: PlacedSkill[];
  skills: Skill[];
  onRemoveSkill: (id: string) => void;
  onLineClick: (lineIndex: number) => void;
  selectedLine: number | null;
  selectedSkillId?: string | null;
  onSelectSkill?: (id: string | null) => void;
  onMoveSkill?: (id: string, newLineIndex: number, newStartCount: number) => void;
}

interface SkillPlacement {
  skill: Skill;
  placedSkill: PlacedSkill;
  startCount: number;
  endCount: number;
  lineIndex: number;
}

// Color mapping for different skill categories
const getSkillCategoryColors = (category: SkillCategory) => {
  switch (category) {
    case "mounts":
    case "on-hands":
      return {
        background: "bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/40 dark:to-purple-900/40",
        border: "border-blue-300 dark:border-blue-600",
        text: "text-blue-900 dark:text-blue-100",
        accent: "bg-blue-600 text-white"
      };
    case "dismounts":
      return {
        background: "bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/40 dark:to-orange-900/40",
        border: "border-red-300 dark:border-red-600",
        text: "text-red-900 dark:text-red-100",
        accent: "bg-red-600 text-white"
      };
    case "pyramids":
      return {
        background: "bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/40 dark:to-emerald-900/40",
        border: "border-green-300 dark:border-green-600",
        text: "text-green-900 dark:text-green-100",
        accent: "bg-green-600 text-white"
      };
    case "baskets":
      return {
        background: "bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/40 dark:to-amber-900/40",
        border: "border-orange-300 dark:border-orange-600",
        text: "text-orange-900 dark:text-orange-100",
        accent: "bg-orange-600 text-white"
      };
    case "tumbling":
      return {
        background: "bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/40 dark:to-amber-900/40",
        border: "border-yellow-300 dark:border-yellow-600",
        text: "text-yellow-900 dark:text-yellow-100",
        accent: "bg-yellow-600 text-white"
      };
    case "transitions":
      return {
        background: "bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-900/40 dark:to-gray-900/40",
        border: "border-slate-300 dark:border-slate-600",
        text: "text-slate-900 dark:text-slate-100",
        accent: "bg-slate-600 text-white"
      };
    default:
      return {
        background: "bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-900/40 dark:to-slate-900/40",
        border: "border-gray-300 dark:border-gray-600",
        text: "text-gray-900 dark:text-gray-100",
        accent: "bg-gray-600 text-white"
      };
  }
};

export const CountSheet = ({
  routineLength,
  bpm,
  placedSkills,
  skills,
  onRemoveSkill,
  onLineClick,
  selectedLine,
  selectedSkillId,
  onSelectSkill,
  onMoveSkill,
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

    // Check if this cell is part of a skill span but not the first cell
    const isPartOfSkillSpan = cellSkills.length > 0 && isFirstCountOfSkill.length === 0;

    return (
      <td
        ref={setNodeRef}
        data-cell={`${lineIndex}-${count}`}
        className={`border border-border min-w-[80px] h-10 p-0.5 relative text-xs ${
          isOver ? "bg-accent" : isPartOfSkillSpan ? "bg-gray-50 dark:bg-gray-800/50" : "bg-card hover:bg-accent/50"
        }`}
      >
        {isFirstCountOfSkill.map((sp) => {
          const cellsToSpan = Math.min(sp.endCount - sp.startCount + 1, 9 - count);
          const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
            id: `placed-${sp.placedSkill.id}`,
            data: { type: "placed-skill", placedSkill: sp.placedSkill },
          });

          // Enhanced drag listeners to handle trash zone
          const enhancedListeners = {
            ...listeners,
            onDragEnd: (event: any) => {
              const { over } = event;
              if (over && (over.id === "trash-zone" || over.id === "trash-drop-zone")) {
                onRemoveSkill(sp.placedSkill.id);
                if (onSelectSkill) onSelectSkill(null);
              }
              // Call original drag end handler if it exists
              if (listeners?.onDragEnd) {
                listeners.onDragEnd(event);
              }
            }
          };

          
          const style = transform
            ? {
                transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
                width: `${100 * cellsToSpan}%`
              }
            : { width: `${100 * cellsToSpan}%` };

          const colors = getSkillCategoryColors(sp.skill.category);

          return (
            <div
              key={sp.placedSkill.id}
              data-skill-id={sp.placedSkill.id}
              ref={setNodeRef}
              {...enhancedListeners}
              {...attributes}
              style={style}
              onClick={(e) => {
                e.stopPropagation();
                onSelectSkill?.(sp.placedSkill.id);
              }}
              className={`${colors.background} ${colors.border} border-2 rounded-md shadow-md p-2 absolute inset-0 flex items-center gap-2 cursor-grab active:cursor-grabbing z-[2000] text-sm transition-all duration-200 hover:shadow-lg ${
                isDragging ? "opacity-50 shadow-xl" : "opacity-100"
              } ${selectedSkillId === sp.placedSkill.id ? "ring-2 ring-accent ring-offset-1" : ""}`}
            >
              <span className={`flex-1 font-semibold ${colors.text}`}>
                {sp.skill.name}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveSkill(sp.placedSkill.id);
                }}
                className="p-0.5 rounded-full hover:bg-black/10 text-gray-500 hover:text-gray-700 transition-colors shrink-0"
                title="Remove skill"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          );
        })}
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
        <td className="border border-border bg-muted font-bold text-center px-2 py-1 text-xs">
          {lineIndex + 1}
        </td>
        {Array.from({ length: 8 }, (_, i) => (
          <CountCell key={i} lineIndex={lineIndex} count={i + 1} />
        ))}
      </tr>
    );
  };

  return (
    <div className="h-full flex flex-col bg-card relative z-10 overflow-hidden">
      <div className="p-1.5 border-b">
        <h2 className="text-sm font-semibold">Count Sheet</h2>
        <p className="text-xs text-muted-foreground">
          {totalLines} lines @ {bpm} BPM
        </p>
      </div>

      <div className="flex-1 overflow-auto relative">
        <table className="w-full border-collapse relative z-10" id="count-sheet-table">
          <thead>
            <tr>
              <th className="border border-border bg-muted font-bold text-center px-2 py-1 text-xs">#</th>
              {Array.from({ length: 8 }, (_, i) => (
                <th key={i} className="border border-border bg-muted font-bold text-center px-2 py-1 text-xs">
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
    </div>
  );
};
