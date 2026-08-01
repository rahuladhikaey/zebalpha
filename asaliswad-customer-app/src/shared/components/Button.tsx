import React from "react";
import { TouchableOpacity, Text, ActivityIndicator, ViewStyle, TextStyle } from "react-native";

interface ButtonProps {
  onPress: () => void;
  title: string;
  variant?: "primary" | "secondary" | "outline" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  textClassName?: string;
  style?: ViewStyle;
}

export const Button: React.FC<ButtonProps> = ({
  onPress,
  title,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  className = "",
  textClassName = "",
  style,
}) => {
  // Variant styles mapping
  const variantStyles = {
    primary: "bg-primary active:bg-primary-hover border-transparent",
    secondary: "bg-slate-800 active:bg-slate-700 border-transparent",
    outline: "bg-transparent border border-slate-700 active:bg-slate-900/50",
    danger: "bg-rose-600 active:bg-rose-700 border-transparent",
    ghost: "bg-transparent border-transparent active:bg-slate-900/50",
  };

  // Size styles mapping
  const sizeStyles = {
    sm: "px-3 py-1.5 rounded-lg",
    md: "px-5 py-3 rounded-xl",
    lg: "px-6 py-4 rounded-2xl",
  };

  // Size text styles mapping
  const sizeTextStyles = {
    sm: "text-xs font-bold",
    md: "text-sm font-extrabold",
    lg: "text-base font-black",
  };

  // Variant text colors mapping
  const variantTextColors = {
    primary: "text-white",
    secondary: "text-slate-100",
    outline: "text-slate-300",
    danger: "text-white",
    ghost: "text-slate-400",
  };

  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      style={style}
      activeOpacity={0.8}
      className={`flex-row items-center justify-center border transition-all ${
        variantStyles[variant]
      } ${sizeStyles[size]} ${isDisabled ? "opacity-50" : ""} ${className}`}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === "outline" || variant === "ghost" ? "#10b981" : "#ffffff"}
          className="mr-2"
        />
      ) : null}
      <Text
        className={`text-center tracking-tight ${
          variantTextColors[variant]
        } ${sizeTextStyles[size]} ${textClassName}`}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
};
