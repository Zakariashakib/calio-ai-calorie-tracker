import { Ionicons } from "@expo/vector-icons";
import { StyleProp, StyleSheet, TextInput, View, ViewStyle } from "react-native";

import { colors, shadows } from "@/src/theme";

type Props = {
  value?: string;
  onChangeText?: (value: string) => void;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function SearchBar({ value, onChangeText, placeholder = "Search", style, testID }: Props) {
  return (
    <View style={[styles.wrap, style]}>
      <Ionicons name="search" size={18} color={colors.faint} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.faint}
        style={styles.input}
        returnKeyType="search"
        testID={testID}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    height: 52,
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
    borderRadius: 18,
    ...shadows.subtle,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    color: colors.ink,
    paddingVertical: 0,
    ...(typeof document !== "undefined" ? ({ outlineStyle: "none" } as object) : null),
  },
});
