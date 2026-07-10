export interface DemoTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  htmlContent: string;
}

export const DEMO_TEMPLATES: DemoTemplate[] = [
  {
    id: 'demo-newsletter',
    name: 'Рассылка',
    category: 'newsletter',
    description: 'Стандартная рассылка с шапкой, блоком контента и подвалом',
    htmlContent: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Newsletter</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5">
<tr><td align="center" style="padding:40px 16px">
  <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
    <tr><td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:40px 40px 36px;text-align:center">
      <p style="margin:0;color:rgba(255,255,255,0.8);font-size:13px;letter-spacing:2px;text-transform:uppercase">ЕЖЕМЕСЯЧНАЯ РАССЫЛКА</p>
      <h1 style="margin:8px 0 0;color:#ffffff;font-size:28px;font-weight:700;line-height:1.2">Название вашей компании</h1>
    </td></tr>
    <tr><td style="padding:36px 40px 0">
      <p style="margin:0;color:#374151;font-size:16px;line-height:1.7">Здравствуйте, {{firstName}}! 👋</p>
      <p style="margin:16px 0 0;color:#374151;font-size:16px;line-height:1.7">Рады поделиться свежими новостями. Вот что произошло за этот месяц:</p>
    </td></tr>
    <tr><td style="padding:28px 40px 0">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fa;border-radius:8px;overflow:hidden">
        <tr><td style="padding:24px">
          <p style="margin:0 0 8px;color:#6366f1;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px">Главная новость</p>
          <h2 style="margin:0 0 12px;color:#111827;font-size:20px;font-weight:700">Заголовок вашего материала</h2>
          <p style="margin:0 0 20px;color:#4b5563;font-size:15px;line-height:1.7">Опишите здесь главную новость или обновление. Пишите кратко и по существу — у читателей мало времени.</p>
          <a href="#" style="display:inline-block;background:#6366f1;color:#ffffff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px">Читать далее →</a>
        </td></tr>
      </table>
    </td></tr>
    <tr><td style="padding:24px 40px 0">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td width="48%" style="background:#f0fdf4;border-radius:8px;padding:20px;vertical-align:top">
            <p style="margin:0 0 8px;font-size:20px">📈</p>
            <h3 style="margin:0 0 8px;color:#111827;font-size:15px;font-weight:700">Функция один</h3>
            <p style="margin:0;color:#4b5563;font-size:13px;line-height:1.6">Краткое описание первого дополнительного блока.</p>
          </td>
          <td width="4%"></td>
          <td width="48%" style="background:#eff6ff;border-radius:8px;padding:20px;vertical-align:top">
            <p style="margin:0 0 8px;font-size:20px">🚀</p>
            <h3 style="margin:0 0 8px;color:#111827;font-size:15px;font-weight:700">Функция два</h3>
            <p style="margin:0;color:#4b5563;font-size:13px;line-height:1.6">Краткое описание второго дополнительного блока.</p>
          </td>
        </tr>
      </table>
    </td></tr>
    <tr><td style="padding:32px 40px;text-align:center">
      <a href="#" style="display:inline-block;background:#111827;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">Перейти на сайт</a>
    </td></tr>
    <tr><td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:24px 40px;text-align:center">
      <p style="margin:0 0 8px;color:#9ca3af;font-size:12px">© 2025 Ваша компания. Все права защищены.</p>
      <p style="margin:0;color:#9ca3af;font-size:12px">
        Вы получили это письмо, потому что подписались на нашу рассылку.<br>
        <a href="{{unsubscribeUrl}}" style="color:#6b7280;text-decoration:underline">Отписаться</a>
      </p>
    </td></tr>
  </table>
</td></tr>
</table>
</body></html>`,
  },
  {
    id: 'demo-promo',
    name: 'Промо / Распродажа',
    category: 'promotional',
    description: 'Промо-письмо с предложением, скидкой и сильным призывом к действию',
    htmlContent: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#1e1b4b;font-family:'Segoe UI',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td align="center" style="padding:40px 16px">
  <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden">
    <tr><td style="background:linear-gradient(135deg,#f59e0b,#ef4444);padding:48px 40px;text-align:center">
      <p style="margin:0 0 12px;color:rgba(255,255,255,0.9);font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:3px">⚡ Специальное предложение</p>
      <h1 style="margin:0 0 16px;color:#ffffff;font-size:48px;font-weight:900;line-height:1">СКИДКА 50%</h1>
      <p style="margin:0;color:rgba(255,255,255,0.9);font-size:17px">Только на этой неделе</p>
    </td></tr>
    <tr><td style="padding:40px">
      <p style="margin:0 0 20px;color:#374151;font-size:16px;line-height:1.7">Здравствуйте, {{firstName}}!</p>
      <p style="margin:0 0 24px;color:#374151;font-size:16px;line-height:1.7">
        Мы подготовили эксклюзивное предложение специально для вас. Не упустите шанс получить наш продукт со скидкой 50% — это ограниченное предложение для наших подписчиков.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff7ed;border:2px dashed #f59e0b;border-radius:8px;margin-bottom:24px">
        <tr><td style="padding:20px;text-align:center">
          <p style="margin:0 0 4px;color:#9ca3af;font-size:13px;text-decoration:line-through">Обычная цена: $99</p>
          <p style="margin:0 0 8px;color:#f59e0b;font-size:36px;font-weight:900">$49</p>
          <p style="margin:0;color:#6b7280;font-size:13px">Промокод: <strong style="color:#111827;font-size:15px">SAVE50</strong></p>
        </td></tr>
      </table>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td align="center">
          <a href="#" style="display:inline-block;background:linear-gradient(135deg,#f59e0b,#ef4444);color:#ffffff;padding:16px 40px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px">
            Получить скидку →
          </a>
        </td></tr>
      </table>
      <p style="margin:20px 0 0;color:#9ca3af;font-size:12px;text-align:center">⏰ Предложение действует ещё 72 часа</p>
    </td></tr>
    <tr><td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center">
      <p style="margin:0;color:#9ca3af;font-size:12px">
        <a href="{{unsubscribeUrl}}" style="color:#9ca3af">Отписаться от этой рассылки</a>
      </p>
    </td></tr>
  </table>
</td></tr>
</table>
</body></html>`,
  },
  {
    id: 'demo-welcome',
    name: 'Приветственное письмо',
    category: 'transactional',
    description: 'Приветственное письмо для новых подписчиков с шагами онбординга',
    htmlContent: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f9ff;font-family:'Segoe UI',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td align="center" style="padding:40px 16px">
  <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06)">
    <tr><td style="padding:48px 40px 32px;text-align:center">
      <div style="width:72px;height:72px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:50%;margin:0 auto 20px">
        <span style="font-size:32px;line-height:72px;display:block">🎉</span>
      </div>
      <h1 style="margin:0 0 12px;color:#111827;font-size:26px;font-weight:700">Добро пожаловать, {{firstName}}!</h1>
      <p style="margin:0;color:#6b7280;font-size:16px;line-height:1.6">Мы очень рады видеть вас в нашем сообществе</p>
    </td></tr>
    <tr><td style="padding:0 40px"><div style="height:1px;background:#e5e7eb"></div></td></tr>
    <tr><td style="padding:32px 40px">
      <p style="margin:0 0 20px;color:#374151;font-size:15px;font-weight:600">Начните за 3 шага:</p>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="padding:0 0 16px">
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="width:36px;height:36px;background:#ede9fe;border-radius:50%;text-align:center;vertical-align:middle;font-size:16px">1</td>
              <td style="padding-left:12px;color:#374151;font-size:14px;line-height:1.5"><strong>Заполните профиль</strong> — добавьте данные, чтобы персонализировать работу</td>
            </tr>
          </table>
        </td></tr>
        <tr><td style="padding:0 0 16px">
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="width:36px;height:36px;background:#dbeafe;border-radius:50%;text-align:center;vertical-align:middle;font-size:16px">2</td>
              <td style="padding-left:12px;color:#374151;font-size:14px;line-height:1.5"><strong>Изучите возможности</strong> — узнайте всё, что мы можем для вас сделать</td>
            </tr>
          </table>
        </td></tr>
        <tr><td>
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="width:36px;height:36px;background:#dcfce7;border-radius:50%;text-align:center;vertical-align:middle;font-size:16px">3</td>
              <td style="padding-left:12px;color:#374151;font-size:14px;line-height:1.5"><strong>Приступайте</strong> — создайте свой первый проект уже сегодня</td>
            </tr>
          </table>
        </td></tr>
      </table>
    </td></tr>
    <tr><td style="padding:0 40px 40px;text-align:center">
      <a href="#" style="display:inline-block;background:#6366f1;color:#ffffff;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px">
        Начать →
      </a>
      <p style="margin:16px 0 0;color:#9ca3af;font-size:13px">Есть вопросы? Мы всегда готовы помочь: support@company.com</p>
    </td></tr>
    <tr><td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center">
      <p style="margin:0;color:#9ca3af;font-size:12px">
        <a href="{{unsubscribeUrl}}" style="color:#9ca3af">Отписаться</a>
      </p>
    </td></tr>
  </table>
</td></tr>
</table>
</body></html>`,
  },
  {
    id: 'demo-cold-outreach',
    name: 'Холодная B2B-рассылка',
    category: 'promotional',
    description: 'Профессиональное холодное письмо для B2B-предложений и партнёрств',
    htmlContent: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Georgia,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td align="center" style="padding:40px 16px">
  <table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.07)">
    <!-- Top accent line -->
    <tr><td style="background:linear-gradient(90deg,#6366f1,#8b5cf6,#06b6d4);height:4px;font-size:0;line-height:0">&nbsp;</td></tr>
    <!-- Header -->
    <tr><td style="padding:36px 44px 28px">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td>
            <h2 style="margin:0;color:#111827;font-size:22px;font-weight:700;line-height:1.3">{{subject}}</h2>
          </td>
          <td style="text-align:right;white-space:nowrap;padding-left:16px">
            <span style="display:inline-block;background:#ede9fe;color:#6366f1;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;padding:4px 10px;border-radius:20px">Предложение</span>
          </td>
        </tr>
      </table>
    </td></tr>
    <!-- Divider -->
    <tr><td style="padding:0 44px"><div style="height:1px;background:#e5e7eb"></div></td></tr>
    <!-- Body -->
    <tr><td style="padding:28px 44px">
      <p style="margin:0 0 18px;color:#374151;font-size:15px;line-height:1.8">Здравствуйте, {{firstName}},</p>
      <p style="margin:0 0 18px;color:#374151;font-size:15px;line-height:1.8">
        Надеюсь, у вас всё хорошо. Пишу вам, потому что вижу отличную возможность для сотрудничества, которое принесёт реальную пользу вашему бизнесу.
      </p>
      <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.8">
        [Опишите ваше предложение или услугу в 2–3 предложениях. Чётко укажите, какую ценность вы приносите.]
      </p>
      <!-- Value highlight box -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
        <tr>
          <td width="33%" style="padding:16px 12px 16px 0;vertical-align:top">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border-radius:8px">
              <tr><td style="padding:16px;text-align:center">
                <p style="margin:0 0 6px;font-size:22px">✅</p>
                <p style="margin:0;color:#166534;font-size:13px;font-weight:600;line-height:1.4">Качественный результат</p>
              </td></tr>
            </table>
          </td>
          <td width="33%" style="padding:16px 6px;vertical-align:top">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#eff6ff;border-radius:8px">
              <tr><td style="padding:16px;text-align:center">
                <p style="margin:0 0 6px;font-size:22px">⚡</p>
                <p style="margin:0;color:#1e40af;font-size:13px;font-weight:600;line-height:1.4">Быстрые сроки</p>
              </td></tr>
            </table>
          </td>
          <td width="33%" style="padding:16px 0 16px 12px;vertical-align:top">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#fdf4ff;border-radius:8px">
              <tr><td style="padding:16px;text-align:center">
                <p style="margin:0 0 6px;font-size:22px">🤝</p>
                <p style="margin:0;color:#6b21a8;font-size:13px;font-weight:600;line-height:1.4">Полная поддержка</p>
              </td></tr>
            </table>
          </td>
        </tr>
      </table>
      <p style="margin:0 0 28px;color:#374151;font-size:15px;line-height:1.8">
        Буду рад созвониться на 15 минут и обсудить, подходит ли это вам. Вам было бы удобно?
      </p>
      <table cellpadding="0" cellspacing="0">
        <tr><td>
          <a href="#" style="display:inline-block;background:#6366f1;color:#ffffff;padding:13px 28px;border-radius:7px;text-decoration:none;font-weight:600;font-size:14px">
            Назначить звонок →
          </a>
        </td></tr>
      </table>
    </td></tr>
    <!-- Signature -->
    <tr><td style="padding:0 44px"><div style="height:1px;background:#e5e7eb"></div></td></tr>
    <tr><td style="padding:24px 44px">
      <table cellpadding="0" cellspacing="0">
        <tr>
          <td style="width:44px;height:44px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:50%;text-align:center;vertical-align:middle;font-size:18px;color:#fff;font-weight:700">
            {{firstName:1}}
          </td>
          <td style="padding-left:12px">
            <p style="margin:0;color:#111827;font-size:14px;font-weight:600">{{senderName}}</p>
            <p style="margin:2px 0 0;color:#6b7280;font-size:13px">{{senderTitle}}</p>
            <p style="margin:2px 0 0;color:#6b7280;font-size:13px">{{senderEmail}}</p>
          </td>
        </tr>
      </table>
    </td></tr>
    <!-- Footer -->
    <tr><td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:16px 44px;text-align:center">
      <p style="margin:0;color:#9ca3af;font-size:11px">
        <a href="{{unsubscribeUrl}}" style="color:#9ca3af;text-decoration:underline">Отписаться</a>
        &nbsp;·&nbsp; Вы получили это письмо из-за вашего профессионального профиля
      </p>
    </td></tr>
  </table>
</td></tr>
</table>
</body></html>`,
  },
  {
    id: 'demo-freelancer',
    name: 'Фрилансер / Агентство',
    category: 'promotional',
    description: 'Стильное письмо для фрилансеров и агентств, предлагающих услуги',
    htmlContent: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td align="center" style="padding:40px 16px">
  <table width="560" cellpadding="0" cellspacing="0" style="background:#1e293b;border-radius:16px;overflow:hidden">
    <!-- Header -->
    <tr><td style="padding:44px 44px 36px;text-align:center">
      <div style="display:inline-block;background:linear-gradient(135deg,#6366f1,#06b6d4);padding:2px;border-radius:50%;margin-bottom:20px">
        <div style="width:64px;height:64px;background:#1e293b;border-radius:50%;display:flex;align-items:center;justify-content:center">
          <span style="font-size:28px;line-height:64px;display:block">💼</span>
        </div>
      </div>
      <h1 style="margin:0 0 8px;color:#f1f5f9;font-size:24px;font-weight:700">Открыт для новых проектов</h1>
      <p style="margin:0;color:#94a3b8;font-size:15px;line-height:1.6">Давайте создадим что-то классное вместе</p>
    </td></tr>
    <!-- Body -->
    <tr><td style="padding:0 44px 36px">
      <p style="margin:0 0 16px;color:#cbd5e1;font-size:15px;line-height:1.8">Здравствуйте, {{firstName}},</p>
      <p style="margin:0 0 24px;color:#cbd5e1;font-size:15px;line-height:1.8">
        Я познакомился с вашей компанией, и меня впечатлило то, что вы создаёте. Я специализируюсь на [ваш навык / услуга] и сейчас беру новых клиентов.
      </p>
      <!-- Skills / services -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px">
        <tr>
          <td style="padding:0 8px 12px 0;width:50%;vertical-align:top">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;border-radius:8px;border:1px solid #334155">
              <tr><td style="padding:16px">
                <p style="margin:0 0 6px;color:#6366f1;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px">Frontend</p>
                <p style="margin:0;color:#94a3b8;font-size:13px;line-height:1.5">React, TypeScript, Next.js, Tailwind CSS</p>
              </td></tr>
            </table>
          </td>
          <td style="padding:0 0 12px 8px;width:50%;vertical-align:top">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;border-radius:8px;border:1px solid #334155">
              <tr><td style="padding:16px">
                <p style="margin:0 0 6px;color:#06b6d4;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px">Backend</p>
                <p style="margin:0;color:#94a3b8;font-size:13px;line-height:1.5">Node.js, NestJS, PostgreSQL, REST / GraphQL</p>
              </td></tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:0 8px 0 0;vertical-align:top">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;border-radius:8px;border:1px solid #334155">
              <tr><td style="padding:16px">
                <p style="margin:0 0 6px;color:#10b981;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px">DevOps</p>
                <p style="margin:0;color:#94a3b8;font-size:13px;line-height:1.5">Docker, CI/CD, AWS, VPS deployment</p>
              </td></tr>
            </table>
          </td>
          <td style="padding:0 0 0 8px;vertical-align:top">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;border-radius:8px;border:1px solid #334155">
              <tr><td style="padding:16px">
                <p style="margin:0 0 6px;color:#f59e0b;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px">Опыт</p>
                <p style="margin:0;color:#94a3b8;font-size:13px;line-height:1.5">12+ лет · Проекты под ключ</p>
              </td></tr>
            </table>
          </td>
        </tr>
      </table>
      <p style="margin:0 0 28px;color:#cbd5e1;font-size:15px;line-height:1.8">
        Я могу приступить сразу и легко влиться в вашу команду и процессы. Дайте знать, если хотите посмотреть портфолио или коротко пообщаться.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding-right:10px">
            <a href="#" style="display:block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#ffffff;padding:13px 0;border-radius:7px;text-decoration:none;font-weight:600;font-size:14px;text-align:center">Смотреть портфолио</a>
          </td>
          <td style="padding-left:10px">
            <a href="#" style="display:block;background:#0f172a;border:1px solid #334155;color:#f1f5f9;padding:13px 0;border-radius:7px;text-decoration:none;font-weight:600;font-size:14px;text-align:center">Назначить звонок</a>
          </td>
        </tr>
      </table>
    </td></tr>
    <!-- Footer -->
    <tr><td style="background:#0f172a;padding:20px 44px;text-align:center">
      <p style="margin:0;color:#475569;font-size:11px">
        <a href="{{unsubscribeUrl}}" style="color:#475569;text-decoration:underline">Отписаться</a>
        &nbsp;·&nbsp; Отправлено через MailForge
      </p>
    </td></tr>
  </table>
</td></tr>
</table>
</body></html>`,
  },
  {
    id: 'demo-followup',
    name: 'Дожим',
    category: 'promotional',
    description: 'Короткое письмо-дожим для неотвеченной рассылки',
    htmlContent: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td align="center" style="padding:40px 16px">
  <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06)">
    <!-- Top accent -->
    <tr><td style="background:#6366f1;height:3px;font-size:0;line-height:0">&nbsp;</td></tr>
    <!-- Body -->
    <tr><td style="padding:40px 44px">
      <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.8">Здравствуйте, {{firstName}},</p>
      <p style="margin:0 0 18px;color:#374151;font-size:15px;line-height:1.8">
        Хотел напомнить о своём предыдущем письме — понимаю, что почта бывает загружена, поэтому буду краток.
      </p>
      <!-- Quote / reminder box -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px">
        <tr><td style="background:#f8fafc;border-left:3px solid #6366f1;border-radius:0 8px 8px 0;padding:16px 20px">
          <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.6;font-style:italic">
            «В прошлом письме я упоминал [краткое напоминание о вашем предложении]. Уверен, это поможет {{company}} достичь [конкретный результат].»
          </p>
        </td></tr>
      </table>
      <p style="margin:0 0 28px;color:#374151;font-size:15px;line-height:1.8">
        Удобно ли вам созвониться на 15 минут на этой неделе? Я гибок по времени.
      </p>
      <table cellpadding="0" cellspacing="0">
        <tr><td>
          <a href="#" style="display:inline-block;background:#6366f1;color:#ffffff;padding:12px 26px;border-radius:7px;text-decoration:none;font-weight:600;font-size:14px">
            Выбрать время →
          </a>
        </td></tr>
      </table>
      <p style="margin:24px 0 0;color:#9ca3af;font-size:13px;line-height:1.6">
        Если сейчас неподходящий момент — просто дайте знать, и я напишу позже. 🙂
      </p>
    </td></tr>
    <!-- Signature line -->
    <tr><td style="padding:0 44px"><div style="height:1px;background:#f1f5f9"></div></td></tr>
    <tr><td style="padding:20px 44px">
      <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.6">
        С уважением,<br>
        <strong style="color:#111827">{{firstName}}</strong>
      </p>
    </td></tr>
    <!-- Footer -->
    <tr><td style="background:#f9fafb;border-top:1px solid #f1f5f9;padding:14px 44px;text-align:center">
      <p style="margin:0;color:#9ca3af;font-size:11px">
        <a href="{{unsubscribeUrl}}" style="color:#9ca3af;text-decoration:underline">Отписаться</a>
      </p>
    </td></tr>
  </table>
</td></tr>
</table>
</body></html>`,
  },
  {
    id: 'demo-saas-trial',
    name: 'SaaS триал / Демо',
    category: 'promotional',
    description: 'Письмо-приглашение на демо SaaS-продукта или активацию бесплатного триала',
    htmlContent: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0fdf4;font-family:'Segoe UI',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td align="center" style="padding:40px 16px">
  <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06)">
    <!-- Hero -->
    <tr><td style="background:linear-gradient(135deg,#059669,#0891b2);padding:44px 40px 36px;text-align:center">
      <p style="margin:0 0 10px;background:rgba(255,255,255,0.15);display:inline-block;color:#ffffff;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;padding:5px 14px;border-radius:20px">🎁 Бесплатный триал</p>
      <h1 style="margin:14px 0 10px;color:#ffffff;font-size:28px;font-weight:800;line-height:1.2">Попробуйте [Продукт] бесплатно<br>14 дней</h1>
      <p style="margin:0;color:rgba(255,255,255,0.85);font-size:15px">Без привязки карты</p>
    </td></tr>
    <!-- Body -->
    <tr><td style="padding:36px 44px 0">
      <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.8">Здравствуйте, {{firstName}},</p>
      <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.8">
        Хочу показать, как [Продукт] помогает командам вроде {{company}} [достичь ключевого результата] — быстрее и без лишней головной боли.
      </p>
      <!-- Features list -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px">
        <tr><td style="padding:0 0 10px">
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="width:28px;height:28px;background:#d1fae5;border-radius:50%;text-align:center;vertical-align:middle;font-size:13px">✓</td>
              <td style="padding-left:12px;color:#374151;font-size:14px;line-height:1.5">Функция один — краткое описание главного преимущества</td>
            </tr>
          </table>
        </td></tr>
        <tr><td style="padding:0 0 10px">
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="width:28px;height:28px;background:#d1fae5;border-radius:50%;text-align:center;vertical-align:middle;font-size:13px">✓</td>
              <td style="padding-left:12px;color:#374151;font-size:14px;line-height:1.5">Функция два — ещё одно ключевое преимущество</td>
            </tr>
          </table>
        </td></tr>
        <tr><td>
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="width:28px;height:28px;background:#d1fae5;border-radius:50%;text-align:center;vertical-align:middle;font-size:13px">✓</td>
              <td style="padding-left:12px;color:#374151;font-size:14px;line-height:1.5">Функция три — интеграция или экономия времени</td>
            </tr>
          </table>
        </td></tr>
      </table>
    </td></tr>
    <!-- CTA -->
    <tr><td style="padding:0 44px 40px;text-align:center">
      <a href="#" style="display:inline-block;background:linear-gradient(135deg,#059669,#0891b2);color:#ffffff;padding:15px 40px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px">
        Начать бесплатный триал →
      </a>
      <p style="margin:16px 0 0;color:#9ca3af;font-size:12px">Настройка займёт меньше 5 минут</p>
    </td></tr>
    <!-- Social proof -->
    <tr><td style="padding:0 44px 36px">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:8px">
        <tr><td style="padding:20px 24px">
          <p style="margin:0 0 8px;color:#374151;font-size:14px;font-style:italic;line-height:1.6">«[Продукт] сэкономил нашей команде 10+ часов в неделю. Настройка прошла легко, а результат был мгновенным.»</p>
          <p style="margin:0;color:#6b7280;font-size:12px;font-weight:600">— Имя клиента, Компания</p>
        </td></tr>
      </table>
    </td></tr>
    <!-- Footer -->
    <tr><td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:18px 44px;text-align:center">
      <p style="margin:0;color:#9ca3af;font-size:11px">
        <a href="{{unsubscribeUrl}}" style="color:#9ca3af;text-decoration:underline">Отписаться</a>
        &nbsp;·&nbsp; Есть вопросы? Ответьте на это письмо в любое время
      </p>
    </td></tr>
  </table>
</td></tr>
</table>
</body></html>`,
  },
];
