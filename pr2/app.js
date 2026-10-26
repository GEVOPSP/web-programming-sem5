'use strict';

const form = document.getElementById('registration');
// Никаких required, pattern, min/max или minlength в HTML: все правила задаются здесь.
// Спецсимволом считается печатный ASCII-знак, не буква, не цифра и не пробел.
const rules = {
  fullName: { regex: /^(?=.*[A-Za-zА-Яа-яЁё])[A-Za-zА-Яа-яЁё ]+$/u, message: 'Используйте только буквы латиницы или кириллицы и пробелы.' },
  login: { regex: /^(?=.*[a-z])(?=.*[A-Z])(?=(?:\D*\d){3})(?=.*[!-/:-@\[-`{-~])[A-Za-z0-9!-/:-@\[-`{-~]{15,}$/, message: 'Нужно от 15 символов, оба регистра латиницы, 3 цифры и спецсимвол.' },
  email: { regex: /^[A-Za-z0-9!#$%&'*+\/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+\/=?^_`{|}~-]+)*@(?:[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/, message: 'Введите адрес латиницей: имя@домен, например egor@example.com.' },
  age: { regex: /^(?:1[89]|[2-9]\d|1[01]\d|120)$/, message: 'Введите целый возраст от 18 до 120 лет.' },
  password: { regex: /^(?=.*[а-яё])(?=.*[А-ЯЁ])(?=(?:\D*\d){3})(?=.*[!-/:-@\[-`{-~])[А-Яа-яЁё0-9!-/:-@\[-`{-~]{15,}$/u, message: 'Нужно от 15 символов, оба регистра кириллицы, 3 цифры и спецсимвол. Латиница не допускается.' }
};

function validateField(name) {
  const input = document.getElementById(name);
  // Пароль и логин проверяются без trim: пробел не должен незаметно исчезать.
  const value = name === 'password' || name === 'login' ? input.value : input.value.trim();
  const valid = rules[name].regex.test(value);
  input.setAttribute('aria-invalid', String(!valid));
  document.getElementById(`${name}-error`).textContent = valid ? '' : value === '' ? 'Заполните это поле.' : rules[name].message;
  return valid;
}

Object.keys(rules).forEach(name => {
  const input = document.getElementById(name);
  input.addEventListener('input', () => { validateField(name); document.getElementById('result').textContent = ''; });
  input.addEventListener('blur', () => validateField(name));
});
form.addEventListener('submit', event => {
  event.preventDefault();
  const results = Object.keys(rules).map(name => ({ name, valid: validateField(name) }));
  const invalid = results.find(result => !result.valid);
  if (invalid) { document.getElementById(invalid.name).focus(); document.getElementById('result').textContent = ''; return; }
  document.getElementById('result').textContent = 'Все поля прошли проверку.';
});
document.getElementById('reset-registration').addEventListener('click', () => {
  form.reset();
  Object.keys(rules).forEach(name => {
    document.getElementById(name).removeAttribute('aria-invalid');
    document.getElementById(`${name}-error`).textContent = '';
  });
  document.getElementById('password').type = 'password';
  document.getElementById('show-password').textContent = 'Показать';
  document.getElementById('show-password').setAttribute('aria-pressed', 'false');
  document.getElementById('result').textContent = '';
  document.getElementById('fullName').focus();
});
document.getElementById('show-password').addEventListener('click', event => {
  const password = document.getElementById('password');
  const show = password.type === 'password'; password.type = show ? 'text' : 'password';
  event.currentTarget.textContent = show ? 'Скрыть' : 'Показать';
  event.currentTarget.setAttribute('aria-pressed', String(show));
});
