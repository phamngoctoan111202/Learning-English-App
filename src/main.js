import { Client, Databases, ID } from 'appwrite';

// Configuration
const client = new Client()
    .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
    .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID);

const databases = new Databases(client);

// Constants
const DATABASE_ID = '68cfb8c900053dca6f90';
const COLLECTION_ID = 'vocabularies';

// Global variables
let isConnected = false;
let allVocabularies = [];
let currentCategory = 'ALL';

// DOM elements
const statusDiv = document.getElementById('status');
const wordInput = document.getElementById('word');
const vietnameseInput = document.getElementById('vietnamese');
const examplesContainer = document.getElementById('examplesContainer');
const submitBtn = document.getElementById('submitBtn');
const vocabList = document.getElementById('vocabList');

// Utility functions
function log(message) {
    // Debug logging disabled in production
}

function showStatus(message, type = 'info') {
    statusDiv.innerHTML = `<div class="status ${type}">${message}</div>`;
    statusDiv.style.display = 'block';
    
    if (type === 'success') {
        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 3000);
    }
}

// Appwrite functions
async function testConnection() {
    try {
        log('🧪 Testing Appwrite connection...');
        showStatus('🧪 Đang kiểm tra kết nối...', 'loading');
        
        const response = await databases.listDocuments(DATABASE_ID, COLLECTION_ID, [], 1);
        log('✅ Connection test successful!');
        log('📋 Response:', response);
        
        isConnected = true;
        showStatus('✅ Kết nối Appwrite thành công!', 'success');
        return true;
    } catch (error) {
        log('❌ Connection test failed:', error);
        isConnected = false;
        
        if (error.code === 404) {
            showStatus('❌ Không tìm thấy database/collection. Kiểm tra lại ID!', 'error');
        } else if (error.code === 401) {
            showStatus('❌ Lỗi xác thực. Kiểm tra Project ID!', 'error');
        } else {
            showStatus('❌ Lỗi kết nối: ' + error.message, 'error');
        }
        return false;
    }
}

async function loadVocabularies() {
    if (!isConnected) {
        showStatus('Vui lòng kết nối Appwrite trước', 'error');
        return;
    }

    try {
        log('📚 Loading vocabularies...');
        showStatus('Đang tải danh sách từ vựng...', 'loading');

        const response = await databases.listDocuments(DATABASE_ID, COLLECTION_ID);
        log('✅ Documents fetched successfully');
        log('📊 Document count:', response.documents.length);

        allVocabularies = response.documents;
        updateCategoryStats();
        renderVocabularyList();

        showStatus(`✅ Đã tải ${response.documents.length} từ vựng`, 'success');
    } catch (error) {
        log('❌ Error loading vocabularies:', error);
        showStatus('❌ Lỗi tải danh sách: ' + error.message, 'error');
    }
}

function updateCategoryStats() {
    const categories = ['GENERAL', 'TOEIC', 'VSTEP', 'SPEAKING', 'WRITING'];
    const stats = {};

    // Calculate stats for each category
    for (const category of categories) {
        const categoryVocabs = allVocabularies.filter(doc => {
            const data = doc.data || doc;
            return data.category === category;
        });
        const learned = categoryVocabs.filter(doc => {
            const data = doc.data || doc;
            return parseInt(data.totalAttempts || '0') >= 1;
        }).length;
        stats[category] = { total: categoryVocabs.length, learned };
    }

    // Calculate stats for ALL
    const allLearned = allVocabularies.filter(doc => {
        const data = doc.data || doc;
        return parseInt(data.totalAttempts || '0') >= 1;
    }).length;
    stats['ALL'] = { total: allVocabularies.length, learned: allLearned };

    // Update UI
    document.getElementById('statsAll').textContent = `${stats['ALL'].learned}/${stats['ALL'].total}`;
    document.getElementById('statsGeneral').textContent = `${stats['GENERAL'].learned}/${stats['GENERAL'].total}`;
    document.getElementById('statsToeic').textContent = `${stats['TOEIC'].learned}/${stats['TOEIC'].total}`;
    document.getElementById('statsVstep').textContent = `${stats['VSTEP'].learned}/${stats['VSTEP'].total}`;
    document.getElementById('statsSpeaking').textContent = `${stats['SPEAKING'].learned}/${stats['SPEAKING'].total}`;
    document.getElementById('statsWriting').textContent = `${stats['WRITING'].learned}/${stats['WRITING'].total}`;
}

function renderVocabularyList() {
    let filteredVocabs = allVocabularies;

    if (currentCategory !== 'ALL') {
        filteredVocabs = allVocabularies.filter(doc => {
            const data = doc.data || doc;
            return data.category === currentCategory;
        });
    }

    if (filteredVocabs.length === 0) {
        vocabList.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">Chưa có từ vựng nào</p>';
    } else {
        vocabList.innerHTML = filteredVocabs.map(doc => {
            const data = doc.data || doc;
            const sentences = data.sentences ? JSON.parse(data.sentences) : [];
            const totalAttempts = parseInt(data.totalAttempts || '0');
            const isLearned = totalAttempts >= 1;
            const category = data.category || 'GENERAL';
            return `
                <div class="vocab-item">
                    <div>
                        <div class="vocab-word">${data.word} ${isLearned ? '✓' : ''}</div>
                        <div class="vocab-examples">${sentences.length} câu ví dụ · ${category}</div>
                    </div>
                    <button class="delete-btn" onclick="deleteVocabulary('${doc.$id}')">Xóa</button>
                </div>
            `;
        }).join('');
    }
}

function setCategory(category) {
    currentCategory = category;

    // Update active button
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.category === category) {
            btn.classList.add('active');
        }
    });

    renderVocabularyList();
}

