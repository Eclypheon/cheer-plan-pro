import type { Skill, SkillCategory } from "@/types/routine";
import { SkillCard } from "./SkillCard";
import { AddSkillDialog } from "./AddSkillDialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SkillsPanelProps {
  skills: Skill[];
  onAddCustomSkill: (skill: any) => void;
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

export const SkillsPanel = ({ skills, onAddCustomSkill }: SkillsPanelProps) => {
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
    return skills.filter((skill) => skill.category === category);
  };

  return (
    <div className="h-full flex flex-col border-r bg-card">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">Skills Library</h2>
        <p className="text-xs text-muted-foreground mb-3">Drag skills to count sheet</p>
        <AddSkillDialog onAddSkill={onAddCustomSkill} />
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
            <TabsContent key={category} value={category} className="p-4 space-y-2">
              {getSkillsByCategory(category).map((skill) => (
                <SkillCard key={skill.id} skill={skill} />
              ))}
              {getSkillsByCategory(category).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No skills in this category yet
                </p>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </ScrollArea>
    </div>
  );
};
