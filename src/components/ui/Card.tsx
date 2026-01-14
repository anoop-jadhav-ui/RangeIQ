"use client";

import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  padding?: "none" | "sm" | "md" | "lg";
}

export function Card({
  children,
  className = "",
  onClick,
  padding = "md",
}: CardProps) {
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
        rounded-2xl shadow-sm
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
interface CardWithHeaderProps {
  title: string;
  subtitle?: string;
  trailing?: React.ReactNode;
  children: React.ReactNode;
}

export function CardWithHeader({
  title,
  subtitle,
  trailing,
  children,
}: CardWithHeaderProps) {
  return (
    <Card padding="none">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <div>
          <h3 className="text-base font-semibold">{title}</h3>
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
        </div>
        {trailing}
      </div>
      <div className="p-4">{children}</div>
    </Card>
  );
}
