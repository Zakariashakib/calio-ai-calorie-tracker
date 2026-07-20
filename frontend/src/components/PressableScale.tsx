import { PropsWithChildren } from "react";
import { Pressable, PressableProps, StyleProp, ViewStyle } from "react-native";

type Props = PropsWithChildren<PressableProps & { style?: StyleProp<ViewStyle> }>;

export function PressableScale({ children, style, disabled, ...props }: Props) {
  return (
    <Pressable
      disabled={disabled}
      style={({ pressed }) => [style, pressed && !disabled ? { opacity: 0.82, transform: [{ scale: 0.98 }] } : null, disabled ? { opacity: 0.5 } : null]}
      {...props}
    >
      {children}
    </Pressable>
  );
}
