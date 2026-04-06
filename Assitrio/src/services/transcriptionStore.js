/**
 * IndexedDB-backed transcription store for client-side RAG.
 * Stores chunked transcriptions with keyword indexes for TF-IDF search.
 */
import { chunkText, extractKeywords, searchByRelevance } from '../utils/textProcessor';

const DB_NAME = 'assistrio-rag';
const DB_VERSION = 1;
const CHUNKS_STORE = 'chunks';
const META_STORE = 'notes_meta';

/* ── Database Setup ── */

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Chunks store: id (auto), noteId (indexed), text, keywords, metadata
      if (!db.objectStoreNames.contains(CHUNKS_STORE)) {
        const chunkStore = db.createObjectStore(CHUNKS_STORE, {
          keyPath: 'id',
          autoIncrement: true,
        });
        chunkStore.createIndex('noteId', 'noteId', { unique: false });
      }

      // Notes metadata store: noteId (primary key), title, date, etc.
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: 'noteId' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/* ── Transcription CRUD ── */

/**
 * Index a transcription into the RAG store.
 * Chunks the text, extracts keywords, and stores in IndexedDB.
 *
 * @param {number} noteId - Unique note ID
 * @param {string} transcript - Full transcription text
 * @param {{ title: string, date: string, time: string, source: string, summary?: string, mom?: string }} metadata
 */
export async function addTranscription(noteId, transcript, metadata = {}) {
  if (!transcript || typeof transcript !== 'string' || transcript.trim().length < 10) return;

  const db = await openDB();

  // Remove old chunks for this noteId first (upsert pattern)
  await removeChunksForNote(db, noteId);

  // Chunk the transcript
  const chunks = chunkText(transcript);

  // Store each chunk with keywords
  const tx = db.transaction([CHUNKS_STORE, META_STORE], 'readwrite');
  const chunkStore = tx.objectStore(CHUNKS_STORE);
  const metaStore = tx.objectStore(META_STORE);

  for (const chunkText of chunks) {
    const keywords = extractKeywords(chunkText);
    chunkStore.add({
      noteId,
      text: chunkText,
      keywords,
      metadata: {
        title: metadata.title || 'Untitled',
        date: metadata.date || '',
        time: metadata.time || '',
        source: metadata.source || 'unknown',
      },
    });
  }

  // Also index the summary and MOM as separate "chunks" for richer search
  if (metadata.summary && metadata.summary.length > 10) {
    chunkStore.add({
      noteId,
      text: `[Summary] ${metadata.summary}`,
      keywords: extractKeywords(metadata.summary),
      metadata: {
        title: metadata.title || 'Untitled',
        date: metadata.date || '',
        time: metadata.time || '',
        source: metadata.source || 'unknown',
      },
    });
  }
  if (metadata.mom && metadata.mom.length > 10) {
    chunkStore.add({
      noteId,
      text: `[MOM] ${metadata.mom}`,
      keywords: extractKeywords(metadata.mom),
      metadata: {
        title: metadata.title || 'Untitled',
        date: metadata.date || '',
        time: metadata.time || '',
        source: metadata.source || 'unknown',
      },
    });
  }

  // Store/update note metadata
  metaStore.put({
    noteId,
    title: metadata.title || 'Untitled',
    date: metadata.date || '',
    time: metadata.time || '',
    duration: metadata.duration || '',
    summary: metadata.summary || '',
    mom: metadata.mom || '',
    source: metadata.source || 'unknown',
  });

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Remove all chunks for a specific note.
 */
async function removeChunksForNote(db, noteId) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CHUNKS_STORE, 'readwrite');
    const store = tx.objectStore(CHUNKS_STORE);
    const index = store.index('noteId');
    const request = index.openCursor(IDBKeyRange.only(noteId));

    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Delete a transcription and its metadata from the store.
 */
export async function deleteTranscription(noteId) {
  const db = await openDB();
  await removeChunksForNote(db, noteId);

  return new Promise((resolve, reject) => {
    const tx = db.transaction(META_STORE, 'readwrite');
    tx.objectStore(META_STORE).delete(noteId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Search the store for chunks relevant to a query.
 *
 * @param {string} query - User's search query
 * @param {number} topK - Number of top results
 * @returns {Promise<{ noteId: number, text: string, score: number, metadata: object }[]>}
 */
export async function searchTranscriptions(query, topK = 5) {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(CHUNKS_STORE, 'readonly');
    const store = tx.objectStore(CHUNKS_STORE);
    const request = store.getAll();

    request.onsuccess = () => {
      const allChunks = request.result || [];
      const results = searchByRelevance(query, allChunks, topK);
      resolve(results);
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * Get all stored note metadata.
 *
 * @returns {Promise<object[]>}
 */
export async function getAllNoteMeta() {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(META_STORE, 'readonly');
    const request = tx.objectStore(META_STORE).getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get total chunk count (for diagnostics).
 */
export async function getChunkCount() {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(CHUNKS_STORE, 'readonly');
    const request = tx.objectStore(CHUNKS_STORE).count();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Index all existing notes from localStorage into IndexedDB (migration/bootstrap).
 * Call this once on app start to populate the RAG store from existing data.
 *
 * @param {object[]} notes - Array of note objects from localStorage
 */
export async function bootstrapFromNotes(notes) {
  if (!notes?.length) return;

  const db = await openDB();
  const tx = db.transaction(META_STORE, 'readonly');
  const metaStore = tx.objectStore(META_STORE);
  const existingRequest = metaStore.getAll();

  return new Promise((resolve) => {
    existingRequest.onsuccess = async () => {
      const existing = new Set((existingRequest.result || []).map((m) => m.noteId));

      // Only index notes not already in IndexedDB
      const toIndex = notes.filter((n) => !existing.has(n.id));

      for (const note of toIndex) {
        try {
          const transcript = note.transcript || '';
          const textToIndex = transcript || `${note.summary || ''}\n${note.mom || ''}`;
          if (textToIndex.trim().length < 10) continue;

          await addTranscription(note.id, textToIndex, {
            title: note.title,
            date: note.date,
            time: note.time,
            duration: note.duration,
            summary: note.summary,
            mom: note.mom,
            source: note.source,
          });
        } catch (e) {
          console.warn('Bootstrap index failed for note', note.id, e);
        }
      }

      resolve();
    };
  });
}
