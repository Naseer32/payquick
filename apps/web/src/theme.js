// Shared design tokens for PayQuick. Components read them as CSS variables (--pq-*)
// that ThemeScope (components/ui.jsx) sets, so light/dark switch without re-styling.

const light = {
  bg: "#F5F6F8",
  surface: "#FFFFFF",
  sunken: "#EEF1F5",
  text: "#0F1A2B",
  muted: "#5B6778",
  border: "#DCE1E8",
  primary: "#1B55E8",
  primaryHover: "#1445C2",
  onPrimary: "#FFFFFF",
  success: "#0B7A4B",
  successBg: "#E4F5EC",
  warning: "#8A5A00",
  warningBg: "#FFF3D6",
  danger: "#B3261E",
  dangerBg: "#FDE8E6",
  info: "#1B55E8",
  infoBg: "#E8EEFF",
  focus: "#1B55E8"
};

const dark = {
  bg: "#0A0F18",
  surface: "#121926",
  sunken: "#0E141F",
  text: "#F1F5FA",
  muted: "#98A4B5",
  border: "#243044",
  primary: "#5B8DFF",
  primaryHover: "#7AA3FF",
  onPrimary: "#07101F",
  success: "#4ADE9A",
  successBg: "#0F2A21",
  warning: "#F5B94A",
  warningBg: "#2E2410",
  danger: "#FF8A80",
  dangerBg: "#331616",
  info: "#8CB0FF",
  infoBg: "#14213D",
  focus: "#8CB0FF"
};

export function getTheme(isDark) {
  return isDark ? dark : light;
}
