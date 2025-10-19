import { useState } from "react";
import { Skill, SkillCategory, SkillLevel } from "@/types/routine";
import { defaultSkills } from "@/data/skillsData";

export const useSkills = () => {
  const [skills, setSkills] = useState<Skill[]>(defaultSkills);

  const addCustomSkill = (skillData: {
    name: string;
    category: SkillCategory;
    level: SkillLevel;
    counts: number;
    description?: string;
  }) => {
    const newSkill: Skill = {
      id: `custom-${Date.now()}-${Math.random()}`,
      ...skillData,
    };
    setSkills([...skills, newSkill]);
  };

  const importFromCSV = (csvText: string) => {
    // Simple CSV parser: expects headers: id,name,category,level,counts,description
    const lines = csvText.trim().split("\n");
    const headers = lines[0].split(",");
    
    const newSkills: Skill[] = lines.slice(1).map((line) => {
      const values = line.split(",");
      return {
        id: values[0],
        name: values[1],
        category: values[2] as Skill["category"],
        level: values[3] as Skill["level"],
        counts: parseInt(values[4]),
        description: values[5] || "",
      };
    });

    setSkills(newSkills);
  };

  const exportToCSV = () => {
    const headers = ["id", "name", "category", "level", "counts", "description"];
    const rows = skills.map((skill) => [
      skill.id,
      skill.name,
      skill.category,
      skill.level,
      skill.counts.toString(),
      skill.description || "",
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    return csv;
  };

  return {
    skills,
    importFromCSV,
    exportToCSV,
    addCustomSkill,
  };
};
