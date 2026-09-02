/**
 * Smart Search Utility for Store Management System
 * Supports:
 * - Multi-word / multi-token search in any order (e.g. "ac dc ericsion" matches "AC-DC Bulb Ericsion 12w")
 * - Punctuation & hyphen normalization ("AC-DC", "AC DC", "ACDC")
 * - Bengali and English language text
 * - Relevance scoring and ranking (best matches appear first)
 */

export function normalizeText(text) {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .replace(/[—–_/\-\\,()\[\]+]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getSearchTokens(query) {
  if (!query) return [];
  const normalized = normalizeText(query);
  return normalized.split(' ').filter(t => t.length > 0);
}

export function matchSearch(targets, query) {
  if (!query || !query.trim()) {
    return { matched: true, score: 0, matchedCount: 0 };
  }

  const rawQuery = query.trim().toLowerCase();
  const queryTokens = getSearchTokens(query);
  if (queryTokens.length === 0) {
    return { matched: true, score: 0, matchedCount: 0 };
  }

  const targetArr = Array.isArray(targets) ? targets : [targets];
  const combinedRaw = targetArr.filter(Boolean).join(' ').toLowerCase();
  const combinedNormalized = normalizeText(combinedRaw);
  const targetWords = combinedNormalized.split(' ').filter(Boolean);
  const cleanRawNoPunct = combinedRaw.replace(/[-_/\s,()[\]+]/g, '');

  let score = 0;

  // 1. Exact full phrase match gets top bonus
  if (combinedRaw.includes(rawQuery) || combinedNormalized.includes(normalizeText(rawQuery))) {
    score += 500;
  }

  let matchedTokensCount = 0;

  for (const token of queryTokens) {
    let tokenMatched = false;
    let tokenScore = 0;

    // Exact whole word match
    if (targetWords.includes(token)) {
      tokenMatched = true;
      tokenScore = Math.max(tokenScore, 100);
    }
    // Prefix match on any word
    else if (targetWords.some(w => w.startsWith(token))) {
      tokenMatched = true;
      tokenScore = Math.max(tokenScore, 60);
    }
    // Substring match in normalized text
    else if (combinedNormalized.includes(token)) {
      tokenMatched = true;
      tokenScore = Math.max(tokenScore, 30);
    }
    // Compact match ignoring all spaces and hyphens (e.g. "acdc" matching "ac-dc")
    else if (cleanRawNoPunct.includes(token.replace(/[-_/\s,()[\]+]/g, ''))) {
      tokenMatched = true;
      tokenScore = Math.max(tokenScore, 25);
    }

    if (tokenMatched) {
      matchedTokensCount++;
      score += tokenScore;
    }
  }

  // All tokens should match (or >= length - 1 for long searches with 3+ words)
  const isFullMatch = matchedTokensCount === queryTokens.length;
  const isPartialMatch = queryTokens.length >= 3 && matchedTokensCount >= queryTokens.length - 1;

  const matched = isFullMatch || isPartialMatch;

  if (isFullMatch) {
    score += 200;
  }

  return { matched, score, matchedCount: matchedTokensCount };
}

export function filterAndRankBySearch(items, getSearchableFields, query) {
  if (!query || !query.trim()) return items;

  const scoredItems = [];

  for (const item of items) {
    const fields = getSearchableFields(item);
    const { matched, score } = matchSearch(fields, query);
    if (matched) {
      scoredItems.push({ item, score });
    }
  }

  // Sort by score descending
  scoredItems.sort((a, b) => b.score - a.score);

  return scoredItems.map(si => si.item);
}
