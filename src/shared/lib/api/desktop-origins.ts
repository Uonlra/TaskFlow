const packagedDesktopOrigin = "app://taskflow";

export function isAllowedDesktopOrigin(origin: string | null) {
  if (!origin) return false;
  if (origin === packagedDesktopOrigin) return true;

  return (process.env.DESKTOP_ALLOWED_ORIGINS ?? "")
    .split(",")
    .some((allowedOrigin) => allowedOrigin.trim() === origin);
}
