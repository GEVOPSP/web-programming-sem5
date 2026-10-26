# Web-программирование

Голубев Егор, 3-ТИД-10

Практические работы и итоговый проект по фронтенду. HTML, CSS и JavaScript без библиотек.

| Работа | Ссылка |
| --- | --- |
| Практическая 1. Настольная игра (drag and drop) | https://gevopsp.github.io/web-programming-sem5/pr1/ |
| Практическая 2. Регистрация с проверкой через regex | https://gevopsp.github.io/web-programming-sem5/pr2/validation.html |
| Практическая 3. Стикеры и доска | https://gevopsp.github.io/web-programming-sem5/pr3/ |
| Практическая 4. Открытки (localStorage) | https://gevopsp.github.io/web-programming-sem5/pr4/ |
| Итоговый проект. Вариант 3 «Трекер чтения книг» | https://gevopsp.github.io/web-programming-sem5/final/ |

Чтобы открыть локально, достаточно открыть `index.html` нужной папки в браузере.

## Трекер чтения книг

- книги хранятся в `localStorage` (ключ `gev-web-final3-books-v1`);
- выбранная книга и несохранённый текст заметки - в `sessionStorage` (ключ `gev-web-final3-session-v1`);
- карточки книг создаются через `document.createElement`;
- форма проверяется регулярными выражениями во время ввода;
- есть фильтр по статусу и жанру, сортировка по названию, автору, оценке и дате добавления;
- в статистике: прочитанные страницы, книги за текущий год, средняя оценка, график по жанрам и общий прогресс.

Фотографии планет для практической 1 взяты с Wikimedia Commons, источники в `assets/CREDITS.md`.
