// ========================================
// CONFIGURATION ET CONSTANTES
// ========================================

const CONFIG = {
    MONGODB_URI: 'mongodb+srv://djaidaniadam02_db_user:0WZcqW2iFYDyiDtb@cluster0.vlltcxf.mongodb.net/?retryWrites=true&w=majority&appName=cluster0',
    GOOGLE_AI_API_KEY: 'AIzaSyChPuVLJTY_oKhUNYZA5IT8x5Ft7SlugOs',
    DB_NAME: 'notes_pro_db',
    COLLECTION_NAME: 'notes',
    AUTO_SYNC_INTERVAL: 30000, // 30 secondes
};

// ========================================
// ÉTAT GLOBAL DE L'APPLICATION
// ========================================

const AppState = {
    notes: [],
    currentView: 'all-notes',
    currentNote: null,
    searchQuery: '',
    sortBy: 'date-desc',
    categoryFilter: 'all',
    settings: {
        theme: 'light',
        fontSize: 'medium',
        autoSync: true,
    },
    categories: ['personnel', 'travail', 'idées', 'projets', 'important'],
    isSyncing: false,
    deviceId: null,
};

// ========================================
// UTILITAIRES
// ========================================

const Utils = {
    // Générer un ID unique
    generateId() {
        return '_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    },

    // Obtenir l'ID de l'appareil
    getDeviceId() {
        let deviceId = localStorage.getItem('deviceId');
        if (!deviceId) {
            deviceId = this.generateId();
            localStorage.setItem('deviceId', deviceId);
        }
        return deviceId;
    },

    // Formater une date
    formatDate(date) {
        const now = new Date();
        const noteDate = new Date(date);
        const diffInSeconds = Math.floor((now - noteDate) / 1000);

        if (diffInSeconds < 60) return 'À l\'instant';
        if (diffInSeconds < 3600) return `Il y a ${Math.floor(diffInSeconds / 60)} min`;
        if (diffInSeconds < 86400) return `Il y a ${Math.floor(diffInSeconds / 3600)} h`;
        if (diffInSeconds < 172800) return 'Hier';
        if (diffInSeconds < 604800) return `Il y a ${Math.floor(diffInSeconds / 86400)} jours`;
        
        return noteDate.toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    },

    // Tronquer le texte
    truncateText(text, maxLength = 150) {
        if (text.length <= maxLength) return text;
        return text.substr(0, maxLength).trim() + '...';
    },

    // Extraire le texte d'un HTML
    stripHtml(html) {
        const tmp = document.createElement('DIV');
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || '';
    },

    // Compter les mots
    countWords(text) {
        return text.trim().split(/\s+/).filter(word => word.length > 0).length;
    },

    // Sauvegarder dans localStorage
    saveToLocalStorage(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
            console.error('Erreur lors de la sauvegarde:', e);
        }
    },

    // Charger depuis localStorage
    loadFromLocalStorage(key, defaultValue = null) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (e) {
            console.error('Erreur lors du chargement:', e);
            return defaultValue;
        }
    },

    // Debounce
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
    },
};

// ========================================
// GESTION DE LA BASE DE DONNÉES
// ========================================

