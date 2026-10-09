import styles from "./StudentWorkspace.module.css";

// Keep presentation class names readable in existing views while scoping the
// entire V2 learning interface. Tailwind utility classes pass through unchanged.
export function studentClassName(value: string): string {
  return value.split(/\s+/).filter(Boolean).map((name) => styles[name] ?? name).join(" ");
}
