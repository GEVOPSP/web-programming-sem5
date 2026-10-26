'use strict';

const BOOKS_KEY = 'gev-web-final3-books-v1';
const SESSION_KEY = 'gev-web-final3-session-v1';
const statusLabels = {
  planned: 'Планирую',
  reading: 'Читаю',
  finished: 'Прочитано'
};
const statusValues = ['planned', 'reading', 'finished'];

const bookForm = document.getElementById('book-form');
const fields = {
  title: document.getElementById('title'),
  author: document.getElementById('author'),
  genre: document.getElementById('genre'),
  pages: document.getElementById('pages'),
  status: document.getElementById('status'),
  rating: document.getElementById('rating'),
  notes: document.getElementById('notes')
};
const statusFilter = document.getElementById('filter-status');
const genreFilter = document.getElementById('filter-genre');
const sortSelect = document.getElementById('sort');
const bookList = document.getElementById('book-list');
const bookCount = document.getElementById('books-count');
const emptyList = document.getElementById('books-empty');
const detailContent = document.getElementById('detail-content');
const detailEmpty = document.getElementById('detail-empty');
const detailStatus = document.getElementById('detail-status-input');
const progressInput = document.getElementById('progress-input');
const progressError = document.getElementById('progress-error');
const progressBar = document.getElementById('progress-bar');
const progressText = document.getElementById('progress-text');
const noteInput = document.getElementById('note');
const noteError = document.getElementById('note-error');
const noteDraftStatus = document.getElementById('note-draft');
const quoteForm = document.getElementById('quote-form');
const quoteInput = document.getElementById('quote');
const quoteList = document.getElementById('quote-list');
const quoteError = document.getElementById('quote-error');
const notice = document.getElementById('book-notice');

let books = [];
let selectedId = null;
let noteDrafts = {};

function localDate() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Данные из хранилища проверяются до вывода на страницу.
function isStoredBook(book) {
  if (!book || !book.progress || !Array.isArray(book.quotes)) {
    return false;
  }

  const textFieldsValid =
    typeof book.id === 'string' &&
    typeof book.title === 'string' &&
    typeof book.author === 'string' &&
    typeof book.genre === 'string' &&
    typeof book.notes === 'string';
  const pagesValid = Number.isInteger(book.pages) && book.pages >= 1 && book.pages <= 10000;
  const ratingValid = Number.isInteger(book.rating) && book.rating >= 1 && book.rating <= 5;
  const progressValid =
    Number.isInteger(book.progress.read) &&
    book.progress.read >= 0 &&
    book.progress.read <= book.pages;
  const quotesValid = book.quotes.every(function (quote) {
    return typeof quote === 'string';
  });

  return (
    textFieldsValid &&
    pagesValid &&
    ratingValid &&
    progressValid &&
    quotesValid &&
    statusValues.includes(book.status)
  );
}

function readBooks() {
  try {
    const saved = JSON.parse(localStorage.getItem(BOOKS_KEY) || '[]');
    if (!Array.isArray(saved)) {
      throw new Error('Неверный формат библиотеки');
    }
    return saved.filter(isStoredBook);
  } catch {
    notice.textContent = 'Не удалось прочитать книги. Проверьте хранилище браузера.';
    return [];
  }
}

function persist(nextBooks) {
  try {
    localStorage.setItem(BOOKS_KEY, JSON.stringify(nextBooks));
    books = nextBooks;
    return true;
  } catch {
    notice.textContent = 'Не удалось сохранить изменения. Хранилище недоступно или заполнено.';
    return false;
  }
}

function saveSession() {
  // Выбранная книга и черновики относятся только к этой вкладке.
  const session = { selectedId: selectedId, draftNotes: noteDrafts };
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    notice.textContent = 'Не удалось сохранить черновик.';
  }
}

