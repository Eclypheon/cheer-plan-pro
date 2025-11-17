import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { RoutineConfig } from "@/types/routine";

interface RoutineConfigModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  config: RoutineConfig;
  updateLength: (length: number) => void;
  updateBpm: (bpm: number) => void;
  updateCategory: (category: RoutineConfig["category"]) => void;
  updateStartCountOffset: (offset: number) => void;
}

export const RoutineConfigModal = ({
  isOpen,
  onOpenChange,
  config,
  updateLength,
  updateBpm,
  updateCategory,
  updateStartCountOffset,
}: RoutineConfigModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Routine Configuration</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="length" className="text-right">
              Length
            </Label>
            <Select
              value={config.length.toString()}
              onValueChange={(v) => updateLength(parseInt(v))}
            >
              <SelectTrigger className="col-span-3">
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

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="bpm" className="text-right">
              BPM
            </Label>
            <Input
              id="bpm"
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
              className="col-span-3"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="category" className="text-right">
              Category
            </Label>
            <Select
              value={config.category}
              onValueChange={(v) => updateCategory(v as RoutineConfig["category"])}
            >
              <SelectTrigger className="col-span-3">
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

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="startCount" className="text-right">
              Start at 5th Count
            </Label>
            <div className="col-span-3 flex items-center space-x-2">
              <Switch
                id="startCount"
                checked={config.startCountOffset === 4}
                onCheckedChange={(checked) => updateStartCountOffset(checked ? 4 : 0)}
              />
              <Label htmlFor="startCount" className="text-sm text-muted-foreground">
                {config.startCountOffset === 4 ? "Enabled" : "Disabled"}
              </Label>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
