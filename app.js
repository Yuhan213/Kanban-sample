/**
 * Kanban Board – app.js
 * Manages board state (localStorage), drag-and-drop, and card CRUD.
 */

const STORAGE_KEY = 'kanban_cards';

// ─── State ────────────────────────────────────────────────────────
let cards = loadCards();

// ─── DOM helpers ─────────────────────────────────────────────────
const overlay      = document.getElementById('modal-overlay');
const modalTitle   = document.getElementById('modal-title');
const titleInput   = document.getElementById('card-title-input');
const descInput    = document.getElementById('card-desc-input');
const saveBtn      = document.getElementById('modal-save-btn');
const cancelBtn    = document.getElementById('modal-cancel-btn');

// ─── Modal state ─────────────────────────────────────────────────
let currentCol  = null;   // column id when adding
let editingId   = null;   // card id when editing

// ─── Bootstrap ───────────────────────────────────────────────────
renderBoard();
bindColumnButtons();

// ─── Persistence ─────────────────────────────────────────────────
function loadCards() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : defaultCards();
  } catch {
    return defaultCards();
  }
}

function saveCards() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
}

function defaultCards() {
  return [
    { id: uid(), status: 'todo',       title: 'Design wireframes',      desc: 'Create initial UI mockups for the dashboard.' },
    { id: uid(), status: 'todo',       title: 'Write user stories',      desc: 'Document acceptance criteria for each feature.' },
    { id: uid(), status: 'inprogress', title: 'Set up CI/CD pipeline',   desc: 'Configure GitHub Actions for build and deployment.' },
    { id: uid(), status: 'done',       title: 'Initialize repository',    desc: 'Create repo, add README and issue templates.' },
  ];
}

// ─── Render ───────────────────────────────────────────────────────
function renderBoard() {
  ['todo', 'inprogress', 'done'].forEach(renderColumn);
}

function renderColumn(status) {
  const container = document.getElementById(`cards-${status}`);
  const countEl   = document.getElementById(`count-${status}`);
  const colCards  = cards.filter(c => c.status === status);

  container.innerHTML = '';
  colCards.forEach(card => container.appendChild(createCardEl(card)));
  countEl.textContent = colCards.length;

  // (Re)bind drag-and-drop for the column
  bindDropZone(container, status);
}

function createCardEl(card) {
  const el = document.createElement('div');
  el.className   = 'card';
  el.draggable   = true;
  el.dataset.id  = card.id;

  el.innerHTML = `
    <div class="card-title">${escHtml(card.title)}</div>
    ${card.desc ? `<div class="card-desc">${escHtml(card.desc)}</div>` : ''}
    <div class="card-actions">
      <button class="edit-btn"   aria-label="Edit card">Edit</button>
      <button class="delete-btn" aria-label="Delete card">Delete</button>
    </div>`;

  el.querySelector('.edit-btn').addEventListener('click', e => {
    e.stopPropagation();
    openEditModal(card.id);
  });

  el.querySelector('.delete-btn').addEventListener('click', e => {
    e.stopPropagation();
    deleteCard(card.id);
  });

  // Drag events
  el.addEventListener('dragstart', onDragStart);
  el.addEventListener('dragend',   onDragEnd);

  return el;
}

// ─── CRUD ─────────────────────────────────────────────────────────
function addCard(status, title, desc) {
  const card = { id: uid(), status, title: title.trim(), desc: desc.trim() };
  cards.push(card);
  saveCards();
  renderColumn(status);
}

function updateCard(id, title, desc) {
  const card = cards.find(c => c.id === id);
  if (!card) return;
  card.title = title.trim();
  card.desc  = desc.trim();
  saveCards();
  renderColumn(card.status);
}

function deleteCard(id) {
  const card = cards.find(c => c.id === id);
  if (!card) return;
  cards = cards.filter(c => c.id !== id);
  saveCards();
  renderColumn(card.status);
}

function moveCard(id, newStatus) {
  const card = cards.find(c => c.id === id);
  if (!card || card.status === newStatus) return;
  const oldStatus = card.status;
  card.status = newStatus;
  saveCards();
  renderColumn(oldStatus);
  renderColumn(newStatus);
}

// ─── Modal ────────────────────────────────────────────────────────
function bindColumnButtons() {
  document.querySelectorAll('.add-card-btn').forEach(btn => {
    btn.addEventListener('click', () => openAddModal(btn.dataset.col));
  });

  saveBtn.addEventListener('click', handleModalSave);
  cancelBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
}

function openAddModal(col) {
  currentCol = col;
  editingId  = null;
  modalTitle.textContent = 'New Card';
  titleInput.value = '';
  descInput.value  = '';
  showModal();
}

function openEditModal(id) {
  const card = cards.find(c => c.id === id);
  if (!card) return;
  currentCol = null;
  editingId  = id;
  modalTitle.textContent = 'Edit Card';
  titleInput.value = card.title;
  descInput.value  = card.desc;
  showModal();
}

function showModal() {
  overlay.classList.remove('hidden');
  titleInput.focus();
}

function closeModal() {
  overlay.classList.add('hidden');
  currentCol = null;
  editingId  = null;
}

function handleModalSave() {
  const title = titleInput.value.trim();
  if (!title) { titleInput.focus(); return; }

  if (editingId) {
    updateCard(editingId, title, descInput.value);
  } else {
    addCard(currentCol, title, descInput.value);
  }
  closeModal();
}

// ─── Drag-and-drop ───────────────────────────────────────────────
let dragId = null;

function onDragStart(e) {
  dragId = e.currentTarget.dataset.id;
  e.currentTarget.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
}

function onDragEnd(e) {
  e.currentTarget.classList.remove('dragging');
  document.querySelectorAll('.cards').forEach(c => c.classList.remove('drag-over'));
}

function bindDropZone(container, status) {
  container.addEventListener('dragover', e => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    container.classList.add('drag-over');
  });

  container.addEventListener('dragleave', () => {
    container.classList.remove('drag-over');
  });

  container.addEventListener('drop', e => {
    e.preventDefault();
    container.classList.remove('drag-over');
    if (dragId) moveCard(dragId, status);
    dragId = null;
  });
}

// ─── Utilities ───────────────────────────────────────────────────
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function escHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
