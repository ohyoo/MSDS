/** Normalize searchable text without changing the original course content. */
export function normalizeSearch(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

const stopWords = new Set([
  "a",
  "an",
  "and",
  "are",
  "at",
  "be",
  "can",
  "course",
  "courses",
  "elective",
  "electives",
  "for",
  "from",
  "help",
  "i",
  "in",
  "interested",
  "is",
  "it",
  "like",
  "me",
  "my",
  "of",
  "on",
  "or",
  "please",
  "should",
  "the",
  "to",
  "want",
  "what",
  "which",
  "with",
  "would",
]);

export function searchTerms(value: string): string[] {
  return [
    ...new Set(
      normalizeSearch(value)
        .split(" ")
        .filter((word) => word.length > 1 && !stopWords.has(word)),
    ),
  ];
}

export function humanizeTag(tag: string): string {
  const overrides: Record<string, string> = {
    ai: "AI",
    "generative-ai": "generative AI",
    nlp: "NLP",
    gis: "GIS",
    "machine-learning": "machine learning",
    "deep-learning": "deep learning",
  };
  return overrides[tag] ?? tag.replace(/-/g, " ");
}

/** Match complete normalized words or phrases, so “AI” never matches “chair”. */
export function containsPhrase(text: string, phrase: string): boolean {
  const normalizedPhrase = normalizeSearch(phrase);
  return (
    Boolean(normalizedPhrase) &&
    ` ${normalizeSearch(text)} `.includes(` ${normalizedPhrase} `)
  );
}
