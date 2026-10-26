'use strict';
const KEY = 'gev-web-final3-books-v1', SESSION = 'gev-web-final3-session-v1';
const $ = id => document.getElementById(id);
const states = {planned:'Планирую',reading:'Читаю',finished:'Прочитано'};
const names = ['title','author','genre','pages','status','rating','notes'];
let books=[], selected=null, drafts={};
const say = message => {$('book-notice').textContent=message;};
const node = (tag, text='', className='') => {const el=document.createElement(tag);el.textContent=text;el.className=className;return el;};
const day = () => {const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
function readBooks(){
  try{const data=JSON.parse(localStorage.getItem(KEY)||'[]');if(!Array.isArray(data))throw Error();return data.filter(b=>b&&typeof b.id==='string'&&typeof b.title==='string'&&typeof b.author==='string'&&typeof b.genre==='string'&&Number.isInteger(b.pages)&&b.pages>0&&b.pages<=10000&&Object.hasOwn(states,b.status)&&Number.isInteger(b.rating)&&b.rating>=1&&b.rating<=5&&typeof b.notes==='string'&&Array.isArray(b.quotes)&&b.quotes.every(q=>typeof q==='string')&&b.progress&&Number.isInteger(b.progress.read)&&b.progress.read>=0&&b.progress.read<=b.pages);}
  catch{say('Не удалось прочитать книги. Проверьте доступ к хранилищу браузера.');return [];}
}
function persist(next){try{localStorage.setItem(KEY,JSON.stringify(next));books=next;return true;}catch{say('Не удалось сохранить данные. Хранилище может быть заполнено или недоступно.');return false;}}
function saveSession(){try{sessionStorage.setItem(SESSION,JSON.stringify({selectedId:selected,draftNotes:drafts}));}catch{say('Хранение черновика недоступно.');}}
const current=()=>books.find(b=>b.id===selected);
function update(changes){if(!current())return false;if(!persist(books.map(b=>b.id===selected?{...b,...changes}:b)))return false;renderList();renderStats();return true;}

// Regex проверяет текст, а целочисленные границы — количество страниц и оценку.
function validate(name){
  const input=$(name), value=input.value.trim();let error='';
  const rules={title:[/^[\s\S]{2,200}$/u,'Название: от 2 до 200 символов.'],author:[/^(?=.{2,100}$)[A-Za-zА-Яа-яЁё]+(?: [A-Za-zА-Яа-яЁё]+)*$/u,'Автор: от 2 до 100 символов, только буквы и пробелы между словами.'],genre:[/^[^\r\n]{2,50}$/u,'Жанр: от 2 до 50 символов.'],notes:[/^[\s\S]{0,1000}$/u,'Заметки: не более 1000 символов.']};
  if(rules[name]&&!rules[name][0].test(name==='notes'?input.value:value))error=rules[name][1];
  if(name==='pages'&&(!/^\d+$/.test(value)||Number(value)<1||Number(value)>10000))error='Введите целое число от 1 до 10000.';
  if(name==='rating'&&!/^[1-5]$/.test(value))error='Оценка: от 1 до 5.';
  if(name==='status'&&!Object.hasOwn(states,value))error='Выберите статус.';
  input.setAttribute('aria-invalid',String(!!error));if($(name+'-error'))$(name+'-error').textContent=error;return !error;
}
function renderGenres(){const previous=$('filter-genre').value;$('filter-genre').replaceChildren(new Option('Все жанры',''));[...new Set(books.map(b=>b.genre))].sort((a,b)=>a.localeCompare(b,'ru')).forEach(g=>$('filter-genre').add(new Option(g,g)));if([...$('filter-genre').options].some(o=>o.value===previous))$('filter-genre').value=previous;}
function renderList(){
  const list=$('book-list');list.replaceChildren();const visible=books.filter(b=>(!$('filter-status').value||b.status===$('filter-status').value)&&(!$('filter-genre').value||b.genre===$('filter-genre').value));
  visible.sort((a,b)=>{const sort=$('sort').value;if(sort==='title'||sort==='author')return a[sort].localeCompare(b[sort],'ru');if(sort==='rating')return b.rating-a.rating;return (b.addedAt||'').localeCompare(a.addedAt||'');});
  visible.forEach(b=>{
    // Карточки, включая типографические обложки, создаются через createElement.
    const card=node('button','','book-card'+(b.id===selected?' selected':''));card.type='button';card.dataset.id=b.id;card.setAttribute('aria-label','Открыть книгу '+b.title);card.setAttribute('aria-pressed',String(b.id===selected));
    const cover=node('div','','book-cover tone-'+books.indexOf(b)%5);cover.setAttribute('role','img');cover.setAttribute('aria-label','Обложка книги '+b.title);cover.append(node('span',b.title,'book-cover-title'),node('span',b.author,'book-cover-author'));
    const meta=node('div','','book-meta'),line=node('div','','between');line.append(node('span',states[b.status],'pill'),node('span',b.rating+' / 5'));
    const track=node('div','','bar-track'),bar=node('div','','bar-fill');bar.style.width=b.progress.read/b.pages*100+'%';track.append(bar);meta.append(line,node('p',b.genre,'muted'),track);card.append(cover,meta);
    card.addEventListener('click',()=>{selected=b.id;saveSession();renderList();renderDetail();});list.append(card);
  });
  $('books-count').textContent=`Показано ${visible.length} из ${books.length}`;$('books-empty').hidden=visible.length>0;$('books-empty').textContent=books.length?'По выбранным фильтрам книг нет.':'Пока полка пуста. Добавьте свою первую книгу.';
}
function progressView(b){const percent=Math.round(b.progress.read/b.pages*100);$('progress-bar').style.width=percent+'%';$('progress-text').textContent=`${b.progress.read} из ${b.pages} страниц · ${percent}%`;$('detail-status').textContent=states[b.status];$('detail-status-input').value=b.status;}
function renderQuotes(){const b=current();$('quote-list').replaceChildren();if(!b)return;b.quotes.forEach((q,index)=>{const li=node('li'),text=node('span',q),remove=node('button','×');remove.setAttribute('aria-label','Удалить цитату '+(index+1));remove.addEventListener('click',()=>{if(update({quotes:current().quotes.filter((_,i)=>i!==index)}))renderQuotes();});li.append(text,remove);$('quote-list').append(li);});}
function renderDetail(){
  const b=current();$('detail-empty').hidden=!!b;$('detail-content').hidden=!b;if(!b)return;
  $('detail-title').textContent=b.title;$('detail-author').textContent=b.author;$('detail-genre').textContent=b.genre;$('detail-rating').textContent=`Оценка ${b.rating} из 5`;$('progress-input').value=b.progress.read;$('progress-error').textContent='';$('progress-input').setAttribute('aria-invalid','false');progressView(b);
  $('note').value=typeof drafts[b.id]==='string'?drafts[b.id]:b.notes;$('note-draft').textContent=Object.hasOwn(drafts,b.id)&&drafts[b.id]!==b.notes?'Черновик восстановлен':'';$('note-error').textContent='';$('note').setAttribute('aria-invalid','false');$('quote').value='';$('quote-error').textContent='';renderQuotes();
}
function renderStats(){
  const year=String(new Date().getFullYear()),read=books.reduce((s,b)=>s+b.progress.read,0),total=books.reduce((s,b)=>s+b.pages,0);$('stats-year').textContent=year;$('pages-total').textContent=read.toLocaleString('ru-RU');$('books-year').textContent=books.filter(b=>b.status==='finished'&&(b.completedAt||'').startsWith(year)).length;$('average-rating').textContent=books.length?(books.reduce((s,b)=>s+b.rating,0)/books.length).toLocaleString('ru-RU',{maximumFractionDigits:1})+' / 5':'—';$('overall-progress').style.width=(total?read/total*100:0)+'%';$('overall-text').textContent=`${read} из ${total} страниц · ${total?Math.round(read/total*100):0}%`;
  const counts=new Map();books.forEach(b=>counts.set(b.genre,(counts.get(b.genre)||0)+1));$('genre-chart').replaceChildren();[...counts].sort((a,b)=>b[1]-a[1]).forEach(([genre,count])=>{const row=node('div','','chart-row'),label=node('div','','chart-label'),track=node('div','','bar-track'),fill=node('div','','bar-fill');label.append(node('span',genre),node('span',String(count)));fill.style.width=count/books.length*100+'%';track.append(fill);row.append(label,track);$('genre-chart').append(row);});$('genre-empty').hidden=books.length>0;$('genre-chart').setAttribute('aria-label','Книги по жанрам: '+([...counts].map(([g,n])=>g+': '+n).join(', ')||'нет книг'));
}
function render(){renderGenres();renderList();renderDetail();renderStats();}
function resetForm(){$('book-form').reset();names.forEach(n=>{$(n).removeAttribute('aria-invalid');if($(n+'-error'))$(n+'-error').textContent='';});}
names.forEach(n=>$(n).addEventListener('input',()=>validate(n)));
$('book-form').addEventListener('submit',e=>{
  e.preventDefault();const invalid=names.map(n=>({name:n,valid:validate(n)})).find(r=>!r.valid);if(invalid){$(invalid.name).focus();return;}
  const pages=Number($('pages').value),status=$('status').value;
  const book={id:crypto.randomUUID(),title:$('title').value.trim(),author:$('author').value.trim(),genre:$('genre').value.trim(),pages,status,rating:Number($('rating').value),notes:$('notes').value.trim(),quotes:[],progress:{read:status==='finished'?pages:0,total:pages},addedAt:new Date().toISOString(),completedAt:status==='finished'?day():null};
  if(persist([...books,book])){selected=book.id;saveSession();resetForm();render();say('Книга добавлена на полку.');}
});
$('reset-book-form').addEventListener('click',resetForm);['filter-status','filter-genre','sort'].forEach(id=>$(id).addEventListener('input',renderList));
$('progress-input').addEventListener('input',e=>{
  const b=current();if(!b)return;const v=e.target.value.trim(),valid=/^\d+$/.test(v)&&Number(v)<=b.pages;e.target.setAttribute('aria-invalid',String(!valid));$('progress-error').textContent=valid?'':`Введите целое число от 0 до ${b.pages}.`;if(!valid)return;
  const read=Number(v),status=read===b.pages?'finished':read>0?'reading':b.status==='finished'?'reading':b.status;
  if(update({progress:{read,total:b.pages},status,completedAt:status==='finished'?b.completedAt||day():null}))progressView(current());
});
$('detail-status-input').addEventListener('change',e=>{const b=current(),status=e.target.value;if(!b||!Object.hasOwn(states,status))return;const read=status==='finished'?b.pages:status==='planned'?0:b.progress.read===b.pages?0:b.progress.read;if(update({status,progress:{read,total:b.pages},completedAt:status==='finished'?b.completedAt||day():null}))renderDetail();});
// Выбранная книга и незавершённая заметка живут в sessionStorage данной вкладки.
$('note').addEventListener('input',e=>{const b=current();if(!b)return;drafts[b.id]=e.target.value;saveSession();const valid=/^[\s\S]{0,1000}$/u.test(e.target.value);e.target.setAttribute('aria-invalid',String(!valid));$('note-error').textContent=valid?'':'Не более 1000 символов.';$('note-draft').textContent='Черновик сохранён';});
$('save-note').addEventListener('click',()=>{const b=current(),text=$('note').value;if(!b||!/^[\s\S]{0,1000}$/u.test(text))return;if(update({notes:text})){delete drafts[b.id];saveSession();$('note-draft').textContent='Заметка сохранена';say('Заметка сохранена в библиотеке.');}});
$('quote-form').addEventListener('submit',e=>{e.preventDefault();const b=current(),text=$('quote').value.trim();$('quote-error').textContent=text?'':'Введите текст цитаты.';if(b&&text&&update({quotes:[...b.quotes,text]})){$('quote').value='';renderQuotes();}});
$('delete-book').addEventListener('click',()=>{const b=current();if(b&&persist(books.filter(x=>x.id!==b.id))){delete drafts[b.id];selected=null;saveSession();render();say('Книга удалена.');}});
window.addEventListener('storage',e=>{if(e.key===KEY||e.key===null){books=readBooks();render();}});
books=readBooks();try{const s=JSON.parse(sessionStorage.getItem(SESSION)||'null');if(s&&typeof s==='object'){selected=typeof s.selectedId==='string'?s.selectedId:null;drafts=s.draftNotes&&typeof s.draftNotes==='object'&&!Array.isArray(s.draftNotes)?s.draftNotes:{};}}catch{/* Неисправный черновик можно начать заново. */}render();
