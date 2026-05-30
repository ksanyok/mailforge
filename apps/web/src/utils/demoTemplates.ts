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
    <tr><td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:40px 40px 36px;text-align:center">
      <p style="margin:0;color:rgba(255,255,255,0.8);font-size:13px;letter-spacing:2px;text-transform:uppercase">MONTHLY NEWSLETTER</p>
      <h1 style="margin:8px 0 0;color:#ffffff;font-size:28px;font-weight:700;line-height:1.2">Your Company Name</h1>
    </td></tr>
    <tr><td style="padding:36px 40px 0">
      <p style="margin:0;color:#374151;font-size:16px;line-height:1.7">Hi {{firstName}}! 👋</p>
      <p style="margin:16px 0 0;color:#374151;font-size:16px;line-height:1.7">We're excited to share the latest updates with you. Here's what happened this month:</p>
    </td></tr>
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
    <tr><td style="padding:32px 40px;text-align:center">
      <a href="#" style="display:inline-block;background:#111827;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">Visit Our Website</a>
    </td></tr>
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
    <tr><td style="background:linear-gradient(135deg,#f59e0b,#ef4444);padding:48px 40px;text-align:center">
      <p style="margin:0 0 12px;color:rgba(255,255,255,0.9);font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:3px">⚡ Special Offer</p>
      <h1 style="margin:0 0 16px;color:#ffffff;font-size:48px;font-weight:900;line-height:1">50% OFF</h1>
      <p style="margin:0;color:rgba(255,255,255,0.9);font-size:17px">This week only</p>
    </td></tr>
    <tr><td style="padding:40px">
      <p style="margin:0 0 20px;color:#374151;font-size:16px;line-height:1.7">Hi {{firstName}}!</p>
      <p style="margin:0 0 24px;color:#374151;font-size:16px;line-height:1.7">
        We've prepared an exclusive offer just for you. Don't miss the chance to get our product at 50% off — this is a limited-time deal for our subscribers.
      </p>
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
    <tr><td style="padding:48px 40px 32px;text-align:center">
      <div style="width:72px;height:72px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:50%;margin:0 auto 20px">
        <span style="font-size:32px;line-height:72px;display:block">🎉</span>
      </div>
      <h1 style="margin:0 0 12px;color:#111827;font-size:26px;font-weight:700">Welcome, {{firstName}}!</h1>
      <p style="margin:0;color:#6b7280;font-size:16px;line-height:1.6">We're thrilled to have you in our community</p>
    </td></tr>
    <tr><td style="padding:0 40px"><div style="height:1px;background:#e5e7eb"></div></td></tr>
    <tr><td style="padding:32px 40px">
      <p style="margin:0 0 20px;color:#374151;font-size:15px;font-weight:600">Get started in 3 steps:</p>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="padding:0 0 16px">
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="width:36px;height:36px;background:#ede9fe;border-radius:50%;text-align:center;vertical-align:middle;font-size:16px">1</td>
              <td style="padding-left:12px;color:#374151;font-size:14px;line-height:1.5"><strong>Complete your profile</strong> — add your details to personalise your experience</td>
            </tr>
          </table>
        </td></tr>
        <tr><td style="padding:0 0 16px">
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="width:36px;height:36px;background:#dbeafe;border-radius:50%;text-align:center;vertical-align:middle;font-size:16px">2</td>
              <td style="padding-left:12px;color:#374151;font-size:14px;line-height:1.5"><strong>Explore features</strong> — see everything we can do for you</td>
            </tr>
          </table>
        </td></tr>
        <tr><td>
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="width:36px;height:36px;background:#dcfce7;border-radius:50%;text-align:center;vertical-align:middle;font-size:16px">3</td>
              <td style="padding-left:12px;color:#374151;font-size:14px;line-height:1.5"><strong>Get started</strong> — create your first project today</td>
            </tr>
          </table>
        </td></tr>
      </table>
    </td></tr>
    <tr><td style="padding:0 40px 40px;text-align:center">
      <a href="#" style="display:inline-block;background:#6366f1;color:#ffffff;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px">
        Get Started →
      </a>
      <p style="margin:16px 0 0;color:#9ca3af;font-size:13px">Questions? We're always here to help: support@company.com</p>
    </td></tr>
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
  {
    id: 'demo-cold-outreach',
    name: 'Cold B2B Outreach',
    category: 'promotional',
    description: 'Professional cold outreach email for B2B proposals and partnerships',
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
            <span style="display:inline-block;background:#ede9fe;color:#6366f1;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;padding:4px 10px;border-radius:20px">Proposal</span>
          </td>
        </tr>
      </table>
    </td></tr>
    <!-- Divider -->
    <tr><td style="padding:0 44px"><div style="height:1px;background:#e5e7eb"></div></td></tr>
    <!-- Body -->
    <tr><td style="padding:28px 44px">
      <p style="margin:0 0 18px;color:#374151;font-size:15px;line-height:1.8">Hi {{firstName}},</p>
      <p style="margin:0 0 18px;color:#374151;font-size:15px;line-height:1.8">
        I hope this message finds you well. I'm reaching out because I believe there's a strong opportunity for us to collaborate and create real value for your business.
      </p>
      <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.8">
        [Describe your proposal or service in 2–3 sentences. Be specific about the value you bring.]
      </p>
      <!-- Value highlight box -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
        <tr>
          <td width="33%" style="padding:16px 12px 16px 0;vertical-align:top">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border-radius:8px">
              <tr><td style="padding:16px;text-align:center">
                <p style="margin:0 0 6px;font-size:22px">✅</p>
                <p style="margin:0;color:#166534;font-size:13px;font-weight:600;line-height:1.4">Quality Result</p>
              </td></tr>
            </table>
          </td>
          <td width="33%" style="padding:16px 6px;vertical-align:top">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#eff6ff;border-radius:8px">
              <tr><td style="padding:16px;text-align:center">
                <p style="margin:0 0 6px;font-size:22px">⚡</p>
                <p style="margin:0;color:#1e40af;font-size:13px;font-weight:600;line-height:1.4">Fast Delivery</p>
              </td></tr>
            </table>
          </td>
          <td width="33%" style="padding:16px 0 16px 12px;vertical-align:top">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#fdf4ff;border-radius:8px">
              <tr><td style="padding:16px;text-align:center">
                <p style="margin:0 0 6px;font-size:22px">🤝</p>
                <p style="margin:0;color:#6b21a8;font-size:13px;font-weight:600;line-height:1.4">Full Support</p>
              </td></tr>
            </table>
          </td>
        </tr>
      </table>
      <p style="margin:0 0 28px;color:#374151;font-size:15px;line-height:1.8">
        I'd love to schedule a quick 15-minute call to discuss whether this could be a fit. Would you be open to that?
      </p>
      <table cellpadding="0" cellspacing="0">
        <tr><td>
          <a href="#" style="display:inline-block;background:#6366f1;color:#ffffff;padding:13px 28px;border-radius:7px;text-decoration:none;font-weight:600;font-size:14px">
            Schedule a Call →
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
        <a href="{{unsubscribeUrl}}" style="color:#9ca3af;text-decoration:underline">Unsubscribe</a>
        &nbsp;·&nbsp; You're receiving this because of your professional profile
      </p>
    </td></tr>
  </table>
</td></tr>
</table>
</body></html>`,
  },
  {
    id: 'demo-freelancer',
    name: 'Freelancer / Agency',
    category: 'promotional',
    description: 'Sleek outreach email for freelancers and agencies pitching services',
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
      <h1 style="margin:0 0 8px;color:#f1f5f9;font-size:24px;font-weight:700">Available for New Projects</h1>
      <p style="margin:0;color:#94a3b8;font-size:15px;line-height:1.6">Let's build something great together</p>
    </td></tr>
    <!-- Body -->
    <tr><td style="padding:0 44px 36px">
      <p style="margin:0 0 16px;color:#cbd5e1;font-size:15px;line-height:1.8">Hi {{firstName}},</p>
      <p style="margin:0 0 24px;color:#cbd5e1;font-size:15px;line-height:1.8">
        I came across your company and I'm impressed by what you're building. I specialize in [your skill / service] and I'm currently taking on new clients.
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
                <p style="margin:0 0 6px;color:#f59e0b;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px">Experience</p>
                <p style="margin:0;color:#94a3b8;font-size:13px;line-height:1.5">12+ years · End-to-end delivery</p>
              </td></tr>
            </table>
          </td>
        </tr>
      </table>
      <p style="margin:0 0 28px;color:#cbd5e1;font-size:15px;line-height:1.8">
        I can start immediately and integrate with your existing team and workflow. Let me know if you'd like to see my portfolio or have a quick chat.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding-right:10px">
            <a href="#" style="display:block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#ffffff;padding:13px 0;border-radius:7px;text-decoration:none;font-weight:600;font-size:14px;text-align:center">View Portfolio</a>
          </td>
          <td style="padding-left:10px">
            <a href="#" style="display:block;background:#0f172a;border:1px solid #334155;color:#f1f5f9;padding:13px 0;border-radius:7px;text-decoration:none;font-weight:600;font-size:14px;text-align:center">Schedule Call</a>
          </td>
        </tr>
      </table>
    </td></tr>
    <!-- Footer -->
    <tr><td style="background:#0f172a;padding:20px 44px;text-align:center">
      <p style="margin:0;color:#475569;font-size:11px">
        <a href="{{unsubscribeUrl}}" style="color:#475569;text-decoration:underline">Unsubscribe</a>
        &nbsp;·&nbsp; Sent via MailForge
      </p>
    </td></tr>
  </table>
</td></tr>
</table>
</body></html>`,
  },
  {
    id: 'demo-followup',
    name: 'Follow-up',
    category: 'promotional',
    description: 'Short follow-up email for unanswered outreach',
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
      <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.8">Hi {{firstName}},</p>
      <p style="margin:0 0 18px;color:#374151;font-size:15px;line-height:1.8">
        I wanted to follow up on my previous message — I know inboxes get busy, so I'll keep this short.
      </p>
      <!-- Quote / reminder box -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px">
        <tr><td style="background:#f8fafc;border-left:3px solid #6366f1;border-radius:0 8px 8px 0;padding:16px 20px">
          <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.6;font-style:italic">
            "In my last email I mentioned [brief reminder of your proposal]. I believe this could help {{company}} achieve [specific outcome]."
          </p>
        </td></tr>
      </table>
      <p style="margin:0 0 28px;color:#374151;font-size:15px;line-height:1.8">
        Would a quick 15-minute call this week work for you? I'm flexible on timing.
      </p>
      <table cellpadding="0" cellspacing="0">
        <tr><td>
          <a href="#" style="display:inline-block;background:#6366f1;color:#ffffff;padding:12px 26px;border-radius:7px;text-decoration:none;font-weight:600;font-size:14px">
            Book a Time →
          </a>
        </td></tr>
      </table>
      <p style="margin:24px 0 0;color:#9ca3af;font-size:13px;line-height:1.6">
        No worries if now isn't the right time — just let me know and I'll reach out later. 🙂
      </p>
    </td></tr>
    <!-- Signature line -->
    <tr><td style="padding:0 44px"><div style="height:1px;background:#f1f5f9"></div></td></tr>
    <tr><td style="padding:20px 44px">
      <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.6">
        Best,<br>
        <strong style="color:#111827">{{firstName}}</strong>
      </p>
    </td></tr>
    <!-- Footer -->
    <tr><td style="background:#f9fafb;border-top:1px solid #f1f5f9;padding:14px 44px;text-align:center">
      <p style="margin:0;color:#9ca3af;font-size:11px">
        <a href="{{unsubscribeUrl}}" style="color:#9ca3af;text-decoration:underline">Unsubscribe</a>
      </p>
    </td></tr>
  </table>
</td></tr>
</table>
</body></html>`,
  },
  {
    id: 'demo-saas-trial',
    name: 'SaaS Trial / Demo',
    category: 'promotional',
    description: 'SaaS product demo invite or free trial activation email',
    htmlContent: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0fdf4;font-family:'Segoe UI',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td align="center" style="padding:40px 16px">
  <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06)">
    <!-- Hero -->
    <tr><td style="background:linear-gradient(135deg,#059669,#0891b2);padding:44px 40px 36px;text-align:center">
      <p style="margin:0 0 10px;background:rgba(255,255,255,0.15);display:inline-block;color:#ffffff;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;padding:5px 14px;border-radius:20px">🎁 Free Trial</p>
      <h1 style="margin:14px 0 10px;color:#ffffff;font-size:28px;font-weight:800;line-height:1.2">Try [Product] Free<br>for 14 Days</h1>
      <p style="margin:0;color:rgba(255,255,255,0.85);font-size:15px">No credit card required</p>
    </td></tr>
    <!-- Body -->
    <tr><td style="padding:36px 44px 0">
      <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.8">Hi {{firstName}},</p>
      <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.8">
        I'd love to show you how [Product] helps teams like {{company}} [achieve key outcome] — in less time and with fewer headaches.
      </p>
      <!-- Features list -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px">
        <tr><td style="padding:0 0 10px">
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="width:28px;height:28px;background:#d1fae5;border-radius:50%;text-align:center;vertical-align:middle;font-size:13px">✓</td>
              <td style="padding-left:12px;color:#374151;font-size:14px;line-height:1.5">Feature one — brief description of main benefit</td>
            </tr>
          </table>
        </td></tr>
        <tr><td style="padding:0 0 10px">
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="width:28px;height:28px;background:#d1fae5;border-radius:50%;text-align:center;vertical-align:middle;font-size:13px">✓</td>
              <td style="padding-left:12px;color:#374151;font-size:14px;line-height:1.5">Feature two — another key advantage</td>
            </tr>
          </table>
        </td></tr>
        <tr><td>
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="width:28px;height:28px;background:#d1fae5;border-radius:50%;text-align:center;vertical-align:middle;font-size:13px">✓</td>
              <td style="padding-left:12px;color:#374151;font-size:14px;line-height:1.5">Feature three — integration or time-saving aspect</td>
            </tr>
          </table>
        </td></tr>
      </table>
    </td></tr>
    <!-- CTA -->
    <tr><td style="padding:0 44px 40px;text-align:center">
      <a href="#" style="display:inline-block;background:linear-gradient(135deg,#059669,#0891b2);color:#ffffff;padding:15px 40px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px">
        Start Free Trial →
      </a>
      <p style="margin:16px 0 0;color:#9ca3af;font-size:12px">Setup takes under 5 minutes</p>
    </td></tr>
    <!-- Social proof -->
    <tr><td style="padding:0 44px 36px">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:8px">
        <tr><td style="padding:20px 24px">
          <p style="margin:0 0 8px;color:#374151;font-size:14px;font-style:italic;line-height:1.6">"[Product] saved our team 10+ hours per week. The setup was seamless and the results were immediate."</p>
          <p style="margin:0;color:#6b7280;font-size:12px;font-weight:600">— Customer Name, Company</p>
        </td></tr>
      </table>
    </td></tr>
    <!-- Footer -->
    <tr><td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:18px 44px;text-align:center">
      <p style="margin:0;color:#9ca3af;font-size:11px">
        <a href="{{unsubscribeUrl}}" style="color:#9ca3af;text-decoration:underline">Unsubscribe</a>
        &nbsp;·&nbsp; Questions? Reply to this email anytime
      </p>
    </td></tr>
  </table>
</td></tr>
</table>
</body></html>`,
  },
];
