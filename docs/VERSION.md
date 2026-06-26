# Version History

## How to Update Version

When you make changes to JS/CSS files, update the version in `index.html`:

```html
<!-- Change ?v=1.1 to ?v=1.2 -->
<script src="js/pages/learnPage.js?v=1.2"></script>
```

This forces browsers to load the new file instead of using cached version.

---

## Version Log

### v1.5 (2026-06-27)
**Fixed:** `memoryScore`/`hasPassed` were computed from lifetime totals instead of the last 10 attempts

**Changes:**
- `js/services/database.js`: `updateLearningStats()` now derives `memoryScore` from the (already tracked) `last10Attempts` sliding window instead of `correctAttempts/totalAttempts`; `Database.hasPassed()` now checks `last10Attempts.length >= 10 && correctCount >= 7` instead of the lifetime ratio — matches the algorithm already documented in the Learn tab's "Review Algorithm" card
- `js/services/syncManager.js`: `mergeAndUpdateLocal()` now recomputes `memoryScore` from the merged `last10Attempts` array instead of `Math.max(local, server)`, since memoryScore can now legitimately go down (forgetting), not just up
- `js/pages/learnPage.js`: Word Queue badge now also shows the last-10 ratio next to the lifetime stat, e.g. `39/61 · 7/10 gần nhất`
- `index.html`: Bumped cache-busting version to v1.5

**Impact:**
- A word is only marked "mastered" (`.passed`, unlocks Next/Skip) based on its most recent 10 attempts, not its entire history — fixes cases like a word with poor lifetime accuracy that has since been learned, or a word with good lifetime accuracy that's currently being forgotten

---

### v1.4 (2026-06-26)
**Added:** "Xem ảnh minh họa" button in Learn tab

**Changes:**
- `js/pages/learnPage.js`: New `openImageSearch()` opens a Google Images search (new tab) for the current example sentence, to help visual association/memorization
- `css/styles.css`: Added `.image-search-btn` style
- `index.html`: Bumped cache-busting version to v1.4

**Impact:**
- Free, no API key/backend needed — just builds a `google.com/search?tbm=isch` URL client-side

---

### v1.1 (2025-11-26)
**Fixed:** Daily Goal not updating after completing sentence

**Changes:**
- `web/js/pages/learnPage.js`: Removed duplicate `addCompletedVocabulary()` call in `handleWordMastered()`
  - Bug: Counter was incremented twice (once in `handleCorrectAnswer()`, once in `handleWordMastered()`)
  - Fix: Only increment in `handleCorrectAnswer()` to match Android behavior
- `web/index.html`: Added version query strings (`?v=1.1`) to all JS/CSS files

**Impact:**
- Daily Goal now updates immediately after each correct answer
- Consistent behavior between Android and Web versions

---

### v1.0 (Initial Release)
- Initial web version with IndexedDB + Appwrite sync
- Learning progress tracking with dynamic goals (3 words/hour)
- Text-to-Speech with ElevenLabs/OpenAI fallback
