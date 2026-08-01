import React from "react";
import { View, Text, TextInput, TextInputProps, ViewStyle } from "react-native";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  className?: string;
  inputClassName?: string;
  containerStyle?: ViewStyle;
  icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  className = "",
  inputClassName = "",
  containerStyle,
  icon,
  ...props
}) => {
  return (
    <View className={`w-full space-y-1.5 ${className}`} style={containerStyle}>
      {label ? (
        <Text className="text-xs font-semibold text-slate-300">
          {label}
        </Text>
      ) : null}
      
      <View className="relative flex-row items-center">
        {icon ? (
          <View className="absolute left-4 z-10">
            {icon}
          </View>
        ) : null}
        
        <TextInput
          placeholderTextColor="#64748b" // slate-500
          className={`w-full rounded-xl border bg-slate-950 px-4 py-3 text-sm font-medium text-white outline-none transition-all ${
            icon ? "pl-11" : ""
          } ${
            error 
              ? "border-rose-600 focus:border-rose-500 focus:ring-1 focus:ring-rose-500" 
              : "border-slate-800 focus:border-primary focus:ring-1 focus:ring-primary"
          } ${inputClassName}`}
          {...props}
        />
      </View>

      {error ? (
        <Text className="text-xs font-semibold text-rose-500 mt-1">
          {error}
        </Text>
      ) : null}
    </View>
  );
};
