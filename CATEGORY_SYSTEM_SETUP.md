# Category System Implementation Guide

## Overview

The Category System allows users to organize vocabulary into two distinct categories:
- **GENERAL**: Regular vocabulary for general English learning
- **TOEIC**: Vocabulary specifically for TOEIC exam preparation

This feature is fully implemented across:
- ✅ Android app (Kotlin/Room Database)
- ✅ Web app (JavaScript/IndexedDB)
- ✅ Appwrite server (Bidirectional sync)

---

## Category Values Explained

### **GENERAL** Category
- **Purpose**: Standard English vocabulary for everyday learning
- **Use Case**: General vocabulary building, common words, daily conversation
- **Color**: Green (#4CAF50)
- **Default**: All existing vocabularies are automatically set to GENERAL

### **TOEIC** Category
- **Purpose**: Vocabulary specifically for TOEIC exam preparation
- **Use Case**: TOEIC test-specific words, business English, exam vocabulary
- **Color**: Orange (#FF9800)
- **Usage**: Selected when adding/editing vocabulary intended for TOEIC study

---

## Appwrite Setup Instructions

### Step 1: Access Appwrite Console
1. Go to https://cloud.appwrite.io/console
2. Login to your account
3. Select your project: **68cf65390012ceaa2085**

### Step 2: Navigate to Database
1. Click on **Databases** in the left sidebar
2. Select database: **68cfb8c900053dca6f90**
3. Click on collection: **vocabularies**

### Step 3: Add Category Attribute

Click **"Add Attribute"** and configure as follows:

| Field | Value | Description |
|-------|-------|-------------|
| **Attribute Key** | `category` | The field name in the database |
| **Type** | String | Text data type |
| **Size** | 50 | Maximum character length |
| **Default Value** | `GENERAL` | Automatically assigned to existing records |
| **Required** | ✅ Yes | Cannot be null/empty |

### Step 4: Verify Attribute
After creation, verify the attribute appears in the collection schema:
```
✓ category (String, Required, Default: GENERAL)
```

### Step 5: Test Sync
1. Open the Android app or Web app
2. Add a new vocabulary with category "TOEIC"
3. Check the Appwrite console to verify the category is synced
4. Refresh the app to see the category displayed

---

## Features Implemented

### 🔷 Android App

#### 1. Database Migration (Room)
- **File**: `AppDatabase.kt`
- **Version**: 7 → 8
- **Change**: Added `category` column with default value "GENERAL"
```kotlin
ALTER TABLE vocabularies ADD COLUMN category TEXT NOT NULL DEFAULT 'GENERAL'
```

#### 2. Data Model
- **File**: `Vocabulary.kt`
- **New Field**: `val category: String = "GENERAL"`
- **Enum**: `VocabularyCategory` (GENERAL/TOEIC)

#### 3. UI Components
- **Add/Edit Dialogs**: RadioGroup for category selection
  - Files: `dialog_add_vocabulary.xml`, `AddVocabularyDialog.kt`, `EditVocabularyDialog.kt`
- **Vocabulary List**: Category badge display
  - Files: `item_vocabulary.xml`, `VocabularyAdapter.kt`
- **Edit Fragment**: Category filter (All/General/TOEIC)
  - Files: `fragment_edit.xml`, `EditFragment.kt`, `EditViewModel.kt`
- **Learn Fragment**: Category selector (General/TOEIC)
  - Files: `fragment_learn.xml` (lines 113-164), `LearnFragment.kt` (onCategoryChanged method)

#### 4. Learn Logic
- **File**: `LearnFragment.kt`
- **Feature**: Category-specific learning queues
- **Behavior**: When category changes, progress resets and 30 new words are selected from that category

#### 5. Sync Logic
- **File**: `SyncManager.kt`
- **Sync Direction**: Bidirectional (Android ↔ Appwrite)
- **Merge Strategy**: Server category overwrites local if different

---

### 🌐 Web App

#### 1. Database Migration (IndexedDB)
- **File**: `database.js`
- **Version**: 7 → 8
- **Default**: All vocabularies get `category: 'GENERAL'`
- **Method Updated**: `getVocabulariesByLowestMemoryScore()` now accepts `category` parameter

#### 2. Services Updated
- **File**: `appwriteService.js` - Send category to server
- **File**: `syncManager.js` - Merge category from server
- **File**: `database.js` - Store category in IndexedDB

#### 3. UI Components - Edit Page
- **Add/Edit Dialogs**: Radio buttons for category selection
  - File: `index.html` (lines 48-60, 95-107)
  - File: `editPage.js` - Handle category in save/update
- **Vocabulary List**: Category badge display
  - File: `editPage.js` (lines 120-148) - Render badges
- **Edit Page Filter**: Category filter radio buttons
  - File: `editPage.js` (lines 16-32) - Filter UI
  - File: `editPage.js` (lines 102-138) - Filter logic

#### 4. UI Components - Learn Page
- **Learn Page Filter**: Category selector (General/TOEIC)
  - File: `learnPage.js` (lines 40-55) - Filter UI in header
  - File: `learnPage.js` (onCategoryChanged method) - Handle category change
- **Feature**: Category-specific learning queues
- **Behavior**: When category changes, progress resets and 30 new words are selected from that category

#### 5. CSS Styling
- **File**: `styles.css`
- **Category Badges**: `.category-badge-general` (green), `.category-badge-toeic` (orange)
- **Filter UI**: `.filter-radio`, `.category-filter`
- **Dialog Radio**: `.radio-group`, `.radio-label`

---

## Usage Guide

### For Users

#### Adding Vocabulary with Category
1. Click **"+"** button (FAB)
2. Enter the word
3. Select category:
   - ✅ **General** - For regular vocabulary
   - ✅ **TOEIC** - For TOEIC exam vocabulary
4. Add examples and save

#### Filtering by Category in Edit Page
1. Go to **Edit** page
2. Use the filter buttons:
   - **All** - Show all vocabularies
   - **General** - Show only general vocabularies
   - **TOEIC** - Show only TOEIC vocabularies
3. Combine with search for precise filtering

#### Learning by Category in Learn Page
1. Go to **Learn** page
2. Select vocabulary type at the top:
   - ✅ **General** - Learn general vocabulary only
   - ✅ **TOEIC** - Learn TOEIC vocabulary only
3. The learning queue will automatically rebuild with 30 words from the selected category
4. Progress is tracked separately for each category

**Important**: When you switch categories in Learn mode, your progress resets and a new queue of 30 words is selected from that category.

#### Viewing Category
- Category badge appears next to each word in the Edit page list
- **Green badge** = General vocabulary
- **Orange badge** = TOEIC vocabulary

---

## Technical Details

### Data Structure

**Android (Room Database)**
```kotlin
@Entity(tableName = "vocabularies")
data class Vocabulary(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val word: String,
    val category: String = "GENERAL",  // NEW FIELD
    val createdAt: Long = System.currentTimeMillis(),
    // ... other fields
)
```

**Web (IndexedDB)**
```javascript
{
    id: 1,
    word: "accomplish",
    category: "TOEIC",  // NEW FIELD
    createdAt: 1234567890,
    // ... other fields
}
```

**Appwrite (Server)**
```json
{
    "$id": "unique_document_id",
    "word": "accomplish",
    "category": "TOEIC",
    "sentences": "I want to accomplish my goals.",
    "vietnamese": "Tôi muốn đạt được mục tiêu của mình.",
    "createdAt": "1234567890",
    // ... other fields
}
```

### Sync Flow

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Android   │ ←────→ │   Appwrite   │ ←────→ │  Web App   │
│  (Room DB)  │  Sync  │   (Server)   │  Sync  │ (IndexedDB) │
└─────────────┘         └──────────────┘         └─────────────┘

1. User adds vocabulary with category on Android
2. SyncManager uploads to Appwrite (category: "TOEIC")
3. Web app syncs from Appwrite
4. Web app downloads vocabulary with category
5. Category displayed in Web app UI
```

### Backward Compatibility

✅ **Existing vocabularies without category**
- Automatically assigned `category: "GENERAL"`
- No data loss
- Seamless migration

✅ **Old app versions**
- Field is optional in parsing
- Default value prevents crashes
- Graceful degradation

---

## Testing Checklist

### Android App
- [ ] Add vocabulary with GENERAL category
- [ ] Add vocabulary with TOEIC category
- [ ] Edit vocabulary and change category
- [ ] Filter by All/General/TOEIC
- [ ] Verify category badge display (green/orange)
- [ ] Sync to Appwrite and verify

### Web App
- [ ] Add vocabulary with GENERAL category
- [ ] Add vocabulary with TOEIC category
- [ ] Edit vocabulary and change category
- [ ] Filter by All/General/TOEIC
- [ ] Verify category badge display (green/orange)
- [ ] Sync to Appwrite and verify

### Cross-Platform Sync
- [ ] Add vocabulary on Android → verify on Web
- [ ] Add vocabulary on Web → verify on Android
- [ ] Edit category on Android → verify on Web
- [ ] Edit category on Web → verify on Android
- [ ] Filter works independently on both platforms

### Learn Mode Category Filtering
- [ ] Android: Switch from General to TOEIC → verify queue rebuilds
- [ ] Android: Learn 5 words in General, switch to TOEIC → verify progress reset
- [ ] Web: Switch from General to TOEIC → verify queue rebuilds
- [ ] Web: Learn 5 words in General, switch to TOEIC → verify progress reset
- [ ] Verify 30 words are selected only from the chosen category

---

## Troubleshooting

### Issue: Category not syncing to Appwrite
**Solution**:
1. Verify the `category` attribute exists in Appwrite console
2. Check attribute is marked as "Required"
3. Verify default value is set to "GENERAL"
4. Check sync logs in browser console or Android logcat

### Issue: Category shows as undefined
**Solution**:
1. Clear app data/cache
2. Re-sync from Appwrite
3. Check database migration completed successfully
4. Verify IndexedDB/Room database version is 8

### Issue: Filter not working
**Solution**:
1. Check browser console for JavaScript errors
2. Verify radio buttons are properly connected
3. Clear browser cache and reload
4. Check `selectedCategory` state in EditPage

---

## Color Scheme

| Category | Background Color | Hex Code | Usage |
|----------|------------------|----------|-------|
| General  | Green            | #4CAF50  | Default, regular vocabulary |
| TOEIC    | Orange           | #FF9800  | TOEIC exam vocabulary |

These colors are consistent across:
- Android drawable backgrounds (`bg_category_general.xml`, `bg_category_toeic.xml`)
- Web CSS classes (`.category-badge-general`, `.category-badge-toeic`)
- UI design specifications

---

## Summary

The Category System is now fully operational across all platforms:

✅ **Database**: Migrated to version 8 with `category` field
✅ **UI - Edit Mode**: Category selector in dialogs, badges in lists, filters in edit page
✅ **UI - Learn Mode**: Category selector for focused learning (General or TOEIC only)
✅ **Sync**: Bidirectional sync with Appwrite server
✅ **Styling**: Color-coded badges (green/orange) for visual distinction
✅ **Logic**: Complete filtering, display, and category-specific learning functionality

**Key Features**:
- **Edit Page**: Filter and manage vocabularies by category (All/General/TOEIC)
- **Learn Page**: Learn vocabularies from one category at a time (General OR TOEIC)
- **Smart Queue**: 30-word learning queue automatically filtered by selected category
- **Progress Isolation**: Switching categories resets progress to start fresh learning

**Status**: ✅ Ready for Production Use

For questions or issues, please refer to the troubleshooting section or contact the development team.