const DatabaseManager = {
    // Initialiser la connexion à la base de données via Vercel Function
    async initialize() {
        try {
            // Test de connexion
            const response = await fetch('/api/notes', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                console.log('Connexion à la base de données établie');
                return true;
            } else {
                throw new Error('Impossible de se connecter à la base de données');
            }
        } catch (error) {
            console.error('Erreur de connexion à la base de données:', error);
            UI.showToast('Mode hors ligne activé', 'warning');
            return false;
        }
    },

    // Récupérer toutes les notes
    async getAllNotes() {
        try {
            const response = await fetch('/api/notes');
            if (!response.ok) throw new Error('Erreur lors de la récupération des notes');
            const data = await response.json();
            return data.notes || [];
        } catch (error) {
            console.error('Erreur:', error);
            // Retourner les notes du localStorage en cas d'erreur
            return Utils.loadFromLocalStorage('notes', []);
        }
    },

    // Sauvegarder une note
    async saveNote(note) {
        try {
            const response = await fetch('/api/notes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(note),
            });

            if (!response.ok) throw new Error('Erreur lors de la sauvegarde');
            const data = await response.json();
            return data.note;
        } catch (error) {
            console.error('Erreur:', error);
            // Sauvegarder localement en cas d'erreur
            this.saveNoteLocally(note);
            return note;
        }
    },

    // Mettre à jour une note
    async updateNote(noteId, updates) {
        try {
            const response = await fetch(`/api/notes`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ noteId, updates }),
            });

            if (!response.ok) throw new Error('Erreur lors de la mise à jour');
            const data = await response.json();
            return data.note;
        } catch (error) {
            console.error('Erreur:', error);
            this.updateNoteLocally(noteId, updates);
            return { ...updates, _id: noteId };
        }
    },

    // Supprimer une note
    async deleteNote(noteId) {
        try {
            const response = await fetch(`/api/notes`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ noteId }),
            });

            if (!response.ok) throw new Error('Erreur lors de la suppression');
            return true;
        } catch (error) {
            console.error('Erreur:', error);
            this.deleteNoteLocally(noteId);
            return true;
        }
    },

    // Sauvegarder localement
    saveNoteLocally(note) {
        const notes = Utils.loadFromLocalStorage('notes', []);
        const existingIndex = notes.findIndex(n => n._id === note._id);
        
        if (existingIndex >= 0) {
            notes[existingIndex] = note;
        } else {
            notes.push(note);
        }
        
        Utils.saveToLocalStorage('notes', notes);
    },

    // Mettre à jour localement
    updateNoteLocally(noteId, updates) {
        const notes = Utils.loadFromLocalStorage('notes', []);
        const index = notes.findIndex(n => n._id === noteId);
        
        if (index >= 0) {
            notes[index] = { ...notes[index], ...updates };
            Utils.saveToLocalStorage('notes', notes);
        }
    },

    // Supprimer localement
    deleteNoteLocally(noteId) {
        let notes = Utils.loadFromLocalStorage('notes', []);
        notes = notes.filter(n => n._id !== noteId);
        Utils.saveToLocalStorage('notes', notes);
    },

    // Synchroniser les données
    async syncData() {
        try {
            AppState.isSyncing = true;
            UI.updateSyncStatus('Synchronisation...');

            // Récupérer les notes du serveur
            const serverNotes = await this.getAllNotes();
            const localNotes = Utils.loadFromLocalStorage('notes', []);

            // Fusionner les données
            const mergedNotes = this.mergeNotes(serverNotes, localNotes);

            // Mettre à jour l'état
            AppState.notes = mergedNotes;
            Utils.saveToLocalStorage('notes', mergedNotes);

            AppState.isSyncing = false;
            UI.updateSyncStatus('Synchronisé');
            UI.showToast('Synchronisation réussie', 'success');
            
            return mergedNotes;
        } catch (error) {
            console.error('Erreur de synchronisation:', error);
            AppState.isSyncing = false;
            UI.updateSyncStatus('Erreur de sync');
            UI.showToast('Erreur de synchronisation', 'error');
            return AppState.notes;
        }
    },

    // Fusionner les notes locales et serveur
    mergeNotes(serverNotes, localNotes) {
        const notesMap = new Map();

        // Ajouter les notes du serveur
        serverNotes.forEach(note => {
            notesMap.set(note._id, note);
        });

        // Fusionner avec les notes locales
        localNotes.forEach(localNote => {
            const serverNote = notesMap.get(localNote._id);
            
            if (!serverNote) {
                // Note locale uniquement, garder la locale
                notesMap.set(localNote._id, localNote);
            } else {
                // Les deux existent, garder la plus récente
                const localDate = new Date(localNote.modifiedAt);
                const serverDate = new Date(serverNote.modifiedAt);
                
                if (localDate > serverDate) {
                    notesMap.set(localNote._id, localNote);
                }
            }
        });

        return Array.from(notesMap.values());
    },
};

// ========================================
// GESTION DES NOTES
// ========================================

