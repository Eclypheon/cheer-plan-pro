import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { Skill } from "@/types/routine";

interface SkillCardProps {
  skill: Skill;
  onUpdateCounts?: (id: string, counts: number) => void;
  showDescription?: boolean;
}

export const SkillCard = ({ skill, onUpdateCounts, showDescription = true, }: SkillCardProps) => {
  const [isEditingCounts, setIsEditingCounts] = useState(false);
  const [editedCounts, setEditedCounts] = useState(skill.counts.toString());
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: skill.id,
    data: skill,
  });

  const handleCountsUpdate = () => {
    const counts = parseInt(editedCounts);
    if (counts > 0 && onUpdateCounts) {
      onUpdateCounts(skill.id, counts);
      setIsEditingCounts(false);
    }
  };

  return (
    <Card
      ref={setNodeRef}
      className={`p-3 cursor-grab active:cursor-grabbing ${
        isDragging ? "opacity-50" : ""
      }`}
      data-dragging={isDragging ? "true" : "false"}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <h3 className="font-medium text-sm">{skill.name}</h3>
          {skill.description && showDescription && (
            <p className="text-xs text-muted-foreground mt-1">{skill.description}</p>
          )}
        </div>
        {isEditingCounts ? (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <Input
              type="number"
              inputMode="numeric"
              min = "1"
              value={editedCounts}
onChange={(e) => setEditedCounts(e.target.value)}
              className="w-14 h-6 text-xs"
              onBlur={handleCountsUpdate}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCountsUpdate();
                if (e.key === "Escape") {
                  setEditedCounts(skill.counts.toString());
                  setIsEditingCounts(false);
                }
// 2. Allow: navigation keys, control keys, and shortcuts
                const isAllowedKey = [
                  "Backspace",
                  "Delete",
                  "ArrowLeft",
                  "ArrowRight",
                  "Tab",
                  "Home",
                  "End",
                ].includes(e.key);

                const isShortcut =
                  (e.ctrlKey || e.metaKey) &&
                  ["a", "c", "v", "x"].includes(e.key.toLowerCase());

                // 3. Test if the key is a single digit
                const isDigit = /^[0-9]$/.test(e.key);

                // 4. If it's not a digit, not an allowed key, and not a
                //    shortcut, PREVENT the key press from registering.
                if (!isDigit && !isAllowedKey && !isShortcut) {
                  e.preventDefault();
                }
              }}
              autoFocus
              onFocus={(e) => e.target.select()}
            />
            <span className="text-xs">ct</span>
          </div>
        ) : (
          <Badge 
            variant="secondary" 
            className="text-xs cursor-pointer hover:bg-secondary/80"
            onClick={(e) => {
              e.stopPropagation();
              setIsEditingCounts(true);
            }}
          >
            {skill.counts}-count
          </Badge>
        )}
      </div>
    </Card>
  );
};
