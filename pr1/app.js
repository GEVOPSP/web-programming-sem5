'use strict';

// Состояние отделено от DOM: каждая фишка знает свою клетку и пропуск хода.
const players = [
  { id: 'earth', name: 'Земля', image: 'earth.jpg', cell: null, skip: false },
  { id: 'moon', name: 'Луна', image: 'moon.jpg', cell: null, skip: false },
  { id: 'saturn', name: 'Сатурн', image: 'saturn.jpg', cell: null, skip: false }
];
const spaces = [
  ['Космодром · старт', 'start'], ['Первая орбита', ''], ['Попутный ветер · +2', 'forward'],
  ['Метеорный поток', ''], ['Ремонт · пропуск хода', 'skip'], ['Тихий космос', ''],
  ['Солнечный ветер · −2', 'back'], ['Лунная станция', ''], ['Звёздный свет', ''],
  ['Дальняя орбита', ''], ['Последний рывок', ''], ['Новая галактика · финиш', 'goal']
];
let selected = null;
const board = document.getElementById('board');
const shelf = document.getElementById('shelf');
const message = document.getElementById('event');

function selectPlayer(id) {
  selected = id;
  const player = players.find(p => p.id === id);
  document.getElementById('active-player').textContent = player ? `Выбрана фишка: ${player.name}` : 'Фишка не выбрана';
  document.querySelectorAll('.token').forEach(token => {
    token.classList.toggle('selected', token.dataset.id === id);
    token.setAttribute('aria-pressed', String(token.dataset.id === id));
  });
}

function makeToken(player) {
  const token = document.createElement('div');
  token.className = 'token';
  token.dataset.id = player.id;
  token.draggable = true;
  token.tabIndex = 0;
  token.setAttribute('role', 'button');
  token.setAttribute('aria-label', `Выбрать фишку ${player.name}`);
  const image = document.createElement('img');
  image.src = `../assets/${player.image}`;
  image.alt = '';
  image.draggable = false;
  const text = document.createElement('span');
  text.textContent = player.name;
  token.append(image, text);
  token.addEventListener('click', event => { event.stopPropagation(); selectPlayer(player.id); });
  token.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault(); event.stopPropagation(); selectPlayer(player.id);
    }
  });
  // dataTransfer содержит только ID, а не HTML перетаскиваемого объекта.
  token.addEventListener('dragstart', event => {
    selectPlayer(player.id);
    event.dataTransfer.setData('text/plain', player.id);
    event.dataTransfer.effectAllowed = 'move';
  });
  return token;
}

function render() {
  board.replaceChildren(); shelf.replaceChildren();
  spaces.forEach(([name, effect], index) => {
    const cell = document.createElement('div');
    cell.className = `cell ${effect ? 'special' : ''} ${effect === 'goal' ? 'goal' : ''}`;
    cell.dataset.cell = index;
    cell.tabIndex = 0;
    cell.setAttribute('role', 'button');
    cell.setAttribute('aria-label', `Клетка ${index + 1}: ${name}`);
    const number = document.createElement('span'); number.className = 'cell-number'; number.textContent = String(index + 1).padStart(2, '0');
    const title = document.createElement('strong'); title.textContent = name;
    const tokens = document.createElement('div'); tokens.className = 'tokens';
    players.filter(p => p.cell === index).forEach(p => tokens.append(makeToken(p)));
    cell.append(number, title, tokens);
    enableDrop(cell, index);
    cell.addEventListener('click', () => move(selected, index));
    cell.addEventListener('keydown', event => {
      if (event.target === cell && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault(); move(selected, index);
      }
    });
    board.append(cell);
  });
  players.filter(p => p.cell === null).forEach(p => shelf.append(makeToken(p)));
  selectPlayer(selected);
}

function enableDrop(zone, index) {
  zone.addEventListener('dragover', event => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', event => { if (!zone.contains(event.relatedTarget)) zone.classList.remove('drag-over'); });
  zone.addEventListener('drop', event => {
    event.preventDefault(); zone.classList.remove('drag-over');
    move(event.dataTransfer.getData('text/plain'), index);
  });
}

function move(id, index) {
  const player = players.find(p => p.id === id);
  if (!player) { message.textContent = 'Сначала выберите фишку.'; return; }
  selected = id;
  if (index === null) {
    player.cell = null; player.skip = false;
    message.textContent = `${player.name} возвращается в экипаж.`;
  } else {
    player.cell = index;
    const effect = spaces[index][1];
    let note = `${player.name}: клетка ${index + 1}, ${spaces[index][0]}.`;
    // Эффект применяется один раз за перенос, чтобы бонусы не запускали друг друга по кругу.
    if (effect === 'forward' || effect === 'back') {
      player.cell = Math.max(0, Math.min(spaces.length - 1, index + (effect === 'forward' ? 2 : -2)));
      note += ` Перемещение на клетку ${player.cell + 1}.`;
    }
    if (effect === 'skip') { player.skip = true; note += ' Следующий бросок кубика будет пропущен.'; }
    if (effect === 'goal') note += ' Путешествие завершено!';
    message.textContent = note;
  }
  render();
}

enableDrop(shelf, null);
shelf.addEventListener('click', event => { if (event.target === shelf && selected) move(selected, null); });
shelf.addEventListener('keydown', event => {
  if (event.target === shelf && (event.key === 'Enter' || event.key === ' ')) {
    event.preventDefault(); move(selected, null);
  }
});
document.getElementById('roll').addEventListener('click', () => {
  const player = players.find(p => p.id === selected);
  if (!player) { message.textContent = 'Перед броском выберите фишку.'; return; }
  if (player.skip) { player.skip = false; message.textContent = `${player.name} пропускает этот ход. Теперь можно бросать снова.`; return; }
  const value = Math.floor(Math.random() * 6) + 1;
  document.getElementById('dice').textContent = value;
  move(player.id, Math.min(spaces.length - 1, (player.cell ?? -1) + value));
});
document.getElementById('reset').addEventListener('click', () => {
  players.forEach(p => { p.cell = null; p.skip = false; }); selected = null;
  document.getElementById('dice').textContent = '—'; message.textContent = 'Новый маршрут. Выберите фишку.'; render();
});
document.addEventListener('dragend', () => document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over')));
render();
