import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import type { SkillCategory } from "@/types/routine"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Color mapping for different skill categories and position icons
export const getSkillCategoryColors = (category: SkillCategory | 'default' = 'default') => {
  switch (category) {
    case "mounts":
    case "on-hands":
    case "dismounts":
      return {
        background: "bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/40 dark:to-purple-900/40",
        border: "border-blue-300 dark:border-blue-600",
        text: "text-blue-900 dark:text-blue-100",
        accent: "bg-blue-600 text-white",
        icon: "text-blue-600 dark:text-blue-400"
      };
    case "pyramids":
      return {
        background: "bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/40 dark:to-emerald-900/40",
        border: "border-green-300 dark:border-green-600",
        text: "text-green-900 dark:text-green-100",
        accent: "bg-green-600 text-white",
        icon: "text-green-600 dark:text-green-400"
      };
    case "baskets":
      return {
        background: "bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/40 dark:to-amber-900/40",
        border: "border-orange-300 dark:border-orange-600",
        text: "text-orange-900 dark:text-orange-100",
        accent: "bg-orange-600 text-white",
        icon: "text-orange-600 dark:text-orange-400"
      };
    case "tumbling":
      return {
        background: "bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/40 dark:to-amber-900/40",
        border: "border-yellow-300 dark:border-yellow-600",
        text: "text-yellow-900 dark:text-yellow-100",
        accent: "bg-yellow-600 text-white",
        icon: "text-yellow-600 dark:text-yellow-400"
      };
    case "transitions":
      return {
        background: "bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-900/40 dark:to-gray-900/40",
        border: "border-slate-300 dark:border-slate-600",
        text: "text-slate-900 dark:text-slate-100",
        accent: "bg-slate-600 text-white",
        icon: "text-slate-600 dark:text-slate-400"
      };
    default:
      return {
        background: "bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-900/40 dark:to-slate-900/40",
        border: "border-gray-300 dark:border-gray-600",
        text: "text-gray-900 dark:text-gray-100",
        accent: "bg-gray-600 text-white",
        icon: "text-primary"
      };
  }
};

// Available position icon colors based on skill categories
export const POSITION_ICON_COLORS = [
  { id: 'default', name: 'Default', category: 'default' as const },
  { id: 'mounts', name: 'Mounts', category: 'mounts' as const },
  { id: 'pyramids', name: 'Pyramids', category: 'pyramids' as const },
  { id: 'baskets', name: 'Baskets', category: 'baskets' as const },
  { id: 'tumbling', name: 'Tumbling', category: 'tumbling' as const },
  { id: 'transitions', name: 'Transitions', category: 'transitions' as const },
] as const;

export type PositionIconColor = typeof POSITION_ICON_COLORS[number]['id'];
