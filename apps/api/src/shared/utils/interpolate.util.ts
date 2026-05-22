export function interpolate(
  template: string,
  variables: Record<string, string | null | undefined>,
): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key) => {
    const value = variables[key];
    return value != null ? value : match;
  });
}

export function extractVariables(template: string): string[] {
  const matches = template.matchAll(/\{\{\s*(\w+)\s*\}\}/g);
  const variables = new Set<string>();
  for (const match of matches) {
    variables.add(match[1]);
  }
  return Array.from(variables);
}

export function hasUnsubscribeLink(html: string): boolean {
  return /\{\{\s*unsubscribeUrl\s*\}\}|href\s*=\s*["'][^"']*unsubscribe[^"']*["']/i.test(html);
}
