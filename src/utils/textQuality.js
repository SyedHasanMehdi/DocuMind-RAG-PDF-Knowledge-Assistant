// textQuality.js
// Utility functions to decide whether a retrieved text chunk contains
// enough real words to be useful in an answer.
// This filters out chunks that are mostly page headers, numbers, or whitespace.

// Regex that matches PDF page markers like "-- 3 of 10 --"
const PAGE_MARKER_REGEX = /--\s*\d+\s+of\s+\d+\s*--/gi;

// Count how many real words a piece of text contains (after stripping page markers)
export function countUsefulWords(text) {
  const cleanedText = String(text || "")
    .replace(PAGE_MARKER_REGEX, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleanedText) {
    return 0;
  }

  return cleanedText.split(" ").filter(Boolean).length;
}

// Returns true if the text has at least 8 real words — the minimum to be useful
export function hasUsefulReadableText(text) {
  return countUsefulWords(text) >= 8;
}
