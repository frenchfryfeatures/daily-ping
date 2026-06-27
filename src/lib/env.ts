export function envValue(key: string) {
  const value = process.env[key];
  if (!value || value.trim() === "") return undefined;
  return value;
}

export function isConfigured(key: string) {
  return Boolean(envValue(key));
}
