"use client";

import React from "react";

interface IOSButtonProps {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "destructive" | "text";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
  className?: string;
}

export function IOSButton({
  children,
  variant = "primary",
  size = "md",
  fullWidth = false,
  disabled = false,
  onClick,
  type = "button",
  className = "",
}: IOSButtonProps) {
  const baseStyles =
    "font-semibold rounded-ios-md transition-all duration-150 active:scale-[0.98]";

  const variantStyles = {
    primary: "bg-ios-blue text-white active:bg-blue-600",
    secondary:
      "bg-ios-gray-6 dark:bg-background-dark-tertiary text-ios-blue active:bg-ios-gray-5",
    destructive: "bg-ios-red text-white active:bg-red-600",
    text: "bg-transparent text-ios-blue active:opacity-50",
  };

  const sizeStyles = {
    sm: "py-2 px-4 text-ios-subhead",
    md: "py-3 px-6 text-ios-body",
    lg: "py-4 px-8 text-ios-headline",
  };

  const disabledStyles = disabled
    ? "opacity-50 cursor-not-allowed active:scale-100"
    : "";

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        ${baseStyles}
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${fullWidth ? "w-full" : ""}
        ${disabledStyles}
        ${className}
      `}
    >
      {children}
    </button>
  );
}

// Text button variant for navigation bar
interface IOSTextButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  destructive?: boolean;
}

export function IOSTextButton({
  children,
  onClick,
  disabled,
  destructive,
}: IOSTextButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        text-ios-body font-normal
        ${destructive ? "text-ios-red" : "text-ios-blue"}
        ${disabled ? "opacity-50" : "active:opacity-50"}
        transition-opacity duration-150
      `}
    >
      {children}
    </button>
  );
}

// Icon button
interface IOSIconButtonProps {
  icon: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  label?: string;
}

export function IOSIconButton({
  icon,
  onClick,
  disabled,
  label,
}: IOSIconButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`
        p-2 text-ios-blue rounded-full
        ${
          disabled
            ? "opacity-50"
            : "active:bg-ios-gray-6 dark:active:bg-gray-800"
        }
        transition-colors duration-150
      `}
    >
      {icon}
    </button>
  );
}
