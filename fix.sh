#!/bin/bash
cd ~/Musica/altri_progetti/MyNotes

echo "🔄 Ripristino index.html..."
cat > index.html << 'EOFHTML'
<!DOCTYPE html>
<html lang="it" data-bs-theme="light">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ReminderHub - MyNotes</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css" rel="stylesheet">
    <link href="style.css" rel="stylesheet">
</head>
<body>
    <nav class="navbar navbar-expand-lg navbar-dark sticky-top shadow-sm">
        <div class="container">
            <a class="navbar-brand fw-bold" href="#"><i class="bi bi-bell-fill me-2"></i>ReminderHub</a>
            <div class="d-flex align-items-center">
                <button id="themeToggle" class="btn btn-outline-light btn-sm me-2"><i class="bi bi-moon-stars-fill"></i></button>
                <button class="btn btn-light me-2" data-bs-toggle="modal" data-bs-target="#reminderModal"><i class="bi bi-plus-lg me-1"></i>Nuovo</button>
                <button class="btn btn-outline-light" data-bs-toggle="modal" data-bs-target="#tagsModal"><i class="bi bi-tags-fill me-1"></i>Tag</button>
            </div>
        </div>
    </nav>
    <main class="container py-4">
        <div id="alertContainer"></div>
        <div class="row g-3 mb-4">
            <div class="col-6 col-md-3"><div class="card stat-card border-0 shadow-sm"><div class="card-body"><div class="text-muted small">Totali</div><div class="h3 mb-0 fw-bold" id="statTotal">0</div></div></div></div>
            <div class="col-6 col-md-3"><div class="card stat-card border-0 shadow-sm stat-overdue"><div class="card-body"><div class="text-muted small">Scaduti</div><div class="h3 mb-0 fw-bold text-danger" id="statOverdue">0</div></div></div></div>
            <div class="col-6 col-md-3"><div class="card stat-card border-0 shadow-sm stat-today"><div class="card-body"><div class="text-muted small">Oggi</div><div class="h3 mb-0 fw-bold text-warning" id="statToday">0</div></div></div></div>
            <div class="col-6 col-md-3"><div class="card stat-card border-0 shadow-sm stat-week"><div class="card-body"><div class="text-muted small">Prossimi 7gg</div><div class="h3 mb-0 fw-bold text-info" id="statWeek">0</div></div></div></div>
        </div>
        <div class="card shadow-sm mb-4">
            <div class="card-header bg-transparent d-flex justify-content-between align-items-center">
                <span class="fw-semibold"><i class="bi bi-tags me-2"></i>Tag rapidi</span>
                <button class="btn btn-sm btn-outline-primary" data-bs-toggle="modal" data-bs-target="#tagsModal"><i class="bi bi-gear-fill"></i> Gestisci</button>
            </div>
            <div class="card-body"><div id="quickTags" class="d-flex flex-wrap gap-2"><span class="text-muted small">Nessun tag creato.</span></div></div>
        </div>
        <div class="card shadow-sm mb-4">
            <div class="card-body">
                <div class="row g-2 align-items-end">
                    <div class="col-md-3"><label class="form-label small text-muted">Cerca</label><input type="text" id="searchInput" class="form-control" placeholder="Titolo o descrizione..."></div>
                    <div class="col-md-2"><label class="form-label small text-muted">Categoria</label><select id="categoryFilter" class="form-select"><option value="tutte">Tutte</option></select></div>
                    <div class="col-md-2"><label class="form-label small text-muted">Tag</label><select id="tagFilter" class="form-select"><option value="tutti">Tutti</option></select></div>
                    <div class="col-md-2"><label class="form-label small text-muted">Stato</label><select id="statusFilter" class="form-select"><option value="tutti">Tutti</option><option value="attivi">Attivi</option><option value="controllati">Controllati</option></select></div>
                    <div class="col-md-3"><button id="clearFilters" class="btn btn-outline-secondary w-100"><i class="bi bi-x-circle"></i> Reset</button></div>
                </div>
            </div>
        </div>
        <div id="remindersList" class="row g-3"></div>
    </main>
    <footer class="text-center text-muted py-3 mt-5 border-top"><small>ReminderHub by Matteo</small></footer>

    <div class="modal fade" id="reminderModal" tabindex="-1">
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header bg-primary text-white">
                    <h5 class="modal-title"><i class="bi bi-plus-circle me-2"></i><span id="modalTitle">Nuovo promemoria</span></h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body p-4">
                    <form id="reminderForm">
                        <input type="hidden" id="reminderId">
                        <div class="mb-3"><label class="form-label fw-semibold">Titolo</label><input type="text" id="titleInput" class="form-control form-control-lg" placeholder="Es. Pagare rata"></div>
                        <div class="mb-3"><label class="form-label fw-semibold">Descrizione</label><textarea id="descriptionInput" class="form-control" rows="3"></textarea></div>
                        <div class="row g-3">
                            <div class="col-md-6">
                                <label class="form-label fw-semibold">Categoria</label>
                                <div class="input-group">
                                    <select id="categoryInput" class="form-select"></select>
                                    <button class="btn btn-outline-secondary" type="button" data-bs-toggle="modal" data-bs-target="#categoryModal" data-bs-dismiss="modal"><i class="bi bi-gear-fill"></i></button>
                                </div>
                            </div>
                            <div class="col-md-6"><label class="form-label fw-semibold">Priorità</label><select id="priorityInput" class="form-select"><option value="bassa">Bassa</option><option value="media" selected>Media</option><option value="alta">Alta</option></select></div>
                        </div>
                        <div class="mb-3 mt-3"><label class="form-label fw-semibold">Data scadenza</label><input type="date" id="dateInput" class="form-control"></div>
                        <div class="mb-3">
                            <label class="form-label fw-semibold">Tag</label>
                            <div id="tagsSelector" class="d-flex flex-wrap gap-2 p-2 border rounded"><span class="text-muted small">Nessun tag disponibile.</span></div>
                            <div class="form-text">Clicca sui tag per selezionarli</div>
                        </div>
                        <div class="d-flex gap-2">
                            <button type="submit" class="btn btn-primary flex-fill"><i class="bi bi-check2-circle me-1"></i>Salva</button>
                            <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Annulla</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </div>

    <div class="modal fade" id="categoryModal" tabindex="-1">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header bg-primary text-white">
                    <h5 class="modal-title"><i class="bi bi-folder-fill me-2"></i>Gestisci Categorie</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <div class="input-group mb-3">
                        <input type="text" id="newCategoryInput" class="form-control" placeholder="Nuova categoria">
                        <button class="btn btn-primary" onclick="addCategory()"><i class="bi bi-plus-lg"></i> Aggiungi</button>
                    </div>
                    <div id="categoriesList" class="list-group"></div>
                </div>
            </div>
        </div>
    </div>

    <div class="modal fade" id="tagsModal" tabindex="-1">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header bg-primary text-white">
                    <h5 class="modal-title"><i class="bi bi-tags-fill me-2"></i>Gestisci Tag</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <div class="input-group mb-3">
                        <input type="text" id="newTagInput" class="form-control" placeholder="Nuovo tag">
                        <button class="btn btn-primary" onclick="addTag()"><i class="bi bi-plus-lg"></i> Aggiungi</button>
                    </div>
                    <div id="tagsList" class="d-flex flex-wrap gap-2"></div>
                </div>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
    <script src="app.js"></script>
