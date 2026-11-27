export function getAuthReturnPath(value: string | null) {
  if (!value?.startsWith("/") || value.startsWith("//") || value.includes("\\") || /\s/.test(value))
    return "/dashboard";
  return value;
}
