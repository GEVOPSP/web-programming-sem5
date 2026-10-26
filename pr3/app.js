// поле со стикерами (tray) и доска (board)
const tray = document.getElementById('tray');
const board = document.getElementById('pinboard');
const input = document.getElementById('sticker-text');
const inputError = document.getElementById('input-error');

// все стикеры: { id, text, element, zone: 'tray' или 'board', x, y }
const stickers = [];
let nextId = 1;
let selectedId = null;
let dragOffset = { x: 0, y: 0 }; // в каком месте стикер взяли мышкой
let topLayer = 1; // z-index последнего перенесённого стикера

// счётчики в заголовках и подсказка на пустой доске
function updateCounts() {
  const inTray = stickers.filter((s) => s.zone === 'tray').length;
  const onBoard = stickers.filter((s) => s.zone === 'board').length;
  document.getElementById('tray-count').textContent = inTray;
  document.getElementById('board-count').textContent = onBoard;
  document.getElementById('board-placeholder').hidden = onBoard > 0;
}

// удаление одного стикера
function removeSticker(id) {
  const index = stickers.findIndex((s) => s.id === id);
  if (index < 0) return;
  stickers[index].element.remove(); // убираем со страницы
  stickers.splice(index, 1); // и из массива
  if (selectedId === id) selectedId = null;
  updateCounts();
}

// выделяем стикер рамкой
function selectSticker(id) {
  selectedId = id;
  stickers.forEach((s) => {
    s.element.style.outline = s.id === id ? '2px solid #42674e' : '';
  });
}

// ставим стикер на доску в точку (x, y), но не даём ему вылезти за края
function fitSticker(sticker, x, y) {
  sticker.x = Math.max(0, Math.min(x, board.clientWidth - sticker.element.offsetWidth));
  sticker.y = Math.max(0, Math.min(y, board.clientHeight - sticker.element.offsetHeight));
  sticker.element.style.left = sticker.x + 'px';
  sticker.element.style.top = sticker.y + 'px';
}

// перенос стикера в зону 'board' или 'tray'
function placeSticker(id, zone, x = 10, y = 10) {
  const sticker = stickers.find((s) => s.id === id);
  if (!sticker) return;
  sticker.zone = zone;
  if (zone === 'board') {
    board.append(sticker.element);
    fitSticker(sticker, x, y);
    // перенесённый стикер ложится поверх остальных
    topLayer++;
    sticker.element.style.zIndex = topLayer;
  } else {
    // в поле стикеры стоят списком, координаты не нужны
    tray.append(sticker.element);
    sticker.element.style.left = '';
    sticker.element.style.top = '';
    sticker.element.style.zIndex = '';
  }
  selectSticker(id);
  updateCounts();
}

// создание нового стикера в поле стикеров
function addSticker(text) {
  const id = String(nextId++);
  const element = document.createElement('article');
  element.className = 'sticker';
  element.draggable = true;
  element.tabIndex = 0;
  element.dataset.id = id;
  // цвета стикеров чередуются
  const colors = ['#fff0aa', '#e8dbee', '#dce9cb'];
  element.style.backgroundColor = colors[(Number(id) - 1) % colors.length];

  const content = document.createElement('span');
  content.textContent = text; // textContent, чтобы теги из текста не выполнялись

  // у каждого стикера своя кнопка удаления
  const remove = document.createElement('button');
  remove.type = 'button';
  remove.textContent = '×';
  remove.title = 'Удалить стикер';
  remove.addEventListener('click', (event) => {
    event.stopPropagation();
    removeSticker(id);
  });
  element.append(content, remove);

  element.addEventListener('click', (event) => {
    event.stopPropagation();
    selectSticker(id);
  });
  element.addEventListener('keydown', (event) => {
    if (event.key === 'Delete') removeSticker(id);
  });
  // начало перетаскивания: запоминаем id и точку захвата внутри стикера
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

// кнопка "Добавить" (и Enter в поле ввода)
document.getElementById('sticker-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const text = input.value.trim();
  if (!text) {
    inputError.textContent = 'Сначала напишите текст стикера.';
    input.focus();
    return;
  }
  if (text.length > 500) {
    inputError.textContent = 'Не больше 500 символов.';
    return;
  }
  inputError.textContent = '';
  addSticker(text);
  input.value = '';
  input.focus();
});

// обе зоны принимают стикеры
[tray, board].forEach((zone) => {
  zone.addEventListener('dragover', (event) => {
    event.preventDefault(); // разрешаем drop
    event.dataTransfer.dropEffect = 'move';
    zone.classList.add('drag-over');
  });
  zone.addEventListener('dragleave', (event) => {
    if (!zone.contains(event.relatedTarget)) zone.classList.remove('drag-over');
  });
  zone.addEventListener('drop', (event) => {
    event.preventDefault();
    zone.classList.remove('drag-over');
    // координаты курсора переводим в координаты внутри доски
    // и вычитаем точку захвата, чтобы стикер не "прыгал" под курсором
    const rect = board.getBoundingClientRect();
    const x = event.clientX - rect.left - board.clientLeft - dragOffset.x;
    const y = event.clientY - rect.top - board.clientTop - dragOffset.y;
    placeSticker(event.dataTransfer.getData('text/plain'), zone === board ? 'board' : 'tray', x, y);
  });
});

// на телефоне drag and drop не работает, поэтому можно выбрать стикер и нажать на доску
board.addEventListener('click', (event) => {
  if (event.target !== board) return;
  const sticker = stickers.find((s) => s.id === selectedId);
  if (!sticker) return;
  const rect = board.getBoundingClientRect();
  const x = event.clientX - rect.left - board.clientLeft - sticker.element.offsetWidth / 2;
  const y = event.clientY - rect.top - board.clientTop - 35;
  placeSticker(selectedId, 'board', x, y);
});
tray.addEventListener('click', (event) => {
  if (event.target === tray) placeSticker(selectedId, 'tray');
});

// очистка одной зоны, вторая не трогается
function clearZone(zone) {
  const ids = stickers.filter((s) => s.zone === zone).map((s) => s.id);
  ids.forEach(removeSticker);
}
document.getElementById('clear-tray').addEventListener('click', () => clearZone('tray'));
document.getElementById('clear-board').addEventListener('click', () => clearZone('board'));

// при изменении размера окна возвращаем стикеры внутрь доски
// (ждём, пока размер перестанет меняться; на совсем узкой доске ничего не двигаем)
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (board.clientWidth < 170) return;
    stickers.filter((s) => s.zone === 'board').forEach((s) => fitSticker(s, s.x, s.y));
  }, 150);
});

document.addEventListener('dragend', () =>
  document.querySelectorAll('.drag-over').forEach((el) => el.classList.remove('drag-over'))
);

updateCounts();
