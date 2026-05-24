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
    name: 'Newsletter',
    category: 'newsletter',
    description: 'Standard newsletter with header, content block, and footer',
    htmlContent: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Newsletter</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5">
<tr><td align="center" style="padding:40px 16px">
  <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
    <!-- Header -->
    <tr><td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:40px 40px 36px;text-align:center">
      <p style="margin:0;color:rgba(255,255,255,0.8);font-size:13px;letter-spacing:2px;text-transform:uppercase">MONTHLY NEWSLETTER</p>
      <h1 style="margin:8px 0 0;color:#ffffff;font-size:28px;font-weight:700;line-height:1.2">Your Company Name</h1>
    </td></tr>
    <!-- Greeting -->
    <tr><td style="padding:36px 40px 0">
      <p style="margin:0;color:#374151;font-size:16px;line-height:1.7">Hi {{firstName}}! 👋</p>
      <p style="margin:16px 0 0;color:#374151;font-size:16px;line-height:1.7">We're excited to share the latest updates with you. Here's what happened this month:</p>
    </td></tr>
    <!-- Feature block -->
    <tr><td style="padding:28px 40px 0">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fa;border-radius:8px;overflow:hidden">
        <tr><td style="padding:24px">
          <p style="margin:0 0 8px;color:#6366f1;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px">Top Story</p>
          <h2 style="margin:0 0 12px;color:#111827;font-size:20px;font-weight:700">Your Content Headline Here</h2>
          <p style="margin:0 0 20px;color:#4b5563;font-size:15px;line-height:1.7">Describe your main news or update here. Keep it concise and specific — readers have limited time.</p>
          <a href="#" style="display:inline-block;background:#6366f1;color:#ffffff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px">Read More →</a>
        </td></tr>
      </table>
    </td></tr>
    <!-- Secondary blocks -->
    <tr><td style="padding:24px 40px 0">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td width="48%" style="background:#f0fdf4;border-radius:8px;padding:20px;vertical-align:top">
            <p style="margin:0 0 8px;font-size:20px">📈</p>
            <h3 style="margin:0 0 8px;color:#111827;font-size:15px;font-weight:700">Feature One</h3>
            <p style="margin:0;color:#4b5563;font-size:13px;line-height:1.6">Brief description of the first additional content block.</p>
          </td>
          <td width="4%"></td>
          <td width="48%" style="background:#eff6ff;border-radius:8px;padding:20px;vertical-align:top">
            <p style="margin:0 0 8px;font-size:20px">🚀</p>
            <h3 style="margin:0 0 8px;color:#111827;font-size:15px;font-weight:700">Feature Two</h3>
            <p style="margin:0;color:#4b5563;font-size:13px;line-height:1.6">Brief description of the second additional content block.</p>
          </td>
        </tr>
      </table>
    </td></tr>
    <!-- CTA -->
    <tr><td style="padding:32px 40px;text-align:center">
      <a href="#" style="display:inline-block;background:#111827;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">Visit Our Website</a>
    </td></tr>
    <!-- Footer -->
    <tr><td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:24px 40px;text-align:center">
      <p style="margin:0 0 8px;color:#9ca3af;font-size:12px">© 2025 Your Company. All rights reserved.</p>
      <p style="margin:0;color:#9ca3af;font-size:12px">
        You received this email because you subscribed to our newsletter.<br>
        <a href="{{unsubscribeUrl}}" style="color:#6b7280;text-decoration:underline">Unsubscribe</a>
      </p>
    </td></tr>
  </table>
