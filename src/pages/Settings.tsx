import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { KeyboardSettings } from "@/types/routine";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const defaultSettings: KeyboardSettings = {
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
  altMoveLeft: "a",
  altMoveRight: "d",
  altMoveUp: "w",
  altMoveDown: "s",
};

export default function Settings() {
  const [settings, setSettings] = useState<KeyboardSettings>(() => {
    const saved = localStorage.getItem("keyboardSettings");
    return saved ? JSON.parse(saved) : defaultSettings;
  });

  const handleSave = () => {
    localStorage.setItem("keyboardSettings", JSON.stringify(settings));
    alert("Settings saved!");
  };

  const handleReset = () => {
    setSettings(defaultSettings);
    localStorage.setItem("keyboardSettings", JSON.stringify(defaultSettings));
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-4">
          <Link to="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Builder
            </Button>
          </Link>
        </div>

        <Card className="p-6">
          <h1 className="text-2xl font-bold mb-6">Keyboard Settings</h1>

          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold mb-3">Position Sheet Navigation</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Next Line</Label>
                  <Input
                    value={settings.nextLine}
                    onChange={(e) => setSettings({ ...settings, nextLine: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Previous Line</Label>
                  <Input
                    value={settings.prevLine}
                    onChange={(e) => setSettings({ ...settings, prevLine: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-3">Position Sheet Controls</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Undo (Ctrl +)</Label>
                  <Input
                    value={settings.undo}
                    onChange={(e) => setSettings({ ...settings, undo: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Redo (Ctrl +)</Label>
                  <Input
                    value={settings.redo}
                    onChange={(e) => setSettings({ ...settings, redo: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Toggle Auto-Follow</Label>
                  <Input
                    value={settings.toggleAutoFollow}
                    onChange={(e) => setSettings({ ...settings, toggleAutoFollow: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Delete Icon</Label>
                  <Input
                    value={settings.deleteIcon}
                    onChange={(e) => setSettings({ ...settings, deleteIcon: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-3">Count Sheet Navigation</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Move Left (1 count)</Label>
                  <Input
                    value={settings.moveLeft}
                    onChange={(e) => setSettings({ ...settings, moveLeft: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Move Right (1 count)</Label>
                  <Input
                    value={settings.moveRight}
                    onChange={(e) => setSettings({ ...settings, moveRight: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Move Up (8 counts)</Label>
                  <Input
                    value={settings.moveUp}
                    onChange={(e) => setSettings({ ...settings, moveUp: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Move Down (8 counts)</Label>
                  <Input
                    value={settings.moveDown}
                    onChange={(e) => setSettings({ ...settings, moveDown: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Alt Move Left (A)</Label>
                  <Input
                    value={settings.altMoveLeft}
                    onChange={(e) => setSettings({ ...settings, altMoveLeft: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Alt Move Right (D)</Label>
                  <Input
                    value={settings.altMoveRight}
                    onChange={(e) => setSettings({ ...settings, altMoveRight: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Alt Move Up (W)</Label>
                  <Input
                    value={settings.altMoveUp}
                    onChange={(e) => setSettings({ ...settings, altMoveUp: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Alt Move Down (S)</Label>
                  <Input
                    value={settings.altMoveDown}
                    onChange={(e) => setSettings({ ...settings, altMoveDown: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={handleSave}>Save Settings</Button>
              <Button variant="outline" onClick={handleReset}>
                Reset to Defaults
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
