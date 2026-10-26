// ключ в localStorage, под которым хранится массив открыток
const STORAGE_KEY = 'gev-web-pr4-cards-v1';
// названия тем (это части CSS-классов theme-...)
const themes = ['linen', 'night', 'sunset', 'garden', 'winter'];

// находим элементы формы
const textInput = document.getElementById('card-text');
const fromInput = document.getElementById('card-from');
const toInput = document.getElementById('card-to');
const themeInput = document.getElementById('card-theme');
const sendButton = document.getElementById('send');
const statusText = document.getElementById('card-status');

let cards = []; // все сохранённые открытки

// читаем открытки из localStorage
function readCards() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (!Array.isArray(saved)) {
      return [];
    }
    // оставляем только записи, у которых есть все нужные поля
    return saved.filter(function (card) {
      return (
        card &&
        typeof card.id === 'string' &&
        typeof card.text === 'string' &&
        typeof card.from === 'string' &&
        typeof card.to === 'string' &&
        themes.includes(card.theme)
      );
    });
  } catch (error) {
    statusText.textContent = 'Не удалось прочитать сохранённые открытки.';
    return [];
  }
}

// сохраняем массив открыток в localStorage
function saveCards(newCards) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newCards));
    cards = newCards;
    return true;
  } catch (error) {
    statusText.textContent = 'Не удалось сохранить открытку.';
    return false;
  }
}

// проверка: все три поля заполнены (пробелы не считаются)
function allFilled() {
  return textInput.value.trim() !== '' && fromInput.value.trim() !== '' && toInput.value.trim() !== '';
}

// обновляем предпросмотр и включаем кнопку, только когда всё заполнено
function preview() {
  document.getElementById('preview').className = 'postcard theme-' + themeInput.value;
  document.getElementById('preview-text').textContent = textInput.value.trim() || 'Текст поздравления';
  document.getElementById('preview-to').textContent = 'Кому: ' + (toInput.value.trim() || '...');
  document.getElementById('preview-from').textContent = 'От: ' + (fromInput.value.trim() || '...');
  sendButton.disabled = !allFilled();
}

// создаём одну открытку для истории
function createCard(card) {
  const wrapper = document.createElement('article');
  wrapper.className = 'history-item';

  const postcard = document.createElement('div');
  postcard.className = 'postcard theme-' + card.theme;
  // текст вставляем через textContent, чтобы введённые теги не выполнялись
  const to = document.createElement('small');
  to.textContent = 'Кому: ' + card.to;
  const text = document.createElement('p');
  text.textContent = card.text;
  const from = document.createElement('small');
  from.textContent = 'От: ' + card.from;
  postcard.append(to, text, from);

  // кнопка удаления только этой открытки
  const remove = document.createElement('button');
  remove.textContent = 'Удалить';
  remove.addEventListener('click', function () {
    const rest = cards.filter(function (item) {
      return item.id !== card.id;
    });
    if (saveCards(rest)) {
      renderHistory();
      statusText.textContent = 'Открытка удалена.';
    }
  });

  wrapper.append(postcard, remove);
  return wrapper;
}

// выводим историю: новые открытки сверху
function renderHistory() {
  const container = document.getElementById('history');
  container.innerHTML = '';
  for (let i = cards.length - 1; i >= 0; i--) {
    container.append(createCard(cards[i]));
  }
  document.getElementById('history-count').textContent = cards.length;
  document.getElementById('history-empty').hidden = cards.length > 0;
  document.getElementById('clear-history').disabled = cards.length === 0;
}

// предпросмотр обновляется при любом вводе и при смене темы
[textInput, fromInput, toInput, themeInput].forEach(function (input) {
  input.addEventListener('input', preview);
});

// отправка: сохраняем открытку в историю и очищаем поля
document.getElementById('card-form').addEventListener('submit', function (event) {
  event.preventDefault();
  if (!allFilled()) {
    return;
  }
  const card = {
    id: String(Date.now()),
    text: textInput.value.trim(),
    from: fromInput.value.trim(),
    to: toInput.value.trim(),
    theme: themeInput.value
  };
  if (!saveCards(cards.concat(card))) {
    return;
  }
  renderHistory();
  statusText.textContent = 'Открытка отправлена в историю.';
  textInput.value = '';
  fromInput.value = '';
  toInput.value = '';
  preview();
});

document.getElementById('clear-history').addEventListener('click', function () {
  if (!confirm('Удалить все сохранённые открытки?')) {
    return;
  }
  if (saveCards([])) {
    renderHistory();
    statusText.textContent = 'История очищена.';
  }
});

// если открытки изменили в другой вкладке, обновляем историю и здесь
window.addEventListener('storage', function (event) {
  if (event.key === STORAGE_KEY || event.key === null) {
    cards = readCards();
    renderHistory();
  }
});

// при открытии страницы загружаем сохранённые открытки
cards = readCards();
preview();
renderHistory();
