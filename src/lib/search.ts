// Search utility functions for FTS5 index maintenance
// The actual FTS sync is handled by database triggers (see schema.sql)
// This file provides helper functions for manual index operations if needed

import { searchPosts as dbSearchPosts } from "./db";

export interface SearchMatch {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  tags: string | null;
  updated_at: string;
}

/**
 * Search posts using FTS5 full-text search
 * @param query - The search query string
 * @returns Array of matching posts
 */
export async function search(query: string): Promise<SearchMatch[]> {
  if (!query || query.trim().length === 0) {
    return [];
  }
  return dbSearchPosts(query);
}

/**
 * Extract a text snippet around the first match for better search result display
 * @param text - The full text content
 * @param query - The search query
 * @param maxLength - Maximum length of the snippet
 * @returns A snippet of text around the match
 */
export function getSnippet(
  text: string,
  query: string,
  maxLength: number = 200,
): string {
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerText.indexOf(lowerQuery);

  if (index === -1) {
    return text.slice(0, maxLength) + (text.length > maxLength ? "..." : "");
  }

  const start = Math.max(0, index - Math.floor(maxLength / 3));
  const end = Math.min(
    text.length,
    index + query.length + Math.floor(maxLength / 3),
  );

  let snippet = text.slice(start, end);
  if (start > 0) snippet = "..." + snippet;
  if (end < text.length) snippet = snippet + "...";

  return snippet;
}
