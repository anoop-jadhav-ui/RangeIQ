"use client";

import React from "react";
import { NavigationBar } from "@/components/ui";

interface AppHeaderProps {
  /** Custom title - defaults to "RangeIQ" */
  title?: string;
  /** Show back button instead of branding */
  showBackButton?: boolean;
  /** Callback when back button is pressed */
  onBack?: () => void;
  /** Right side button element */
  rightButton?: React.ReactNode;
}

export function AppHeader({
  title = "RangeIQ",
  showBackButton = false,
  onBack,
  rightButton,
}: AppHeaderProps) {
  // If showing back button, use standard nav without branding
  if (showBackButton) {
    return (
      <NavigationBar
        title={title}
        showBackButton
        onBack={onBack}
        rightButton={rightButton}
      />
    );
  }

  // Default: show branded header
  return (
    <NavigationBar
      title="RangeIQ"
      largeTitle
      showBranding
      rightButton={rightButton}
    />
  );
}
