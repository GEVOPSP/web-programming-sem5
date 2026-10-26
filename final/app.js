// Трекер чтения книг (вариант 3)

// ключи, под которыми данные лежат в localStorage и sessionStorage
const BOOKS_KEY = 'gev-web-final3-books-v1';
const SESSION_KEY = 'gev-web-final3-session-v1';

// подписи статусов для вывода на странице
const statusLabels = {
    planned: 'Планирую',
    reading: 'Читаю',
    finished: 'Прочитано'
};
const statusValues = ['planned', 'reading', 'finished'];

// находим нужные элементы на странице
const sections = document.querySelectorAll('.section');
const navLinks = document.querySelectorAll('.nav a');
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
const detailBox = document.getElementById('book-detail');
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

let books = []; // все книги из localStorage
let selectedId = null; // id выбранной книги
let noteDrafts = {}; // несохранённые заметки: { id книги: текст }
let noticeTimer = null;

// ---------- навигация ----------

// показываем только тот раздел, который указан в адресе после # (например #add)
function showSection() {
    let name = location.hash.slice(1);
    if (!document.getElementById(name) || !document.getElementById(name).classList.contains('section')) {
        name = 'books';
    }
    for (const section of sections) {
        section.hidden = section.id !== name;
    }
    // подсвечиваем активную ссылку в шапке
    for (const link of navLinks) {
        link.classList.toggle('active', link.getAttribute('href') === '#' + name);
    }
}

// короткое сообщение под шапкой, через 3 секунды исчезает
function showNotice(text) {
    notice.textContent = text;
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(function () {
        notice.textContent = '';
    }, 3000);
}

// сегодняшняя дата в виде 2026-10-26 (по местному времени)
function today() {
    const date = new Date();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return date.getFullYear() + '-' + month + '-' + day;
}

// ---------- хранение данных ----------

// проверяем, что объект из localStorage похож на книгу,
// чтобы испорченная запись не сломала всю страницу
function isStoredBook(book) {
    if (!book || !book.progress || !Array.isArray(book.quotes)) {
        return false;
    }
    const textOk =
        typeof book.id === 'string' &&
        typeof book.title === 'string' &&
        typeof book.author === 'string' &&
        typeof book.genre === 'string' &&
        typeof book.notes === 'string';
    const pagesOk = Number.isInteger(book.pages) && book.pages >= 1 && book.pages <= 10000;
    const ratingOk = Number.isInteger(book.rating) && book.rating >= 1 && book.rating <= 5;
    const progressOk =
        Number.isInteger(book.progress.read) &&
        book.progress.read >= 0 &&
        book.progress.read <= book.pages;
    const quotesOk = book.quotes.every(function (quote) {
        return typeof quote === 'string';
    });
    return textOk && pagesOk && ratingOk && progressOk && quotesOk && statusValues.includes(book.status);
}

// читаем массив книг из localStorage
function readBooks() {
    try {
        const saved = JSON.parse(localStorage.getItem(BOOKS_KEY) || '[]');
        if (!Array.isArray(saved)) {
            return [];
        }
        return saved.filter(isStoredBook);
    } catch (error) {
        showNotice('Не удалось прочитать сохранённые книги.');
        return [];
    }
}

// записываем массив книг в localStorage (JSON-строкой)
function saveBooks(newBooks) {
    try {
        localStorage.setItem(BOOKS_KEY, JSON.stringify(newBooks));
        books = newBooks;
        return true;
    } catch (error) {
        showNotice('Не удалось сохранить изменения.');
        return false;
    }
}

// в sessionStorage храним выбранную книгу и черновики заметок,
// они нужны только пока открыта эта вкладка
function saveSession() {
    const session = { selectedId: selectedId, draftNotes: noteDrafts };
    try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch (error) {
        showNotice('Не удалось сохранить черновик.');
    }
}

// при загрузке страницы восстанавливаем выбранную книгу и черновики
function restoreSession() {
    try {
        const session = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
        if (!session) {
            return;
        }
        if (typeof session.selectedId === 'string') {
            selectedId = session.selectedId;
        }
        if (session.draftNotes && typeof session.draftNotes === 'object') {
            noteDrafts = session.draftNotes;
        }
    } catch (error) {
        selectedId = null;
        noteDrafts = {};
    }
}

