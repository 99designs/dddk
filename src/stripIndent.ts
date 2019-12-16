export function stripIndent(s: string): string {
  const match = s.match(/^[^\S\n]*(?=\S)/gm);
  const indent = match && Math.min(...match.map(el => el.length));
  if (indent) {
    const regexp = new RegExp(`^.{${indent}}`, "gm");
    return s.replace(regexp, "");
  }
  return s;
}
