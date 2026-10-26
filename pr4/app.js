'use strict';

const STORAGE_KEY = 'gev-web-pr4-cards-v1';
const themes = ['linen', 'night', 'sunset', 'garden', 'winter'];
const textInput = document.getElementById('card-text');
const fromInput = document.getElementById('card-from');
const toInput = document.getElementById('card-to');
const themeInput = document.getElementById('card-theme');
const status = document.getElementById('card-status');
let cards = [];

function readCards() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (!Array.isArray(value)) throw new Error('Invalid data');
    return value.filter(c => c && typeof c.id === 'string' && typeof c.text === 'string' && typeof c.from === 'string' && typeof c.to === 'string' && themes.includes(c.theme));
  } catch { status.textContent = 'Не удалось прочитать историю. Проверьте доступ к хранилищу браузера.'; return []; }
}

function persist(nextCards) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(nextCards)); cards = nextCards; return true; }
  catch { status.textContent = 'Не удалось сохранить открытки. Возможно, хранилище заполнено или недоступно.'; return false; }
}

function preview() {
  document.getElementById('preview').className = `postcard theme-${themeInput.value}`;
  document.getElementById('preview-text').textContent = textInput.value.trim() || 'Пара тёплых слов сделает день лучше.';
  document.getElementById('preview-from').textContent = fromInput.value.trim() ? `От ${fromInput.value.trim()}` : 'С добрыми пожеланиями';
  document.getElementById('preview-to').textContent = toInput.value.trim() ? `Для ${toInput.value.trim()}` : 'Для вас';
  document.getElementById('send').disabled = ![textInput, fromInput, toInput].every(input => input.value.trim());
}

function renderHistory() {
  const container = document.getElementById('history'); container.replaceChildren();
  cards.slice().reverse().forEach(card => {
    const wrapper = document.createElement('article'); wrapper.className = 'history-item';
    const element = document.createElement('div'); element.className = `postcard theme-${card.theme}`;
    // Пользовательский текст вставляется через textContent: HTML-теги не выполняются.
    const to = document.createElement('small'); to.textContent = `Для ${card.to}`;
    const text = document.createElement('p'); text.textContent = card.text;
    const from = document.createElement('small'); from.textContent = `От ${card.from}`;
    element.append(to, text, from);
    const remove = document.createElement('button'); remove.textContent = 'Удалить'; remove.className = 'danger'; remove.setAttribute('aria-label', `Удалить открытку для ${card.to}`);
    remove.addEventListener('click', () => { if (persist(cards.filter(c => c.id !== card.id))) { renderHistory(); status.textContent = 'Открытка удалена.'; } });
    wrapper.append(element, remove); container.append(wrapper);
  });
  document.getElementById('history-count').textContent = cards.length;
  document.getElementById('history-empty').hidden = cards.length > 0;
  document.getElementById('clear-history').disabled = cards.length === 0;
}

[textInput, fromInput, toInput, themeInput].forEach(input => input.addEventListener('input', preview));
document.getElementById('card-form').addEventListener('submit', event => {
  event.preventDefault(); if (![textInput, fromInput, toInput].every(input => input.value.trim())) return;
  const card = { id: crypto.randomUUID(), text: textInput.value.trim(), from: fromInput.value.trim(), to: toInput.value.trim(), theme: themeInput.value };
  if (!persist([...cards, card])) return;
  renderHistory(); status.textContent = 'Открытка сохранена в коллекции.';
  textInput.value = ''; fromInput.value = ''; toInput.value = ''; preview();
});
document.getElementById('clear-history').addEventListener('click', () => { if (persist([])) { renderHistory(); status.textContent = 'Коллекция очищена.'; } });
// Событие storage обновляет коллекцию в другой вкладке того же сайта.
window.addEventListener('storage', event => { if (event.key === STORAGE_KEY || event.key === null) { cards = readCards(); renderHistory(); } });
cards = readCards(); preview(); renderHistory();
