import { useDraggable } from "@dnd-kit/core";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skill } from "@/types/routine";

interface SkillCardProps {
  skill: Skill;
}

export const SkillCard = ({ skill }: SkillCardProps) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: skill.id,
    data: skill,
  });

  return (
    <Card
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`p-3 cursor-grab active:cursor-grabbing transition-all ${
        isDragging ? "opacity-50 scale-95" : "hover:shadow-md"
      }`}
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-medium text-sm">{skill.name}</h4>
          <Badge variant="secondary" className="text-xs">
            {skill.counts}ct
          </Badge>
        </div>
        {skill.description && (
          <p className="text-xs text-muted-foreground">{skill.description}</p>
        )}
      </div>
    </Card>
  );
};