</body>
</html>
EOFHTML

echo "🔄 Ripristino app.js (versione completa con supporto Tag)..."
cat > app.js << 'EOFJS'
const STORAGE_KEY = 'reminderhub_data';
const CATEGORIES_KEY = 'reminderhub_categories';
const TAGS_KEY = 'reminderhub_tags';
const THEME_KEY = 'reminderhub_theme';
const DEFAULT_CATEGORIES = ['Università', 'Biblioteca', 'Lezioni', 'Personale', 'Lavoro', 'Altro'];
const DEFAULT_TAGS = [{name: 'Urgente', color: 'danger'}, {name: 'Università', color: 'primary'}];

document.addEventListener('DOMContentLoaded', () => {
    initData(); initTheme(); renderReminders(); renderCategories(); renderTags(); setupEventListeners();
});

function initData() {
    if (!localStorage.getItem(STORAGE_KEY)) localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    if (!localStorage.getItem(CATEGORIES_KEY)) localStorage.setItem(CATEGORIES_KEY, JSON.stringify(DEFAULT_CATEGORIES));
    if (!localStorage.getItem(TAGS_KEY)) localStorage.setItem(TAGS_KEY, JSON.stringify(DEFAULT_TAGS));
}
function getReminders() { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
function saveReminders(r) { localStorage.setItem(STORAGE_KEY, JSON.stringify(r)); }
function getCategories() { return JSON.parse(localStorage.getItem(CATEGORIES_KEY) || JSON.stringify(DEFAULT_CATEGORIES)); }
function saveCategories(c) { localStorage.setItem(CATEGORIES_KEY, JSON.stringify(c)); }
function getTags() { return JSON.parse(localStorage.getItem(TAGS_KEY) || JSON.stringify(DEFAULT_TAGS)); }
function saveTags(t) { localStorage.setItem(TAGS_KEY, JSON.stringify(t)); }
function generateId() { return Date.now().toString(36) + Math.random().toString(36).substr(2); }

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
    const status = document.getElementById('statusFilter').value;

    let filtered = reminders.filter(r => {
        const matchSearch = !search || (r.title && r.title.toLowerCase().includes(search)) || (r.description && r.description.toLowerCase().includes(search));
        const matchCategory = category === 'tutte' || r.category === category;
        const matchTag = tag === 'tutti' || (r.tags && r.tags.includes(tag));
        const matchStatus = status === 'tutti' || (status === 'attivi' && !r.checked) || (status === 'controllati' && r.checked);
        return matchSearch && matchCategory && matchTag && matchStatus;
    });

    filtered.sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate) - new Date(b.dueDate);
    });

    updateStats(reminders);
    updateCategoryFilter();
    updateTagFilter();

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

