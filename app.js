// ==========================================
// ReminderHub - App JavaScript
// Dati salvati in localStorage
// ==========================================

const STORAGE_KEY = 'reminderhub_data';
const THEME_KEY = 'reminderhub_theme';

// Inizializzazione
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    renderReminders();
    setupEventListeners();
});

// --- Gestione dati ---
function getReminders() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
}

function saveReminders(reminders) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reminders));
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// --- Calcolo stato ---
function getDaysLeft(dueDate) {
    if (!dueDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    return Math.ceil((due - today) / (1000 * 60 * 60 * 24));
}

function getStatusClass(reminder) {
    if (reminder.checked) return 'checked';
    const days = getDaysLeft(reminder.dueDate);
    if (days === null) return 'no-date';
    if (days < 0) return 'overdue';
    if (days === 0) return 'today';
    if (days <= 3) return 'urgent';
    if (days <= 7) return 'soon';
    return 'ok';
}

function getStatusLabel(reminder) {
    if (reminder.checked) return '✓ Controllato';
    const days = getDaysLeft(reminder.dueDate);
    if (days === null) return 'Nessuna data';
    if (days < 0) return 'Scaduto da ' + (-days) + 'g';
    if (days === 0) return 'Oggi!';
    if (days === 1) return 'Domani';
    return 'Tra ' + days + ' giorni';
}

// --- Rendering ---
function renderReminders() {
    const reminders = getReminders();
    const search = document.getElementById('searchInput').value.toLowerCase();
    const category = document.getElementById('categoryFilter').value;
    const status = document.getElementById('statusFilter').value;

    // Filtri
    let filtered = reminders.filter(r => {
        const matchSearch = !search || 
            r.title.toLowerCase().includes(search) || 
            (r.description && r.description.toLowerCase().includes(search));
        const matchCategory = category === 'tutte' || r.category === category;
        const matchStatus = status === 'tutti' || 
            (status === 'attivi' && !r.checked) || 
            (status === 'controllati' && r.checked);
        return matchSearch && matchCategory && matchStatus;
    });

    // Ordinamento per data
    filtered.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

    // Aggiorna statistiche (su tutti i promemoria, non filtrati)
    updateStats(reminders);

    // Renderizza lista
    const list = document.getElementById('remindersList');
    
    if (filtered.length === 0) {
        list.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="bi bi-inbox display-1 text-muted"></i>
                <p class="text-muted mt-3">Nessun promemoria trovato.</p>
                <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#reminderModal">
                    <i class="bi bi-plus-lg me-1"></i>Aggiungi il primo
                </button>
            </div>
        `;
        return;
    }

    list.innerHTML = filtered.map(r => {
        const statusClass = getStatusClass(r);
        const statusLabel = getStatusLabel(r);
        const priorityBadge = r.priority === 'alta' ? 'danger' : 
                              r.priority === 'media' ? 'warning text-dark' : 'info';
        const btnToggleClass = r.checked ? 'secondary' : 'success';
        const btnToggleIcon = r.checked ? 'arrow-counterclockwise' : 'check2-circle';
        const titleClass = r.checked ? 'text-decoration-line-through text-muted' : '';

        return `
            <div class="col-md-6 col-lg-4">
                <div class="card reminder-card h-100 shadow-sm status-${statusClass}">
                    <div class="card-body">
                        <div class="d-flex justify-content-between mb-2">
                            <span class="badge bg-secondary-subtle text-secondary">
                                <i class="bi bi-tag-fill me-1"></i>${r.category}
                            </span>
                            <span class="badge bg-${priorityBadge}">${r.priority.charAt(0).toUpperCase() + r.priority.slice(1)}</span>
                        </div>
                        <h5 class="card-title mb-1 ${titleClass}">${escapeHtml(r.title)}</h5>
                        ${r.description ? `<p class="card-text small text-muted mb-2">${escapeHtml(r.description)}</p>` : ''}
                        <div class="d-flex align-items-center justify-content-between mt-3">
                            <div><i class="bi bi-calendar3 me-1"></i><small>${formatDate(r.dueDate)}</small></div>
                            <span class="status-badge bg-${getBadgeColor(statusClass)} text-${getTextColor(statusClass)}">${statusLabel}</span>
                        </div>
                    </div>
                    <div class="card-footer bg-transparent border-top-0 d-flex gap-1">
                        <button onclick="toggleReminder('${r.id}')" class="btn btn-sm btn-outline-${btnToggleClass} flex-fill">
                            <i class="bi bi-${btnToggleIcon}"></i>
                        </button>
                        <button onclick="editReminder('${r.id}')" class="btn btn-sm btn-outline-primary flex-fill">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button onclick="deleteReminder('${r.id}')" class="btn btn-sm btn-outline-danger flex-fill">
                            <i class="bi bi-trash"></i>
                        </button>
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

// --- Azioni ---
function toggleReminder(id) {
    const reminders = getReminders();
    const r = reminders.find(x => x.id === id);
    if (r) {
        r.checked = !r.checked;
        saveReminders(reminders);
        renderReminders();
        showAlert(r.checked ? 'Promemoria segnato come controllato' : 'Promemoria riattivato', 'info');
    }
}

function deleteReminder(id) {
    if (!confirm('Eliminare questo promemoria?')) return;
    const reminders = getReminders().filter(r => r.id !== id);
    saveReminders(reminders);
    renderReminders();
    showAlert('Promemoria eliminato', 'warning');
}

function editReminder(id) {
    const r = getReminders().find(x => x.id === id);
    if (!r) return;

    document.getElementById('reminderId').value = r.id;
    document.getElementById('titleInput').value = r.title;
    document.getElementById('descriptionInput').value = r.description || '';
    document.getElementById('categoryInput').value = r.category;
    document.getElementById('priorityInput').value = r.priority;
    document.getElementById('dateInput').value = r.dueDate;
    document.getElementById('modalTitle').textContent = 'Modifica promemoria';

    const modal = new bootstrap.Modal(document.getElementById('reminderModal'));
    modal.show();
}

// --- Form ---
function setupEventListeners() {
    document.getElementById('reminderForm').addEventListener('submit', handleFormSubmit);
    document.getElementById('searchInput').addEventListener('input', renderReminders);
    document.getElementById('categoryFilter').addEventListener('change', renderReminders);
    document.getElementById('statusFilter').addEventListener('change', renderReminders);
    document.getElementById('clearFilters').addEventListener('click', () => {
        document.getElementById('searchInput').value = '';
        document.getElementById('categoryFilter').value = 'tutte';
        document.getElementById('statusFilter').value = 'tutti';
        renderReminders();
    });
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);

    // Reset form quando si chiude il modal
    document.getElementById('reminderModal').addEventListener('hidden.bs.modal', () => {
        document.getElementById('reminderForm').reset();
        document.getElementById('reminderId').value = '';
        document.getElementById('modalTitle').textContent = 'Nuovo promemoria';
    });
}

function handleFormSubmit(e) {
    e.preventDefault();
    
    const id = document.getElementById('reminderId').value;
    const title = document.getElementById('titleInput').value.trim();
    const description = document.getElementById('descriptionInput').value.trim();
    const category = document.getElementById('categoryInput').value;
    const priority = document.getElementById('priorityInput').value;
    const dueDate = document.getElementById('dateInput').value;

    if (!title && !dueDate) {
        showAlert('Inserisci almeno un titolo o una data', 'danger');
        return;
    }

    const reminders = getReminders();

    if (id) {
        // Modifica
        const r = reminders.find(x => x.id === id);
        if (r) {
            r.title = title;
            r.description = description;
            r.category = category;
            r.priority = priority;
            r.dueDate = dueDate;
        }
        showAlert('Promemoria aggiornato!', 'success');
    } else {
        // Nuovo
        reminders.push({
            id: generateId(),
            title,
            description,
            category,
            priority,
            dueDate,
            checked: false,
            createdAt: new Date().toISOString()
        });
        showAlert('Promemoria aggiunto!', 'success');
    }

    saveReminders(reminders);
    renderReminders();

    // Chiudi modal
    bootstrap.Modal.getInstance(document.getElementById('reminderModal')).hide();
}

// --- Tema ---
function initTheme() {
    const saved = localStorage.getItem(THEME_KEY) || 'light';
    document.documentElement.setAttribute('data-bs-theme', saved);
    updateThemeIcon(saved);
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-bs-theme');
    const next = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-bs-theme', next);
    localStorage.setItem(THEME_KEY, next);
    updateThemeIcon(next);
}

function updateThemeIcon(theme) {
    const btn = document.getElementById('themeToggle');
    btn.innerHTML = theme === 'light' 
        ? '<i class="bi bi-moon-stars-fill"></i>' 
        : '<i class="bi bi-sun-fill"></i>';
}

// --- Utility ---
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
    const colors = {
        overdue: 'danger',
        today: 'warning',
        urgent: 'primary',
        soon: 'primary',
        ok: 'success',
        checked: 'secondary'
    };
    return colors[statusClass] || 'secondary';
}

function getTextColor(statusClass) {
    return (statusClass === 'today' || statusClass === 'soon') ? 'dark' : 'white';
}

function showAlert(message, type = 'info') {
    const container = document.getElementById('alertContainer');
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show`;
    alert.innerHTML = `${message}<button type="button" class="btn-close" data-bs-dismiss="alert"></button>`;
    container.appendChild(alert);
    setTimeout(() => alert.remove(), 3000);
}
