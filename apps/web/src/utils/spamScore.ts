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
      label: 'Есть ссылка для отписки',
      pass: html.includes('{{unsubscribeUrl}}') || htmlLower.includes('unsubscribe'),
      weight: 25,
      tip: 'Добавьте {{unsubscribeUrl}} — письма без неё почти всегда попадают в спам',
    },
    {
      label: 'Нет спам-слов в теме',
      pass: !SPAM_WORDS.slice(0, 15).some((w) => subjectLower.includes(w)),
      weight: 20,
      tip: 'Слова вроде FREE, URGENT, WIN, PRIZE в теме — тревожный сигнал для спам-фильтров',
    },
    {
      label: 'Тема не полностью заглавными',
      pass: subject.replace(/[^A-Z]/g, '').length < subject.length * 0.4,
      weight: 10,
      tip: 'Слишком много заглавных букв в теме выглядит как спам',
    },
    {
      label: 'Нет лишней пунктуации в теме',
      pass: !/(!!|!!!|\$\$|\$\$\$)/.test(subject),
      weight: 10,
      tip: 'Избегайте !!!, $$$ и подобных символов в теме письма',
    },
    {
      label: 'HTML-содержимое не пустое',
      pass: html.trim().length > 50,
      weight: 15,
      tip: 'Текст письма не может быть пустым',
    },
    {
      label: 'Есть текстовое содержимое (не только изображения)',
      pass: textContent.replace(/\s/g, '').length > 100,
      weight: 10,
      tip: 'Письма из одних изображений блокируются. Добавьте достаточно текста.',
    },
    {
      label: 'Нет спам-слов в тексте письма',
      pass: SPAM_WORDS.filter((w) => textLower.includes(w)).length < 4,
      weight: 10,
      tip: `Спам-слова, найденные в тексте: ${SPAM_WORDS.filter((w) => textLower.includes(w)).slice(0, 3).join(', ')}`,
    },
  ];

  const totalWeight = checks.reduce((a, c) => a + c.weight, 0);
  const failedWeight = checks.filter((c) => !c.pass).reduce((a, c) => a + c.weight, 0);
  const score = Math.round((failedWeight / totalWeight) * 100);

  const level: SpamResult['level'] = score <= 20 ? 'good' : score <= 50 ? 'warning' : 'danger';

  return { score, level, checks };
}
