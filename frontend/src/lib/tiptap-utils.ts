// Extract plain text from a Tiptap JSON document for previews
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function tiptapToText(doc: any, maxLength = 200): string {
  if (!doc) return "";
  const parts: string[] = [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function walk(node: any) {
    if (node.type === "text" && node.text) {
      parts.push(node.text);
    }
    if (node.content) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      node.content.forEach((child: any) => walk(child));
    }
    if (node.type === "paragraph" || node.type === "heading") {
      parts.push(" ");
    }
  }

  walk(doc);
  const text = parts.join("").trim();
  return text.length > maxLength ? text.slice(0, maxLength) + "…" : text;
}

// Format a date relative to now for note card labels (today, yesterday, or a date string)
export function formatNoteDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);

  if (date >= startOfToday) return "today";
  if (date >= startOfYesterday) return "yesterday";

  return date.toLocaleDateString("en-US", { month: "long", day: "numeric" });
}

// Format a full datetime for the note editor header — local timezone, e.g. "July 21, 2024 at 8:39pm"
export function formatNoteDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  const datePart = date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const timePart = date
    .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
    .toLowerCase()
    .replace(" ", ""); // "8:39 pm" → "8:39pm"

  return `${datePart} at ${timePart}`;
}
