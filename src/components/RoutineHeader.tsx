import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Download, Info, Library, RotateCcw, Settings as SettingsIcon, Edit, Upload, Save, ChevronUp, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import { ThemeToggle } from "./ThemeToggle";
import type { RoutineConfig, SkillLevel } from "@/types/routine";

interface RoutineHeaderProps {
  config: RoutineConfig;
  saveNames: Record<1 | 2 | 3, string>;
  loadedSaveStateSlot: 1 | 2 | 3 | null;
  showAboutModal: boolean;
  updateLength: (length: number) => void;
  updateBpm: (bpm: number) => void;
  updateCategory: (category: RoutineConfig["category"]) => void;
  updateLevel: (level: SkillLevel) => void;
  handleReset: () => void;
  handleExportPDF: () => void;
  isGeneratingPdf: boolean;
  setShowAboutModal: (show: boolean) => void;
  setShowConfigModal: (show: boolean) => void;
  loadFromSlot: (slot: 1 | 2 | 3) => void;
  setShowRenameDialog: (show: boolean) => void;
  setRenameInput: (input: string) => void;
  placedSkills: any[];
  positionIcons: any[];
  notes: Record<number, string>;
  segmentNames: Record<number, string>;
  onExportData?: () => void;
  onImportData?: () => void;
}

export const RoutineHeader = ({
  config,
  saveNames,
  loadedSaveStateSlot,
  showAboutModal,
  updateLength,
  updateBpm,
  updateCategory,
  updateLevel,
  handleReset,
  handleExportPDF,
  isGeneratingPdf,
  setShowAboutModal,
  setShowConfigModal,
  loadFromSlot,
  setShowRenameDialog,
  setRenameInput,
  placedSkills,
  positionIcons,
  notes,
  segmentNames,
  onExportData,
  onImportData,
}: RoutineHeaderProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <header className="border-b bg-card p-2 relative">
      <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isCollapsed ? 'max-h-0 opacity-0 pb-0' : 'max-h-96 opacity-100 pb-2'}`}>
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-xl font-bold">Cheer Routine Builder</h1>
          <div className="flex flex-wrap gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAboutModal(true)}
            >
              <Info className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowConfigModal(true)}
              title="Routine Configuration"
            >
              <SettingsIcon className="h-4 w-4" />
            </Button>
            <Button variant="destructive" size="sm" onClick={handleReset}>
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Link to="/skills-editor">
              <Button variant="outline" size="sm">
                <Library className="h-4 w-4 mr-1" />
                Skills
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPDF}
              disabled={isGeneratingPdf}
            >
              <Download className="h-4 w-4 mr-1" />
              {isGeneratingPdf ? "Generating..." : "PDF"}
            </Button>
            <ThemeToggle />
          </div>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-1">
          <Label className="text-xs">Saves:</Label>
          <Select
            value={loadedSaveStateSlot?.toString() || "1"}
            onValueChange={(slot) => {
              const newSlot = parseInt(slot) as 1 | 2 | 3;
              // Auto-save current state before switching to new slot
              if (loadedSaveStateSlot) {
                const key = `save-state-${loadedSaveStateSlot}`;
                const data: any = {
                  placedSkills: [...placedSkills],
                  positionIcons: [...positionIcons],
                  config: { ...config },
                  notes: { ...notes },
                  segmentNames: { ...segmentNames },
                  timestamp: Date.now(),
                };
                localStorage.setItem(key, JSON.stringify(data));
              }
              // Load the new slot
              loadFromSlot(newSlot);
            }}
          >
            <SelectTrigger className="w-32 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {([1, 2, 3] as const).map((slot) => (
                <SelectItem key={slot} value={slot.toString()}>
                  {saveNames[slot]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (loadedSaveStateSlot) {
                setRenameInput(saveNames[loadedSaveStateSlot]);
                setShowRenameDialog(true);
              }
            }}
            className="h-8 w-8 p-0"
            title="Rename current save"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onExportData}
            disabled={!loadedSaveStateSlot}
            className="h-8 w-8 p-0"
            title="Export current save slot data"
          >
            <Save className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onImportData}
            disabled={!loadedSaveStateSlot}
            className="h-8 w-8 p-0"
            title="Import data to current save slot"
          >
            <Upload className="h-4 w-4" />
          </Button>
        </div>
      </div>
      </div>

      {/* Toggle button positioned at bottom border */}
      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 z-[5]">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="h-6 w-6 p-0 rounded-full bg-card border shadow-sm hover:bg-accent"
          title={isCollapsed ? "Expand header" : "Collapse header"}
        >
          {isCollapsed ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
        </Button>
      </div>
    </header>
  );
};
