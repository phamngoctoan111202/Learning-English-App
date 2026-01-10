/**
 * Main Application - Entry point and navigation
 * Tương đương với MainActivity trong Android
 */
const App = {
    currentPage: 'learn',

    /**
     * Initialize the application
     */
    async init() {
        console.log('Initializing Special English Learning App...');

        try {
            // Initialize database
            await db.init();
            console.log('Database initialized');

            // Login to Appwrite anonymously
            await appwriteService.loginAnonymously();
            console.log('Appwrite session initialized');

            // Sync vocabulary words to extension storage
            await appwriteService.syncWordsToExtension();

            // Sync data from server
            this.startBackgroundSync();

            // Setup navigation
            this.setupNavigation();

            // Load default page (Learn)
            this.navigateTo('learn');

            console.log('App initialized successfully');
        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.showToast('Failed to initialize app', 'error');
        }
    },

    /**
     * Setup navigation event listeners
     */
    setupNavigation() {
        const navItems = document.querySelectorAll('.nav-item');

        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const page = item.dataset.page;
                this.navigateTo(page);
            });
        });
    },

    /**
     * Navigate to a page
     */
    navigateTo(page) {
        // Cleanup current page
        if (this.currentPage === 'learn') {
            LearnPage.cleanup?.();
        }

        // Update navigation UI
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.page === page);
        });

        // Render new page
        this.currentPage = page;

        switch (page) {
            case 'edit':
                EditPage.render();
                break;
            case 'learn':
                LearnPage.render();
                break;
            default:
                LearnPage.render();
        }
    },

    /**
     * Start background sync
     */
    startBackgroundSync() {
        // Initial sync
        syncManager.syncData();

        // Periodic sync every 5 minutes
        setInterval(() => {
            syncManager.syncData();
        }, 5 * 60 * 1000);
    },

    /**
     * Show toast notification
     */
    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast ${type}`;

        // Show toast
        setTimeout(() => {
            toast.classList.remove('hidden');
        }, 10);

        // Hide after 3 seconds
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 3000);
    },

    /**
     * Show loading state
     */
    showLoading(container) {
        if (typeof container === 'string') {
            container = document.getElementById(container);
        }
        if (container) {
            container.innerHTML = `
                <div class="loading">
                    <div class="loading-spinner"></div>
                    <p>Loading...</p>
                </div>
            `;
        }
    },

    /**
     * Format date
     */
    formatDate(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleDateString('vi-VN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    /**
     * Debounce function
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

// Handle visibility change (sync when user returns)
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        syncManager.syncData();
    }
});

// Handle before unload (final sync)
window.addEventListener('beforeunload', () => {
    learningProgressManager.syncToAppwrite();
});
