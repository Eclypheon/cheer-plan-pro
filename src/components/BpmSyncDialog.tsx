import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface BpmSyncDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  detectedBpm: number;
  currentRoutineBpm: number;
  onSync: () => void;
  onSkip: () => void;
}

export const BpmSyncDialog = ({
  isOpen,
  onOpenChange,
  detectedBpm,
  currentRoutineBpm,
  onSync,
  onSkip,
}: BpmSyncDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleSync = async () => {
    setIsLoading(true);
    try {
      await onSync();
    } finally {
      setIsLoading(false);
      onOpenChange(false);
    }
  };

  const handleSkip = () => {
    onSkip();
    onOpenChange(false);
  };

  const bpmDifference = Math.abs(detectedBpm - currentRoutineBpm);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Sync Routine BPM</DialogTitle>
          <DialogDescription>
            We detected a BPM of <strong>{detectedBpm}</strong> in your music file.
            {bpmDifference > 0 && (
              <> Your current routine BPM is <strong>{currentRoutineBpm}</strong> ({bpmDifference > 5 ? 'significant' : 'minor'} difference).</>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          <p className="text-sm text-muted-foreground">
            Would you like to update your routine's BPM to match the music?
            This will adjust the timing of all skills in your routine.
          </p>

          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={handleSkip}
              disabled={isLoading}
            >
              Keep Current BPM
            </Button>
            <Button
              onClick={handleSync}
              disabled={isLoading}
            >
              {isLoading ? "Syncing..." : `Sync to ${detectedBpm} BPM`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