function updateStats(reminders) {
    const active = reminders.filter(r => !r.checked);
    document.getElementById('statTotal').textContent = reminders.length;
    document.getElementById('statOverdue').textContent = active.filter(r => { const d = getDaysLeft(r.dueDate); return d !== null && d < 0; }).length;
    document.getElementById('statToday').textContent = active.filter(r => getDaysLeft(r.dueDate) === 0).length;
    document.getElementById('statWeek').textContent = active.filter(r => { const d = getDaysLeft(r.dueDate); return d !== null && d > 0 && d <= 7; }).length;
}

function updateCategoryFilter() {
    const select = document.getElementById('categoryFilter');
    const current = select.value;
    select.innerHTML = '<option value="tutte">Tutte</option>' + getCategories().map(c => `<option value="${c}">${c}</option>`).join('');
    select.value = current;
}

function updateTagFilter() {
    const select = document.getElementById('tagFilter');
    const current = select.value;
    select.innerHTML = '<option value="tutti">Tutti</option>' + getTags().map(t => `<option value="${t.name}">${t.name}</option>`).join('');
    select.value = current;
}

function renderCategories() {
    const list = document.getElementById('categoriesList');
    const select = document.getElementById('categoryInput');
    list.innerHTML = getCategories().map(c => `
        <div class="list-group-item d-flex justify-content-between align-items-center">
            ${c}
            ${c !== 'Altro' ? `<button class="btn btn-sm btn-outline-danger" onclick="deleteCategory('${c}')"><i class="bi bi-trash"></i></button>` : '<span class="text-muted small">Default</span>'}
        </div>
    `).join('');
    if (select) {
        const current = select.value;
        select.innerHTML = getCategories().map(c => `<option value="${c}">${c}</option>`).join('');
        if (current) select.value = current;
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
    renderCategories();
}

function deleteCategory(name) {
    if (name === 'Altro') return;
    if (!confirm(`Eliminare "${name}"? I promemoria passeranno a "Altro".`)) return;
    saveCategories(getCategories().filter(c => c !== name));
    const reminders = getReminders();
    reminders.forEach(r => { if (r.category === name) r.category = 'Altro'; });
    saveReminders(reminders);
    renderCategories();
    renderReminders();
}

function renderTags() {
    const tags = getTags();
    const list = document.getElementById('tagsList');
    list.innerHTML = tags.map(t => `<span class="badge bg-${t.color} p-2 d-flex align-items-center gap-2">${t.name}<button class="btn btn-sm btn-link text-white p-0" onclick="deleteTag('${t.name}')"><i class="bi bi-x-lg"></i></button></span>`).join('');
    renderTagsSelector();
    renderQuickTags();
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
    renderTags();
}

function deleteTag(name) {
    if (!confirm(`Eliminare il tag "${name}"?`)) return;
    saveTags(getTags().filter(t => t.name !== name));
    const reminders = getReminders();
    reminders.forEach(r => { if (r.tags) r.tags = r.tags.filter(t => t !== name); });
    saveReminders(reminders);
    renderTags();
    renderReminders();
}

function renderTagsSelector() {
    const tags = getTags();
    const container = document.getElementById('tagsSelector');
    const form = document.getElementById('reminderForm');
    const selected = JSON.parse(form.dataset.selectedTags || '[]');
    container.innerHTML = tags.map(t => `<span class="badge bg-${t.color} p-2 ${selected.includes(t.name)?'border border-3 border-dark':''}" style="cursor:pointer;opacity:${selected.includes(t.name)?'1':'0.6'}" onclick="toggleTagSelector('${t.name}')">${t.name}</span>`).join('');
}

function renderQuickTags() {
    const tags = getTags();
    const container = document.getElementById('quickTags');
    container.innerHTML = tags.length ? tags.map(t => `<span class="badge bg-${t.color} p-2" style="cursor:pointer" onclick="filterByTag('${t.name}')"><i class="bi bi-tag-fill me-1"></i>${t.name}</span>`).join('') : '<span class="text-muted small">Nessun tag.</span>';
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
    document.getElementById('modalTitle').textContent = 'Modifica promemoria';
    renderTagsSelector();
    new bootstrap.Modal(document.getElementById('reminderModal')).show();
}

function setupEventListeners() {
    document.getElementById('reminderForm').addEventListener('submit', handleFormSubmit);
    document.getElementById('searchInput').addEventListener('input', renderReminders);
    document.getElementById('categoryFilter').addEventListener('change', renderReminders);
    document.getElementById('tagFilter').addEventListener('change', renderReminders);
    document.getElementById('statusFilter').addEventListener('change', renderReminders);
    document.getElementById('clearFilters').addEventListener('click', () => {
        document.getElementById('searchInput').value = '';
        document.getElementById('categoryFilter').value = 'tutte';
        document.getElementById('tagFilter').value = 'tutti';
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
    const tags = JSON.parse(document.getElementById('reminderForm').dataset.selectedTags || '[]');

    if (!title && !dueDate) return alert('Inserisci almeno un titolo o una data');

    const reminders = getReminders();
    if (id) {
        const r = reminders.find(x => x.id === id);
        if (r) Object.assign(r, {title, description, category, priority, dueDate, tags});
    } else {
        reminders.push({id: generateId(), title, description, category, priority, dueDate, tags, checked: false, createdAt: new Date().toISOString()});
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
EOFJS

echo "✅ File riparati con successo!"
