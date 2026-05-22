import { PrismaClient } from '@prisma/client';
import * as bcryptjs from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  const passwordHash = await bcryptjs.hash('Admin123!', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@mailforge.local' },
    update: {},
    create: {
      email: 'admin@mailforge.local',
      passwordHash,
      name: 'System Admin',
      role: 'ADMIN',
    },
  });

  console.log(`✅ Admin user: ${admin.email} / Admin123!`);

  await prisma.setting.createMany({
    skipDuplicates: true,
    data: [
      {
        key: 'onboarding_completed',
        value: 'false',
        description: 'Whether initial setup wizard is done',
      },
      {
        key: 'default_from_name',
        value: 'MailForge',
        description: 'Default sender display name',
      },
      {
        key: 'max_import_file_size_mb',
        value: '50',
        description: 'Max CSV/XLSX upload size in MB',
      },
      {
        key: 'global_unsubscribe_footer',
        value: 'You are receiving this email because you subscribed.',
        description: 'Default unsubscribe footer text',
      },
      {
        key: 'require_unsubscribe_link',
        value: 'true',
        description: 'Block campaign sending if no unsubscribe link in HTML',
      },
      {
        key: 'auto_suppress_hard_bounce',
        value: 'true',
        description: 'Automatically suppress contacts after hard bounce',
      },
      {
        key: 'max_bounce_rate_threshold',
        value: '0.05',
        description: 'Auto-pause campaign if bounce rate exceeds this (5%)',
      },
      {
        key: 'max_complaint_rate_threshold',
        value: '0.001',
        description: 'Auto-pause campaign if complaint rate exceeds this (0.1%)',
      },
    ],
  });

  console.log('✅ Default settings created');

  // Create sample email templates
  await prisma.emailTemplate.createMany({
    skipDuplicates: true,
    data: [
      {
        name: 'Simple Newsletter',
        category: 'Newsletter',
        isSystem: true,
        variables: JSON.stringify(['firstName', 'lastName', 'unsubscribeUrl']),
        htmlContent: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Newsletter</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 0; background: #f4f4f4; }
    .container { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 8px; overflow: hidden; }
    .header { background: #6366f1; color: #fff; padding: 32px; text-align: center; }
    .content { padding: 32px; color: #333; line-height: 1.6; }
    .footer { background: #f8f8f8; padding: 16px 32px; font-size: 12px; color: #999; text-align: center; }
    .btn { display: inline-block; background: #6366f1; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Newsletter</h1>
    </div>
    <div class="content">
      <p>Hi {{firstName}},</p>
      <p>Your content here.</p>
      <p><a href="#" class="btn">Learn More</a></p>
    </div>
    <div class="footer">
      <p>You received this because you subscribed.</p>
      <p><a href="{{unsubscribeUrl}}">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>`,
        textContent: `Hi {{firstName}},\n\nYour content here.\n\n---\nYou received this because you subscribed.\nUnsubscribe: {{unsubscribeUrl}}`,
      },
      {
        name: 'Transactional Email',
        category: 'Transactional',
        isSystem: true,
        variables: JSON.stringify(['firstName', 'unsubscribeUrl']),
        htmlContent: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Notification</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 0; background: #f4f4f4; }
    .container { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 8px; overflow: hidden; }
    .content { padding: 40px; color: #333; line-height: 1.6; }
    .footer { padding: 16px 40px; font-size: 12px; color: #999; }
  </style>
</head>
<body>
  <div class="container">
    <div class="content">
      <h2>Hello, {{firstName}}!</h2>
      <p>Your notification message goes here.</p>
    </div>
    <div class="footer">
      <a href="{{unsubscribeUrl}}">Unsubscribe</a>
    </div>
  </div>
</body>
</html>`,
        textContent: `Hello, {{firstName}}!\n\nYour notification message goes here.\n\nUnsubscribe: {{unsubscribeUrl}}`,
      },
    ],
  });

  console.log('✅ Sample email templates created');
  console.log('\n🎉 Seed complete!');
  console.log('   Admin email: admin@mailforge.local');
  console.log('   Admin password: Admin123!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
