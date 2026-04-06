export function parseTagsInput(value?: string) {
  if (!value) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .split(/[，,]/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

export function formatTagsInput(tags?: string[]) {
  return tags?.join("，") ?? "";
}
