const STORAGE_KEY = 'reminderhub_data';
const CATEGORIES_KEY = 'reminderhub_categories';
const TAGS_KEY = 'reminderhub_tags';
const THEME_KEY = 'reminderhub_theme';
const DEFAULT_CATEGORIES = ['Università', 'Biblioteca', 'Lezioni', 'Personale', 'Lavoro', 'Altro'];
const DEFAULT_TAGS = [{name: 'Urgente', color: 'danger'}, {name: 'Università', color: 'primary'}];

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 App avviata');
    initData();
    initTheme();
    populateAllFilters();
    renderAll();
    setupEventListeners();
    autoDeleteExpiredReminders();
});

function initData() {
    if (!localStorage.getItem(STORAGE_KEY)) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    }
    if (!localStorage.getItem(CATEGORIES_KEY)) {
        localStorage.setItem(CATEGORIES_KEY, JSON.stringify(DEFAULT_CATEGORIES));
        console.log('✅ Categorie default inizializzate:', DEFAULT_CATEGORIES);
    }
    if (!localStorage.getItem(TAGS_KEY)) {
        localStorage.setItem(TAGS_KEY, JSON.stringify(DEFAULT_TAGS));
        console.log('✅ Tag default inizializzati:', DEFAULT_TAGS);
    }
}

