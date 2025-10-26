import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Download, Upload, Plus, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useSkills } from "@/hooks/useSkills";
import type { Skill, SkillCategory, SkillLevel } from "@/types/routine";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SkillsLibraryEditor = () => {
  const { skills, importFromCSV, exportToCSV, updateSkillCounts, deleteSkill, addCustomSkill, updateSkillName, updateSkillDescription, updateSkillLevel } = useSkills();
  const [editingCell, setEditingCell] = useState<{ skillId: string; field: keyof Skill } | null>(null);
  const [editValue, setEditValue] = useState("");

  const handleAddSkill = (category: SkillCategory) => {
    addCustomSkill({
      name: "",
      category,
      level: "premier",
      counts: 1,
      description: "",
    });
  };

  const handleCellClick = (skill: Skill, field: keyof Skill) => {
    setEditingCell({ skillId: skill.id, field });
    setEditValue(String(skill[field]));
  };

  const handleCellSave = (skillId: string, field: keyof Skill, value?: string) => {
    const skill = skills.find((s) => s.id === skillId);
    if (!skill) return;

    const finalValue = value !== undefined ? value : editValue;

    // Update the skill based on the field
    if (field === "counts") {
      const counts = parseInt(finalValue);
      if (!isNaN(counts)) {
        updateSkillCounts(skillId, counts);
      }
    } else if (field === "name") {
      updateSkillName(skillId, finalValue);
    } else if (field === "description") {
      updateSkillDescription(skillId, finalValue);
    } else if (field === "level") {
      updateSkillLevel(skillId, finalValue as SkillLevel);
    }

    setEditingCell(null);
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

  const categories: SkillCategory[] = [
    "mounts",
    "dismounts",
    "on-hands",
    "pyramids",
    "baskets",
    "tumbling",
    "transitions",
  ];

  const levelOptions: SkillLevel[] = [
    "novice",
    "intermediate",
    "median",
    "advanced",
    "elite",
    "premier",
  ];

  return (
    <div className="min-h-screen bg-background p-2">
      <div className="max-w-7xl mx-auto space-y-2">
        <div className="flex items-center justify-between">
          <Link to="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Builder
            </Button>
          </Link>
          <div className="flex gap-2">
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

        <h1 className="text-2xl font-bold">Skills Library Editor</h1>

        {categories.map((category) => {
          const categorySkills = skills.filter((s) => s.category === category);

          return (
            <Card key={category} className="p-2">
              <div className="flex items-center justify-between mb-1.5">
                <h2 className="text-base font-semibold capitalize">{category}</h2>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-6 px-2"
                  onClick={() => handleAddSkill(category)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="h-8">
                    <TableHead className="text-xs p-1.5">Name</TableHead>
                    <TableHead className="text-xs p-1.5 w-16">Counts</TableHead>
                    <TableHead className="text-xs p-1.5 w-28">Level</TableHead>
                    <TableHead className="text-xs p-1.5">Description</TableHead>
                    <TableHead className="text-xs p-1.5 w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categorySkills.map((skill) => (
                     <TableRow key={skill.id} className="h-8">
                      <TableCell className="p-1 text-xs">
                        {editingCell?.skillId === skill.id && editingCell?.field === "name" ? (
                          <Input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => handleCellSave(skill.id, "name")}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleCellSave(skill.id, "name");
                            }}
                            autoFocus
                            className="h-6 text-xs"
                          />
                        ) : (
                          <div
                            onClick={() => handleCellClick(skill, "name")}
                            className="cursor-pointer hover:bg-muted/50 p-1 rounded min-h-[24px]"
                          >
                            {skill.name || "(empty)"}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="p-1 text-xs">
                        {editingCell?.skillId === skill.id && editingCell?.field === "counts" ? (
                          <Input
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => handleCellSave(skill.id, "counts")}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleCellSave(skill.id, "counts");
                            }}
                            autoFocus
                            className="w-14 h-6 text-xs"
                          />
                        ) : (
                          <div
                            onClick={() => handleCellClick(skill, "counts")}
                            className="cursor-pointer hover:bg-muted/50 p-1 rounded min-h-[24px]"
                          >
                            {skill.counts}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="p-1 text-xs">
                        {editingCell?.skillId === skill.id && editingCell?.field === "level" ? (
                          <Select
                            value={editValue}
                            onValueChange={(value) => handleCellSave(skill.id, "level", value)}
                          >
                            <SelectTrigger className="h-6 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {levelOptions.map((level) => (
                                <SelectItem key={level} value={level} className="text-xs capitalize">
                                  {level}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <div
                            onClick={() => handleCellClick(skill, "level")}
                            className="cursor-pointer hover:bg-muted/50 p-1 rounded capitalize min-h-[24px]"
                          >
                            {skill.level}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="p-1 text-xs">
                        {editingCell?.skillId === skill.id && editingCell?.field === "description" ? (
                          <Input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => handleCellSave(skill.id, "description")}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleCellSave(skill.id, "description");
                            }}
                            autoFocus
                            className="h-6 text-xs"
                          />
                        ) : (
                          <div
                            onClick={() => handleCellClick(skill, "description")}
                            className="cursor-pointer hover:bg-muted/50 p-1 rounded min-h-[24px]"
                          >
                            {skill.description || "-"}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="p-1 text-xs">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => deleteSkill(skill.id)}
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default SkillsLibraryEditor;
