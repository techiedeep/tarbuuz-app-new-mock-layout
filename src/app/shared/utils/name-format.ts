/**
 * Registration never enforced any capitalization on name input — someone
 * typing "test user" gets exactly that stored and displayed verbatim.
 * This formats for *display* only; it deliberately doesn't mutate what's
 * actually stored, so re-editing a name field still shows the person
 * their own original input rather than a silently "corrected" version
 * they never typed.
 */
export function capitalizeName(value: string | undefined | null): string {
  if (!value) return '';
  return value
    .trim()
    .split(/\s+/)
    .map((word) => (word.length > 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(' ');
}