function getReminders() { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
function saveReminders(r) { localStorage.setItem(STORAGE_KEY, JSON.stringify(r)); }
function getCategories() { return JSON.parse(localStorage.getItem(CATEGORIES_KEY) || JSON.stringify(DEFAULT_CATEGORIES)); }
function saveCategories(c) { localStorage.setItem(CATEGORIES_KEY, JSON.stringify(c)); }
function getTags() { return JSON.parse(localStorage.getItem(TAGS_KEY) || JSON.stringify(DEFAULT_TAGS)); }
function saveTags(t) { localStorage.setItem(TAGS_KEY, JSON.stringify(t)); }
function generateId() { return Date.now().toString(36) + Math.random().toString(36).substr(2); }

function populateAllFilters() {
    console.log('🔄 Popolo i filtri...');
    const categories = getCategories();
    const tags = getTags();
    console.log('📁 Categorie:', categories);
    console.log('��️ Tag:', tags);

    // Popola filtro categoria
    const catFilter = document.getElementById('categoryFilter');
    if (catFilter) {
        catFilter.innerHTML = '<option value="tutte">Tutte</option>' + 
            categories.map(c => `<option value="${c}">${c}</option>`).join('');
    }

    // Popola filtro tag
    const tagFilter = document.getElementById('tagFilter');
    if (tagFilter) {
        tagFilter.innerHTML = '<option value="tutti">Tutti</option>' + 
            tags.map(t => `<option value="${t.name}">${t.name}</option>`).join('');
    }

    // Popola select categoria nel form
    const catInput = document.getElementById('categoryInput');
    if (catInput) {
        catInput.innerHTML = categories.map(c => `<option value="${c}">${c}</option>`).join('');
    }
}

function renderAll() {
    renderCategories();
    renderTags();
    renderCategoriesDisplay();
    renderQuickTags();
    renderReminders();
}

function getDaysLeft(dueDate) {
    if (!dueDate) return null;
    const today = new Date(); today.setHours(0,0,0,0);
    return Math.ceil((new Date(dueDate) - today) / (1000 * 60 * 60 * 24));
}

function getStatusClass(r) {
    if (r.checked) return 'checked';
    const days = getDaysLeft(r.dueDate);
    if (days === null) return 'no-date';
    if (days < 0) return 'overdue';
    if (days === 0) return 'today';
    if (days <= 3) return 'urgent';
    if (days <= 7) return 'soon';
    return 'ok';
}

function getStatusLabel(r) {
    if (r.checked) return '✓ Controllato';
    const days = getDaysLeft(r.dueDate);
    if (days === null) return 'Nessuna data';
    if (days < 0) return `Scaduto da ${-days}g`;
    if (days === 0) return 'Oggi!';
    if (days === 1) return 'Domani';
    return `Tra ${days} giorni`;
}

function renderReminders() {
    const reminders = getReminders();
    const search = document.getElementById('searchInput').value.toLowerCase();
    const category = document.getElementById('categoryFilter').value;
    const tag = document.getElementById('tagFilter').value;
    const priority = document.getElementById('priorityFilter').value;
    const status = document.getElementById('statusFilter').value;

    let filtered = reminders.filter(r => {
        const matchSearch = !search || (r.title && r.title.toLowerCase().includes(search)) || (r.description && r.description.toLowerCase().includes(search));
        const matchCategory = category === 'tutte' || r.category === category;
        const matchTag = tag === 'tutti' || (r.tags && r.tags.includes(tag));
        const matchPriority = priority === 'tutte' || r.priority === priority;
        const matchStatus = status === 'tutti' || (status === 'attivi' && !r.checked) || (status === 'completati' && r.checked);
        return matchSearch && matchCategory && matchTag && matchPriority && matchStatus;
    });

    filtered.sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate) - new Date(b.dueDate);
    });

    const list = document.getElementById('remindersList');
    if (filtered.length === 0) {
        list.innerHTML = `<div class="col-12 text-center py-5"><i class="bi bi-inbox display-1 text-muted"></i><p class="text-muted mt-3">Nessun promemoria trovato.</p></div>`;
        return;
    }

    list.innerHTML = filtered.map(r => {
        const statusClass = getStatusClass(r);
        const priorityBadge = r.priority === 'alta' ? 'danger' : (r.priority === 'media' ? 'warning text-dark' : 'info');
        const btnToggleClass = r.checked ? 'secondary' : 'success';
        const btnToggleIcon = r.checked ? 'arrow-counterclockwise' : 'check2-circle';
        const titleClass = r.checked ? 'text-decoration-line-through text-muted' : '';
        const tagsHtml = r.tags && r.tags.length > 0 ? r.tags.map(t => `<span class="badge bg-${getTagColor(t)} me-1" style="cursor:pointer" onclick="filterByTag('${t}')">${t}</span>`).join('') : '';

        return `
            <div class="col-md-6 col-lg-4">
                <div class="card reminder-card h-100 shadow-sm status-${statusClass}">
                    <div class="card-body">
                        <div class="d-flex justify-content-between mb-2">
                            <span class="badge bg-secondary-subtle text-secondary"><i class="bi bi-folder-fill me-1"></i>${r.category || 'Nessuna'}</span>
                            <span class="badge bg-${priorityBadge}">${(r.priority || 'media').charAt(0).toUpperCase() + (r.priority || 'media').slice(1)}</span>
                        </div>
                        <h5 class="card-title mb-1 ${titleClass}">${escapeHtml(r.title || 'Senza titolo')}</h5>
                        ${r.description ? `<p class="card-text small text-muted mb-2">${escapeHtml(r.description)}</p>` : ''}
                        ${tagsHtml ? `<div class="mb-2">${tagsHtml}</div>` : ''}
                        <div class="d-flex align-items-center justify-content-between mt-2">
                            <div><i class="bi bi-calendar3 me-1"></i><small>${r.dueDate ? formatDate(r.dueDate) : 'Nessuna data'}</small></div>
                            <span class="status-badge bg-${getBadgeColor(statusClass)} text-${getTextColor(statusClass)}">${getStatusLabel(r)}</span>
                        </div>
                    </div>
                    <div class="card-footer bg-transparent border-top-0 d-flex gap-1">
                        <button onclick="toggleReminder('${r.id}')" class="btn btn-sm btn-outline-${btnToggleClass} flex-fill"><i class="bi bi-${btnToggleIcon}"></i></button>
                        <button onclick="editReminder('${r.id}')" class="btn btn-sm btn-outline-primary flex-fill"><i class="bi bi-pencil"></i></button>
                        <button onclick="deleteReminder('${r.id}')" class="btn btn-sm btn-outline-danger flex-fill"><i class="bi bi-trash"></i></button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function renderCategories() {
    const list = document.getElementById('categoriesList');
    if (list) {
        list.innerHTML = getCategories().map(c => `
            <div class="list-group-item d-flex justify-content-between align-items-center">
                ${c}
                ${c !== 'Altro' ? `<button class="btn btn-sm btn-outline-danger" onclick="deleteCategory('${c}')"><i class="bi bi-trash"></i></button>` : '<span class="text-muted small">Default</span>'}
            </div>
        `).join('');
    }
}

function renderCategoriesDisplay() {
    const container = document.getElementById('categoriesDisplay');
    if (container) {
        const categories = getCategories();
        container.innerHTML = categories.length ? categories.map(c => `<span class="badge bg-secondary p-2"><i class="bi bi-folder-fill me-1"></i>${c}</span>`).join('') : '<span class="text-muted small">Nessuna categoria.</span>';
    }
}

function addCategory() {
    const input = document.getElementById('newCategoryInput');
    const name = input.value.trim();
    if (!name) return;
    const categories = getCategories();
    if (categories.includes(name)) return alert('Esiste già');
    categories.push(name);
    saveCategories(categories);
    input.value = '';
    populateAllFilters();
    renderAll();
}

function deleteCategory(name) {
    if (name === 'Altro') return;
    if (!confirm(`Eliminare "${name}"? I promemoria passeranno a "Altro".`)) return;
    saveCategories(getCategories().filter(c => c !== name));
    const reminders = getReminders();
    reminders.forEach(r => { if (r.category === name) r.category = 'Altro'; });
    saveReminders(reminders);
    populateAllFilters();
    renderAll();
}

function renderTags() {
    const list = document.getElementById('tagsList');
    if (list) {
        list.innerHTML = getTags().map(t => `<span class="badge bg-${t.color} p-2 d-flex align-items-center gap-2">${t.name}<button class="btn btn-sm btn-link text-white p-0" onclick="deleteTag('${t.name}')"><i class="bi bi-x-lg"></i></button></span>`).join('');
    }
    renderTagsSelector();
}

function renderQuickTags() {
    const container = document.getElementById('quickTags');
    if (container) {
        const tags = getTags();
        container.innerHTML = tags.length ? tags.map(t => `<span class="badge bg-${t.color} p-2" style="cursor:pointer" onclick="filterByTag('${t.name}')"><i class="bi bi-tag-fill me-1"></i>${t.name}</span>`).join('') : '<span class="text-muted small">Nessun tag.</span>';
    }
}

function addTag() {
    const input = document.getElementById('newTagInput');
    const name = input.value.trim();
    if (!name) return;
    const tags = getTags();
    if (tags.find(t => t.name === name)) return alert('Esiste già');
    const colors = ['primary','success','info','warning','danger','purple','pink'];
    tags.push({name, color: colors[Math.floor(Math.random() * colors.length)]});
    saveTags(tags);
    input.value = '';
    populateAllFilters();
    renderAll();
}

function deleteTag(name) {
    if (!confirm(`Eliminare il tag "${name}"?`)) return;
    saveTags(getTags().filter(t => t.name !== name));
    const reminders = getReminders();
    reminders.forEach(r => { if (r.tags) r.tags = r.tags.filter(t => t !== name); });
    saveReminders(reminders);
    populateAllFilters();
    renderAll();
}

function renderTagsSelector() {
    const container = document.getElementById('tagsSelector');
    const form = document.getElementById('reminderForm');
    if (container && form) {
        const tags = getTags();
        const selected = JSON.parse(form.dataset.selectedTags || '[]');
        container.innerHTML = tags.length ? tags.map(t => `<span class="badge bg-${t.color} p-2 ${selected.includes(t.name)?'border border-3 border-dark':''}" style="cursor:pointer;opacity:${selected.includes(t.name)?'1':'0.6'}" onclick="toggleTagSelector('${t.name}')">${t.name}</span>`).join('') : '<span class="text-muted small">Nessun tag disponibile.</span>';
    }
}

function toggleTagSelector(name) {
    const form = document.getElementById('reminderForm');
    let sel = JSON.parse(form.dataset.selectedTags || '[]');
    sel = sel.includes(name) ? sel.filter(t => t !== name) : [...sel, name];
    form.dataset.selectedTags = JSON.stringify(sel);
    renderTagsSelector();
}

function filterByTag(name) {
    document.getElementById('tagFilter').value = name;
    renderReminders();
}

function getTagColor(name) {
    const t = getTags().find(x => x.name === name);
    return t ? t.color : 'secondary';
}

function toggleReminder(id) {
    const reminders = getReminders();
    const r = reminders.find(x => x.id === id);
    if (r) {
        r.checked = !r.checked;
        saveReminders(reminders);
        renderReminders();
    }
}

function deleteReminder(id) {
    if (!confirm('Eliminare?')) return;
    saveReminders(getReminders().filter(r => r.id !== id));
    renderReminders();
}

function editReminder(id) {
    const r = getReminders().find(x => x.id === id);
    if (!r) return;
    const form = document.getElementById('reminderForm');
    form.dataset.selectedTags = JSON.stringify(r.tags || []);
    document.getElementById('reminderId').value = r.id;
    document.getElementById('titleInput').value = r.title || '';
    document.getElementById('descriptionInput').value = r.description || '';
    document.getElementById('categoryInput').value = r.category || 'Altro';
    document.getElementById('priorityInput').value = r.priority || 'media';
    document.getElementById('dateInput').value = r.dueDate || '';
    document.getElementById('autoDeleteInput').value = r.autoDeleteDate || '';
    document.getElementById('initialStatusInput').value = r.checked ? 'completato' : 'attivo';
    document.getElementById('modalTitle').textContent = 'Modifica promemoria';
    renderTagsSelector();
    new bootstrap.Modal(document.getElementById('reminderModal')).show();
}

function setupEventListeners() {
    document.getElementById('reminderForm').addEventListener('submit', handleFormSubmit);
    document.getElementById('searchInput').addEventListener('input', renderReminders);
    document.getElementById('categoryFilter').addEventListener('change', renderReminders);
    document.getElementById('tagFilter').addEventListener('change', renderReminders);
    document.getElementById('priorityFilter').addEventListener('change', renderReminders);
    document.getElementById('statusFilter').addEventListener('change', renderReminders);
    document.getElementById('clearFilters').addEventListener('click', () => {
        document.getElementById('searchInput').value = '';
        document.getElementById('categoryFilter').value = 'tutte';
        document.getElementById('tagFilter').value = 'tutti';
        document.getElementById('priorityFilter').value = 'tutte';
        document.getElementById('statusFilter').value = 'tutti';
        renderReminders();
    });
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    document.getElementById('reminderModal').addEventListener('hidden.bs.modal', () => {
        const form = document.getElementById('reminderForm');
        form.reset();
        form.dataset.selectedTags = '[]';
        document.getElementById('reminderId').value = '';
        document.getElementById('modalTitle').textContent = 'Nuovo promemoria';
        document.getElementById('initialStatusInput').value = 'attivo';
    });
    document.getElementById('newCategoryInput')?.addEventListener('keypress', (e) => { if (e.key === 'Enter') addCategory(); });
    document.getElementById('newTagInput')?.addEventListener('keypress', (e) => { if (e.key === 'Enter') addTag(); });
}

function handleFormSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('reminderId').value;
    const title = document.getElementById('titleInput').value.trim();
    const description = document.getElementById('descriptionInput').value.trim();
    const category = document.getElementById('categoryInput').value;
    const priority = document.getElementById('priorityInput').value;
    const dueDate = document.getElementById('dateInput').value;
    const autoDeleteDate = document.getElementById('autoDeleteInput').value;
    const initialStatus = document.getElementById('initialStatusInput').value;
    const tags = JSON.parse(document.getElementById('reminderForm').dataset.selectedTags || '[]');

    if (!title && !dueDate) return alert('Inserisci almeno un titolo o una data');

    const reminders = getReminders();
    if (id) {
        const r = reminders.find(x => x.id === id);
        if (r) Object.assign(r, {title, description, category, priority, dueDate, autoDeleteDate, tags});
    } else {
        reminders.push({id: generateId(), title, description, category, priority, dueDate, autoDeleteDate, tags, checked: initialStatus === 'completato', createdAt: new Date().toISOString()});
    }
    saveReminders(reminders);
    renderReminders();
    bootstrap.Modal.getInstance(document.getElementById('reminderModal')).hide();
}

function initTheme() {
    const saved = localStorage.getItem(THEME_KEY) || 'light';
    document.documentElement.setAttribute('data-bs-theme', saved);
    document.getElementById('themeToggle').innerHTML = saved === 'light' ? '<i class="bi bi-moon-stars-fill"></i>' : '<i class="bi bi-sun-fill"></i>';
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-bs-theme');
    const next = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-bs-theme', next);
    localStorage.setItem(THEME_KEY, next);
    document.getElementById('themeToggle').innerHTML = next === 'light' ? '<i class="bi bi-moon-stars-fill"></i>' : '<i class="bi bi-sun-fill"></i>';
}

function autoDeleteExpiredReminders() {
    const reminders = getReminders();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const filtered = reminders.filter(r => {
        if (!r.autoDeleteDate) return true;
        const deleteDate = new Date(r.autoDeleteDate);
        return deleteDate > today;
    });
    if (filtered.length !== reminders.length) {
        saveReminders(filtered);
    }
}

function formatDate(dateStr) {
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getBadgeColor(statusClass) {
    const colors = {overdue: 'danger', today: 'warning', urgent: 'primary', soon: 'primary', ok: 'success', checked: 'secondary', 'no-date': 'secondary'};
    return colors[statusClass] || 'secondary';
}

function getTextColor(statusClass) {
    return (statusClass === 'today' || statusClass === 'soon') ? 'dark' : 'white';
}
