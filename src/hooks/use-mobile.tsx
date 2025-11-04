import * as React from "react";

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    // Check for touch capability instead of screen width
    const hasTouchCapability =
      navigator.maxTouchPoints > 0 ||
      'ontouchstart' in window ||
      window.matchMedia('(pointer: coarse)').matches;

    setIsMobile(hasTouchCapability);
  }, []);

  return !!isMobile;
}