function restoreSession() {
  try {
    const session = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
    if (!session || typeof session !== 'object') {
      return;
    }
    if (typeof session.selectedId === 'string') {
      selectedId = session.selectedId;
    }
    if (
      session.draftNotes &&
      typeof session.draftNotes === 'object' &&
      !Array.isArray(session.draftNotes)
    ) {
      noteDrafts = session.draftNotes;
    }
  } catch {
    selectedId = null;
    noteDrafts = {};
  }
}

function getSelectedBook() {
  return books.find(function (book) {
    return book.id === selectedId;
  });
}

function selectBook(id) {
  selectedId = id;
  saveSession();
  renderList();
  renderDetail();
}

function updateBook(changes) {
  if (!getSelectedBook()) {
    return false;
  }
  const updated = books.map(function (book) {
    if (book.id === selectedId) {
      return { ...book, ...changes };
    }
    return book;
  });
  if (!persist(updated)) {
    return false;
  }
  renderList();
  renderStats();
  return true;
}

function validateField(name) {
  // У страниц и оценки проверяем не только запись числа, но и допустимые границы.
  const input = fields[name];
  const value = input.value.trim();
  let error = '';

  switch (name) {
    case 'title':
      if (!/^[\s\S]{2,200}$/u.test(value)) {
        error = 'Название: от 2 до 200 символов.';
      }
      break;
    case 'author':
      if (!/^(?=.{2,100}$)[A-Za-zА-Яа-яЁё]+(?: [A-Za-zА-Яа-яЁё]+)*$/u.test(value)) {
        error = 'Автор: от 2 до 100 символов, буквы и пробелы между словами.';
      }
      break;
    case 'genre':
      if (!/^[^\r\n]{2,50}$/u.test(value)) {
        error = 'Жанр: от 2 до 50 символов.';
      }
      break;
    case 'pages':
      if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 10000) {
        error = 'Введите целое число от 1 до 10000.';
      }
      break;
    case 'rating':
      if (!/^[1-5]$/.test(value)) {
        error = 'Оценка: от 1 до 5.';
      }
      break;
    case 'status':
      if (!statusValues.includes(value)) {
        error = 'Выберите статус.';
      }
      break;
    case 'notes':
      if (!/^[\s\S]{0,1000}$/u.test(input.value)) {
        error = 'Заметки: не более 1000 символов.';
      }
      break;
  }

  input.setAttribute('aria-invalid', String(error !== ''));
  const errorElement = document.getElementById(name + '-error');
  if (errorElement) {
    errorElement.textContent = error;
  }
  return error === '';
}

function renderGenres() {
  const previous = genreFilter.value;
  const genres = [];
  for (const book of books) {
    if (!genres.includes(book.genre)) {
      genres.push(book.genre);
    }
  }
  genres.sort(function (a, b) {
    return a.localeCompare(b, 'ru');
  });

  genreFilter.replaceChildren(new Option('Все жанры', ''));
  for (const genre of genres) {
    genreFilter.add(new Option(genre, genre));
  }
  if (genres.includes(previous)) {
    genreFilter.value = previous;
  }
}

function matchesFilters(book) {
  const statusMatches = statusFilter.value === '' || book.status === statusFilter.value;
  const genreMatches = genreFilter.value === '' || book.genre === genreFilter.value;
  return statusMatches && genreMatches;
}

function compareBooks(a, b) {
  switch (sortSelect.value) {
    case 'title':
      return a.title.localeCompare(b.title, 'ru');
    case 'author':
      return a.author.localeCompare(b.author, 'ru');
    case 'rating':
      return b.rating - a.rating;
    default:
      return String(b.addedAt || '').localeCompare(String(a.addedAt || ''));
  }
}

