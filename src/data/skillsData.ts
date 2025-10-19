import { Skill } from "@/types/routine";

// Initial skills data for Premier Level Partner Stunts
// This can be customized via CSV import in the future
export const defaultSkills: Skill[] = [
  // Mounts
  {
    id: "mount-1",
    name: "Liberty",
    category: "mounts",
    level: "premier",
    counts: 1,
    description: "Single leg stunt"
  },
  {
    id: "mount-2",
    name: "Heel Stretch",
    category: "mounts",
    level: "premier",
    counts: 1,
    description: "Extended heel stretch"
  },
  {
    id: "mount-3",
    name: "Scale",
    category: "mounts",
    level: "premier",
    counts: 1,
    description: "Arabesque scale position"
  },
  
  // Dismounts
  {
    id: "dismount-1",
    name: "Cradle",
    category: "dismounts",
    level: "premier",
    counts: 3,
    description: "Basic cradle dismount"
  },
  {
    id: "dismount-2",
    name: "Double Down",
    category: "dismounts",
    level: "premier",
    counts: 3,
    description: "Double down dismount"
  },
  {
    id: "dismount-3",
    name: "Full Down",
    category: "dismounts",
    level: "premier",
    counts: 3,
    description: "Full twist down"
  },
  
  // On-Hands
  {
    id: "onhand-1",
    name: "Hands to Prep",
    category: "on-hands",
    level: "premier",
    counts: 3,
    description: "Transition from hands to prep level"
  },
  {
    id: "onhand-2",
    name: "Hands to Extended",
    category: "on-hands",
    level: "premier",
    counts: 3,
    description: "Transition from hands to extended level"
  },
  
  // Baskets
  {
    id: "basket-1",
    name: "Basket Toss",
    category: "baskets",
    level: "premier",
    counts: 8,
    description: "Basic basket toss"
  },
  {
    id: "basket-2",
    name: "Toe Touch Basket",
    category: "baskets",
    level: "premier",
    counts: 8,
    description: "Basket toss with toe touch"
  },
  
  // Tumbling
  {
    id: "tumbling-1",
    name: "Standing Back Tuck",
    category: "tumbling",
    level: "premier",
    counts: 1,
    description: "Standing back tuck"
  },
  {
    id: "tumbling-2",
    name: "Round-off Back Handspring",
    category: "tumbling",
    level: "premier",
    counts: 3,
    description: "Round-off back handspring combo"
  },
  
  // Transitions
  {
    id: "transition-1",
    name: "Prep to Extended",
    category: "transitions",
    level: "premier",
    counts: 1,
    description: "Transition from prep to extended"
  },
  {
    id: "transition-2",
    name: "Liberty Switch",
    category: "transitions",
    level: "premier",
    counts: 3,
    description: "Switch liberty legs"
  },
  {
    id: "transition-3",
    name: "Toss to Hands",
    category: "transitions",
    level: "premier",
    counts: 8,
    description: "Toss to hands position"
  },
];
