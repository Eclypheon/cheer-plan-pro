import { useState, useEffect } from "react";
import { Skill } from "@/types/routine";
import { defaultSkills } from "@/data/skillsData";

const SKILLS_STORAGE_KEY = "cheerleading-skills";

export const useSkills = () => {
  const [skills, setSkills] = useState<Skill[]>([]);

  useEffect(() => {
    // Load skills from localStorage or use default
    const stored = localStorage.getItem(SKILLS_STORAGE_KEY);
    if (stored) {
      try {
        setSkills(JSON.parse(stored));
      } catch {
        setSkills(defaultSkills);
      }
    } else {
      setSkills(defaultSkills);
    }
  }, []);

  const saveSkills = (newSkills: Skill[]) => {
    setSkills(newSkills);
    localStorage.setItem(SKILLS_STORAGE_KEY, JSON.stringify(newSkills));
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

    saveSkills(newSkills);
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
    saveSkills,
    importFromCSV,
    exportToCSV,
  };
};
