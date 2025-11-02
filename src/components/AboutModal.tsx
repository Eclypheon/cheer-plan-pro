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

  const nextPage = () => setCurrentPage(2);
  const prevPage = () => setCurrentPage(1);

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
              {currentPage === 1 ? "How to Use the App" : "About Cheerleading Routine Builder"}
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
                {currentPage} / 2
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={nextPage}
                disabled={currentPage === 2}
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
                <h2 className="text-2xl font-semibold mb-3">How to Use</h2>
                <div className="space-y-4 text-muted-foreground">
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">1. Configure Your Routine</h3>
                    <p>Set the routine length, category (Partner/Group/Team), level, and BPM at the top of the builder.</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">2. Add Skills</h3>
                    <p>Browse the skills library on the left. Drag skills from the library onto the count sheet. Skills will span multiple counts based on their duration (1, 3, or 8 counts).</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">3. Customize Skills</h3>
                    <p>Click on skill counts in the library to edit them. Add custom skills using the form at the bottom of each category. Delete custom skills using the trash icon.</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">4. Reposition and Delete</h3>
                    <p>Drag placed skills to different positions on the count sheet. To delete, drag a skill to the trash bin that appears at the bottom of the screen.</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">5. Position Mapping (Team Categories Only)</h3>
                    <p>For Team (16) or Team (24), use the position sheet below the count sheet. Drag icons to position athletes on the mat. Click icons to assign names. Use the legend: Square = Base, Circle = Mid Tier, X = Top Fly.</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">6. Advanced Editing</h3>
                    <p>Visit the Skills Library Editor (link in header) for bulk editing of all skills in a table format.</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">7. Export</h3>
                    <p>Export your routine to PDF or export/import your skills library as CSV (Feature Pending).</p>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">Tips</h2>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>Skills that overflow a line will automatically continue onto the next line</li>
                  <li>Use the Propagate Changes toggle in position sheets to maintain consistent positioning across lines</li>
                  <li>Export PDF only exports unique positions</li>
                  <li>Edit counts directly on count sheet by dragging the handles of placed skills</li>
                  <li>Use <kbd className="px-1 py-0.5 bg-muted rounded text-sm">Shift</kbd> + arrow keys to move a selected skill and all skills after it together</li>
                  <li>Use <kbd className="px-1 py-0.5 bg-muted rounded text-sm">Shift</kbd> + <kbd className="px-1 py-0.5 bg-muted rounded text-sm">Alt</kbd> arrow keys to move a selected skill and all skills before it together</li>
                </ul>
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
                  <li>Visual position mapping for team routines on a 7-mat layout</li>
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
