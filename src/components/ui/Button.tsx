"use client";

import React from "react";

interface ButtonProps {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "destructive" | "text";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
  className?: string;
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  fullWidth = false,
  disabled = false,
  onClick,
  type = "button",
  className = "",
}: ButtonProps) {
  const baseStyles =
    "font-semibold rounded-xl transition-all duration-150 active:scale-[0.98]";

  const variantStyles = {
    primary: "bg-ios-blue text-white active:bg-blue-600",
    secondary:
      "bg-gray-100 dark:bg-background-dark-tertiary text-ios-blue active:bg-gray-200",
    destructive: "bg-ios-red text-white active:bg-red-600",
    text: "bg-transparent text-ios-blue active:opacity-50",
  };

  const sizeStyles = {
    sm: "py-2 px-4 text-sm",
    md: "py-3 px-6 text-base",
    lg: "py-4 px-8 text-lg font-semibold",
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
interface TextButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  destructive?: boolean;
}

export function TextButton({
  children,
  onClick,
  disabled,
  destructive,
}: TextButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        text-base font-normal
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
interface IconButtonProps {
  icon: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "default" | "filled";
  size?: "sm" | "md" | "lg";
}

export function IconButton({
  icon,
  onClick,
  disabled,
  variant = "default",
  size = "md",
}: IconButtonProps) {
  const sizeStyles = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-12 h-12",
  };

  const variantStyles = {
    default: "text-ios-blue active:opacity-50",
    filled: "bg-ios-blue/10 text-ios-blue rounded-full active:bg-ios-blue/20",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        flex items-center justify-center
        ${sizeStyles[size]}
        ${variantStyles[variant]}
        ${disabled ? "opacity-50" : ""}
        transition-all duration-150
      `}
    >
      {icon}
    </button>
  );
}
