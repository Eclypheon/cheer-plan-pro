import { useEffect } from "react";
import type { PlacedSkill, PositionIcon, RoutineConfig } from "@/types/routine";
import type { Skill } from "@/types/routine";

const defaultKeyboardSettings = {
  nextLine: "ArrowDown",
  prevLine: "ArrowUp",
  undo: "z",
  redo: "y",
  toggleAutoFollow: "f",
  deleteIcon: "Delete",
  moveLeft: "ArrowLeft",
  moveRight: "ArrowRight",
  moveUp: "ArrowUp",
  moveDown: "ArrowDown",
};

type KeyboardSettings = typeof defaultKeyboardSettings;

interface UseKeyboardShortcutsProps {
  config: RoutineConfig;
  selectedLine: number | null;
  selectedSkillId: string | null;
  placedSkills: PlacedSkill[];
  positionIcons: PositionIcon[];
  skills: Skill[];
  autoFollow: boolean;
  keyboardSettings: KeyboardSettings;
  setSelectedLine: (line: number | null) => void;
  setAutoFollow: (autoFollow: boolean) => void;
  setPositionIcons: React.Dispatch<React.SetStateAction<PositionIcon[]>>;
  setPlacedSkills: React.Dispatch<React.SetStateAction<PlacedSkill[]>>;
  setSelectedSkillId: (id: string | null) => void;
  handleUndoLine: (lineIndex: number) => void;
  handleRedoLine: (lineIndex: number) => void;
  handleRemoveSkill: (id: string) => void;
}

