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
