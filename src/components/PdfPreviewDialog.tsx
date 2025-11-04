import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface PdfPreviewDialogProps {
  showPdfPreview: boolean;
  pdfBlobUrl: string | null;
  setShowPdfPreview: (show: boolean) => void;
}

export const PdfPreviewDialog = ({
  showPdfPreview,
  pdfBlobUrl,
  setShowPdfPreview,
}: PdfPreviewDialogProps) => {
  return (
    <Dialog open={showPdfPreview} onOpenChange={setShowPdfPreview}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>PDF Preview</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center space-y-4">
          {pdfBlobUrl && (
            <object
              data={pdfBlobUrl}
              type="application/pdf"
              className="w-full h-[600px] border rounded"
              title="PDF Preview"
            >
              <p>
                Your browser doesn't support PDF preview.{" "}
                <a href={pdfBlobUrl} download="routine.pdf">
                  Download the PDF
                </a>{" "}
                instead.
              </p>
            </object>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowPdfPreview(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (pdfBlobUrl) {
                const a = document.createElement("a");
                a.href = pdfBlobUrl;
                a.download = "routine.pdf";
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                setShowPdfPreview(false);
              }
            }}
          >
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
