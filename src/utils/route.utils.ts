/** Express route param helper */
export function param(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}
