import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { SkillCategory, SkillLevel } from "@/types/routine";

interface AddSkillDialogProps {
  onAddSkill: (skill: {
    name: string;
    category: SkillCategory;
    level: SkillLevel;
    counts: number;
    description?: string;
  }) => void;
}

export const AddSkillDialog = ({ onAddSkill }: AddSkillDialogProps) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<SkillCategory>("mounts");
  const [level, setLevel] = useState<SkillLevel>("premier");
  const [counts, setCounts] = useState<number>(1);
  const [description, setDescription] = useState("");

  const handleSubmit = () => {
    if (!name) return;

    onAddSkill({
      name,
      category,
      level,
      counts,
      description,
    });

    // Reset form
    setName("");
    setCategory("mounts");
    setLevel("premier");
    setCounts(1);
    setDescription("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Add Custom Skill
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Custom Skill</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Skill Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter skill name"
            />
          </div>

          <div>
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as SkillCategory)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mounts">Mounts</SelectItem>
                <SelectItem value="dismounts">Dismounts</SelectItem>
                <SelectItem value="on-hands">On-Hands</SelectItem>
                <SelectItem value="pyramids">Pyramids</SelectItem>
                <SelectItem value="baskets">Baskets</SelectItem>
                <SelectItem value="tumbling">Tumbling</SelectItem>
                <SelectItem value="transitions">Transitions</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="level">Level</Label>
            <Select value={level} onValueChange={(v) => setLevel(v as SkillLevel)}>
              <SelectTrigger>
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

          <div>
            <Label htmlFor="counts">Counts</Label>
            <Select value={counts.toString()} onValueChange={(v) => setCounts(parseInt(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 count</SelectItem>
                <SelectItem value="3">3 counts</SelectItem>
                <SelectItem value="8">8 counts</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter description"
            />
          </div>

          <Button onClick={handleSubmit} className="w-full">
            Add Skill
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