// ---------- работа с выбранной книгой ----------

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

// меняем поля выбранной книги, сохраняем и перерисовываем список и статистику
function updateBook(changes) {
    if (!getSelectedBook()) {
        return false;
    }
    const updated = books.map(function (book) {
        if (book.id === selectedId) {
            return { ...book, ...changes }; // копия книги с новыми значениями
        }
        return book;
    });
    if (!saveBooks(updated)) {
        return false;
    }
    renderList();
    renderStats();
    return true;
}

// ---------- валидация формы ----------

// проверяем одно поле формы, выводим ошибку под ним и возвращаем true/false
function validateField(name) {
    const input = fields[name];
    const value = input.value.trim();
    let error = '';

    switch (name) {
        case 'title':
            // любые символы, от 2 до 200
            if (!/^.{2,200}$/.test(value)) {
                error = 'Название должно быть от 2 до 200 символов.';
            }
            break;
        case 'author':
            // только буквы (русские или латинские), слова разделяются пробелом или дефисом
            if (!/^(?=.{2,100}$)[A-Za-zА-Яа-яЁё]+([ -][A-Za-zА-Яа-яЁё]+)*$/.test(value)) {
                error = 'Автор: только буквы, от 2 до 100 символов.';
            }
            break;
        case 'genre':
            if (!/^.{2,50}$/.test(value)) {
                error = 'Жанр должен быть от 2 до 50 символов.';
            }
            break;
        case 'pages':
            // сначала проверяем, что это целое число, потом границы
            if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 10000) {
                error = 'Введите целое число от 1 до 10000.';
            }
            break;
        case 'rating':
            if (!/^[1-5]$/.test(value)) {
                error = 'Оценка от 1 до 5.';
            }
            break;
        case 'status':
            if (!statusValues.includes(value)) {
                error = 'Выберите статус.';
            }
            break;
        case 'notes':
            // [\s\S] - любой символ, включая перенос строки
            if (!/^[\s\S]{0,1000}$/.test(input.value)) {
                error = 'Заметки: не больше 1000 символов.';
            }
            break;
    }

    input.classList.toggle('invalid', error !== '');
    document.getElementById(name + '-error').textContent = error;
    return error === '';
}

// ---------- список книг ----------

// заполняем фильтр жанров теми жанрами, которые есть в библиотеке
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

    genreFilter.innerHTML = '<option value="">Все жанры</option>';
    for (const genre of genres) {
        genreFilter.add(new Option(genre, genre));
    }
    // если выбранный жанр ещё есть, оставляем его выбранным
    if (genres.includes(previous)) {
        genreFilter.value = previous;
    }
}

// подходит ли книга под выбранные статус и жанр
function matchesFilters(book) {
    const statusOk = statusFilter.value === '' || book.status === statusFilter.value;
    const genreOk = genreFilter.value === '' || book.genre === genreFilter.value;
    return statusOk && genreOk;
}

// функция сравнения для sort() в зависимости от выбранной сортировки
function compareBooks(a, b) {
    switch (sortSelect.value) {
        case 'title':
            return a.title.localeCompare(b.title, 'ru');
        case 'author':
            return a.author.localeCompare(b.author, 'ru');
        case 'rating':
            return b.rating - a.rating; // сначала высокие оценки
        default:
            // по дате добавления: сначала новые
            return String(b.addedAt || '').localeCompare(String(a.addedAt || ''));
    }
}

// звёзды для оценки: 4 -> ★★★★☆
function stars(rating) {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
}

