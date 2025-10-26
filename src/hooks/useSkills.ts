import { useState, useEffect } from "react";
import type { Skill, SkillCategory, SkillLevel } from "@/types/routine";
import { defaultSkills } from "@/data/skillsData";

export const useSkills = () => {
  const [skills, setSkills] = useState<Skill[]>(() => {
    // Load skills from localStorage on initialization
    const savedSkills = localStorage.getItem('skillsLibrary');
    if (savedSkills) {
      try {
        return JSON.parse(savedSkills);
      } catch (e) {
        console.error('Failed to load skills from localStorage:', e);
        return defaultSkills;
      }
    }
    return defaultSkills;
  });

  // Auto-save skills whenever they change
  useEffect(() => {
    localStorage.setItem('skillsLibrary', JSON.stringify(skills));
  }, [skills]);

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
    setSkills(prev => [...prev, newSkill]);
  };

  const deleteSkill = (id: string) => {
    setSkills(skills.filter(s => s.id !== id));
  };

  const updateSkillCounts = (id: string, counts: number) => {
    setSkills(skills.map(s => s.id === id ? { ...s, counts } : s));
  };

  const updateSkillName = (id: string, name: string) => {
    setSkills(skills.map(s => s.id === id ? { ...s, name } : s));
  };

  const updateSkillDescription = (id: string, description: string) => {
    setSkills(skills.map(s => s.id === id ? { ...s, description } : s));
  };

  const updateSkillLevel = (id: string, level: SkillLevel) => {
    setSkills(skills.map(s => s.id === id ? { ...s, level } : s));
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
    deleteSkill,
    updateSkillCounts,
    updateSkillName,
    updateSkillDescription,
    updateSkillLevel,
  };
};
