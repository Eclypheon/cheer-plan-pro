import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Smartphone, Download } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [supportsPWAInstall, setSupportsPWAInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  // Check if app is already installed as PWA
  const checkIfInstalled = () => {
    // Check for standalone mode (iOS Safari)
    const isIOSStandalone = 'standalone' in window.navigator && (window.navigator as any).standalone === true;

    // Check for standalone display mode (modern browsers)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

    const installed = isIOSStandalone || isStandalone;

    console.log('PWAInstallPrompt: Installation check', {
      isIOSStandalone,
      isStandalone,
      installed
    });

    return installed;
  };

  useEffect(() => {
    console.log('PWAInstallPrompt: Component mounted');

    // Check if already installed first
    const alreadyInstalled = checkIfInstalled();
    setIsInstalled(alreadyInstalled);

    if (alreadyInstalled) {
      console.log('PWAInstallPrompt: App is already installed, not showing prompt');
      return;
    }

    // Check if device supports PWA installation (touch devices including tablets)
    const checkSupportsPWAInstall = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const touchDeviceKeywords = ['android', 'webos', 'iphone', 'ipad', 'ipod', 'blackberry', 'windows phone'];
      const hasTouchDeviceKeyword = touchDeviceKeywords.some(keyword => userAgent.includes(keyword));
      const hasTouch = 'ontouchstart' in window;
      // Include tablets by not limiting to small screens - tablets can be larger than 768px
      const isTouchDevice = hasTouchDeviceKeyword || hasTouch;

      console.log('PWAInstallPrompt: PWA support detection', {
        userAgent: navigator.userAgent,
        hasTouchDeviceKeyword,
        hasTouch,
        isTouchDevice
      });

      setSupportsPWAInstall(isTouchDevice);
      return isTouchDevice;
    };

    const supportsPWA = checkSupportsPWAInstall();
    window.addEventListener('resize', checkSupportsPWAInstall);

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      console.log('PWAInstallPrompt: beforeinstallprompt event fired', e);
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e);
      // Show the install prompt immediately for touch devices
      if (supportsPWA) {
        console.log('PWAInstallPrompt: Showing install prompt for touch device');
        setShowPrompt(true);
      } else {
        console.log('PWAInstallPrompt: Not showing prompt - device does not support PWA install');
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // For testing - show prompt after 5 seconds if on touch device and no beforeinstallprompt fired
    if (supportsPWA) {
      setTimeout(() => {
        if (!deferredPrompt && !localStorage.getItem('pwa-install-dismissed')) {
          console.log('PWAInstallPrompt: No beforeinstallprompt event, showing manual prompt for testing');
          setShowPrompt(true);
        }
      }, 5000);
    }

    return () => {
      window.removeEventListener('resize', checkSupportsPWAInstall);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Use native install prompt if available
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User ${outcome} the install prompt`);
      setDeferredPrompt(null);
    } else {
      // Fallback: Show instructions for manual installation
      alert('To install this app:\n\n1. Tap the share button in your browser\n2. Select "Add to Home Screen"\n3. Tap "Add"');
    }
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Store dismissal in localStorage to not show again
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  // Don't show if device doesn't support PWA install, already installed, already dismissed, or no prompt available
  if (!supportsPWAInstall || isInstalled || !showPrompt || localStorage.getItem('pwa-install-dismissed')) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50">
      <div className="bg-primary text-primary-foreground rounded-lg p-4 shadow-lg border">
        <div className="flex items-start gap-3">
          <Smartphone className="h-6 w-6 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm mb-1">Install CheerPlan Pro</h3>
            <p className="text-xs opacity-90 mb-3">
              Add to your home screen for the best experience with offline access and native app feel.
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleInstallClick}
                className="flex-1 h-8 text-xs"
              >
                <Download className="h-3 w-3 mr-1" />
                Install App
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="h-8 w-8 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