const NotesManager = {
    // Créer une nouvelle note
    createNote(data = {}) {
        const now = new Date().toISOString();
        return {
            _id: Utils.generateId(),
            title: data.title || 'Sans titre',
            content: data.content || '',
            category: data.category || '',
            tags: data.tags || [],
            isFavorite: data.isFavorite || false,
            isArchived: data.isArchived || false,
            isDeleted: data.isDeleted || false,
            createdAt: now,
            modifiedAt: now,
            deviceId: AppState.deviceId,
        };
    },

    // Sauvegarder une note
    async saveNote(noteData) {
        try {
            const note = this.createNote(noteData);
            await DatabaseManager.saveNote(note);
            AppState.notes.push(note);
            Utils.saveToLocalStorage('notes', AppState.notes);
            UI.showToast('Note enregistrée', 'success');
            return note;
        } catch (error) {
            console.error('Erreur:', error);
            UI.showToast('Erreur lors de l\'enregistrement', 'error');
            return null;
        }
    },

    // Mettre à jour une note
    async updateNote(noteId, updates) {
        try {
            updates.modifiedAt = new Date().toISOString();
            await DatabaseManager.updateNote(noteId, updates);
            
            const index = AppState.notes.findIndex(n => n._id === noteId);
            if (index >= 0) {
                AppState.notes[index] = { ...AppState.notes[index], ...updates };
                Utils.saveToLocalStorage('notes', AppState.notes);
            }
            
            UI.showToast('Note mise à jour', 'success');
            return true;
        } catch (error) {
            console.error('Erreur:', error);
            UI.showToast('Erreur lors de la mise à jour', 'error');
            return false;
        }
    },

    // Supprimer une note
    async deleteNote(noteId, permanent = false) {
        try {
            if (permanent) {
                await DatabaseManager.deleteNote(noteId);
                AppState.notes = AppState.notes.filter(n => n._id !== noteId);
            } else {
                // Déplacer vers la corbeille
                await this.updateNote(noteId, { isDeleted: true });
            }
            
            Utils.saveToLocalStorage('notes', AppState.notes);
            UI.showToast('Note supprimée', 'success');
            return true;
        } catch (error) {
            console.error('Erreur:', error);
            UI.showToast('Erreur lors de la suppression', 'error');
            return false;
        }
    },

    // Restaurer une note
    async restoreNote(noteId) {
        return await this.updateNote(noteId, { isDeleted: false });
    },

    // Basculer le favori
    async toggleFavorite(noteId) {
        const note = AppState.notes.find(n => n._id === noteId);
        if (note) {
            return await this.updateNote(noteId, { isFavorite: !note.isFavorite });
        }
    },

    // Basculer l'archivage
    async toggleArchive(noteId) {
        const note = AppState.notes.find(n => n._id === noteId);
        if (note) {
            return await this.updateNote(noteId, { isArchived: !note.isArchived });
        }
    },

    // Filtrer les notes
    filterNotes() {
        let filtered = [...AppState.notes];

        // Filtrer par vue
        switch (AppState.currentView) {
            case 'all-notes':
                filtered = filtered.filter(n => !n.isDeleted && !n.isArchived);
                break;
            case 'favorites':
                filtered = filtered.filter(n => !n.isDeleted && n.isFavorite);
                break;
            case 'archive':
                filtered = filtered.filter(n => n.isArchived && !n.isDeleted);
                break;
            case 'trash':
                filtered = filtered.filter(n => n.isDeleted);
                break;
        }

        // Filtrer par catégorie
        if (AppState.categoryFilter !== 'all') {
            filtered = filtered.filter(n => n.category === AppState.categoryFilter);
        }

        // Filtrer par recherche
        if (AppState.searchQuery) {
            const query = AppState.searchQuery.toLowerCase();
            filtered = filtered.filter(n =>
                n.title.toLowerCase().includes(query) ||
                Utils.stripHtml(n.content).toLowerCase().includes(query) ||
                n.tags.some(tag => tag.toLowerCase().includes(query))
            );
        }

        // Trier
        filtered.sort((a, b) => {
            switch (AppState.sortBy) {
                case 'date-desc':
                    return new Date(b.modifiedAt) - new Date(a.modifiedAt);
                case 'date-asc':
                    return new Date(a.modifiedAt) - new Date(b.modifiedAt);
                case 'title-asc':
                    return a.title.localeCompare(b.title);
                case 'title-desc':
                    return b.title.localeCompare(a.title);
                case 'modified':
                    return new Date(b.modifiedAt) - new Date(a.modifiedAt);
                default:
                    return 0;
            }
        });

        return filtered;
    },

    // Exporter toutes les notes
    exportNotes() {
        const data = JSON.stringify(AppState.notes, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `notes-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        UI.showToast('Notes exportées', 'success');
    },

    // Vider la corbeille
    async emptyTrash() {
        const trashedNotes = AppState.notes.filter(n => n.isDeleted);
        
        for (const note of trashedNotes) {
            await this.deleteNote(note._id, true);
        }
        
        UI.showToast('Corbeille vidée', 'success');
        UI.renderNotes();
    },
};

// ========================================
// INTELLIGENCE ARTIFICIELLE
// ========================================

const AIManager = {
    // Appeler l'API Google AI
    async callGoogleAI(prompt) {
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${CONFIG.GOOGLE_AI_API_KEY}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }]
                }),
            });

            if (!response.ok) {
                throw new Error('Erreur lors de l\'appel à l\'API');
            }

            const data = await response.json();
            return data.candidates[0].content.parts[0].text;
        } catch (error) {
            console.error('Erreur AI:', error);
            throw error;
        }
    },

    // Améliorer le texte
    async improveText(text) {
        const prompt = `Améliore ce texte en le rendant plus clair, professionnel et bien structuré. Conserve le sens original mais améliore le style et la clarté. Texte: "${text}"`;
        return await this.callGoogleAI(prompt);
    },

    // Corriger la grammaire
    async correctGrammar(text) {
        const prompt = `Corrige uniquement les fautes d'orthographe et de grammaire dans ce texte, sans changer le style ou le sens. Texte: "${text}"`;
        return await this.callGoogleAI(prompt);
    },

    // Résumer le texte
    async summarize(text) {
        const prompt = `Résume ce texte de manière concise en conservant les points principaux. Texte: "${text}"`;
        return await this.callGoogleAI(prompt);
    },

    // Développer le texte
    async expand(text) {
        const prompt = `Développe ce texte en ajoutant plus de détails, d'exemples et d'explications pertinentes. Texte: "${text}"`;
        return await this.callGoogleAI(prompt);
    },

    // Traduire
    async translate(text, targetLang = 'en') {
        const prompt = `Traduis ce texte en ${targetLang === 'en' ? 'anglais' : 'français'}. Texte: "${text}"`;
        return await this.callGoogleAI(prompt);
    },

    // Convertir en points
    async convertToBulletPoints(text) {
        const prompt = `Convertis ce texte en liste à puces bien organisée avec les points principaux. Texte: "${text}"`;
        return await this.callGoogleAI(prompt);
    },
};

// ========================================
// INTERFACE UTILISATEUR
// ========================================

const UI = {
    // Initialiser l'UI
    initialize() {
        this.setupEventListeners();
        this.loadSettings();
        this.updateCounts();
    },

    // Configurer les écouteurs d'événements
    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const view = e.currentTarget.dataset.view;
                this.changeView(view);
            });
        });

        // Recherche
        const searchInput = document.getElementById('search-input');
        searchInput.addEventListener('input', Utils.debounce((e) => {
            AppState.searchQuery = e.target.value;
            this.renderNotes();
        }, 300));

        // Boutons
        document.getElementById('new-note-btn').addEventListener('click', () => this.openNoteModal());
        document.getElementById('empty-new-note-btn').addEventListener('click', () => this.openNoteModal());
        document.getElementById('sync-btn').addEventListener('click', () => DatabaseManager.syncData().then(() => this.renderNotes()));
        document.getElementById('settings-btn').addEventListener('click', () => this.openSettingsModal());
        document.getElementById('mobile-menu-toggle').addEventListener('click', () => this.toggleSidebar());

        // Tri et filtres
        document.getElementById('sort-select').addEventListener('change', (e) => {
            AppState.sortBy = e.target.value;
            this.renderNotes();
        });

        document.getElementById('category-filter').addEventListener('change', (e) => {
            AppState.categoryFilter = e.target.value;
            this.renderNotes();
        });

        // Modal de note
        document.getElementById('close-note-modal').addEventListener('click', () => this.closeNoteModal());
        document.getElementById('cancel-note-btn').addEventListener('click', () => this.closeNoteModal());
        document.getElementById('save-note-btn').addEventListener('click', () => this.saveCurrentNote());
        document.getElementById('delete-note-btn').addEventListener('click', () => this.deleteCurrentNote());

        // Éditeur de note
        const contentEditor = document.getElementById('note-content-editor');
        const titleInput = document.getElementById('note-title-input');

        contentEditor.addEventListener('input', () => this.updateNoteStats());
        titleInput.addEventListener('input', () => this.updateNoteStats());

        // Tags
        const tagInput = document.getElementById('tag-input');
        tagInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.addTag(tagInput.value.trim());
                tagInput.value = '';
            }
        });

        // Toolbar
        document.querySelectorAll('.toolbar-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.currentTarget.dataset.action;
                if (action) this.applyFormat(action);
            });
        });

        // IA
        document.getElementById('ai-enhance-btn').addEventListener('click', () => this.openAIModal());
        document.getElementById('close-ai-modal').addEventListener('click', () => this.closeAIModal());
        document.getElementById('ai-cancel').addEventListener('click', () => this.closeAIModal());
        document.getElementById('ai-apply').addEventListener('click', () => this.applyAIResult());

        document.querySelectorAll('.ai-option-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.currentTarget.dataset.action;
                this.processWithAI(action);
            });
        });

        // Paramètres
        document.getElementById('close-settings-modal').addEventListener('click', () => this.closeSettingsModal());
        document.getElementById('theme-select').addEventListener('change', (e) => this.changeTheme(e.target.value));
        document.getElementById('export-data-btn').addEventListener('click', () => NotesManager.exportNotes());
        document.getElementById('clear-trash-btn').addEventListener('click', () => {
            if (confirm('Voulez-vous vraiment vider la corbeille ?')) {
                NotesManager.emptyTrash();
            }
        });

        document.getElementById('add-category-btn').addEventListener('click', () => this.addCustomCategory());

        // Fermeture des modals en cliquant à l'extérieur
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('show');
                }
            });
        });
    },

    // Charger les paramètres
    loadSettings() {
        const settings = Utils.loadFromLocalStorage('settings', AppState.settings);
        AppState.settings = settings;
        
        document.getElementById('theme-select').value = settings.theme;
        document.getElementById('font-size-select').value = settings.fontSize;
        document.getElementById('auto-sync').checked = settings.autoSync;

        this.applySettings();
    },

    // Appliquer les paramètres
    applySettings() {
        if (AppState.settings.theme === 'dark') {
            document.body.setAttribute('data-theme', 'dark');
        } else {
            document.body.removeAttribute('data-theme');
        }

        document.body.className = `font-${AppState.settings.fontSize}`;
    },

    // Changer le thème
    changeTheme(theme) {
        AppState.settings.theme = theme;
        Utils.saveToLocalStorage('settings', AppState.settings);
        this.applySettings();
    },

    // Changer de vue
    changeView(view) {
        AppState.currentView = view;

        // Mettre à jour la navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-view="${view}"]`).classList.add('active');

        // Mettre à jour le titre
        const titles = {
            'all-notes': 'Toutes les notes',
            'favorites': 'Favoris',
            'categories': 'Catégories',
            'archive': 'Archives',
            'trash': 'Corbeille',
        };
        document.getElementById('view-title').textContent = titles[view] || 'Notes';

        this.renderNotes();
    },

    // Afficher les notes
    renderNotes() {
        const container = document.getElementById('notes-grid');
        const emptyState = document.getElementById('empty-state');
        const filtered = NotesManager.filterNotes();

        container.innerHTML = '';

        if (filtered.length === 0) {
            container.style.display = 'none';
            emptyState.classList.add('show');
        } else {
            container.style.display = 'grid';
            emptyState.classList.remove('show');

            filtered.forEach(note => {
                const card = this.createNoteCard(note);
                container.appendChild(card);
            });
        }

        this.updateCounts();
    },

    // Créer une carte de note
    createNoteCard(note) {
        const card = document.createElement('div');
        card.className = 'note-card';
        card.dataset.noteId = note._id;

        const preview = Utils.stripHtml(note.content);
        const previewText = Utils.truncateText(preview);

        card.innerHTML = `
            <div class="note-card-header">
                <h3 class="note-title">${note.title}</h3>
                <button class="note-favorite-btn ${note.isFavorite ? 'active' : ''}" data-note-id="${note._id}">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="${note.isFavorite ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                    </svg>
                </button>
            </div>
            <p class="note-content-preview">${previewText}</p>
            <div class="note-card-footer">
                <div class="note-meta">
                    ${note.category ? `<span class="note-category">${note.category}</span>` : ''}
                    <span class="note-date">${Utils.formatDate(note.modifiedAt)}</span>
                </div>
            </div>
            ${note.tags.length > 0 ? `
                <div class="note-tags">
                    ${note.tags.map(tag => `<span class="note-tag">${tag}</span>`).join('')}
                </div>
            ` : ''}
        `;

        // Événements
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.note-favorite-btn')) {
                this.openNoteModal(note);
            }
        });

        const favoriteBtn = card.querySelector('.note-favorite-btn');
        favoriteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            NotesManager.toggleFavorite(note._id).then(() => this.renderNotes());
        });

        return card;
    },

    // Ouvrir le modal de note
    openNoteModal(note = null) {
        const modal = document.getElementById('note-modal');
        const title = document.getElementById('note-title-input');
        const content = document.getElementById('note-content-editor');
        const category = document.getElementById('note-category');
        const favorite = document.getElementById('note-favorite');
        const deleteBtn = document.getElementById('delete-note-btn');
        const modalTitle = document.getElementById('modal-title');
        const tagsList = document.getElementById('tags-list');

        if (note) {
            AppState.currentNote = note;
            modalTitle.textContent = 'Modifier la note';
            title.value = note.title;
            content.innerHTML = note.content;
            category.value = note.category || '';
            favorite.checked = note.isFavorite;
            deleteBtn.style.display = 'inline-flex';

            // Afficher les tags
            tagsList.innerHTML = '';
            note.tags.forEach(tag => {
                this.addTagElement(tag);
            });
        } else {
            AppState.currentNote = null;
            modalTitle.textContent = 'Nouvelle note';
            title.value = '';
            content.innerHTML = '';
            category.value = '';
            favorite.checked = false;
            deleteBtn.style.display = 'none';
            tagsList.innerHTML = '';
        }

        this.updateNoteStats();
        modal.classList.add('show');
        title.focus();
    },

    // Fermer le modal de note
    closeNoteModal() {
        const modal = document.getElementById('note-modal');
        modal.classList.remove('show');
        AppState.currentNote = null;
    },

    // Sauvegarder la note courante
    async saveCurrentNote() {
        const title = document.getElementById('note-title-input').value.trim();
        const content = document.getElementById('note-content-editor').innerHTML;
        const category = document.getElementById('note-category').value;
        const isFavorite = document.getElementById('note-favorite').checked;
        const tagsList = document.getElementById('tags-list');
        const tags = Array.from(tagsList.querySelectorAll('.tag-item')).map(el => el.textContent.replace('×', '').trim());

        if (!title && !content) {
            UI.showToast('Veuillez remplir au moins le titre ou le contenu', 'warning');
            return;
        }

        const noteData = {
            title: title || 'Sans titre',
            content,
            category,
            isFavorite,
            tags,
        };

        if (AppState.currentNote) {
            await NotesManager.updateNote(AppState.currentNote._id, noteData);
        } else {
            await NotesManager.saveNote(noteData);
        }

        this.closeNoteModal();
        this.renderNotes();
    },

    // Supprimer la note courante
    async deleteCurrentNote() {
        if (!AppState.currentNote) return;

        const confirmed = confirm('Voulez-vous vraiment supprimer cette note ?');
        if (!confirmed) return;

        await NotesManager.deleteNote(AppState.currentNote._id);
        this.closeNoteModal();
        this.renderNotes();
    },

    // Mettre à jour les statistiques de la note
    updateNoteStats() {
        const content = document.getElementById('note-content-editor').innerText;
        const charCount = content.length;
        const wordCount = Utils.countWords(content);

        document.getElementById('char-count').textContent = `${charCount} caractères`;
        document.getElementById('word-count').textContent = `${wordCount} mots`;
    },

    // Ajouter un tag
    addTag(tag) {
        if (!tag) return;
        
        const tagsList = document.getElementById('tags-list');
        const existingTags = Array.from(tagsList.querySelectorAll('.tag-item')).map(el => el.textContent.replace('×', '').trim());
        
        if (existingTags.includes(tag)) return;

        this.addTagElement(tag);
    },

    // Ajouter un élément tag
    addTagElement(tag) {
        const tagsList = document.getElementById('tags-list');
        const tagEl = document.createElement('span');
        tagEl.className = 'tag-item';
        tagEl.innerHTML = `
            ${tag}
            <button class="tag-remove">×</button>
        `;

        tagEl.querySelector('.tag-remove').addEventListener('click', () => {
            tagEl.remove();
        });

        tagsList.appendChild(tagEl);
    },

    // Appliquer un format
    applyFormat(format) {
        const editor = document.getElementById('note-content-editor');
        editor.focus();

        switch (format) {
            case 'bold':
                document.execCommand('bold', false, null);
                break;
            case 'italic':
                document.execCommand('italic', false, null);
                break;
            case 'underline':
                document.execCommand('underline', false, null);
                break;
            case 'strikethrough':
                document.execCommand('strikeThrough', false, null);
                break;
            case 'heading':
                document.execCommand('formatBlock', false, '<h2>');
                break;
            case 'list-ul':
                document.execCommand('insertUnorderedList', false, null);
                break;
            case 'list-ol':
                document.execCommand('insertOrderedList', false, null);
                break;
            case 'link':
                const url = prompt('Entrez l\'URL:');
                if (url) document.execCommand('createLink', false, url);
                break;
            case 'code':
                document.execCommand('formatBlock', false, '<pre>');
                break;
            case 'checkbox':
                const selection = window.getSelection();
                if (selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0);
                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    range.insertNode(checkbox);
                }
                break;
        }
    },

    // Ouvrir le modal IA
    openAIModal() {
        const content = document.getElementById('note-content-editor').innerText;
        if (!content.trim()) {
            this.showToast('Veuillez écrire du texte avant d\'utiliser l\'IA', 'warning');
            return;
        }

        const modal = document.getElementById('ai-modal');
        const result = document.getElementById('ai-result');
        result.style.display = 'none';
        modal.classList.add('show');
    },

    // Fermer le modal IA
    closeAIModal() {
        const modal = document.getElementById('ai-modal');
        modal.classList.remove('show');
    },

    // Traiter avec l'IA
    async processWithAI(action) {
        const content = document.getElementById('note-content-editor').innerText;
        const result = document.getElementById('ai-result');
        const output = document.getElementById('ai-output');

        result.style.display = 'block';
        output.style.display = 'none';
        document.querySelector('.ai-loading').style.display = 'flex';

        try {
            let aiResult;

            switch (action) {
                case 'improve':
                    aiResult = await AIManager.improveText(content);
                    break;
                case 'grammar':
                    aiResult = await AIManager.correctGrammar(content);
                    break;
                case 'summarize':
                    aiResult = await AIManager.summarize(content);
                    break;
                case 'expand':
                    aiResult = await AIManager.expand(content);
                    break;
                case 'translate':
                    aiResult = await AIManager.translate(content);
                    break;
                case 'bullets':
                    aiResult = await AIManager.convertToBulletPoints(content);
                    break;
            }

            document.querySelector('.ai-loading').style.display = 'none';
            output.textContent = aiResult;
            output.style.display = 'block';
            output.dataset.result = aiResult;
        } catch (error) {
            this.showToast('Erreur lors du traitement IA', 'error');
            this.closeAIModal();
        }
    },

    // Appliquer le résultat de l'IA
    applyAIResult() {
        const output = document.getElementById('ai-output');
        const result = output.dataset.result;
        
        if (result) {
            document.getElementById('note-content-editor').innerText = result;
            this.updateNoteStats();
            this.closeAIModal();
            this.showToast('Texte amélioré par l\'IA appliqué', 'success');
        }
    },

    // Ouvrir le modal de paramètres
    openSettingsModal() {
        const modal = document.getElementById('settings-modal');
        modal.classList.add('show');
        this.renderCategories();
    },

    // Fermer le modal de paramètres
    closeSettingsModal() {
        const modal = document.getElementById('settings-modal');
        modal.classList.remove('show');
    },

    // Ajouter une catégorie personnalisée
    addCustomCategory() {
        const input = document.getElementById('new-category-input');
        const category = input.value.trim().toLowerCase();

        if (!category) return;

        if (AppState.categories.includes(category)) {
            this.showToast('Cette catégorie existe déjà', 'warning');
            return;
        }

        AppState.categories.push(category);
        Utils.saveToLocalStorage('categories', AppState.categories);
        
        input.value = '';
        this.renderCategories();
        this.updateCategoryFilters();
        this.showToast('Catégorie ajoutée', 'success');
    },

    // Afficher les catégories
    renderCategories() {
        const list = document.getElementById('categories-list');
        list.innerHTML = '';

        AppState.categories.forEach(category => {
            const item = document.createElement('div');
            item.className = 'category-item';
            item.innerHTML = `
                <span>${category}</span>
                <button class="btn-secondary" onclick="UI.removeCategory('${category}')">Supprimer</button>
            `;
            list.appendChild(item);
        });
    },

    // Supprimer une catégorie
    removeCategory(category) {
        AppState.categories = AppState.categories.filter(c => c !== category);
        Utils.saveToLocalStorage('categories', AppState.categories);
        this.renderCategories();
        this.updateCategoryFilters();
    },

    // Mettre à jour les filtres de catégories
    updateCategoryFilters() {
        const categorySelect = document.getElementById('note-category');
        const categoryFilter = document.getElementById('category-filter');

        // Mettre à jour le select de l'éditeur
        categorySelect.innerHTML = '<option value="">Sélectionner une catégorie</option>';
        AppState.categories.forEach(cat => {
            categorySelect.innerHTML += `<option value="${cat}">${cat}</option>`;
        });

        // Mettre à jour le filtre
        categoryFilter.innerHTML = '<option value="all">Toutes catégories</option>';
        AppState.categories.forEach(cat => {
            categoryFilter.innerHTML += `<option value="${cat}">${cat}</option>`;
        });
    },

    // Mettre à jour les compteurs
    updateCounts() {
        const all = AppState.notes.filter(n => !n.isDeleted && !n.isArchived).length;
        const favorites = AppState.notes.filter(n => !n.isDeleted && n.isFavorite).length;
        const archive = AppState.notes.filter(n => n.isArchived && !n.isDeleted).length;
        const trash = AppState.notes.filter(n => n.isDeleted).length;

        document.getElementById('all-notes-count').textContent = all;
        document.getElementById('favorites-count').textContent = favorites;
        document.getElementById('archive-count').textContent = archive;
        document.getElementById('trash-count').textContent = trash;
    },

    // Mettre à jour le statut de synchronisation
    updateSyncStatus(status) {
        document.getElementById('sync-status').textContent = status;
    },

    // Toggle sidebar
    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        sidebar.classList.toggle('open');
    },

    // Afficher un toast
    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                ${type === 'success' ? '<polyline points="20 6 9 17 4 12"></polyline>' : ''}
                ${type === 'error' ? '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>' : ''}
                ${type === 'warning' ? '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>' : ''}
                ${type === 'info' ? '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line>' : ''}
            </svg>
            <span>${message}</span>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideInRight 0.3s ease-out reverse';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },
};

