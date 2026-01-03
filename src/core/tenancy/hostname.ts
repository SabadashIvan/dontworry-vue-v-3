/**
 * Normalize hostname values from env/config or user input.
 * Strips scheme, port, and path while lowercasing.
 */
export function normalizeHostname(value: string): string {
  const trimmed = value.trim().toLowerCase()
  const withoutScheme = trimmed.replace(/^[a-z]+:\/\//, '')
  const hostWithPort = withoutScheme.split('/')[0] || ''
  return hostWithPort.split(':')[0] || ''
}
