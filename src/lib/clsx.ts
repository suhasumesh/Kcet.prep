/** Tiny class-name joiner; avoids a dependency for something this small. */
export default function clsx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(' ');
}
