import { useState } from "react";
import type { RoutineConfig, RoutineCategory, SkillLevel } from "@/types/routine";

export const useRoutineConfig = () => {
  const [config, setConfig] = useState<RoutineConfig>({
    length: 90,
    category: "partner-stunts",
    level: "premier",
    bpm: 154,
  });

  const updateLength = (length: number) => {
    setConfig(prev => ({ ...prev, length }));
  };

  const updateCategory = (category: RoutineCategory) => {
    setConfig(prev => ({ ...prev, category }));
  };

  const updateLevel = (level: SkillLevel) => {
    setConfig(prev => ({ ...prev, level }));
  };

  const updateBpm = (bpm: number) => {
    setConfig(prev => ({ ...prev, bpm }));
  };

  const updateConfig = (newConfig: Partial<RoutineConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
  };

  return {
    config,
    updateLength,
    updateCategory,
    updateLevel,
    updateBpm,
    updateConfig,
  };
};
