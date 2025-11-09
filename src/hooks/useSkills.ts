import { useState, useEffect } from "react";
import type { Skill, SkillCategory, SkillLevel, PlacedSkill } from "@/types/routine";
import { defaultSkills } from "@/data/skillsData";

export const useSkills = (placedSkills?: PlacedSkill[]) => {
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

  // Ensure all skills referenced in placedSkills exist in the skills array
  useEffect(() => {
    if (!placedSkills) return;

    const skillIdsInPlacedSkills = new Set(placedSkills.map(ps => ps.skillId));
    const missingSkillIds = Array.from(skillIdsInPlacedSkills).filter(
      skillId => !skills.some(s => s.id === skillId)
    );

    if (missingSkillIds.length > 0) {
      const skillsToAdd: Skill[] = [];

      for (const skillId of missingSkillIds) {
        // First try to find the skill in defaultSkills
        const defaultSkill = defaultSkills.find(s => s.id === skillId);
        if (defaultSkill) {
          skillsToAdd.push(defaultSkill);
        } else {
          // If not found in defaultSkills, create a placeholder skill
          skillsToAdd.push({
            id: skillId,
            name: `Unknown Skill (${skillId})`,
            category: "mounts",
            level: "premier",
            counts: 1,
            description: "Auto-generated placeholder skill",
          });
        }
      }

      setSkills(prev => [...prev, ...skillsToAdd]);
    }
  }, [placedSkills, skills]);

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
    // Simple CSV parser: expects headers: name,category,level,counts,description
    const lines = csvText.trim().split("\n");
    
    // Skip header row (lines[0])
    const newSkills: Skill[] = lines.slice(1).map((line) => {
      const values = line.split(",");
      return {
        // Generate a new unique ID on import
        id: `custom-${Date.now()}-${Math.random()}`,
        name: values[0],
        category: values[1] as Skill["category"],
        level: values[2] as Skill["level"],
        counts: parseInt(values[3]),
        description: values[4] || "",
      };
    });

    setSkills(newSkills);
  };

  const exportToCSV = () => {
    // "id" is no longer included in the export
    const headers = ["name", "category", "level", "counts", "description"];
    const rows = skills.map((skill) => [
      // skill.id is no longer exported
      skill.name,
      skill.category,
      skill.level,
      skill.counts.toString(),
      skill.description || "",
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    return csv;
  };

  const resetToDefault = () => {
    setSkills(defaultSkills);
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
    resetToDefault,
  };
};