function createBookCard(book) {
  // Пользовательский текст вставляется как текст, без разбора HTML.
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'book-card';
  card.dataset.id = book.id;
  card.classList.toggle('selected', book.id === selectedId);
  card.setAttribute('aria-label', 'Открыть книгу ' + book.title);
  card.setAttribute('aria-pressed', String(book.id === selectedId));

  const cover = document.createElement('div');
  cover.className = 'book-cover tone-' + (books.indexOf(book) % 5);
  cover.setAttribute('role', 'img');
  cover.setAttribute('aria-label', 'Обложка книги ' + book.title);
  const title = document.createElement('span');
  title.className = 'book-cover-title';
  title.textContent = book.title;
  const author = document.createElement('span');
  author.className = 'book-cover-author';
  author.textContent = book.author;
  cover.append(title, author);

  const meta = document.createElement('div');
  meta.className = 'book-meta';
  const line = document.createElement('div');
  line.className = 'between';
  const status = document.createElement('span');
  status.className = 'pill';
  status.textContent = statusLabels[book.status];
  const rating = document.createElement('span');
  rating.textContent = book.rating + ' / 5';
  line.append(status, rating);

  const genre = document.createElement('p');
  genre.className = 'muted';
  genre.textContent = book.genre;
  const track = document.createElement('div');
  track.className = 'bar-track';
  const fill = document.createElement('div');
  fill.className = 'bar-fill';
  fill.style.width = (book.progress.read / book.pages) * 100 + '%';
  track.append(fill);
  meta.append(line, genre, track);
  card.append(cover, meta);

  card.addEventListener('click', function () {
    selectBook(book.id);
  });
  return card;
}

function renderList() {
  // filter создаёт отдельный массив: сортировка не меняет порядок хранения книг.
  const visibleBooks = books.filter(matchesFilters);
  visibleBooks.sort(compareBooks);
  bookList.replaceChildren();
  for (const book of visibleBooks) {
    bookList.append(createBookCard(book));
  }
  bookCount.textContent = `Показано ${visibleBooks.length} из ${books.length}`;
  emptyList.hidden = visibleBooks.length > 0;
  emptyList.textContent =
    books.length > 0
      ? 'По выбранным фильтрам книг нет.'
      : 'Пока полка пуста. Добавьте свою первую книгу.';
}

function showProgress(book) {
  const percent = Math.round((book.progress.read / book.pages) * 100);
  progressBar.style.width = percent + '%';
  progressText.textContent = `${book.progress.read} из ${book.pages} страниц · ${percent}%`;
  document.getElementById('detail-status').textContent = statusLabels[book.status];
  detailStatus.value = book.status;
}

function renderQuotes() {
  const book = getSelectedBook();
  quoteList.replaceChildren();
  if (!book) {
    return;
  }
  book.quotes.forEach(function (quote, index) {
    const item = document.createElement('li');
    const text = document.createElement('span');
    text.textContent = quote;
    const remove = document.createElement('button');
    remove.textContent = '×';
    remove.setAttribute('aria-label', 'Удалить цитату ' + (index + 1));
    remove.addEventListener('click', function () {
      const quotes = book.quotes.slice();
      quotes.splice(index, 1);
      if (updateBook({ quotes: quotes })) {
        renderQuotes();
      }
    });
    item.append(text, remove);
    quoteList.append(item);
  });
}

function renderDetail() {
  const book = getSelectedBook();
  detailEmpty.hidden = Boolean(book);
  detailContent.hidden = !book;
  if (!book) {
    return;
  }

  document.getElementById('detail-title').textContent = book.title;
  document.getElementById('detail-author').textContent = book.author;
  document.getElementById('detail-genre').textContent = book.genre;
  document.getElementById('detail-rating').textContent = `Оценка ${book.rating} из 5`;
  progressInput.value = book.progress.read;
  progressInput.setAttribute('aria-invalid', 'false');
  progressError.textContent = '';
  showProgress(book);

  // Несохранённая заметка восстанавливается отдельно для каждой книги.
  const draft = noteDrafts[book.id];
  noteInput.value = typeof draft === 'string' ? draft : book.notes;
  noteDraftStatus.textContent =
    typeof draft === 'string' && draft !== book.notes ? 'Черновик восстановлен' : '';
  noteInput.setAttribute('aria-invalid', 'false');
  noteError.textContent = '';
  quoteInput.value = '';
  quoteError.textContent = '';
  renderQuotes();
}

