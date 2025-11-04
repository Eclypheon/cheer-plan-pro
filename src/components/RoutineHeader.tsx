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
            <Button variant="destructive" size="sm" onClick={handleReset}>
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Link to="/settings">
              <Button variant="outline" size="sm">
                <SettingsIcon className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/skills-editor">
              <Button variant="outline" size="sm">
                <Library className="h-4 w-4 mr-1" />
                Skills Editor
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPDF}
              disabled={isGeneratingPdf}
            >
              <Download className="h-4 w-4 mr-1" />
              {isGeneratingPdf ? "Generating..." : "Export PDF"}
            </Button>
            <ThemeToggle />
          </div>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-1">
          <Label className="text-xs">Length:</Label>
          <Select
            value={config.length.toString()}
            onValueChange={(v) => updateLength(parseInt(v))}
          >
            <SelectTrigger className="w-20 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="60">1:00</SelectItem>
              <SelectItem value="90">1:30</SelectItem>
              <SelectItem value="120">2:00</SelectItem>
              <SelectItem value="135">2:15</SelectItem>
              <SelectItem value="150">2:30</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1">
          <Label className="text-xs">BPM:</Label>
          <Input
            type="number"
            min="120"
            max="160"
            value={config.bpm}
            onChange={(e) => {
              const bpm = parseInt(e.target.value);
              if (!isNaN(bpm) && bpm >= 120 && bpm <= 160) {
                updateBpm(bpm);
              }
            }}
            className="w-[80px] h-8"
          />
        </div>

        <div className="flex items-center gap-1">
          <Label className="text-xs">Cat:</Label>
          <Select
            value={config.category}
            onValueChange={(v) =>
              updateCategory(v as any)
            }
          >
            <SelectTrigger className="w-36 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="partner-stunts">Partner Stunts</SelectItem>
              <SelectItem value="group-stunts">Group Stunts</SelectItem>
              <SelectItem value="team-16">Team (16)</SelectItem>
              <SelectItem value="team-24">Team (24)</SelectItem>
            </SelectContent>
          </Select>
        </div>

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
      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 z-10">
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