// создаём карточку книги через createElement
function createBookCard(book) {
    const card = document.createElement('div');
    card.className = 'book-card';
    if (book.id === selectedId) {
        card.classList.add('selected');
    }

    // обложка: цвет зависит от длины названия, поэтому не меняется при удалении других книг
    const cover = document.createElement('div');
    cover.className = 'cover cover-' + (book.title.length % 5);
    const coverTitle = document.createElement('div');
    coverTitle.className = 'cover-title';
    coverTitle.textContent = book.title; // textContent, чтобы текст не разбирался как HTML
    const coverAuthor = document.createElement('div');
    coverAuthor.className = 'cover-author';
    coverAuthor.textContent = book.author;
    cover.append(coverTitle, coverAuthor);

    // под обложкой: статус, оценка и прогресс
    const info = document.createElement('div');
    info.className = 'card-info';

    const status = document.createElement('p');
    status.className = 'status status-' + book.status;
    status.textContent = statusLabels[book.status];

    const rating = document.createElement('p');
    rating.className = 'stars';
    rating.textContent = stars(book.rating);

    // маленькая полоска прогресса чтения
    const track = document.createElement('div');
    track.className = 'progress';
    const fill = document.createElement('div');
    fill.className = 'progress-fill';
    fill.style.width = (book.progress.read / book.pages) * 100 + '%';
    track.append(fill);

    info.append(status, rating, track);
    card.append(cover, info);

    card.addEventListener('click', function () {
        selectBook(book.id);
        // на телефоне подробности находятся под списком, прокручиваем к ним
        if (window.innerWidth <= 800) {
            detailBox.scrollIntoView({ behavior: 'smooth' });
        }
    });
    return card;
}

// выводим карточки с учётом фильтров и сортировки
function renderList() {
    // filter возвращает новый массив, поэтому сортировка не меняет порядок в books
    const visibleBooks = books.filter(matchesFilters);
    visibleBooks.sort(compareBooks);

    bookList.innerHTML = '';
    for (const book of visibleBooks) {
        bookList.append(createBookCard(book));
    }

    bookCount.textContent = 'Показано ' + visibleBooks.length + ' из ' + books.length;
    emptyList.hidden = visibleBooks.length > 0;
    if (books.length > 0) {
        emptyList.textContent = 'По выбранным фильтрам книг нет.';
    } else {
        emptyList.textContent = 'Список пуст. Добавьте первую книгу.';
    }
}

// ---------- подробная информация ----------

// прогресс-бар выбранной книги
function showProgress(book) {
    const percent = Math.round((book.progress.read / book.pages) * 100);
    progressBar.style.width = percent + '%';
    progressText.textContent = book.progress.read + ' из ' + book.pages + ' страниц (' + percent + '%)';
    detailStatus.value = book.status;
}