</td></tr>
</table>
</body></html>`,
  },
  {
    id: 'demo-promo',
    name: 'Promo / Sale',
    category: 'promotional',
    description: 'Promotional email with offer, discount, and strong call to action',
    htmlContent: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#1e1b4b;font-family:'Segoe UI',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td align="center" style="padding:40px 16px">
  <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden">
    <!-- Hero -->
    <tr><td style="background:linear-gradient(135deg,#f59e0b,#ef4444);padding:48px 40px;text-align:center">
      <p style="margin:0 0 12px;color:rgba(255,255,255,0.9);font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:3px">⚡ Special Offer</p>
      <h1 style="margin:0 0 16px;color:#ffffff;font-size:48px;font-weight:900;line-height:1">50% OFF</h1>
      <p style="margin:0;color:rgba(255,255,255,0.9);font-size:17px">This week only</p>
    </td></tr>
    <!-- Body -->
    <tr><td style="padding:40px">
      <p style="margin:0 0 20px;color:#374151;font-size:16px;line-height:1.7">Hi {{firstName}}!</p>
      <p style="margin:0 0 24px;color:#374151;font-size:16px;line-height:1.7">
        We've prepared an exclusive offer just for you. Don't miss the chance to get our product at 50% off — this is a limited-time deal for our subscribers.
      </p>
      <!-- Offer box -->
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff7ed;border:2px dashed #f59e0b;border-radius:8px;margin-bottom:24px">
        <tr><td style="padding:20px;text-align:center">
          <p style="margin:0 0 4px;color:#9ca3af;font-size:13px;text-decoration:line-through">Regular price: $99</p>
          <p style="margin:0 0 8px;color:#f59e0b;font-size:36px;font-weight:900">$49</p>
          <p style="margin:0;color:#6b7280;font-size:13px">Use code: <strong style="color:#111827;font-size:15px">SAVE50</strong></p>
        </td></tr>
      </table>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td align="center">
          <a href="#" style="display:inline-block;background:linear-gradient(135deg,#f59e0b,#ef4444);color:#ffffff;padding:16px 40px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px">
            Claim Your Discount →
          </a>
        </td></tr>
      </table>
      <p style="margin:20px 0 0;color:#9ca3af;font-size:12px;text-align:center">⏰ Offer expires in 72 hours</p>
    </td></tr>
    <!-- Footer -->
    <tr><td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center">
      <p style="margin:0;color:#9ca3af;font-size:12px">
        <a href="{{unsubscribeUrl}}" style="color:#9ca3af">Unsubscribe from this list</a>
      </p>
    </td></tr>
  </table>
</td></tr>
</table>
</body></html>`,
  },
  {
    id: 'demo-welcome',
    name: 'Welcome Email',
    category: 'transactional',
    description: 'Welcome email for new subscribers with onboarding steps',
    htmlContent: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f9ff;font-family:'Segoe UI',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td align="center" style="padding:40px 16px">
  <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06)">
    <!-- Header -->
    <tr><td style="padding:48px 40px 32px;text-align:center">
      <div style="width:72px;height:72px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:50%;margin:0 auto 20px;display:flex;align-items:center;justify-content:center">
        <span style="font-size:32px;line-height:72px;display:block">🎉</span>
      </div>
      <h1 style="margin:0 0 12px;color:#111827;font-size:26px;font-weight:700">Welcome, {{firstName}}!</h1>
      <p style="margin:0;color:#6b7280;font-size:16px;line-height:1.6">We're thrilled to have you in our community</p>
    </td></tr>
    <!-- Divider -->
    <tr><td style="padding:0 40px"><div style="height:1px;background:#e5e7eb"></div></td></tr>
    <!-- Steps -->
    <tr><td style="padding:32px 40px">
      <p style="margin:0 0 20px;color:#374151;font-size:15px;font-weight:600">Get started in 3 steps:</p>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:0 0 16px">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="width:36px;height:36px;background:#ede9fe;border-radius:50%;text-align:center;vertical-align:middle;font-size:16px">1</td>
                <td style="padding-left:12px;color:#374151;font-size:14px;line-height:1.5"><strong>Complete your profile</strong> — add your details to personalise your experience</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:0 0 16px">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="width:36px;height:36px;background:#dbeafe;border-radius:50%;text-align:center;vertical-align:middle;font-size:16px">2</td>
                <td style="padding-left:12px;color:#374151;font-size:14px;line-height:1.5"><strong>Explore features</strong> — see everything we can do for you</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td>
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="width:36px;height:36px;background:#dcfce7;border-radius:50%;text-align:center;vertical-align:middle;font-size:16px">3</td>
                <td style="padding-left:12px;color:#374151;font-size:14px;line-height:1.5"><strong>Get started</strong> — create your first project today</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td></tr>
    <!-- CTA -->
    <tr><td style="padding:0 40px 40px;text-align:center">
      <a href="#" style="display:inline-block;background:#6366f1;color:#ffffff;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px">
        Get Started →
      </a>
      <p style="margin:16px 0 0;color:#9ca3af;font-size:13px">Questions? We're always here to help: support@company.com</p>
    </td></tr>
    <!-- Footer -->
    <tr><td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center">
      <p style="margin:0;color:#9ca3af;font-size:12px">
        <a href="{{unsubscribeUrl}}" style="color:#9ca3af">Unsubscribe</a>
      </p>
    </td></tr>
  </table>
</td></tr>
</table>
</body></html>`,
  },
];
