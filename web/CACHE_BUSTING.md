# Cache Busting Guide

## Problem
Browsers cache JavaScript and CSS files. When you update code, users may still see old version.

## Solution
We use **version query strings** (`?v=1.1`) to force browsers to load new files.

---

## 📝 When to Update Version

Update version **EVERY TIME** you modify any JS or CSS file:

```bash
# Manual method
# Edit index.html and change ?v=1.1 to ?v=1.2

# Automatic method (recommended)
./bump-version.sh 1.2
```

---

## 🚀 Quick Update Workflow

1. Make changes to JS/CSS files
2. Run: `./bump-version.sh 1.2` (or next version number)
3. Update `VERSION.md` with changelog
4. Reload page in browser (no hard refresh needed!)

---

## 🧪 Testing Cache Busting

### Check if version is updated:
```bash
grep "?v=" index.html
```

Should show:
```html
<script src="js/pages/learnPage.js?v=1.2"></script>
```

### Verify in browser DevTools:
1. Open DevTools → Network tab
2. Reload page
3. Check loaded files should show `learnPage.js?v=1.2`

---

## 🛠️ Alternative Solutions (Not Used)

### Option 2: HTTP Cache-Control Headers
```
Cache-Control: no-cache, must-revalidate
```
❌ Requires server configuration

### Option 3: Service Worker
```javascript
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.map(key => caches.delete(key)))
  ));
});
```
❌ Complex, overkill for simple static site

### Option 4: Timestamp-based versioning
```html
<script src="js/app.js?t=1732614000"></script>
```
❌ Auto-generated timestamp makes version control messy

---

## ✅ Why Query String is Best

- ✅ Simple to implement
- ✅ No server config needed
- ✅ Works on any hosting (GitHub Pages, Netlify, etc.)
- ✅ Version control friendly
- ✅ Can be automated with script
- ✅ Semantic versioning (v1.0, v1.1, v2.0)

---

## 🔍 Debugging Cache Issues

If users still see old code:

1. **Check version in URL:**
   - DevTools → Network tab
   - Should see `learnPage.js?v=1.2` (not `?v=1.1`)

2. **Hard refresh (emergency only):**
   - macOS: `Cmd + Shift + R`
   - Windows/Linux: `Ctrl + Shift + R`

3. **Clear browser data:**
   - Chrome: Settings → Privacy → Clear browsing data
   - Select "Cached images and files"

4. **Disable cache in DevTools (development only):**
   - DevTools → Network tab
   - Check "Disable cache"
   - Keep DevTools open while testing