// список цитат выбранной книги, у каждой своя кнопка удаления
function renderQuotes() {
    const book = getSelectedBook();
    quoteList.innerHTML = '';
    if (!book) {
        return;
    }
    book.quotes.forEach(function (quote, index) {
        const item = document.createElement('li');
        const text = document.createElement('span');
        text.textContent = quote;
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.textContent = '×';
        remove.title = 'Удалить цитату';
        remove.addEventListener('click', function () {
            const quotes = book.quotes.slice(); // копия массива
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
    document.getElementById('detail-pages').textContent = book.pages;
    document.getElementById('detail-rating').textContent = stars(book.rating) + ' (' + book.rating + ' из 5)';
    document.getElementById('detail-added').textContent = book.addedAt
        ? new Date(book.addedAt).toLocaleDateString('ru-RU')
        : '—';

    progressInput.value = book.progress.read;
    progressInput.classList.remove('invalid');
    progressError.textContent = '';
    showProgress(book);

    // если для книги есть несохранённый черновик из sessionStorage, показываем его
    const draft = noteDrafts[book.id];
    if (typeof draft === 'string') {
        noteInput.value = draft;
        noteDraftStatus.textContent = draft !== book.notes ? 'Черновик восстановлен' : '';
    } else {
        noteInput.value = book.notes;
        noteDraftStatus.textContent = '';
    }
    noteInput.classList.remove('invalid');
    noteError.textContent = '';
    quoteInput.value = '';
    quoteError.textContent = '';
    renderQuotes();
}

// ---------- статистика ----------

function renderStats() {
    const year = String(new Date().getFullYear());
    let readPages = 0;
    let totalPages = 0;
    let ratingSum = 0;
    let finishedThisYear = 0;
    const genres = []; // [{ name: 'Роман', count: 2 }, ...]

    // один проход по всем книгам
    for (const book of books) {
        readPages += book.progress.read;
        totalPages += book.pages;
        ratingSum += book.rating;

        // книга прочитана в этом году, если дата завершения начинается с текущего года
        if (book.status === 'finished' && typeof book.completedAt === 'string' && book.completedAt.startsWith(year)) {
            finishedThisYear++;
        }

        const genre = genres.find(function (item) {
            return item.name === book.genre;
        });
        if (genre) {
            genre.count++;
        } else {
            genres.push({ name: book.genre, count: 1 });
        }
    }

    document.getElementById('stats-year').textContent = year;
    document.getElementById('pages-total').textContent = readPages;
    document.getElementById('books-year').textContent = finishedThisYear;

    // средняя оценка по всем книгам, с одним знаком после запятой
    const average = document.getElementById('average-rating');
    if (books.length > 0) {
        average.textContent = (ratingSum / books.length).toFixed(1).replace('.', ',');
    } else {
        average.textContent = '—';
    }

    // общий прогресс: сколько страниц прочитано из всех страниц всех книг
    const percent = totalPages > 0 ? Math.round((readPages / totalPages) * 100) : 0;
    document.getElementById('overall-progress').style.width = percent + '%';
    document.getElementById('overall-text').textContent =
        readPages + ' из ' + totalPages + ' страниц (' + percent + '%)';

    // график по жанрам: длина полосы = доля книг этого жанра
    genres.sort(function (a, b) {
        return b.count - a.count;
    });
    const chart = document.getElementById('genre-chart');
    chart.innerHTML = '';
    for (const genre of genres) {
        const row = document.createElement('div');
        row.className = 'chart-row';
        const name = document.createElement('div');
        name.className = 'chart-name';
        name.textContent = genre.name;
        const bar = document.createElement('div');
        bar.className = 'chart-bar';
        const fill = document.createElement('div');
        fill.className = 'chart-fill';
        fill.style.width = (genre.count / books.length) * 100 + '%';
        bar.append(fill);
        const count = document.createElement('div');
        count.className = 'chart-count';
        count.textContent = genre.count;
        row.append(name, bar, count);
        chart.append(row);
    }
    document.getElementById('genre-empty').hidden = books.length > 0;
}

// перерисовать всё
function render() {
    renderGenres();
    renderList();
    renderDetail();
    renderStats();
}

// ---------- действия пользователя ----------

function resetForm() {
    bookForm.reset();
    for (const name in fields) {
        fields[name].classList.remove('invalid');
        document.getElementById(name + '-error').textContent = '';
    }
}

// добавление новой книги из формы
function addBook(event) {
    event.preventDefault();

    // при отправке проверяем все поля ещё раз, курсор ставим в первое неверное
    let firstInvalid = null;
    for (const name in fields) {
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
    let genre = fields.genre.value.trim();
    // жанр с большой буквы, чтобы "роман" и "Роман" не считались разными жанрами
    genre = genre.charAt(0).toUpperCase() + genre.slice(1);

    const book = {
        id: String(Date.now()),
        title: fields.title.value.trim(),
        author: fields.author.value.trim(),
        genre: genre,
        pages: pages,
        status: status,
        rating: Number(fields.rating.value),
        notes: fields.notes.value.trim(),
        quotes: [],
        // если книга уже прочитана, то прочитаны все страницы
        progress: { read: status === 'finished' ? pages : 0, total: pages },
        addedAt: new Date().toISOString(),
        completedAt: status === 'finished' ? today() : null
    };

    if (!saveBooks(books.concat(book))) {
        return;
    }
    selectedId = book.id;
    saveSession();
    resetForm();
    render();
    showNotice('Книга «' + book.title + '» добавлена.');
    // переходим к списку, новая книга уже выбрана
    location.hash = 'books';
    showSection();
}

// изменение количества прочитанных страниц
function changeProgress() {
    const book = getSelectedBook();
    if (!book) {
        return;
    }
    const value = progressInput.value.trim();
    const valid = /^\d+$/.test(value) && Number(value) <= book.pages;
    progressInput.classList.toggle('invalid', !valid);
    progressError.textContent = valid ? '' : 'Введите целое число от 0 до ' + book.pages + '.';
    if (!valid) {
        return;
    }

    // статус меняется вместе с прогрессом:
    // все страницы - "Прочитано", часть страниц - "Читаю"
    const read = Number(value);
    let status = book.status;
    if (read === book.pages) {
        status = 'finished';
    } else if (read > 0 || status === 'finished') {
        status = 'reading';
    }
    const completedAt = status === 'finished' ? book.completedAt || today() : null;

    if (updateBook({ progress: { read: read, total: book.pages }, status: status, completedAt: completedAt })) {
        showProgress(getSelectedBook());
    }
}

// изменение статуса в подробной информации
function changeStatus() {
    const book = getSelectedBook();
    const status = detailStatus.value;
    if (!book || !statusValues.includes(status)) {
        return;
    }
    // прочитано - все страницы, планирую - ноль страниц
    let read = book.progress.read;
    if (status === 'finished') {
        read = book.pages;
    } else if (status === 'planned' || read === book.pages) {
        read = 0;
    }
    const completedAt = status === 'finished' ? book.completedAt || today() : null;

    if (updateBook({ status: status, progress: { read: read, total: book.pages }, completedAt: completedAt })) {
        renderDetail();
    }
}

// при каждом вводе в заметку сохраняем черновик в sessionStorage
function saveNoteDraft() {
    const book = getSelectedBook();
    if (!book) {
        return;
    }
    noteDrafts[book.id] = noteInput.value;
    saveSession();
    const valid = /^[\s\S]{0,1000}$/.test(noteInput.value);
    noteInput.classList.toggle('invalid', !valid);
    noteError.textContent = valid ? '' : 'Не больше 1000 символов.';
    noteDraftStatus.textContent = 'Черновик сохранён';
}

// сохраняем заметку в саму книгу (localStorage) и удаляем черновик
function saveNote() {
    const book = getSelectedBook();
    const text = noteInput.value.trim();
    if (!book || !/^[\s\S]{0,1000}$/.test(text)) {
        return;
    }
    if (updateBook({ notes: text })) {
        delete noteDrafts[book.id];
        saveSession();
        noteDraftStatus.textContent = 'Заметка сохранена';
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
    if (!book || !confirm('Удалить книгу «' + book.title + '»?')) {
        return;
    }
    const remaining = books.filter(function (item) {
        return item.id !== book.id;
    });
    if (saveBooks(remaining)) {
        delete noteDrafts[book.id];
        selectedId = null;
        saveSession();
        render();
        showNotice('Книга удалена.');
    }
}

// ---------- обработчики событий ----------

// валидация в реальном времени: проверяем поле при каждом вводе
for (const name in fields) {
    fields[name].addEventListener('input', function () {
        validateField(name);
    });
}
bookForm.addEventListener('submit', addBook);
document.getElementById('reset-book-form').addEventListener('click', resetForm);
statusFilter.addEventListener('change', renderList);
genreFilter.addEventListener('change', renderList);
sortSelect.addEventListener('change', renderList);
progressInput.addEventListener('input', changeProgress);
detailStatus.addEventListener('change', changeStatus);
noteInput.addEventListener('input', saveNoteDraft);
document.getElementById('save-note').addEventListener('click', saveNote);
quoteForm.addEventListener('submit', addQuote);
document.getElementById('delete-book').addEventListener('click', deleteBook);
window.addEventListener('hashchange', showSection);

// если книги изменили в другой вкладке, браузер присылает событие storage
window.addEventListener('storage', function (event) {
    if (event.key === BOOKS_KEY || event.key === null) {
        books = readBooks();
        render();
    }
});

// запуск: загружаем книги и состояние вкладки, рисуем страницу
books = readBooks();
restoreSession();
render();
showSection();
