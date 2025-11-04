import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface SaveRenameDialogProps {
  showRenameDialog: boolean;
  renameInput: string;
  loadedSaveStateSlot: 1 | 2 | 3 | null;
  saveNames: Record<1 | 2 | 3, string>;
  setShowRenameDialog: (show: boolean) => void;
  setRenameInput: (input: string) => void;
  handleRenameSave: () => void;
}

export const SaveRenameDialog = ({
  showRenameDialog,
  renameInput,
  loadedSaveStateSlot,
  saveNames,
  setShowRenameDialog,
  setRenameInput,
  handleRenameSave,
}: SaveRenameDialogProps) => {
  return (
    <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Rename Save Slot</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="save-name" className="text-right">
              Name
            </Label>
            <Input
              id="save-name"
              value={renameInput}
              onChange={(e) => setRenameInput(e.target.value)}
              className="col-span-3"
              placeholder="Enter save name..."
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleRenameSave();
                }
              }}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowRenameDialog(false)}>
            Cancel
          </Button>
          <Button onClick={handleRenameSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
