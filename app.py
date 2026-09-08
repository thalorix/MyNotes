import os
from datetime import datetime, date
from flask import Flask, render_template, request, redirect, url_for, flash
from flask_sqlalchemy import SQLAlchemy
from dotenv import load_dotenv

load_dotenv()
app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'chiave-segreta-matteo')
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///reminders.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

class Reminder(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, default='')
    category = db.Column(db.String(50), default='Altro')
    due_date = db.Column(db.Date, nullable=False)
    priority = db.Column(db.String(20), default='media')
    checked = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    @property
    def days_left(self):
        return (self.due_date - date.today()).days if self.due_date else None

    @property
    def status_class(self):
        if self.checked: return 'checked'
        days = self.days_left
        if days is None: return ''
        if days < 0: return 'overdue'
        if days == 0: return 'today'
        if days <= 3: return 'urgent'
        if days <= 7: return 'soon'
        return 'ok'

    @property
    def status_label(self):
        if self.checked: return '✓ Controllato'
        days = self.days_left
        if days is None: return 'Senza data'
        if days < 0: return f'Scaduto da {-days}g'
        if days == 0: return 'Oggi!'
        if days == 1: return 'Domani'
        return f'Tra {days} giorni'

CATEGORIES = ['Università', 'Biblioteca', 'Lezioni', 'Personale', 'Lavoro', 'Altro']
PRIORITIES = ['bassa', 'media', 'alta']

@app.route('/')
def index():
    filter_cat = request.args.get('category', 'tutte')
    filter_status = request.args.get('status', 'tutti')
    search = request.args.get('search', '').strip()
    query = Reminder.query
    if filter_cat != 'tutte': query = query.filter_by(category=filter_cat)
    if filter_status == 'attivi': query = query.filter_by(checked=False)
    elif filter_status == 'controllati': query = query.filter_by(checked=True)
    if search: query = query.filter(db.or_(Reminder.title.ilike(f'%{search}%'), Reminder.description.ilike(f'%{search}%')))
    reminders = query.order_by(Reminder.due_date.asc(), Reminder.priority.desc()).all()
    stats = {
        'total': Reminder.query.count(),
        'overdue': sum(1 for r in Reminder.query.filter_by(checked=False).all() if r.days_left is not None and r.days_left < 0),
        'today': sum(1 for r in Reminder.query.filter_by(checked=False).all() if r.days_left == 0),
        'week': sum(1 for r in Reminder.query.filter_by(checked=False).all() if r.days_left is not None and 0 < r.days_left <= 7),
    }
    return render_template('index.html', reminders=reminders, categories=CATEGORIES, filter_cat=filter_cat, filter_status=filter_status, search=search, stats=stats)

@app.route('/add', methods=['GET', 'POST'])
def add():
    if request.method == 'POST':
        title = request.form.get('title', '').strip()
        description = request.form.get('description', '').strip()
        category = request.form.get('category', 'Altro')
        due_date_str = request.form.get('due_date', '')
        priority = request.form.get('priority', 'media')
        if not title or not due_date_str:
            flash('Titolo e data sono obbligatori', 'danger')
            return redirect(url_for('add'))
        due_date = datetime.strptime(due_date_str, '%Y-%m-%d').date()
        db.session.add(Reminder(title=title, description=description, category=category, due_date=due_date, priority=priority))
        db.session.commit()
        flash('Promemoria aggiunto!', 'success')
        return redirect(url_for('index'))
    return render_template('form.html', reminder=None, categories=CATEGORIES, priorities=PRIORITIES)

@app.route('/edit/<int:id>', methods=['GET', 'POST'])
def edit(id):
    reminder = Reminder.query.get_or_404(id)
    if request.method == 'POST':
        reminder.title = request.form.get('title', '').strip()
        reminder.description = request.form.get('description', '').strip()
        reminder.category = request.form.get('category', 'Altro')
        reminder.priority = request.form.get('priority', 'media')
        if request.form.get('due_date'):
            reminder.due_date = datetime.strptime(request.form.get('due_date'), '%Y-%m-%d').date()
        db.session.commit()
        flash('Promemoria aggiornato!', 'success')
        return redirect(url_for('index'))
    return render_template('form.html', reminder=reminder, categories=CATEGORIES, priorities=PRIORITIES)

@app.route('/toggle/<int:id>')
def toggle(id):
    reminder = Reminder.query.get_or_404(id)
    reminder.checked = not reminder.checked
    db.session.commit()
    return redirect(url_for('index'))

@app.route('/delete/<int:id>', methods=['POST'])
def delete(id):
    db.session.delete(Reminder.query.get_or_404(id))
    db.session.commit()
    return redirect(url_for('index'))

if __name__ == '__main__':
    with app.app_context(): db.create_all()
    app.run(debug=True, port=5000)
