"use client";

import React from "react";

interface IOSCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  padding?: "none" | "sm" | "md" | "lg";
}

export function IOSCard({
  children,
  className = "",
  onClick,
  padding = "md",
}: IOSCardProps) {
  const paddingStyles = {
    none: "",
    sm: "p-3",
    md: "p-4",
    lg: "p-6",
  };

  const Component = onClick ? "button" : "div";

  return (
    <Component
      onClick={onClick}
      className={`
        bg-white dark:bg-background-dark-secondary
        rounded-ios-card shadow-ios-card
        ${paddingStyles[padding]}
        ${
          onClick
            ? "w-full text-left active:scale-[0.98] transition-transform duration-150"
            : ""
        }
        ${className}
      `}
    >
      {children}
    </Component>
  );
}

// Card with header
interface IOSCardHeaderProps {
  title: string;
  subtitle?: string;
  trailing?: React.ReactNode;
  children: React.ReactNode;
}

export function IOSCardWithHeader({
  title,
  subtitle,
  trailing,
  children,
}: IOSCardHeaderProps) {
  return (
    <IOSCard padding="none">
      <div className="flex items-center justify-between px-4 py-3 border-b border-ios-gray-5 dark:border-gray-800">
        <div>
          <h3 className="text-ios-headline">{title}</h3>
          {subtitle && (
            <p className="text-ios-footnote text-ios-gray-1">{subtitle}</p>
          )}
        </div>
        {trailing}
      </div>
      <div className="p-4">{children}</div>
    </IOSCard>
  );
}
