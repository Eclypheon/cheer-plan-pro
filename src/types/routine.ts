export type SkillCategory = 
  | "mounts" 
  | "dismounts" 
  | "on-hands" 
  | "pyramids" 
  | "baskets" 
  | "tumbling" 
  | "transitions";

export type SkillLevel = 
  | "premier" 
  | "elite" 
  | "advanced" 
  | "median";

export type RoutineCategory = 
  | "partner-stunts" 
  | "group-stunts" 
  | "team-16" 
  | "team-24";

export interface Skill {
  id: string;
  name: string;
  category: SkillCategory;
  level: SkillLevel;
  counts: number; // 1, 3, or 8
  description?: string;
}

export interface PlacedSkill {
  id: string;
  skillId: string;
  lineIndex: number;
  startCount: number;
}

export interface Position {
  id: string;
  x: number;
  y: number;
  lineIndex: number;
}

export interface PositionIcon {
  id: string;
  type: "square" | "circle" | "x";
  x: number;
  y: number;
  lineIndex: number;
  name?: string;
}

export interface RoutineConfig {
  length: number; // in seconds (60-150)
  category: RoutineCategory;
  level: SkillLevel;
  bpm: number;
}
