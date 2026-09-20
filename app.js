const STORAGE_KEY = 'reminderhub_data';
const CATEGORIES_KEY = 'reminderhub_categories';
const TAGS_KEY = 'reminderhub_tags';
const THEME_KEY = 'reminderhub_theme';
const LAST_EXPORT_KEY = 'reminderhub_last_export';
const TRASH_KEY = 'reminderhub_trash';
const DEFAULT_CATEGORIES = ['Università', 'Biblioteca', 'Lezioni', 'Personale', 'Lavoro', 'Altro'];
const DEFAULT_TAGS = [{name: 'Urgente', color: 'danger'}, {name: 'Università', color: 'primary'}];

let currentView = 'list';
let calendar = null;
let pendingImportData = null;

// ========== IIFE: Applica tema subito ==========
(function() {
    const saved = localStorage.getItem(THEME_KEY) || 'dark';
    document.documentElement.setAttribute('data-bs-theme', saved);
})();

// ========== Inizializzazione ==========
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 App avviata');
    initData();
    initTheme();
    populateAllFilters();
    renderAll();
    setupEventListeners();
    autoDeleteExpiredReminders();
    autoEmptyTrash();
    checkWeeklyBackup();
    registerServiceWorker();
    setupInstallBanner();
});

function initData() {
    if (!localStorage.getItem(STORAGE_KEY)) localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    if (!localStorage.getItem(CATEGORIES_KEY)) localStorage.setItem(CATEGORIES_KEY, JSON.stringify(DEFAULT_CATEGORIES));
    if (!localStorage.getItem(TAGS_KEY)) localStorage.setItem(TAGS_KEY, JSON.stringify(DEFAULT_TAGS));
    if (!localStorage.getItem(TRASH_KEY)) localStorage.setItem(TRASH_KEY, JSON.stringify([]));
}