function renderStats() {
  // Считаем страницы, оценки и количество книг каждого жанра за один проход.
  const year = String(new Date().getFullYear());
  let readPages = 0;
  let totalPages = 0;
  let ratingSum = 0;
  let finishedCount = 0;
  const genres = [];

  for (const book of books) {
    readPages += book.progress.read;
    totalPages += book.pages;
    ratingSum += book.rating;
    if (
      book.status === 'finished' &&
      typeof book.completedAt === 'string' &&
      book.completedAt.startsWith(year)
    ) {
      finishedCount += 1;
    }
    const genre = genres.find(function (item) {
      return item.name === book.genre;
    });
    if (genre) {
      genre.count += 1;
    } else {
      genres.push({ name: book.genre, count: 1 });
    }
  }

  document.getElementById('stats-year').textContent = year;
  document.getElementById('pages-total').textContent = readPages.toLocaleString('ru-RU');
  document.getElementById('books-year').textContent = finishedCount;
  const average = document.getElementById('average-rating');
  if (books.length > 0) {
    average.textContent =
      (ratingSum / books.length).toLocaleString('ru-RU', {
        maximumFractionDigits: 1
      }) + ' / 5';
  } else {
    average.textContent = '—';
  }
  const percent = totalPages > 0 ? Math.round((readPages / totalPages) * 100) : 0;
  document.getElementById('overall-progress').style.width = percent + '%';
  document.getElementById('overall-text').textContent =
    `${readPages} из ${totalPages} страниц · ${percent}%`;

  const chart = document.getElementById('genre-chart');
  chart.replaceChildren();
  genres.sort(function (a, b) {
    return b.count - a.count;
  });
  const descriptions = [];
  for (const genre of genres) {
    const row = document.createElement('div');
    row.className = 'chart-row';
    const label = document.createElement('div');
    label.className = 'chart-label';
    const name = document.createElement('span');
    name.textContent = genre.name;
    const count = document.createElement('span');
    count.textContent = genre.count;
    label.append(name, count);
    const track = document.createElement('div');
    track.className = 'bar-track';
    const fill = document.createElement('div');
    fill.className = 'bar-fill';
    fill.style.width = (genre.count / books.length) * 100 + '%';
    track.append(fill);
    row.append(label, track);
    chart.append(row);
    descriptions.push(genre.name + ': ' + genre.count);
  }
  chart.setAttribute(
    'aria-label',
    'Книги по жанрам: ' + (descriptions.join(', ') || 'нет книг')
  );
  document.getElementById('genre-empty').hidden = books.length > 0;
}

function render() {
  renderGenres();
  renderList();
  renderDetail();
  renderStats();
}

function resetForm() {
  bookForm.reset();
  for (const name of Object.keys(fields)) {
    fields[name].removeAttribute('aria-invalid');
    const error = document.getElementById(name + '-error');
    if (error) {
      error.textContent = '';
    }
  }
}

function addBook(event) {
  event.preventDefault();
  let firstInvalid = null;
  for (const name of Object.keys(fields)) {
    if (!validateField(name) && firstInvalid === null) {
      firstInvalid = fields[name];
    }
  }
  if (firstInvalid) {
    firstInvalid.focus();
    return;
  }

  const pages = Number(fields.pages.value);
  const status = fields.status.value;
  const book = {
    id: crypto.randomUUID(),
    title: fields.title.value.trim(),
    author: fields.author.value.trim(),
    genre: fields.genre.value.trim(),
    pages: pages,
    status: status,
    rating: Number(fields.rating.value),
    notes: fields.notes.value.trim(),
    quotes: [],
    progress: { read: status === 'finished' ? pages : 0, total: pages },
    addedAt: new Date().toISOString(),
    completedAt: status === 'finished' ? localDate() : null
  };
  if (!persist(books.concat(book))) {
    return;
  }
  selectedId = book.id;
  saveSession();
  resetForm();
  render();
  notice.textContent = 'Книга добавлена на полку.';
}