// ========================================
// INITIALISATION
// ========================================

async function initApp() {
    // Afficher l'écran de chargement
    const loadingScreen = document.getElementById('loading-screen');

    try {
        // Obtenir l'ID de l'appareil
        AppState.deviceId = Utils.getDeviceId();

        // Initialiser la connexion à la base de données
        await DatabaseManager.initialize();

        // Charger les catégories personnalisées
        const savedCategories = Utils.loadFromLocalStorage('categories');
        if (savedCategories) {
            AppState.categories = savedCategories;
        }

        // Synchroniser les données
        await DatabaseManager.syncData();

        // Initialiser l'UI
        UI.initialize();
        UI.updateCategoryFilters();
        UI.renderNotes();

        // Configuration de la synchronisation automatique
        if (AppState.settings.autoSync) {
            setInterval(async () => {
                if (!AppState.isSyncing) {
                    await DatabaseManager.syncData();
                    UI.renderNotes();
                }
            }, CONFIG.AUTO_SYNC_INTERVAL);
        }

        // Masquer l'écran de chargement
        setTimeout(() => {
            loadingScreen.classList.add('hidden');
        }, 1000);

        console.log('Application initialisée avec succès');
    } catch (error) {
        console.error('Erreur lors de l\'initialisation:', error);
        UI.showToast('Erreur lors du chargement de l\'application', 'error');
        
        // Charger quand même les données locales
        AppState.notes = Utils.loadFromLocalStorage('notes', []);
        UI.initialize();
        UI.updateCategoryFilters();
        UI.renderNotes();

        setTimeout(() => {
            loadingScreen.classList.add('hidden');
        }, 1000);
    }
}

// Démarrer l'application quand le DOM est prêt
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// Gérer la fermeture de la fenêtre
window.addEventListener('beforeunload', () => {
    // Sauvegarder les paramètres
    Utils.saveToLocalStorage('settings', AppState.settings);
    Utils.saveToLocalStorage('categories', AppState.categories);
});
