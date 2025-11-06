import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface AboutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AboutModal = ({ open, onOpenChange }: AboutModalProps) => {
  const [currentPage, setCurrentPage] = useState(1);

  const nextPage = () => setCurrentPage(Math.min(currentPage + 1, 3));
  const prevPage = () => setCurrentPage(Math.max(currentPage - 1, 1));

  const handleClose = () => {
    onOpenChange(false);
    setCurrentPage(1); // Reset to first page when closing
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center justify-between">
            <span>
              {currentPage === 1 ? "Keyboard Shortcuts" :
               currentPage === 2 ? "How to Use the App" : "About Cheer Routine Builder"}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={prevPage}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                {currentPage} / 3
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={nextPage}
                disabled={currentPage === 3}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {currentPage === 1 ? (
            <Card className="p-6 space-y-4">
              <section>
                <h2 className="text-2xl font-semibold mb-3">Skill Movement</h2>
                <div className="space-y-3 text-muted-foreground">
                  <div className="flex items-center gap-3">
                    <kbd className="px-2 py-1 bg-muted rounded text-sm">A</kbd>
                    <span>Select previous skill</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <kbd className="px-2 py-1 bg-muted rounded text-sm">D</kbd>
                    <span>Select next skill</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <kbd className="px-2 py-1 bg-muted rounded text-sm">↑↓←→</kbd>
                    <span>Move selected skill</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <kbd className="px-2 py-1 bg-muted rounded text-sm">Shift</kbd> + <kbd className="px-2 py-1 bg-muted rounded text-sm">↑↓←→</kbd>
                    <span>Move selected skill and all skills after it</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <kbd className="px-2 py-1 bg-muted rounded text-sm">Shift</kbd> + <kbd className="px-2 py-1 bg-muted rounded text-sm">Alt</kbd> + <kbd className="px-2 py-1 bg-muted rounded text-sm">↑↓←→</kbd>
                    <span>Move selected skill and all skills before it</span>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">Editing</h2>
                <div className="space-y-3 text-muted-foreground">
                  <div className="flex items-center gap-3">
                    <kbd className="px-2 py-1 bg-muted rounded text-sm">Delete</kbd>
                    <span>Delete selected skill or position icon</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <kbd className="px-2 py-1 bg-muted rounded text-sm">Z</kbd>
                    <span>Undo last action</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <kbd className="px-2 py-1 bg-muted rounded text-sm">Y</kbd>
                    <span>Redo last undone action</span>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">Navigation</h2>
                <div className="space-y-3 text-muted-foreground">
                  <div className="flex items-center gap-3">
                    <kbd className="px-2 py-1 bg-muted rounded text-sm">F</kbd>
                    <span>Toggle Propogate Changes</span>
                  </div>
                </div>
              </section>
            </Card>
          ) : currentPage === 2 ? (
            <Card className="p-6 space-y-4">
              <section>
                <h2 className="text-2xl font-semibold mb-3">Tips</h2>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <p>- Propagate Changes transmit changes made to all following lines</p>
                  <p>- Export PDF only exports unique positions</p>
                  <p>- Edit counts directly on count sheet by dragging the handles of placed skills</p>
                  <p>- Select placed skill or icon and press <kbd className="px-1 py-0.5 bg-muted rounded text-sm">Delete</kbd> to delete them.</p>
                  <p>- Select placed skill and use arrow keys to move them</p>
                  <p>- Use <kbd className="px-1 py-0.5 bg-muted rounded text-sm">Shift</kbd> + arrow keys to move a selected skill and all skills after it</p>
                  <p>- Use <kbd className="px-1 py-0.5 bg-muted rounded text-sm">Shift</kbd> + <kbd className="px-1 py-0.5 bg-muted rounded text-sm">Alt</kbd> arrow keys to move a selected skill and before it</p>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">How to Use</h2>
                <div className="space-y-4 text-muted-foreground">
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">1. Configure Your Routine</h3>
                    <p>Set the routine length, category (Partner/Group/Team), level, and BPM at the top of the builder.</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">2. Add Skills</h3>
                    <p>Browse the skills library on the left. Drag skills from the library onto the count sheet.</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">3. Customize Skills</h3>
                    <p>Click on skill counts in the library to edit them. Add custom skills as needed.</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">4. Reposition and Delete</h3>
                    <p>To delete, drag a skill to the trash bin that appears at the left of the screen.</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">5. Position Mapping (Team Categories Only)</h3>
                    <p>For Team Categories, double-click icons to assign names. Click the icons in the toolbar to add new people.</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">6. Export</h3>
                    <p>Export your routine to PDF.</p>
                  </div>
                </div>
              </section>
            </Card>
          ) : (
            <Card className="p-6 space-y-4">
              <section>
                <h2 className="text-2xl font-semibold mb-3">What is this app?</h2>
                <p className="text-muted-foreground">
                  The Cheerleading Routine Builder is a comprehensive tool designed to help cheerleading coaches and athletes
                  plan, visualize, and organize their routines. Built specifically for competitive cheerleading, it supports
                  Partner Stunts, Group Stunts, and Team routines (16 and 24 members).
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">Key Features</h2>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>Drag-and-drop skill placement on an 8-count system</li>
                  <li>Customizable skills library with pre-loaded skills across all categories</li>
                  <li>Visual position mapping for team routines on a 9-mat layout</li>
                  <li>BPM-based automatic count calculation</li>
                  <li>PDF export for count sheets and position diagrams</li>
                  <li>CSV import/export for skills management</li>
                  <li>Dark mode support for comfortable viewing</li>
                </ul>
              </section>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AboutModal;
