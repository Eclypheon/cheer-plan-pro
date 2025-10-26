import { useState } from "react";
import type { Skill, SkillCategory } from "@/types/routine";
import { SkillCard } from "./SkillCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";

interface SkillsPanelProps {
  skills: Skill[];
  onAddCustomSkill: (skill: any) => void;
  onDeleteSkill: (id: string) => void;
  onUpdateSkillCounts: (id: string, counts: number) => void;
  currentLevel: import("@/types/routine").SkillLevel;
  onLevelChange: (level: import("@/types/routine").SkillLevel) => void;
}

const categoryLabels: Record<SkillCategory, string> = {
  mounts: "Mounts",
  dismounts: "Dismounts",
  "on-hands": "On-Hands",
  pyramids: "Pyramids",
  baskets: "Baskets",
  tumbling: "Tumbling",
  transitions: "Transitions",
};

export const SkillsPanel = ({ skills, onAddCustomSkill, onDeleteSkill, onUpdateSkillCounts, currentLevel, onLevelChange }: SkillsPanelProps) => {
  const [newSkillName, setNewSkillName] = useState<Record<SkillCategory, string>>({} as any);
  const [newSkillCounts, setNewSkillCounts] = useState<Record<SkillCategory, string>>({} as any);
  const [newSkillDesc, setNewSkillDesc] = useState<Record<SkillCategory, string>>({} as any);

  const categories: SkillCategory[] = [
    "mounts",
    "dismounts",
    "on-hands",
    "pyramids",
    "baskets",
    "tumbling",
    "transitions",
  ];

  const getSkillsByCategory = (category: SkillCategory) => {
    return skills.filter((skill) => skill.category === category && skill.level === currentLevel);
  };

  const handleAddSkill = (category: SkillCategory) => {
    const name = newSkillName[category]?.trim();
    const counts = parseInt(newSkillCounts[category]);
    const description = newSkillDesc[category]?.trim();

    if (name && counts > 0) {
      onAddCustomSkill({
        name,
        category,
        level: "premier",
        counts,
        description: description || "",
      });

      setNewSkillName({ ...newSkillName, [category]: "" });
      setNewSkillCounts({ ...newSkillCounts, [category]: "" });
      setNewSkillDesc({ ...newSkillDesc, [category]: "" });
    }
  };

  return (
    <div className="h-full flex flex-col border-r bg-card relative z-10">
      <div className="p-2 border-b space-y-2">
        <h2 className="text-sm font-semibold">Skills Library</h2>
        <Select value={currentLevel} onValueChange={onLevelChange}>
          <SelectTrigger className="w-full h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="novice">Novice</SelectItem>
            <SelectItem value="intermediate">Intermediate</SelectItem>
            <SelectItem value="median">Median</SelectItem>
            <SelectItem value="advanced">Advanced</SelectItem>
            <SelectItem value="elite">Elite</SelectItem>
            <SelectItem value="premier">Premier</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <ScrollArea className="flex-1">
        <Tabs defaultValue="mounts" className="w-full">
          <TabsList className="w-full flex-wrap h-auto justify-start gap-1 p-2">
            {categories.map((category) => (
              <TabsTrigger key={category} value={category} className="text-xs">
                {categoryLabels[category]}
              </TabsTrigger>
            ))}
          </TabsList>
          
          {categories.map((category) => (
            <TabsContent key={category} value={category} className="p-2 space-y-1">
              {getSkillsByCategory(category).map((skill) => (
                <div key={skill.id} className="relative group">
                  <SkillCard skill={skill} onUpdateCounts={onUpdateSkillCounts} />
                  {skill.id.startsWith("custom-") && (
                    <button
                      onClick={() => onDeleteSkill(skill.id)}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-destructive text-destructive-foreground p-1 rounded"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
              
              {/* Inline Add Skill Form */}
              <Card className="p-3 space-y-2 bg-muted/50">
                <Input
                  placeholder="Skill name"
                  value={newSkillName[category] || ""}
                  onChange={(e) => setNewSkillName({ ...newSkillName, [category]: e.target.value })}
                  className="h-8 text-sm"
                />
                <Input
                  placeholder="Counts (e.g., 8)"
                  type="number"
                  value={newSkillCounts[category] || ""}
                  onChange={(e) => setNewSkillCounts({ ...newSkillCounts, [category]: e.target.value })}
                  className="h-8 text-sm"
                />
                <Input
                  placeholder="Description (optional)"
                  value={newSkillDesc[category] || ""}
                  onChange={(e) => setNewSkillDesc({ ...newSkillDesc, [category]: e.target.value })}
                  className="h-8 text-sm"
                />
                <Button
                  size="sm"
                  onClick={() => handleAddSkill(category)}
                  className="w-full h-8"
                >
                  <Check className="h-4 w-4 mr-1" />
                  Add Skill
                </Button>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </ScrollArea>
    </div>
  );
};