async function saveVocabulary(word, sentences, vietnamese, category) {
    if (!isConnected) {
        showStatus('Vui lòng kết nối Appwrite trước', 'error');
        return;
    }

    try {
        log('💾 Saving vocabulary to Appwrite...');
        showStatus('Đang lưu từ vựng...', 'loading');

        const data = {
            word: word,
            sentences: JSON.stringify(sentences),
            vietnamese: vietnamese || null,
            category: category || 'GENERAL',
            createdAt: Date.now().toString(),
            lastStudiedAt: '0',
            priorityScore: '0',
            totalAttempts: '0',
            correctAttempts: '0',
            memoryScore: '0.0'
        };

        log('📊 Data to send:', data);

        const response = await databases.createDocument(
            DATABASE_ID,
            COLLECTION_ID,
            ID.unique(),
            data
        );

        log('✅ Document created successfully:', response);
        showStatus('✅ Đã lưu từ vựng thành công!', 'success');

        // Reset form
        resetForm();

        // Reload vocabulary list
        loadVocabularies();

    } catch (error) {
        log('❌ Error saving vocabulary:', error);
        showStatus('❌ Lỗi lưu từ vựng: ' + error.message, 'error');
    }
}

async function deleteVocabulary(documentId) {
    if (!isConnected) {
        showStatus('Vui lòng kết nối Appwrite trước', 'error');
        return;
    }

    if (!confirm('Bạn có chắc muốn xóa từ vựng này?')) {
        return;
    }

    try {
        await databases.deleteDocument(DATABASE_ID, COLLECTION_ID, documentId);
        showStatus('✅ Đã xóa từ vựng thành công', 'success');
        loadVocabularies();
    } catch (error) {
        log('❌ Error deleting vocabulary:', error);
        showStatus('❌ Lỗi xóa từ vựng: ' + error.message, 'error');
    }
}

// UI functions
function addExample() {
    const container = examplesContainer;
    const exampleCount = container.children.length + 1;
    
    const exampleDiv = document.createElement('div');
    exampleDiv.className = 'example-item';
    exampleDiv.innerHTML = `
        <div class="example-header">
            <span class="example-number">Ví dụ ${exampleCount}</span>
            <button type="button" class="remove-example" onclick="removeExample(this)">Xóa</button>
        </div>
        <textarea placeholder="Nhập các câu tiếng Anh, mỗi câu một dòng&#10;Ví dụ:&#10;Hello, how are you?&#10;Hi, how are you doing?&#10;How are you today?" required></textarea>
    `;
    
    container.appendChild(exampleDiv);
    updateRemoveButtons();
}

function removeExample(button) {
    const container = examplesContainer;
    if (container.children.length > 1) {
        button.closest('.example-item').remove();
        updateExampleNumbers();
        updateRemoveButtons();
    }
}

function updateExampleNumbers() {
    const container = examplesContainer;
    const examples = container.querySelectorAll('.example-number');
    examples.forEach((span, index) => {
        span.textContent = `Ví dụ ${index + 1}`;
    });
}

function updateRemoveButtons() {
    const container = examplesContainer;
    const removeButtons = container.querySelectorAll('.remove-example');
    removeButtons.forEach((button, index) => {
        button.style.display = removeButtons.length > 1 ? 'block' : 'none';
    });
}

function resetForm() {
    document.getElementById('vocabularyForm').reset();
    examplesContainer.innerHTML = `
        <div class="example-item">
            <div class="example-header">
                <span class="example-number">Ví dụ 1</span>
                <button type="button" class="remove-example" onclick="removeExample(this)" style="display: none;">Xóa</button>
            </div>
            <textarea placeholder="Nhập các câu tiếng Anh, mỗi câu một dòng&#10;Ví dụ:&#10;Hello, how are you?&#10;Hi, how are you doing?&#10;How are you today?" required></textarea>
        </div>
    `;
}

// Event listeners
document.getElementById('testConnection').addEventListener('click', testConnection);
document.getElementById('loadVocabularies').addEventListener('click', loadVocabularies);
document.getElementById('addExample').addEventListener('click', addExample);

document.getElementById('vocabularyForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const word = wordInput.value.trim();
    const vietnamese = vietnameseInput.value.trim();
    const category = document.getElementById('category').value;

    if (!word) {
        showStatus('Vui lòng nhập từ vựng', 'error');
        return;
    }

    // Collect all examples
    const exampleTextareas = document.querySelectorAll('#examplesContainer textarea');
    const allSentences = [];

    for (const textarea of exampleTextareas) {
        const sentences = textarea.value.trim().split('\n').filter(s => s.trim());
        allSentences.push(...sentences);
    }

    if (allSentences.length === 0) {
        showStatus('Vui lòng nhập ít nhất một câu ví dụ', 'error');
        return;
    }

    await saveVocabulary(word, allSentences, vietnamese, category);
});

// Category filter click handlers
document.querySelectorAll('.category-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        setCategory(btn.dataset.category);
    });
});

// Global functions for onclick handlers
window.removeExample = removeExample;
window.deleteVocabulary = deleteVocabulary;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    log('🚀 App initialized');
    log('📦 Appwrite version:', '8.1.0');
    log('🔧 Configuration:');
    log('  - Project ID:', import.meta.env.VITE_APPWRITE_PROJECT_ID);
    log('  - Endpoint:', import.meta.env.VITE_APPWRITE_ENDPOINT);
    log('  - Database ID:', DATABASE_ID);
    log('  - Collection ID:', COLLECTION_ID);
    
    // Auto-test connection
    setTimeout(testConnection, 1000);
});
