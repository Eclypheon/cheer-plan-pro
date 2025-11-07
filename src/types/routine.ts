export type SkillCategory = 
  | "mounts" 
  | "dismounts" 
  | "on-hands" 
  | "pyramids" 
  | "baskets" 
  | "tumbling" 
  | "transitions";

export type SkillLevel = 
  | "novice"
  | "intermediate"
  | "median"
  | "advanced"
  | "elite"
  | "premier";

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
  selected?: boolean;
}

export interface Arrow {
  id: string;
  start: { x: number; y: number };
  end: { x: number; y: number };
  lineIndex: number;
  selected?: boolean;
}

export interface KeyboardSettings {
  nextLine: string;
  prevLine: string;
  undo: string;
  redo: string;
  toggleAutoFollow: string;
  deleteIcon: string;
  moveLeft: string;
  moveRight: string;
  moveUp: string;
  moveDown: string;
}

export interface RoutineConfig {
  length: number; // in seconds (60-150)
  category: RoutineCategory;
  level: SkillLevel;
  bpm: number;
}

export interface CategoryStateData {
  placedSkills: PlacedSkill[];
  positionIcons: PositionIcon[];
  arrows: Arrow[];
  notes: Record<number, string>;
  segmentNames?: Record<number, string>;
  timestamp: number;
}

export interface SaveStateData {
  placedSkills: PlacedSkill[];
  positionIcons: PositionIcon[];
  arrows: Arrow[];
  config: RoutineConfig;
  notes: Record<number, string>;
  segmentNames?: Record<number, string>;
  timestamp: number;
}