export const useKeyboardShortcuts = ({
  config,
  selectedLine,
  selectedSkillId,
  placedSkills,
  positionIcons,
  skills,
  autoFollow,
  keyboardSettings,
  setSelectedLine,
  setAutoFollow,
  setPositionIcons,
  setPlacedSkills,
  setSelectedSkillId,
  handleUndoLine,
  handleRedoLine,
  handleRemoveSkill,
}: UseKeyboardShortcutsProps) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip keyboard shortcuts if user is typing in an input field
      const activeElement = document.activeElement;
      if (
        activeElement &&
        (activeElement.tagName === "INPUT" ||
          activeElement.tagName === "TEXTAREA" ||
          (activeElement as HTMLElement).contentEditable === "true")
      ) {
        return;
      }

      // Position sheet shortcuts
      if (e.key === keyboardSettings.nextLine && !e.shiftKey) {
        const totalLines = Math.ceil(((config.length * config.bpm) / 60 / 8));
        if (selectedLine !== null && selectedLine < totalLines - 1) {
          setSelectedLine(selectedLine + 1);
          e.preventDefault();
        }
      }

      if (e.key === keyboardSettings.prevLine && !e.shiftKey) {
        if (selectedLine !== null && selectedLine > 0) {
          setSelectedLine(selectedLine - 1);
          e.preventDefault();
        }
      }

      if (e.key === keyboardSettings.toggleAutoFollow) {
        setAutoFollow(!autoFollow);
        e.preventDefault();
      }

      // Undo/Redo shortcuts (no modifier keys required)
      if (e.key === keyboardSettings.undo && selectedLine !== null) {
        handleUndoLine(selectedLine);
        e.preventDefault();
      }

      if (e.key === keyboardSettings.redo && selectedLine !== null) {
        handleRedoLine(selectedLine);
        e.preventDefault();
      }

      if (
        e.key === keyboardSettings.deleteIcon ||
        e.key === "Delete" ||
        e.key === "Backspace"
      ) {
        const selectedIcons = positionIcons.filter((icon) => icon.selected);
        if (selectedIcons.length > 0) {
          setPositionIcons((prev) => prev.filter((icon) => !icon.selected));
          e.preventDefault();
        }
      }

      // Delete key for selected skills in count sheet
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        selectedSkillId &&
        !e.shiftKey
      ) {
        handleRemoveSkill(selectedSkillId);
        setSelectedSkillId(null);
        e.preventDefault();
      }

      // Previous/next skill selection shortcuts
      if (e.key === "a" && selectedSkillId) {
        // Sort skills by their absolute position in the routine
        const sortedSkills = [...placedSkills].sort((a, b) => {
          const posA = a.lineIndex * 8 + a.startCount - 1;
          const posB = b.lineIndex * 8 + b.startCount - 1;
          return posA - posB;
        });

        const currentIndex = sortedSkills.findIndex(ps => ps.id === selectedSkillId);
        if (currentIndex !== -1) {
          const prevIndex = currentIndex > 0 ? currentIndex - 1 : sortedSkills.length - 1;
          const prevSkill = sortedSkills[prevIndex];
          setSelectedSkillId(prevSkill.id);
          setSelectedLine(prevSkill.lineIndex);
          // Deselect all position icons when selecting a placed skill
          setPositionIcons(prev => prev.map(icon => ({ ...icon, selected: false })));
          e.preventDefault();
        }
      }

      if (e.key === "d" && selectedSkillId) {
        // Sort skills by their absolute position in the routine
        const sortedSkills = [...placedSkills].sort((a, b) => {
          const posA = a.lineIndex * 8 + a.startCount - 1;
          const posB = b.lineIndex * 8 + b.startCount - 1;
          return posA - posB;
        });

        const currentIndex = sortedSkills.findIndex(ps => ps.id === selectedSkillId);
        if (currentIndex !== -1) {
          const nextIndex = currentIndex < sortedSkills.length - 1 ? currentIndex + 1 : 0;
          const nextSkill = sortedSkills[nextIndex];
          setSelectedSkillId(nextSkill.id);
          setSelectedLine(nextSkill.lineIndex);
          // Deselect all position icons when selecting a placed skill
          setPositionIcons(prev => prev.map(icon => ({ ...icon, selected: false })));
          e.preventDefault();
        }
      }

      // Count sheet shortcuts
      if (selectedSkillId) {
        const selectedSkill = placedSkills.find(
          (ps) => ps.id === selectedSkillId,
        );
        if (!selectedSkill) return;

        const totalLines = Math.ceil(((config.length * config.bpm) / 60 / 8));

        if (e.key === keyboardSettings.moveLeft) {
          const skill = skills.find((s) => s.id === selectedSkill.skillId);
          if (!skill) return;

          // Calculate absolute start position (0-indexed)
          const absoluteStartPos =
            selectedSkill.lineIndex * 8 + selectedSkill.startCount - 1;

          // Try to move left by 1 count
          const newAbsoluteStartPos = absoluteStartPos - 1;

          if (newAbsoluteStartPos >= 0) {
            // Calculate new line and start count
            const newLineIndex = Math.floor(newAbsoluteStartPos / 8);
            const newStartCount = (newAbsoluteStartPos % 8) + 1;

            setPlacedSkills((prev) =>
              prev.map((ps) =>
                ps.id === selectedSkillId
                  ? { ...ps, lineIndex: newLineIndex, startCount: newStartCount }
                  : ps,
              ),
            );
          }
          e.preventDefault();
        }

        if (e.key === keyboardSettings.moveRight) {
          const skill = skills.find((s) => s.id === selectedSkill.skillId);
          if (!skill) return;

          // Calculate absolute start position (0-indexed)
          const absoluteStartPos =
            selectedSkill.lineIndex * 8 + selectedSkill.startCount - 1;

          // Try to move right by 1 count
          const newAbsoluteStartPos = absoluteStartPos + 1;

          // Calculate total available positions
          const totalAvailablePositions = totalLines * 8;
          const skillEndPos = newAbsoluteStartPos + skill.counts - 1;

          if (skillEndPos < totalAvailablePositions) {
            // Calculate new line and start count
            const newLineIndex = Math.floor(newAbsoluteStartPos / 8);
            const newStartCount = (newAbsoluteStartPos % 8) + 1;

            setPlacedSkills((prev) =>
              prev.map((ps) =>
                ps.id === selectedSkillId
                  ? { ...ps, lineIndex: newLineIndex, startCount: newStartCount }
                  : ps,
              ),
            );
          }
          e.preventDefault();
        }

        if (e.key === keyboardSettings.moveUp) {
          if (selectedSkill.lineIndex > 0) {
            setPlacedSkills((prev) =>
              prev.map((ps) =>
                ps.id === selectedSkillId
                  ? { ...ps, lineIndex: ps.lineIndex - 1 }
                  : ps,
              ),
            );
          }
          e.preventDefault();
        }

        if (e.key === keyboardSettings.moveDown) {
          if (selectedSkill.lineIndex < totalLines - 1) {
            setPlacedSkills((prev) =>
              prev.map((ps) =>
                ps.id === selectedSkillId
                  ? { ...ps, lineIndex: ps.lineIndex + 1 }
                  : ps,
              ),
            );
          }
          e.preventDefault();
        }
      }

      // Advanced keyboard shortcuts for bulk skill movement
      if (selectedSkillId && e.shiftKey && !e.altKey && !e.ctrlKey) {
        // Shift + Arrow keys: Move selected skill and all skills after it
        const selectedSkill = placedSkills.find(
          (ps) => ps.id === selectedSkillId,
        );
        if (!selectedSkill) return;

        const totalLines = Math.ceil(((config.length * config.bpm) / 60 / 8));

        if (e.key === keyboardSettings.moveLeft) {
          // Check if we can move left - calculate absolute positions for all affected skills
          const skillsToMove = placedSkills.filter(
            (ps) =>
              ps.lineIndex > selectedSkill.lineIndex ||
              (ps.lineIndex === selectedSkill.lineIndex &&
                ps.startCount > selectedSkill.startCount),
          );

          // Check if all skills to move can be moved left by calculating their new absolute positions
          const canMoveLeft = skillsToMove.every((ps) => {
            const skill = skills.find((s) => s.id === ps.skillId);
            if (!skill) return false;

            // Calculate absolute start position (0-indexed)
            const absoluteStartPos = ps.lineIndex * 8 + ps.startCount - 1;
            const newAbsoluteStartPos = absoluteStartPos - 1;

            // Must be within bounds
            return newAbsoluteStartPos >= 0;
          });

          if (canMoveLeft) {
            setPlacedSkills((prev) =>
              prev.map((ps) => {
                if (skillsToMove.some((stm) => stm.id === ps.id)) {
                  // Calculate absolute start position (0-indexed)
                  const absoluteStartPos = ps.lineIndex * 8 + ps.startCount - 1;
                  const newAbsoluteStartPos = absoluteStartPos - 1;

                  // Calculate new line and start count
                  const newLineIndex = Math.floor(newAbsoluteStartPos / 8);
                  const newStartCount = (newAbsoluteStartPos % 8) + 1;

                  return {
                    ...ps,
                    lineIndex: newLineIndex,
                    startCount: newStartCount,
                  };
                }
                return ps;
              }),
            );
          }
          e.preventDefault();
        }

        if (e.key === keyboardSettings.moveRight) {
          // Check if we can move right - calculate absolute positions for all affected skills
          const skillsToMove = placedSkills.filter(
            (ps) =>
              ps.lineIndex > selectedSkill.lineIndex ||
              (ps.lineIndex === selectedSkill.lineIndex &&
                ps.startCount > selectedSkill.startCount),
          );

          // Check if all skills to move can be moved right by calculating their new absolute end positions
          const canMoveRight = skillsToMove.every((ps) => {
            const skill = skills.find((s) => s.id === ps.skillId);
            if (!skill) return false;

            // Calculate absolute start position (0-indexed) and new position
            const absoluteStartPos = ps.lineIndex * 8 + ps.startCount - 1;
            const newAbsoluteStartPos = absoluteStartPos + 1;

            // Calculate total available positions
            const totalAvailablePositions = totalLines * 8;
            const skillEndPos = newAbsoluteStartPos + skill.counts - 1;

            // Must not exceed total available positions
            return skillEndPos < totalAvailablePositions;
          });

          if (canMoveRight) {
            setPlacedSkills((prev) =>
              prev.map((ps) => {
                if (skillsToMove.some((stm) => stm.id === ps.id)) {
                  // Calculate absolute start position (0-indexed) and new position
                  const absoluteStartPos = ps.lineIndex * 8 + ps.startCount - 1;
                  const newAbsoluteStartPos = absoluteStartPos + 1;

                  // Calculate new line and start count
                  const newLineIndex = Math.floor(newAbsoluteStartPos / 8);
                  const newStartCount = (newAbsoluteStartPos % 8) + 1;

                  return {
                    ...ps,
                    lineIndex: newLineIndex,
                    startCount: newStartCount,
                  };
                }
                return ps;
              }),
            );
          }
          e.preventDefault();
        }

        if (e.key === keyboardSettings.moveUp) {
          // Check if all skills to move can actually move up (not in first line)
          const skillsToMove = placedSkills.filter(
            (ps) =>
              ps.lineIndex > selectedSkill.lineIndex ||
              (ps.lineIndex === selectedSkill.lineIndex &&
                ps.startCount > selectedSkill.startCount),
          );

          const canAllSkillsMoveUp = skillsToMove.every((ps) => ps.lineIndex > 0);

          if (canAllSkillsMoveUp) {
            setPlacedSkills((prev) =>
              prev.map((ps) =>
                skillsToMove.some((stm) => stm.id === ps.id)
                  ? { ...ps, lineIndex: ps.lineIndex - 1 }
                  : ps,
              ),
            );
          }
          e.preventDefault();
        }

        if (e.key === keyboardSettings.moveDown) {
          // Check if all skills to move can actually move down (not in last line)
          const skillsToMove = placedSkills.filter(
            (ps) =>
              ps.lineIndex > selectedSkill.lineIndex ||
              (ps.lineIndex === selectedSkill.lineIndex &&
                ps.startCount > selectedSkill.startCount),
          );

          const canAllSkillsMoveDown = skillsToMove.every(
            (ps) => ps.lineIndex < totalLines - 1,
          );

          if (canAllSkillsMoveDown) {
            setPlacedSkills((prev) =>
              prev.map((ps) =>
                skillsToMove.some((stm) => stm.id === ps.id)
                  ? { ...ps, lineIndex: ps.lineIndex + 1 }
                  : ps,
              ),
            );
          }
          e.preventDefault();
        }
      }

      if (selectedSkillId && e.shiftKey && e.altKey) {
        // Shift + Alt + Arrow keys: Move selected skill and all skills before it
        const selectedSkill = placedSkills.find(
          (ps) => ps.id === selectedSkillId,
        );
        if (!selectedSkill) return;

        const totalLines = Math.ceil(((config.length * config.bpm) / 60 / 8));

        if (e.key === keyboardSettings.moveLeft) {
          // Check if we can move left - calculate absolute positions for all affected skills
          const skillsToMove = placedSkills.filter(
            (ps) =>
              ps.lineIndex < selectedSkill.lineIndex ||
              (ps.lineIndex === selectedSkill.lineIndex &&
                ps.startCount < selectedSkill.startCount),
          );

          // Check if all skills to move can be moved left by calculating their new absolute positions
          const canMoveLeft = skillsToMove.every((ps) => {
            const skill = skills.find((s) => s.id === ps.skillId);
            if (!skill) return false;

            // Calculate absolute start position (0-indexed)
            const absoluteStartPos = ps.lineIndex * 8 + ps.startCount - 1;
            const newAbsoluteStartPos = absoluteStartPos - 1;

            // Must be within bounds
            return newAbsoluteStartPos >= 0;
          });

          if (canMoveLeft) {
            setPlacedSkills((prev) =>
              prev.map((ps) => {
                if (skillsToMove.some((stm) => stm.id === ps.id)) {
                  // Calculate absolute start position (0-indexed)
                  const absoluteStartPos = ps.lineIndex * 8 + ps.startCount - 1;
                  const newAbsoluteStartPos = absoluteStartPos - 1;

                  // Calculate new line and start count
                  const newLineIndex = Math.floor(newAbsoluteStartPos / 8);
                  const newStartCount = (newAbsoluteStartPos % 8) + 1;

                  return {
                    ...ps,
                    lineIndex: newLineIndex,
                    startCount: newStartCount,
                  };
                }
                return ps;
              }),
            );
          }
          e.preventDefault();
        }

        if (e.key === keyboardSettings.moveRight) {
          // Check if we can move right - calculate absolute positions for all affected skills
          const skillsToMove = placedSkills.filter(
            (ps) =>
              ps.lineIndex < selectedSkill.lineIndex ||
              (ps.lineIndex === selectedSkill.lineIndex &&
                ps.startCount < selectedSkill.startCount),
          );

          // Check if all skills to move can be moved right by calculating their new absolute end positions
          const canMoveRight = skillsToMove.every((ps) => {
            const skill = skills.find((s) => s.id === ps.skillId);
            if (!skill) return false;

            // Calculate absolute start position (0-indexed) and new position
            const absoluteStartPos = ps.lineIndex * 8 + ps.startCount - 1;
            const newAbsoluteStartPos = absoluteStartPos + 1;

            // Calculate total available positions
            const totalAvailablePositions = totalLines * 8;
            const skillEndPos = newAbsoluteStartPos + skill.counts - 1;

            // Must not exceed total available positions
            return skillEndPos < totalAvailablePositions;
          });

          if (canMoveRight) {
            setPlacedSkills((prev) =>
              prev.map((ps) => {
                if (skillsToMove.some((stm) => stm.id === ps.id)) {
                  // Calculate absolute start position (0-indexed) and new position
                  const absoluteStartPos = ps.lineIndex * 8 + ps.startCount - 1;
                  const newAbsoluteStartPos = absoluteStartPos + 1;

                  // Calculate new line and start count
                  const newLineIndex = Math.floor(newAbsoluteStartPos / 8);
                  const newStartCount = (newAbsoluteStartPos % 8) + 1;

                  return {
                    ...ps,
                    lineIndex: newLineIndex,
                    startCount: newStartCount,
                  };
                }
                return ps;
              }),
            );
          }
          e.preventDefault();
        }

        if (e.key === keyboardSettings.moveUp) {
          // Check if all skills to move can actually move up (not in first line)
          const skillsToMove = placedSkills.filter(
            (ps) =>
              ps.lineIndex < selectedSkill.lineIndex ||
              (ps.lineIndex === selectedSkill.lineIndex &&
                ps.startCount < selectedSkill.startCount),
          );

          const canAllSkillsMoveUp = skillsToMove.every((ps) => ps.lineIndex > 0);

          if (canAllSkillsMoveUp) {
            setPlacedSkills((prev) =>
              prev.map((ps) =>
                skillsToMove.some((stm) => stm.id === ps.id)
                  ? { ...ps, lineIndex: ps.lineIndex - 1 }
                  : ps,
              ),
            );
          }
          e.preventDefault();
        }

        if (e.key === keyboardSettings.moveDown) {
          // Check if all skills to move can actually move down (not in last line)
          const skillsToMove = placedSkills.filter(
            (ps) =>
              ps.lineIndex < selectedSkill.lineIndex ||
              (ps.lineIndex === selectedSkill.lineIndex &&
                ps.startCount < selectedSkill.startCount),
          );

          const canAllSkillsMoveDown = skillsToMove.every(
            (ps) => ps.lineIndex < totalLines - 1,
          );

          if (canAllSkillsMoveDown) {
            setPlacedSkills((prev) =>
              prev.map((ps) =>
                skillsToMove.some((stm) => stm.id === ps.id)
                  ? { ...ps, lineIndex: ps.lineIndex + 1 }
                  : ps,
              ),
            );
          }
          e.preventDefault();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    selectedLine,
    config,
    autoFollow,
    positionIcons,
    selectedSkillId,
    placedSkills,
    keyboardSettings,
    setSelectedLine,
    setAutoFollow,
    setPositionIcons,
    setPlacedSkills,
    setSelectedSkillId,
    handleUndoLine,
    handleRedoLine,
    handleRemoveSkill,
    skills,
  ]);
};
