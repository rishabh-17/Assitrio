/**
 * Text processing utilities for client-side RAG.
 * Chunking, keyword extraction, and TF-IDF scoring.
 */

/* ── English + Hindi stopwords ── */
const STOPWORDS = new Set([
  // English
  'a','an','the','is','are','was','were','be','been','being','have','has','had',
  'do','does','did','will','would','shall','should','may','might','must','can',
  'could','am','i','me','my','we','our','you','your','he','him','his','she',
  'her','it','its','they','them','their','this','that','these','those','what',
  'which','who','whom','when','where','why','how','all','each','every','both',
  'few','more','most','other','some','such','no','not','only','own','same',
  'so','than','too','very','just','about','above','after','again','also','and',
  'any','as','at','because','before','below','between','but','by','down',
  'during','for','from','here','if','in','into','of','off','on','or','out',
  'over','then','there','through','to','under','until','up','with',
  // Hindi common (romanized)
  'ka','ki','ke','ko','se','ne','hai','hain','tha','thi','the','ho','hona',
  'kya','ye','wo','yeh','woh','mein','par','aur','ya','bhi','nahi','nhi',
  'ek','do','teen','toh','jo','jab','tab','ab','koi','kuch','bahut','bohot',
  'hum','tum','aap','unka','unki','iske','uske','apna','apni','apne',
]);

/**
 * Split text into chunks of approximately `maxTokens` tokens (1 token ≈ 4 chars).
 * Splits at sentence boundaries with overlap for context continuity.
 */
export function chunkText(text, maxTokens = 400, overlapTokens = 50) {
  if (!text || typeof text !== 'string') return [];
  const clean = text.trim();
  if (!clean) return [];

  const maxChars = maxTokens * 4;
  const overlapChars = overlapTokens * 4;

  // Split into sentences
  const sentences = clean.split(/(?<=[.!?\n])\s+/).filter((s) => s.trim().length > 0);

  const chunks = [];
  let currentChunk = '';
  let overlapBuffer = '';

  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > maxChars && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      // Keep the tail of the current chunk as overlap for the next
      overlapBuffer = currentChunk.slice(-overlapChars);
      currentChunk = overlapBuffer + ' ' + sentence;
    } else {
      currentChunk += (currentChunk ? ' ' : '') + sentence;
    }
  }
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  // If text is too short for even 1 chunk, just return it
  if (chunks.length === 0 && clean.length > 0) {
    chunks.push(clean);
  }

  return chunks;
}

/**
 * Extract meaningful keywords from text.
 * Removes stopwords, lowercases, keeps words > 2 characters.
 */
export function extractKeywords(text) {
  if (!text || typeof text !== 'string') return [];
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));

  // Deduplicate
  return [...new Set(words)];
}

/**
 * Compute TF-IDF relevance scores for a query against a set of documents.
 *
 * @param {string} query - User's search query
 * @param {{ id: any, text: string, keywords: string[] }[]} documents - Array of chunk documents
 * @param {number} topK - Number of top results to return
 * @returns {{ id: any, score: number, text: string }[]} - Sorted by score descending
 */
export function searchByRelevance(query, documents, topK = 5) {
  if (!query || !documents?.length) return [];

  const queryKeywords = extractKeywords(query);
  if (queryKeywords.length === 0) return documents.slice(0, topK).map((d) => ({ ...d, score: 0 }));

  const N = documents.length;

  // Compute IDF for each query keyword
  const idf = {};
  for (const kw of queryKeywords) {
    const docsContaining = documents.filter(
      (doc) => doc.keywords?.includes(kw) || doc.text?.toLowerCase().includes(kw)
    ).length;
    idf[kw] = docsContaining > 0 ? Math.log(N / docsContaining) + 1 : 0;
  }

  // Score each document
  const scored = documents.map((doc) => {
    const docText = (doc.text || '').toLowerCase();
    const docKeywords = doc.keywords || [];
    let score = 0;

    for (const kw of queryKeywords) {
      // Term frequency: count occurrences in the text
      const regex = new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      const matches = docText.match(regex);
      const tf = matches ? matches.length : 0;

      // Boost if keyword is in the pre-extracted keywords list
      const keywordBoost = docKeywords.includes(kw) ? 1.5 : 1.0;

      score += tf * (idf[kw] || 0) * keywordBoost;
    }

    return { ...doc, score };
  });

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Return top-K with non-zero scores (or top-K overall if all zero)
  const nonZero = scored.filter((s) => s.score > 0);
  return (nonZero.length > 0 ? nonZero : scored).slice(0, topK);
}
