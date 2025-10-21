import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Download, Upload } from "lucide-react";
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

const SkillsLibraryEditor = () => {
  const { skills, importFromCSV, exportToCSV, updateSkillCounts, deleteSkill } = useSkills();
  const [editingCell, setEditingCell] = useState<{ skillId: string; field: keyof Skill } | null>(null);
  const [editValue, setEditValue] = useState("");

  const handleCellClick = (skill: Skill, field: keyof Skill) => {
    setEditingCell({ skillId: skill.id, field });
    setEditValue(String(skill[field]));
  };

  const handleCellSave = (skillId: string, field: keyof Skill) => {
    const skill = skills.find((s) => s.id === skillId);
    if (!skill) return;

    // Update the skill based on the field
    if (field === "counts") {
      const counts = parseInt(editValue);
      if (!isNaN(counts)) {
        updateSkillCounts(skillId, counts);
      }
    }
    // Add more field updates as needed

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

  return (
    <div className="min-h-screen bg-background p-3">
      <div className="max-w-7xl mx-auto space-y-3">
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
            <Card key={category} className="p-3">
              <h2 className="text-lg font-semibold mb-2 capitalize">{category}</h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Counts</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categorySkills.map((skill) => (
                     <TableRow key={skill.id}>
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
                            className="h-7"
                          />
                        ) : (
                          <div
                            onClick={() => handleCellClick(skill, "name")}
                            className="cursor-pointer hover:bg-muted/50 p-1 rounded"
                          >
                            {skill.name}
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
                            className="w-16 h-7"
                          />
                        ) : (
                          <div
                            onClick={() => handleCellClick(skill, "counts")}
                            className="cursor-pointer hover:bg-muted/50 p-1 rounded"
                          >
                            {skill.counts}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="capitalize p-1 text-xs">{skill.level}</TableCell>
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
                          />
                        ) : (
                          <div
                            onClick={() => handleCellClick(skill, "description")}
                            className="cursor-pointer hover:bg-muted/50 p-2 rounded"
                          >
                            {skill.description || "-"}
                          </div>
                        )}
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