// ========== Storage helpers ==========
function getReminders() { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
function saveReminders(r) { localStorage.setItem(STORAGE_KEY, JSON.stringify(r)); }
function getCategories() { return JSON.parse(localStorage.getItem(CATEGORIES_KEY) || JSON.stringify(DEFAULT_CATEGORIES)); }
function saveCategories(c) { localStorage.setItem(CATEGORIES_KEY, JSON.stringify(c)); }
function getTags() { return JSON.parse(localStorage.getItem(TAGS_KEY) || JSON.stringify(DEFAULT_TAGS)); }
function saveTags(t) { localStorage.setItem(TAGS_KEY, JSON.stringify(t)); }
function getTrash() { return JSON.parse(localStorage.getItem(TRASH_KEY) || '[]'); }
function saveTrash(t) { localStorage.setItem(TRASH_KEY, JSON.stringify(t)); }
function generateId() { return Date.now().toString(36) + Math.random().toString(36).substr(2); }

// ========== Tema ==========
function initTheme() {
    const saved = localStorage.getItem(THEME_KEY) || 'dark';
    document.documentElement.setAttribute('data-bs-theme', saved);
    const toggle = document.getElementById('themeToggle');
    if (toggle) {
        toggle.innerHTML = saved === 'light' ? '<i class="bi bi-moon-stars-fill"></i>' : '<i class="bi bi-sun-fill"></i>';
    }
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-bs-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-bs-theme', next);
    localStorage.setItem(THEME_KEY, next);
    const toggle = document.getElementById('themeToggle');
    if (toggle) {
        toggle.innerHTML = next === 'light' ? '<i class="bi bi-moon-stars-fill"></i>' : '<i class="bi bi-sun-fill"></i>';
    }
}

// ========== Date helpers ==========
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

function getPriorityValue(priority) {
    const values = {alta: 3, media: 2, bassa: 1};
    return values[priority] || 2;
}

function getPriorityColor(priority) {
    const colors = {alta: '#dc3545', media: '#ffc107', bassa: '#0dcaf0'};
    return colors[priority] || '#6c757d';
}

function getTagColor(name) {
    const t = getTags().find(x => x.name === name);
    return t ? t.color : 'secondary';
}

// ========== Filtri e ordinamento ==========
function populateAllFilters() {
    const categories = getCategories();
    const tags = getTags();

    const catFilter = document.getElementById('categoryFilter');
    if (catFilter) {
        catFilter.innerHTML = '<option value="tutte">Tutte</option>' + 
            categories.map(c => `<option value="${c}">${c}</option>`).join('');
    }

    const tagFilter = document.getElementById('tagFilter');
    if (tagFilter) {
        tagFilter.innerHTML = '<option value="tutti">Tutti</option>' + 
            tags.map(t => `<option value="${t.name}">${t.name}</option>`).join('');
    }

    const catInput = document.getElementById('categoryInput');
    if (catInput) {
        catInput.innerHTML = categories.map(c => `<option value="${c}">${c}</option>`).join('');
    }
}

function sortReminders(reminders, sortBy) {
    const sorted = [...reminders];
    switch(sortBy) {
        case 'date':
            sorted.sort((a, b) => {
                if (!a.dueDate && !b.dueDate) return 0;
                if (!a.dueDate) return 1;
                if (!b.dueDate) return -1;
                return new Date(a.dueDate) - new Date(b.dueDate);
            });
            break;
        case 'priority':
            sorted.sort((a, b) => getPriorityValue(b.priority) - getPriorityValue(a.priority));
            break;
        case 'category':
            sorted.sort((a, b) => (a.category || '').localeCompare(b.category || ''));
            break;
        case 'name':
            sorted.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
            break;
    }
    return sorted;
}

// ========== Rendering ==========
function renderAll() {
    renderCategories();
    renderTags();
    renderCategoriesDisplay();
    renderQuickTags();
    if (currentView === 'list') renderReminders();
    else if (currentView === 'calendar') renderCalendar();
    else if (currentView === 'trash') renderTrash();
}

function renderReminders() {
    const reminders = getReminders();
    const search = document.getElementById('searchInput').value.toLowerCase();
    const category = document.getElementById('categoryFilter').value;
    const tag = document.getElementById('tagFilter').value;
    const priority = document.getElementById('priorityFilter').value;
    const status = document.getElementById('statusFilter').value;
    const sortBy = document.getElementById('sortBy').value;
    const dateFrom = document.getElementById('dateFrom').value;
    const dateTo = document.getElementById('dateTo').value;
    const groupByCategory = document.getElementById('groupByCategory').checked;

    let filtered = reminders.filter(r => {
        const matchSearch = !search || (r.title && r.title.toLowerCase().includes(search)) || (r.description && r.description.toLowerCase().includes(search));
        const matchCategory = category === 'tutte' || r.category === category;
        const matchTag = tag === 'tutti' || (r.tags && r.tags.includes(tag));
        const matchPriority = priority === 'tutte' || r.priority === priority;
        const matchStatus = status === 'tutti' || (status === 'attivi' && !r.checked) || (status === 'completati' && r.checked);
        const matchDateRange = (!dateFrom || (r.dueDate && r.dueDate >= dateFrom)) && (!dateTo || (r.dueDate && r.dueDate <= dateTo));
        return matchSearch && matchCategory && matchTag && matchPriority && matchStatus && matchDateRange;
    });

    filtered = sortReminders(filtered, sortBy);
    const list = document.getElementById('remindersList');

    if (groupByCategory) {
        const grouped = {};
        filtered.forEach(r => {
            const cat = r.category || 'Nessuna';
            if (!grouped[cat]) grouped[cat] = [];
            grouped[cat].push(r);
        });
        let html = '';
        Object.keys(grouped).sort().forEach(cat => {
            html += `<div class="mb-4"><h5 class="text-muted"><i class="bi bi-folder-fill me-2"></i>${cat} <span class="badge bg-secondary">${grouped[cat].length}</span></h5><div class="row g-3">`;
            html += grouped[cat].map(r => renderReminderCard(r)).join('');
            html += '</div></div>';
        });
        list.innerHTML = html || '<div class="col-12 text-center py-5"><i class="bi bi-inbox display-1 text-muted"></i><p class="text-muted mt-3">Nessun promemoria trovato.</p></div>';
    } else {
        const noDate = filtered.filter(r => !r.dueDate);
        const withDate = filtered.filter(r => r.dueDate);
        let html = '';
        if (noDate.length > 0) {
            html += `<div class="mb-4"><h5 class="text-muted"><i class="bi bi-calendar-x me-2"></i>Senza data <span class="badge bg-secondary">${noDate.length}</span></h5><div class="row g-3">`;
            html += noDate.map(r => renderReminderCard(r)).join('');
            html += '</div></div>';
        }
        if (withDate.length > 0) {
            html += '<div class="row g-3">';
            html += withDate.map(r => renderReminderCard(r)).join('');
            html += '</div>';
        }
        list.innerHTML = html || '<div class="col-12 text-center py-5"><i class="bi bi-inbox display-1 text-muted"></i><p class="text-muted mt-3">Nessun promemoria trovato.</p></div>';
    }
}

function renderReminderCard(r) {
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
                    <button onclick="moveToTrash('${r.id}')" class="btn btn-sm btn-outline-danger flex-fill"><i class="bi bi-trash"></i></button>
                </div>
            </div>
        </div>
    `;
}

function renderCategories() {
    const list = document.getElementById('categoriesList');
    const reminders = getReminders();
    if (list) {
        list.innerHTML = getCategories().map(c => {
            const count = reminders.filter(r => r.category === c).length;
            return `<div class="list-group-item d-flex justify-content-between align-items-center">
                <span>${c} <span class="badge bg-secondary">${count}</span></span>
                ${c !== 'Altro' ? `<button class="btn btn-sm btn-outline-danger" onclick="deleteCategory('${c}')"><i class="bi bi-trash"></i></button>` : '<span class="text-muted small">Default</span>'}
            </div>`;
        }).join('');
    }
}

function renderCategoriesDisplay() {
    const container = document.getElementById('categoriesDisplay');
    const reminders = getReminders();
    if (container) {
        const categories = getCategories();
        container.innerHTML = categories.length ? categories.map(c => {
            const count = reminders.filter(r => r.category === c).length;
            return `<span class="badge bg-secondary p-2"><i class="bi bi-folder-fill me-1"></i>${c} (${count})</span>`;
        }).join('') : '<span class="text-muted small">Nessuna categoria.</span>';
    }
}

function renderTags() {
    const list = document.getElementById('tagsList');
    const reminders = getReminders();
    if (list) {
        list.innerHTML = getTags().map(t => {
            const count = reminders.filter(r => r.tags && r.tags.includes(t.name)).length;
            return `<span class="badge bg-${t.color} p-2 d-flex align-items-center gap-2">${t.name} (${count})<button class="btn btn-sm btn-link text-white p-0" onclick="deleteTag('${t.name}')"><i class="bi bi-x-lg"></i></button></span>`;
        }).join('');
    }
    renderTagsSelector();
}

function renderQuickTags() {
    const container = document.getElementById('quickTags');
    const reminders = getReminders();
    if (container) {
        const tags = getTags();
        container.innerHTML = tags.length ? tags.map(t => {
            const count = reminders.filter(r => r.tags && r.tags.includes(t.name)).length;
            return `<span class="badge bg-${t.color} p-2" style="cursor:pointer" onclick="filterByTag('${t.name}')"><i class="bi bi-tag-fill me-1"></i>${t.name} (${count})</span>`;
        }).join('') : '<span class="text-muted small">Nessun tag.</span>';
    }
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

function renderTrash() {
    const trash = getTrash();
    const list = document.getElementById('trashList');
    if (trash.length === 0) {
        list.innerHTML = '<div class="col-12 text-center py-5"><i class="bi bi-trash display-1 text-muted"></i><p class="text-muted mt-3">Cestino vuoto.</p></div>';
        return;
    }
    list.innerHTML = trash.map(r => {
        const daysUntilDelete = Math.ceil((30 * 24 * 60 * 60 * 1000 - (Date.now() - new Date(r.deletedAt).getTime())) / (24 * 60 * 60 * 1000));
        return `<div class="col-md-6 col-lg-4">
            <div class="card reminder-card h-100 shadow-sm status-checked">
                <div class="card-body">
                    <div class="d-flex justify-content-between mb-2">
                        <span class="badge bg-secondary-subtle text-secondary"><i class="bi bi-folder-fill me-1"></i>${r.category || 'Nessuna'}</span>
                        <span class="badge bg-warning text-dark">Elimina tra ${daysUntilDelete}g</span>
                    </div>
                    <h5 class="card-title mb-1 text-decoration-line-through text-muted">${escapeHtml(r.title || 'Senza titolo')}</h5>
                    ${r.description ? `<p class="card-text small text-muted mb-2">${escapeHtml(r.description)}</p>` : ''}
                    <div class="d-flex align-items-center justify-content-between mt-2">
                        <div><i class="bi bi-calendar3 me-1"></i><small>${r.dueDate ? formatDate(r.dueDate) : 'Nessuna data'}</small></div>
                    </div>
                </div>
                <div class="card-footer bg-transparent border-top-0 d-flex gap-1">
                    <button onclick="restoreFromTrash('${r.id}')" class="btn btn-sm btn-outline-success flex-fill"><i class="bi bi-arrow-counterclockwise"></i> Ripristina</button>
                    <button onclick="deleteFromTrash('${r.id}')" class="btn btn-sm btn-outline-danger flex-fill"><i class="bi bi-trash"></i> Elimina</button>
                </div>
            </div>
        </div>`;
    }).join('');
}

function renderCalendar() {
    const reminders = getReminders().filter(r => r.dueDate && !r.checked);
    const calendarEl = document.getElementById('calendar');
    if (calendar) calendar.destroy();
    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        locale: 'it',
        headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,dayGridWeek' },
        events: reminders.map(r => ({
            id: r.id,
            title: r.title || 'Senza titolo',
            start: r.dueDate,
            backgroundColor: getPriorityColor(r.priority),
            borderColor: getPriorityColor(r.priority)
        })),
        eventClick: function(info) { editReminder(info.event.id); }
    });
    calendar.render();
}

// ========== Categorie e Tag (FUNZIONI GLOBALI) ==========
window.addCategory = function() {
    console.log('➕ addCategory chiamata');
    console.log('➕ Aggiungendo categoria...');
    const input = document.getElementById('newCategoryInput');
    if (!input) { console.error(' Input non trovato'); return; }
    const name = input.value.trim();
    if (!name) { alert('Inserisci un nome'); return; }
    const categories = getCategories();
    if (categories.includes(name)) { alert('Esiste già'); return; }
    categories.push(name);
    saveCategories(categories);
    input.value = '';
    renderCategories();
    renderCategoriesDisplay();
    populateAllFilters();
    console.log('✅ Categoria aggiunta:', name);
};

window.deleteCategory = function(name) {
    if (name === 'Altro') { alert('Non puoi eliminare "Altro"'); return; }
    if (!confirm(`Eliminare "${name}"?`)) return;
    saveCategories(getCategories().filter(c => c !== name));
    const reminders = getReminders();
    reminders.forEach(r => { if (r.category === name) r.category = 'Altro'; });
    saveReminders(reminders);
    renderCategories();
    renderCategoriesDisplay();
    populateAllFilters();
    renderReminders();
};

window.addTag = function() {
    console.log('️ addTag chiamata');
    console.log('🏷️ Aggiungendo tag...');
    const input = document.getElementById('newTagInput');
    if (!input) { console.error('❌ Input non trovato'); return; }
    const name = input.value.trim();
    if (!name) { alert('Inserisci un nome'); return; }
    const tags = getTags();
    if (tags.find(t => t.name === name)) { alert('Esiste già'); return; }
    const colors = ['primary','success','info','warning','danger','purple','pink'];
    tags.push({name, color: colors[Math.floor(Math.random() * colors.length)]});
    saveTags(tags);
    input.value = '';
    renderTags();
    renderQuickTags();
    populateAllFilters();
    console.log('✅ Tag aggiunto:', name);
};

window.deleteTag = function(name) {
    if (!confirm(`Eliminare il tag "${name}"?`)) return;
    saveTags(getTags().filter(t => t.name !== name));
    const reminders = getReminders();
    reminders.forEach(r => { if (r.tags) r.tags = r.tags.filter(t => t !== name); });
    saveReminders(reminders);
    renderTags();
    renderQuickTags();
    populateAllFilters();
    renderReminders();
};

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

// ========== Azioni promemoria ==========
function toggleReminder(id) {
    const reminders = getReminders();
    const r = reminders.find(x => x.id === id);
    if (r) { r.checked = !r.checked; saveReminders(reminders); renderAll(); }
}

function moveToTrash(id) {
    const reminders = getReminders();
    const r = reminders.find(x => x.id === id);
    if (r) {
        const trash = getTrash();
        r.deletedAt = new Date().toISOString();
        trash.push(r);
        saveTrash(trash);
        saveReminders(reminders.filter(x => x.id !== id));
        renderAll();
    }
}

function restoreFromTrash(id) {
    const trash = getTrash();
    const r = trash.find(x => x.id === id);
    if (r) {
        delete r.deletedAt;
        const reminders = getReminders();
        reminders.push(r);
        saveReminders(reminders);
        saveTrash(trash.filter(x => x.id !== id));
        renderAll();
    }
}

function deleteFromTrash(id) {
    if (!confirm('Eliminare definitivamente?')) return;
    saveTrash(getTrash().filter(r => r.id !== id));
    renderAll();
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

// ========== Form submit ==========
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

    if (!title && !dueDate) { alert('Inserisci almeno un titolo o una data'); return; }

    const reminders = getReminders();
    if (id) {
        const r = reminders.find(x => x.id === id);
        if (r) Object.assign(r, {title, description, category, priority, dueDate, autoDeleteDate, tags});
    } else {
        reminders.push({id: generateId(), title, description, category, priority, dueDate, autoDeleteDate, tags, checked: initialStatus === 'completato', createdAt: new Date().toISOString()});
    }
    saveReminders(reminders);
    renderAll();
    bootstrap.Modal.getInstance(document.getElementById('reminderModal')).hide();
}

// ========== Switch view ==========
function switchView(view) {
    currentView = view;
    document.getElementById('listView').style.display = view === 'list' ? 'block' : 'none';
    document.getElementById('calendarView').style.display = view === 'calendar' ? 'block' : 'none';
    document.getElementById('trashView').style.display = view === 'trash' ? 'block' : 'none';
    document.getElementById('viewListBtn').classList.toggle('active', view === 'list');
    document.getElementById('viewCalendarBtn').classList.toggle('active', view === 'calendar');
    document.getElementById('viewTrashBtn').classList.toggle('active', view === 'trash');
    renderAll();
}

// ========== Event listeners ==========
function setupEventListeners() {
    document.getElementById('reminderForm').addEventListener('submit', handleFormSubmit);
    document.getElementById('searchInput').addEventListener('input', renderAll);
    document.getElementById('categoryFilter').addEventListener('change', renderAll);
    document.getElementById('tagFilter').addEventListener('change', renderAll);
    document.getElementById('priorityFilter').addEventListener('change', renderAll);
    document.getElementById('statusFilter').addEventListener('change', renderAll);
    document.getElementById('sortBy').addEventListener('change', renderAll);
    document.getElementById('dateFrom').addEventListener('change', renderAll);
    document.getElementById('dateTo').addEventListener('change', renderAll);
    document.getElementById('groupByCategory').addEventListener('change', renderAll);
    document.getElementById('viewListBtn').addEventListener('click', () => switchView('list'));
    document.getElementById('viewCalendarBtn').addEventListener('click', () => switchView('calendar'));
    document.getElementById('viewTrashBtn').addEventListener('click', () => switchView('trash'));
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    document.getElementById('exportBtn').addEventListener('click', exportData);
    document.getElementById('importBtn').addEventListener('click', () => document.getElementById('importFile').click());
    document.getElementById('importFile').addEventListener('change', (e) => {
        if (e.target.files.length > 0) { importData(e.target.files[0]); e.target.value = ''; }
    });
    document.getElementById('clearFilters').addEventListener('click', () => {
        document.getElementById('searchInput').value = '';
        document.getElementById('categoryFilter').value = 'tutte';
        document.getElementById('tagFilter').value = 'tutti';
        document.getElementById('priorityFilter').value = 'tutte';
        document.getElementById('statusFilter').value = 'tutti';
        document.getElementById('dateFrom').value = '';
        document.getElementById('dateTo').value = '';
        renderAll();
    });
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

// ========== Auto-delete ==========
function autoDeleteExpiredReminders() {
    const reminders = getReminders();
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const filtered = reminders.filter(r => {
        if (!r.autoDeleteDate) return true;
        return new Date(r.autoDeleteDate) > today;
    });
    if (filtered.length !== reminders.length) saveReminders(filtered);
}

function autoEmptyTrash() {
    const trash = getTrash();
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const filtered = trash.filter(r => new Date(r.deletedAt).getTime() > thirtyDaysAgo);
    if (filtered.length !== trash.length) saveTrash(filtered);
}

// ========== Export/Import ==========
function exportData() {
    const data = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        reminders: getReminders(),
        categories: getCategories(),
        tags: getTags(),
        trash: getTrash()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-mynotes-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    localStorage.setItem(LAST_EXPORT_KEY, new Date().toISOString());
}

function importData(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (!data.reminders || !data.categories || !data.tags) throw new Error('File non valido');
            pendingImportData = data;
            showImportModal(data);
        } catch (err) { alert('Errore: ' + err.message); }
    };
    reader.readAsText(file);
}

function showImportModal(data) {
    const summary = document.getElementById('importSummary');
    if (summary) {
        summary.innerHTML = `<li class="list-group-item d-flex justify-content-between"><span>Promemoria</span><span class="badge bg-primary">${data.reminders.length}</span></li>
        <li class="list-group-item d-flex justify-content-between"><span>Categorie</span><span class="badge bg-secondary">${data.categories.length}</span></li>
        <li class="list-group-item d-flex justify-content-between"><span>Tag</span><span class="badge bg-info">${data.tags.length}</span></li>`;
    }
    new bootstrap.Modal(document.getElementById('importModal')).show();
}

document.addEventListener('DOMContentLoaded', () => {
    const mergeBtn = document.getElementById('mergeBtn');
    const replaceBtn = document.getElementById('replaceBtn');
    if (mergeBtn) {
        mergeBtn.addEventListener('click', () => {
            if (!pendingImportData) return;
            const currentReminders = getReminders();
            const merged = [...currentReminders];
            let added = 0;
            pendingImportData.reminders.forEach(newR => {
                if (!merged.find(r => r.id === newR.id)) { merged.push(newR); added++; }
            });
            saveReminders(merged);
            saveCategories([...new Set([...getCategories(), ...pendingImportData.categories])]);
            const currentTags = getTags();
            pendingImportData.tags.forEach(newT => {
                if (!currentTags.find(t => t.name === newT.name)) currentTags.push(newT);
            });
            saveTags(currentTags);
            bootstrap.Modal.getInstance(document.getElementById('importModal')).hide();
            populateAllFilters();
            renderAll();
            pendingImportData = null;
        });
    }
    if (replaceBtn) {
        replaceBtn.addEventListener('click', () => {
            if (!pendingImportData) return;
            if (!confirm('Sostituire TUTTI i dati?')) return;
            saveReminders(pendingImportData.reminders);
            saveCategories(pendingImportData.categories);
            saveTags(pendingImportData.tags);
            if (pendingImportData.trash) saveTrash(pendingImportData.trash);
            bootstrap.Modal.getInstance(document.getElementById('importModal')).hide();
            populateAllFilters();
            renderAll();
            pendingImportData = null;
        });
    }
});

// ========== Backup settimanale ==========
function checkWeeklyBackup() {
    const lastExport = localStorage.getItem(LAST_EXPORT_KEY);
    if (!lastExport) {
        setTimeout(() => alert('⚠️ Non hai mai fatto un backup!'), 1000);
        return;
    }
    const daysSince = (Date.now() - new Date(lastExport)) / (1000 * 60 * 60 * 24);
    if (daysSince >= 7) {
        setTimeout(() => alert(`⏰ Sono passati ${Math.floor(daysSince)} giorni dall'ultimo backup.`), 1000);
    }
}

// ========== PWA ==========
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').catch(err => console.warn('SW error:', err));
    }
}

function setupInstallBanner() {
    let deferredPrompt = null;
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        const banner = document.getElementById('installBanner');
        if (banner) banner.style.display = 'block';
    });
    const installBtn = document.getElementById('installBtn');
    if (installBtn) {
        installBtn.addEventListener('click', async () => {
            if (!deferredPrompt) return;
            deferredPrompt.prompt();
            await deferredPrompt.userChoice;
            deferredPrompt = null;
            const banner = document.getElementById('installBanner');
            if (banner) banner.style.display = 'none';
        });
    }
}
