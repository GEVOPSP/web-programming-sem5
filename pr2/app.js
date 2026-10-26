const form = document.getElementById('registration');
const result = document.getElementById('result');

// Вся проверка сделана регулярными выражениями, в HTML нет required, pattern, min/max.
// (?=...) - "просмотр вперёд": проверяет, что в строке что-то есть, не съедая символы.
// Спецсимволы для логина и пароля: ! @ # $ % ^ & * _ - . , ?
const rules = {
  // ФИО: только буквы (латиница или кириллица) и пробелы
  fullName: {
    regex: /^[A-Za-zА-Яа-яЁё]+( +[A-Za-zА-Яа-яЁё]+)*$/,
    message: 'Только буквы и пробелы, без цифр и других символов.'
  },
  // логин: латиница, есть строчная и заглавная буква, 3 цифры, спецсимвол, от 15 знаков
  login: {
    regex: /^(?=.*[a-z])(?=.*[A-Z])(?=(.*\d){3})(?=.*[!@#$%^&*_\-.,?])[A-Za-z\d!@#$%^&*_\-.,?]{15,}$/,
    message: 'Нужно от 15 символов: латиница в обоих регистрах, минимум 3 цифры и спецсимвол.'
  },
  // email: имя, @, домен с точкой, только латиница
  email: {
    regex: /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/,
    message: 'Введите адрес латиницей, например egor@mail.ru.'
  },
  // возраст для клуба настольных игр: от 18 до 120 (18-19, 20-99, 100-119, 120)
  age: {
    regex: /^(1[89]|[2-9]\d|1[01]\d|120)$/,
    message: 'Возраст - целое число от 18 до 120.'
  },
  // пароль: те же условия, что у логина, но буквы только кириллицей
  password: {
    regex: /^(?=.*[а-яё])(?=.*[А-ЯЁ])(?=(.*\d){3})(?=.*[!@#$%^&*_\-.,?])[А-Яа-яЁё\d!@#$%^&*_\-.,?]{15,}$/,
    message: 'Нужно от 15 символов: кириллица в обоих регистрах, минимум 3 цифры и спецсимвол.'
  }
};

// проверяем одно поле и показываем ошибку под ним
function validateField(name) {
  const input = document.getElementById(name);
  // у логина и пароля пробелы по краям не обрезаем - это тоже символы
  let value = input.value;
  if (name !== 'login' && name !== 'password') {
    value = value.trim();
  }
  const valid = rules[name].regex.test(value);
  input.setAttribute('aria-invalid', String(!valid));

  let error = '';
  if (value === '') {
    error = 'Заполните это поле.';
  } else if (!valid) {
    error = rules[name].message;
  }
  document.getElementById(name + '-error').textContent = error;
  return valid;
}

// проверка во время ввода и при уходе с поля
Object.keys(rules).forEach((name) => {
  const input = document.getElementById(name);
  input.addEventListener('input', () => {
    validateField(name);
    result.textContent = '';
  });
  input.addEventListener('blur', () => validateField(name));
});

// при отправке проверяем все поля, страница не перезагружается
form.addEventListener('submit', (event) => {
  event.preventDefault();
  let firstInvalid = null;
  Object.keys(rules).forEach((name) => {
    if (!validateField(name) && !firstInvalid) {
      firstInvalid = document.getElementById(name);
    }
  });
  if (firstInvalid) {
    firstInvalid.focus();
    result.textContent = '';
    return;
  }
  result.textContent = 'Все поля заполнены правильно.';
});

// кнопка "Очистить": сбрасываем поля и ошибки
document.getElementById('reset-registration').addEventListener('click', () => {
  form.reset();
  Object.keys(rules).forEach((name) => {
    document.getElementById(name).removeAttribute('aria-invalid');
    document.getElementById(name + '-error').textContent = '';
  });
  document.getElementById('password').type = 'password';
  document.getElementById('show-password').textContent = 'Показать';
  result.textContent = '';
  document.getElementById('fullName').focus();
});

// показать / скрыть пароль
document.getElementById('show-password').addEventListener('click', (event) => {
  const password = document.getElementById('password');
  const show = password.type === 'password';
  password.type = show ? 'text' : 'password';
  event.currentTarget.textContent = show ? 'Скрыть' : 'Показать';
});