function changeProgress() {
  // Достигнута последняя страница — книга автоматически становится прочитанной.
  const book = getSelectedBook();
  if (!book) {
    return;
  }
  const value = progressInput.value.trim();
  const valid = /^\d+$/.test(value) && Number(value) <= book.pages;
  progressInput.setAttribute('aria-invalid', String(!valid));
  progressError.textContent = valid ? '' : `Введите целое число от 0 до ${book.pages}.`;
  if (!valid) {
    return;
  }

  const read = Number(value);
  let status = book.status;
  if (read === book.pages) {
    status = 'finished';
  } else if (read > 0 || status === 'finished') {
    status = 'reading';
  }
  const completedAt = status === 'finished' ? book.completedAt || localDate() : null;
  if (
    updateBook({
      progress: { read: read, total: book.pages },
      status: status,
      completedAt: completedAt
    })
  ) {
    showProgress(getSelectedBook());
  }
}

function changeStatus() {
  const book = getSelectedBook();
  const status = detailStatus.value;
  if (!book || !statusValues.includes(status)) {
    return;
  }
  let read = book.progress.read;
  if (status === 'finished') {
    read = book.pages;
  } else if (status === 'planned' || read === book.pages) {
    read = 0;
  }
  const completedAt = status === 'finished' ? book.completedAt || localDate() : null;
  if (
    updateBook({
      status: status,
      progress: { read: read, total: book.pages },
      completedAt: completedAt
    })
  ) {
    renderDetail();
  }
}

function saveNoteDraft() {
  const book = getSelectedBook();
  if (!book) {
    return;
  }
  noteDrafts[book.id] = noteInput.value;
  saveSession();
  const valid = /^[\s\S]{0,1000}$/u.test(noteInput.value);
  noteInput.setAttribute('aria-invalid', String(!valid));
  noteError.textContent = valid ? '' : 'Не более 1000 символов.';
  noteDraftStatus.textContent = 'Черновик сохранён';
}

function saveNote() {
  const book = getSelectedBook();
  const text = noteInput.value;
  if (!book || !/^[\s\S]{0,1000}$/u.test(text)) {
    return;
  }
  if (updateBook({ notes: text })) {
    delete noteDrafts[book.id];
    saveSession();
    noteDraftStatus.textContent = 'Заметка сохранена';
    notice.textContent = 'Заметка сохранена в библиотеке.';
  }
}

function addQuote(event) {
  event.preventDefault();
  const book = getSelectedBook();
  const text = quoteInput.value.trim();
  quoteError.textContent = text ? '' : 'Введите текст цитаты.';
  if (book && text && updateBook({ quotes: book.quotes.concat(text) })) {
    quoteInput.value = '';
    renderQuotes();
  }
}

function deleteBook() {
  const book = getSelectedBook();
  if (!book) {
    return;
  }
  const remaining = books.filter(function (item) {
    return item.id !== book.id;
  });
  if (persist(remaining)) {
    delete noteDrafts[book.id];
    selectedId = null;
    saveSession();
    render();
    notice.textContent = 'Книга удалена.';
  }
}

for (const name of Object.keys(fields)) {
  fields[name].addEventListener('input', function () {
    validateField(name);
  });
}
bookForm.addEventListener('submit', addBook);
document.getElementById('reset-book-form').addEventListener('click', resetForm);
statusFilter.addEventListener('input', renderList);
genreFilter.addEventListener('input', renderList);
sortSelect.addEventListener('input', renderList);
progressInput.addEventListener('input', changeProgress);
detailStatus.addEventListener('change', changeStatus);
noteInput.addEventListener('input', saveNoteDraft);
document.getElementById('save-note').addEventListener('click', saveNote);
quoteForm.addEventListener('submit', addQuote);
document.getElementById('delete-book').addEventListener('click', deleteBook);
window.addEventListener('storage', function (event) {
  if (event.key === BOOKS_KEY || event.key === null) {
    books = readBooks();
    render();
  }
});

books = readBooks();
restoreSession();
render();
