'use strict';

const tray = document.getElementById('tray');
const board = document.getElementById('pinboard');
const input = document.getElementById('sticker-text');
const stickers = [];
let nextId = 1;
let selectedId = null;
let dragOffset = { x: 0, y: 0 };
let topLayer = 1;

function updateCounts() {
  document.getElementById('tray-count').textContent = stickers.filter(
    (s) => s.zone === 'tray'
  ).length;
  document.getElementById('board-count').textContent = stickers.filter(
    (s) => s.zone === 'board'
  ).length;
  document.getElementById('board-placeholder').hidden = stickers.some(
    (s) => s.zone === 'board'
  );
}

function removeSticker(id) {
  const index = stickers.findIndex((s) => s.id === id);
  if (index < 0) return;
  stickers[index].element.remove();
  stickers.splice(index, 1);
  if (selectedId === id) selectedId = null;
  updateCounts();
}

function selectSticker(id) {
  selectedId = id;
  stickers.forEach((s) => {
    s.element.style.outline = s.id === id ? '2px solid #42674e' : '';
    s.element.setAttribute('aria-pressed', String(s.id === id));
  });
}

// Координаты считаются относительно доски, с учётом точки захвата стикера.
function fitSticker(sticker, x, y) {
  sticker.x = Math.max(0, Math.min(x, board.clientWidth - sticker.element.offsetWidth));
  sticker.y = Math.max(0, Math.min(y, board.clientHeight - sticker.element.offsetHeight));
  sticker.element.style.left = `${sticker.x}px`;
  sticker.element.style.top = `${sticker.y}px`;
}

function placeSticker(id, zone, x = 10, y = 10) {
  const sticker = stickers.find((s) => s.id === id);
  if (!sticker) return;
  sticker.zone = zone;
  const target = zone === 'board' ? board : tray;
  target.append(sticker.element);
  if (zone === 'board') {
    fitSticker(sticker, x, y);
    sticker.element.style.zIndex = ++topLayer;
  } else {
    sticker.element.style.left = '';
    sticker.element.style.top = '';
    sticker.element.style.zIndex = '';
  }
  selectSticker(id);
  updateCounts();
}

function addSticker(text) {
  const id = String(nextId++);
  const element = document.createElement('article');
  element.className = 'sticker';
  element.draggable = true;
  element.tabIndex = 0;
  // Цвет относится к самому стикеру и сохраняется при переносе между полями.
  const colors = ['#fff0aa', '#e8dbee', '#dce9cb'];
  element.style.backgroundColor = colors[(Number(id) - 1) % colors.length];
  element.dataset.id = id;
  element.setAttribute('role', 'button');
  element.setAttribute('aria-label', `Выбрать стикер: ${text}`);
  const content = document.createElement('span');
  content.textContent = text;
  const remove = document.createElement('button');
  remove.type = 'button';
  remove.textContent = '×';
  remove.setAttribute('aria-label', `Удалить стикер: ${text}`);
  remove.addEventListener('click', (event) => {
    event.stopPropagation();
    removeSticker(id);
  });
  remove.addEventListener('keydown', (event) => event.stopPropagation());
  element.append(content, remove);
  element.addEventListener('click', (event) => {
    event.stopPropagation();
    selectSticker(id);
  });
  element.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      selectSticker(id);
    }
    if (event.key === 'Delete') removeSticker(id);
  });
  element.addEventListener('dragstart', (event) => {
    selectSticker(id);
    const rect = element.getBoundingClientRect();
    dragOffset = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    event.dataTransfer.setData('text/plain', id);
    event.dataTransfer.effectAllowed = 'move';
  });
  stickers.push({ id, text, element, zone: 'tray', x: 0, y: 0 });
  tray.append(element);
  updateCounts();
}

document.getElementById('sticker-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const text = input.value.trim();
  if (!text) {
    document.getElementById('input-error').textContent = 'Сначала напишите текст стикера.';
    input.focus();
    return;
  }
  if (text.length > 500) {
    document.getElementById('input-error').textContent =
      'Для стикера используйте не более 500 символов.';
    return;
  }
  document.getElementById('input-error').textContent = '';
  addSticker(text);
  input.value = '';
  input.focus();
});
[tray, board].forEach((zone) => {
  zone.addEventListener('dragover', (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    zone.classList.add('drag-over');
  });
  zone.addEventListener('dragleave', (event) => {
    if (!zone.contains(event.relatedTarget)) zone.classList.remove('drag-over');
  });
  zone.addEventListener('drop', (event) => {
    event.preventDefault();
    zone.classList.remove('drag-over');
    const rect = board.getBoundingClientRect();
    placeSticker(
      event.dataTransfer.getData('text/plain'),
      zone === board ? 'board' : 'tray',
      event.clientX - rect.left - board.clientLeft - dragOffset.x,
      event.clientY - rect.top - board.clientTop - dragOffset.y
    );
  });
});
board.addEventListener('click', (event) => {
  if (event.target !== board) return;
  const sticker = stickers.find((s) => s.id === selectedId);
  if (!sticker) return;
  const rect = board.getBoundingClientRect();
  placeSticker(
    selectedId,
    'board',
    event.clientX - rect.left - board.clientLeft - sticker.element.offsetWidth / 2,
    event.clientY - rect.top - board.clientTop - 35
  );
});
tray.addEventListener('click', (event) => {
  if (event.target === tray) placeSticker(selectedId, 'tray');
});
function clearZone(zone) {
  stickers
    .filter((s) => s.zone === zone)
    .map((s) => s.id)
    .forEach(removeSticker);
  document.getElementById('notice').textContent =
    zone === 'board' ? 'Доска очищена.' : 'Поле очищено.';
}
document.getElementById('clear-tray').addEventListener('click', () => clearZone('tray'));
document.getElementById('clear-board').addEventListener('click', () => clearZone('board'));
// Ждём окончания изменения окна, чтобы промежуточная ширина не сдвинула все заметки.
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (board.clientWidth < 170) return;
    stickers.filter((s) => s.zone === 'board').forEach((s) => fitSticker(s, s.x, s.y));
  }, 120);
});
document.addEventListener('dragend', () =>
  document.querySelectorAll('.drag-over').forEach((el) => el.classList.remove('drag-over'))
);
updateCounts();
