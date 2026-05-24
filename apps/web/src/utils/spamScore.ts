export interface SpamCheck {
  label: string;
  pass: boolean;
  weight: number;
  tip: string;
}

export interface SpamResult {
  score: number; // 0-100, 100 = definitely spam
  level: 'good' | 'warning' | 'danger';
  checks: SpamCheck[];
}

const SPAM_WORDS = [
  'free', 'winner', 'won', 'prize', 'cash', 'money', 'click here', 'act now',
  'limited time', 'urgent', 'guarantee', 'no risk', '100%', 'amazing',
  'earn money', 'make money', 'work from home', 'double your', 'extra income',
  'as seen on', 'best price', 'compare rates', 'huge discount', 'lose weight',
  'miracle', 'incredible deal', 'special promotion', 'lowest price',
  'million dollars', 'order now', 'promise you', 'risk free', 'satisfaction guaranteed',
  'unsubscribe', // spammers often add fake unsubscribe text
];

export function analyzeSpam(subject: string, html: string): SpamResult {
  const subjectLower = (subject || '').toLowerCase();
  const htmlLower = (html || '').toLowerCase();
  const textContent = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const textLower = textContent.toLowerCase();

  const checks: SpamCheck[] = [
    {
      label: 'Ссылка отписки',
      pass: html.includes('{{unsubscribeUrl}}') || html.includes('unsubscribe'),
      weight: 25,
      tip: 'Добавь {{unsubscribeUrl}} — без неё письмо почти точно в спам',
    },
    {
      label: 'Нет слов-триггеров в теме',
      pass: !SPAM_WORDS.slice(0, 15).some((w) => subjectLower.includes(w)),
      weight: 20,
      tip: 'Слова FREE, URGENT, WIN, PRIZE в теме — красный флаг для спам-фильтров',
    },
    {
      label: 'Тема без CAPS LOCK',
      pass: subject.replace(/[^A-Z]/g, '').length < subject.length * 0.4,
      weight: 10,
      tip: 'Слишком много заглавных букв в теме выглядит как спам',
    },
    {
      label: 'Тема без избытка знаков',
      pass: !/(!!|!!!|\$\$|\$\$\$)/.test(subject),
      weight: 10,
      tip: 'Избегай !!!, $$$ и подобных символов в теме письма',
    },
    {
      label: 'HTML-контент есть',
      pass: html.trim().length > 50,
      weight: 15,
      tip: 'Письмо не может быть пустым',
    },
    {
      label: 'Есть текстовый контент (не только изображения)',
      pass: textContent.replace(/\s/g, '').length > 100,
      weight: 10,
      tip: 'Письма только из картинок блокируются. Добавь достаточно текста.',
    },
    {
      label: 'Нет слов-триггеров в теле письма',
      pass: SPAM_WORDS.filter((w) => textLower.includes(w)).length < 4,
      weight: 10,
      tip: `Спам-слова в тексте письма: ${SPAM_WORDS.filter((w) => textLower.includes(w)).slice(0, 3).join(', ')}`,
    },
  ];

  const totalWeight = checks.reduce((a, c) => a + c.weight, 0);
  const failedWeight = checks.filter((c) => !c.pass).reduce((a, c) => a + c.weight, 0);
  const score = Math.round((failedWeight / totalWeight) * 100);

  const level: SpamResult['level'] = score <= 20 ? 'good' : score <= 50 ? 'warning' : 'danger';

  return { score, level, checks };
}
