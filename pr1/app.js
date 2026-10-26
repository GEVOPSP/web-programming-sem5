// фишки игроков: cell - номер клетки (null - фишка ещё в области фишек),
// skip - нужно ли пропустить следующий бросок кубика
const players = [
  { id: 'earth', name: 'Земля', image: 'earth.jpg', cell: null, skip: false },
  { id: 'moon', name: 'Луна', image: 'moon.jpg', cell: null, skip: false },
  { id: 'saturn', name: 'Сатурн', image: 'saturn.jpg', cell: null, skip: false }
];

// клетки поля: [название, эффект]
// эффекты: forward - на 2 вперёд, back - на 2 назад, skip - пропуск хода, goal - финиш
const spaces = [
  ['Старт', 'start'],
  ['Первая орбита', ''],
  ['Попутный ветер: +2 клетки', 'forward'],
  ['Метеоритный поток', ''],
  ['Тихий космос', ''],
  ['Ремонт: пропуск хода', 'skip'],
  ['Солнечный ветер: −2 клетки', 'back'],
  ['Лунная станция', ''],
  ['Звёздный свет', ''],
  ['Дальняя орбита', ''],
  ['Последний рывок', ''],
  ['Финиш', 'goal']
];

let selected = null; // id выбранной фишки
const board = document.getElementById('board');
const shelf = document.getElementById('shelf');
const message = document.getElementById('event');

// выбор фишки (кликом или при начале перетаскивания)
function selectPlayer(id) {
  selected = id;
  const player = players.find((p) => p.id === id);
  document.getElementById('active-player').textContent = player
    ? `Выбрана фишка: ${player.name}`
    : 'Фишка не выбрана';
  // подсвечиваем выбранную фишку
  document.querySelectorAll('.token').forEach((token) => {
    token.classList.toggle('selected', token.dataset.id === id);
  });
}

// создаём элемент фишки с картинкой
function makeToken(player) {
  const token = document.createElement('div');
  token.className = 'token';
  token.dataset.id = player.id;
  token.draggable = true; // разрешаем перетаскивание
  token.tabIndex = 0;
  const image = document.createElement('img');
  image.src = `../assets/${player.image}`;
  image.alt = '';
  image.draggable = false; // тащим всю фишку, а не саму картинку
  const text = document.createElement('span');
  text.textContent = player.name;
  token.append(image, text);

  token.addEventListener('click', (event) => {
    event.stopPropagation(); // чтобы клик не дошёл до клетки под фишкой
    selectPlayer(player.id);
  });
  token.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      event.stopPropagation();
      selectPlayer(player.id);
    }
  });
  // при начале перетаскивания запоминаем id фишки
  token.addEventListener('dragstart', (event) => {
    selectPlayer(player.id);
    event.dataTransfer.setData('text/plain', player.id);
    event.dataTransfer.effectAllowed = 'move';
  });
  return token;
}

// рисуем поле и область фишек заново по данным из массивов
function render() {
  board.innerHTML = '';
  shelf.innerHTML = '';
  spaces.forEach(([name, effect], index) => {
    const cell = document.createElement('div');
    cell.className = 'cell';
    if (effect) cell.classList.add('special');
    if (effect === 'goal') cell.classList.add('goal');
    cell.dataset.cell = index;
    cell.tabIndex = 0;

    const number = document.createElement('span');
    number.className = 'cell-number';
    number.textContent = index + 1;
    const title = document.createElement('strong');
    title.textContent = name;
    // фишки, которые стоят на этой клетке
    const tokens = document.createElement('div');
    tokens.className = 'tokens';
    players.filter((p) => p.cell === index).forEach((p) => tokens.append(makeToken(p)));
    cell.append(number, title, tokens);

    enableDrop(cell, index);
    // второй способ хода: выбрать фишку, потом нажать на клетку
    cell.addEventListener('click', () => move(selected, index));
    cell.addEventListener('keydown', (event) => {
      if (event.target === cell && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        move(selected, index);
      }
    });
    board.append(cell);
  });
  // фишки, которые ещё не на поле
  players.filter((p) => p.cell === null).forEach((p) => shelf.append(makeToken(p)));
  selectPlayer(selected);
}

// делаем элемент местом, куда можно бросить фишку
function enableDrop(zone, index) {
  zone.addEventListener('dragover', (event) => {
    event.preventDefault(); // без этого браузер не разрешит drop
    event.dataTransfer.dropEffect = 'move';
    zone.classList.add('drag-over');
  });
  zone.addEventListener('dragleave', (event) => {
    if (!zone.contains(event.relatedTarget)) zone.classList.remove('drag-over');
  });
  zone.addEventListener('drop', (event) => {
    event.preventDefault();
    zone.classList.remove('drag-over');
    move(event.dataTransfer.getData('text/plain'), index);
  });
}

// перемещение фишки на клетку index (null - вернуть в область фишек)
function move(id, index) {
  const player = players.find((p) => p.id === id);
  if (!player) {
    message.textContent = 'Сначала выберите фишку.';
    return;
  }
  selected = id;

  if (index === null) {
    player.cell = null;
    player.skip = false;
    message.textContent = `${player.name}: фишка снята с поля.`;
    render();
    return;
  }

  player.cell = index;
  const effect = spaces[index][1];
  let note = `${player.name}: клетка ${index + 1} - ${spaces[index][0]}.`;

  // особые клетки: сдвиг на 2 клетки, пропуск хода, финиш
  if (effect === 'forward' || effect === 'back') {
    const step = effect === 'forward' ? 2 : -2;
    // не выходим за начало и конец поля
    player.cell = Math.max(0, Math.min(spaces.length - 1, index + step));
    note += ` Фишка переходит на клетку ${player.cell + 1}.`;
  }
  if (effect === 'skip') {
    player.skip = true;
    note += ' Следующий бросок кубика пропускается.';
  }
  if (effect === 'goal') {
    note += ' Путешествие завершено!';
  }
  message.textContent = note;
  render();
}

// область фишек тоже принимает фишки (вернуть фишку с поля)
enableDrop(shelf, null);
shelf.addEventListener('click', (event) => {
  if (event.target === shelf && selected) move(selected, null);
});
shelf.addEventListener('keydown', (event) => {
  if (event.target === shelf && (event.key === 'Enter' || event.key === ' ')) {
    event.preventDefault();
    move(selected, null);
  }
});

// кубик: случайное число от 1 до 6, выбранная фишка идёт вперёд на столько клеток
document.getElementById('roll').addEventListener('click', () => {
  const player = players.find((p) => p.id === selected);
  if (!player) {
    message.textContent = 'Перед броском выберите фишку.';
    return;
  }
  if (player.skip) {
    player.skip = false;
    message.textContent = `${player.name} пропускает этот ход. Теперь можно бросать снова.`;
    return;
  }
  const value = Math.floor(Math.random() * 6) + 1;
  document.getElementById('dice').textContent = value;
  // фишка из области фишек начинает с позиции -1, то есть перед первой клеткой
  const from = player.cell === null ? -1 : player.cell;
  move(player.id, Math.min(spaces.length - 1, from + value));
});

// начать игру заново: все фишки возвращаются в область фишек
document.getElementById('reset').addEventListener('click', () => {
  players.forEach((p) => {
    p.cell = null;
    p.skip = false;
  });
  selected = null;
  document.getElementById('dice').textContent = '—';
  message.textContent = 'Новая игра. Выберите фишку.';
  render();
});

// убираем подсветку, если перетаскивание отменили
document.addEventListener('dragend', () =>
  document.querySelectorAll('.drag-over').forEach((el) => el.classList.remove('drag-over'))
);

render();
