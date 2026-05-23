# MailForge — User Guide

Complete guide to using the MailForge email delivery platform.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard](#dashboard)
3. [Contacts](#contacts)
4. [Lists](#lists)
5. [Importing Contacts](#importing-contacts)
6. [Senders (SMTP Accounts)](#senders)
7. [Email Templates](#templates)
8. [Campaigns](#campaigns)
9. [Warmup](#warmup)
10. [Deliverability](#deliverability)
11. [Suppressions](#suppressions)
12. [Reports](#reports)
13. [Settings](#settings)
14. [Webmail](#webmail)
15. [Tips & Best Practices](#tips)

---

## 1. Getting Started <a name="getting-started"></a>

After logging in you will see the main dashboard. The left sidebar gives access to all sections. Start with this sequence:

1. **Add a Sender** — configure your SMTP account
2. **Import Contacts** — upload your contact list
3. **Create a List** — group contacts for targeting
4. **Create a Campaign** — compose and send your email

---

## 2. Dashboard <a name="dashboard"></a>

The dashboard shows a real-time overview of your email operations.

**Key metrics:**
| Metric | Meaning |
|---|---|
| Total Contacts | All contacts in the database |
| Subscribed | Active contacts who can receive email |
| Bounced | Contacts whose email address is unreachable |
| Unsubscribed | Contacts who opted out |
| Suppressed | Globally blocked addresses |
| Total Campaigns | Number of campaigns created |
| Sent Today | Emails dispatched in the last 24 hours |
| Avg Open Rate | Average open rate across all campaigns |

**Charts:**
- **Email Activity (30 Days)** — area chart showing sends, opens, clicks, and bounces per day
- **Contact Status** — pie chart showing the breakdown of contact statuses

**Recommendations panel** — if there are active warnings (high bounce rate, missing DNS records, etc.) they appear here in orange.

---

## 3. Contacts <a name="contacts"></a>

Contacts are the individual email addresses in your database.

### Viewing contacts
Go to **Contacts** in the sidebar. Use the search box and filters to find specific contacts by email, name, status, or tags.

### Contact statuses
| Status | Meaning |
|---|---|
| SUBSCRIBED | Can receive emails |
| UNSUBSCRIBED | Opted out — will not receive emails |
| BOUNCED | Invalid address — automatically skipped |
| COMPLAINED | Reported as spam — automatically skipped |
| SUPPRESSED | Globally blocked |

### Engagement score (0–100)
Shows how often a contact opens and clicks emails. High score = good engagement. Low score = candidate for re-engagement or list cleaning.

### Risk score (0–100)
Higher risk score means the address looks suspicious (role-based address like info@, disposable domain, etc.). High-risk contacts are sent but flagged.

### Contact detail page
Click any contact to see:
- Full profile and custom fields
- Event timeline (sent, opened, clicked, unsubscribed)
- Tags and list memberships
- Notes

### Adding contacts manually
Click **+ New Contact** and fill in the form. Email is the only required field.

---

## 4. Lists <a name="lists"></a>

Lists group contacts for targeted sending. A contact can belong to multiple lists.

### Creating a list
Go to **Lists** → **+ New List**. Enter a name and optional description.

### Managing members
Open any list and:
- **Add contacts** — search and add existing contacts
- **Remove contacts** — select and remove from the list
- The **Contact Count** updates automatically

### Using lists in campaigns
When creating a campaign (step 3 — Recipients), select one or more lists. All subscribed contacts from the selected lists will receive the campaign (duplicates are automatically deduplicated).

---

## 5. Importing Contacts <a name="importing-contacts"></a>

Import contacts in bulk from a file.

### Supported file formats
| Format | Extension | Notes |
|---|---|---|
| CSV | .csv | Most common. UTF-8 encoding recommended. |
| Excel | .xlsx | Reads the first sheet |
| JSON | .json | Array of objects |
| Text | .txt | One email per line |

### Column names
The system automatically detects these column names (case-insensitive):

| Field | Accepted names | Required |
|---|---|---|
| email | email, e-mail, mail | **Yes** |
| firstName | firstName, first_name, name | No |
| lastName | lastName, last_name, surname | No |
| phone | phone, tel, telephone | No |
| company | company, org, organization | No |

Any extra columns are saved as custom fields.

### Import options
- **Add to list** — optionally add all imported contacts to a specific list
- **Duplicate handling**:
  - **Skip** — if an email already exists, keep the existing record unchanged
  - **Update** — if an email already exists, overwrite it with the new data

### Checking import results
After uploading, you are redirected to the import detail page showing:
- Progress bar with % complete
- Number of rows imported successfully
- Number of errors with the reason for each failure

The import page auto-refreshes while processing is in progress.

---

## 6. Senders (SMTP Accounts) <a name="senders"></a>

Senders are SMTP server credentials used to actually deliver email.

### Adding a sender
Go to **Senders** → **+ New Sender** and fill in:

| Field | Description |
|---|---|
| Name | Internal label (e.g. "Main newsletter account") |
| From Name | Displayed as the sender name in the inbox (e.g. "Acme Team") |
| From Email | The "From:" address (e.g. hello@yourdomain.com) |
| Reply-To | Optional. Address where replies go. |
| SMTP Host | Your mail server hostname |
| SMTP Port | Usually 587 (STARTTLS) or 465 (TLS) or 25 |
| Encryption | NONE / TLS / STARTTLS |
| Username | SMTP login username |
| Password | SMTP password (stored encrypted) |
| Daily Limit | Max emails per day from this sender |
| Hourly Limit | Max emails per hour |
| Per-minute Limit | Max emails per minute |

### Testing the connection
After saving, click **Test Connection**. This sends a test email to the sender's own address and verifies the SMTP connection.

### Health score (0–100)
Calculated from the last 7 days of sending activity:
- 100 = perfect (no bounces, no complaints, good open rate)
- Deductions for: high bounce rate, complaints, low open rate, SMTP errors

### Sender statuses
| Status | Meaning |
|---|---|
| ACTIVE | Working normally |
| PAUSED | Temporarily paused (e.g. during warmup) |
| ERROR | Last SMTP connection failed |

---

## 7. Email Templates <a name="templates"></a>

Templates are reusable HTML email designs.

### Creating a template
Go to **Templates** → **+ New Template**. Enter a name, category, and paste your HTML.

### Variables
Use these placeholders in template HTML — they are replaced with real values when sending:

| Variable | Replaced with |
|---|---|
| `{{firstName}}` | Contact's first name |
| `{{lastName}}` | Contact's last name |
| `{{email}}` | Contact's email address |
| `{{unsubscribeUrl}}` | Unique unsubscribe link for this contact |

**Always include `{{unsubscribeUrl}}`** — it is required by email law (CAN-SPAM, GDPR).

### Using templates in campaigns
In the Campaign Builder (step 3 — Content), use the **Load from template** dropdown to insert a saved template into the editor.

---

## 8. Campaigns <a name="campaigns"></a>

A campaign is an email sent to one or more contact lists.

### Campaign Builder — step by step

**Step 1 — Basics**
- **Campaign Name** — internal label, not seen by recipients
- **Subject Line** — what recipients see in their inbox. Aim for 40–60 characters. Avoid ALL CAPS and excessive punctuation.
- **Preheader** — preview text shown after the subject in most email clients. Aim for 80–100 characters.

**Step 2 — Sender**
- Select which SMTP account to send from. Only ACTIVE senders are recommended.

**Step 3 — Recipients**
- Select one or more contact lists. The total contact count is shown.
- Unsubscribed, bounced, complained, and suppressed contacts are automatically excluded at send time.

**Step 4 — Content**
- Paste or write your HTML email.
- Use **+ Insert starter email template** to get a professionally structured starting point.
- Click variable buttons (`{{firstName}}`, etc.) to insert them at the cursor.
- Switch to **Preview** tab to see a rendered preview of the email.
- Optionally add a plain text version (shown to email clients that can't render HTML).

**Step 5 — Settings**
- **Send Rate** — emails per minute. Lower = safer. Recommended: 30–60/min.
- **Track Opens** — embed invisible 1×1 pixel to detect opens.
- **Track Clicks** — wrap links to count clicks before redirecting.

**Step 6 — Review**
- Summary of all settings.
- **Pre-send Checklist** — the system checks for common issues:
  - Unsubscribe link present
  - Subject line set
  - Sender selected
  - Lists selected

### Dispatching a campaign
After saving a campaign (status = DRAFT), open it and click **Dispatch**. The system:
1. Resolves all eligible recipients from the selected lists
2. Filters out unsubscribed, bounced, complained contacts
3. Queues all emails in the background with rate limiting
4. Updates the campaign status to SENDING → SENT

### Campaign statuses
| Status | Meaning |
|---|---|
| DRAFT | Created but not sent |
| SCHEDULED | Scheduled for future sending |
| SENDING | Currently being dispatched |
| SENT | All emails have been dispatched |
| PAUSED | Sending paused manually |
| CANCELLED | Cancelled before completion |

### Campaign statistics
Open any campaign to see:
- **Funnel**: Sent → Delivered → Opened → Clicked
- **Rates**: Open rate, click rate, bounce rate, unsubscribe rate
- **Event table**: Individual events per contact

---

## 9. Warmup <a name="warmup"></a>

Email warmup gradually increases the sending volume from a new IP or domain to build a good sender reputation.

### How it works
- Each sender has a **warmup stage** (0, 1, 2, …)
- Each day, if engagement metrics are healthy, the stage advances and the daily limit increases
- If bounce or complaint rates are too high, warmup is paused automatically

### Configuring warmup rules
Go to **Warmup** and click the settings icon next to a sender to set:

| Setting | Default | Meaning |
|---|---|---|
| Initial Daily Volume | 20 | Emails/day to start with |
| Daily Increase | 20% | Volume increase per successful day |
| Max Daily Limit | 500 | Volume cap |
| Min Open Rate | 20% | Minimum open rate to advance stage |
| Max Bounce Rate | 3% | Maximum bounce rate to stay healthy |
| Max Complaint Rate | 0.1% | Maximum complaint rate |
| Auto-pause on critical | Yes | Auto-pause sender if limits are exceeded |

### Warmup progress chart
Shows daily send volume vs. target volume over time. A healthy warmup ramps up smoothly.

---

## 10. Deliverability <a name="deliverability"></a>

Deliverability checks verify the DNS and SMTP configuration for your sending domains.

### DNS checks
| Check | What it tests |
|---|---|
| SPF | TXT record `v=spf1 …` authorizes your server to send |
| DKIM | TXT record with public key for signing emails |
| DMARC | TXT record `v=DMARC1 …` policy for failed auth |
| MX | Mail exchanger records exist for the domain |
| rDNS | Reverse DNS (PTR) of the sending IP matches the hostname |
| Blacklist | IP is not on common email blacklists |
| SMTP | Can connect and authenticate to the SMTP server |

### Running checks
Open **Deliverability**, select a sender, and click **Run Checks**. Results show PASS / FAIL / WARNING for each check with a recommended fix.

### Common issues and fixes

**SPF FAIL** — Add a TXT record to your DNS:
```
v=spf1 ip4:YOUR_SERVER_IP ~all
```

**DKIM FAIL** — Generate a DKIM key pair and add the public key as a TXT record. Configure OpenDKIM on your mail server.

**DMARC FAIL** — Add a TXT record to your DNS:
```
_dmarc.yourdomain.com  TXT  "v=DMARC1; p=none; rua=mailto:you@yourdomain.com"
```

**rDNS FAIL** — Set the PTR record for your server's IP to match your mail hostname. Done in your hosting provider's panel.

---

## 11. Suppressions <a name="suppressions"></a>

The suppression list is a global blocklist of email addresses that will never receive email regardless of campaign or list membership.

### Addresses are auto-suppressed when:
- A hard bounce occurs (invalid address)
- A spam complaint is received

### Manual suppression
Go to **Suppressions** → **+ Add** and enter an email address with an optional note. Use this to honor manual opt-out requests or block known invalid addresses.

### Checking if an address is suppressed
Use the search box or the **Check Email** feature. A suppressed address will not receive any campaigns.

---

## 12. Reports <a name="reports"></a>

The Reports section provides aggregated analytics across all campaigns and senders.

### Available reports
- **Campaign comparison** — side-by-side metrics for multiple campaigns
- **Sender comparison** — health scores and send volumes per sender
- **Contact engagement** — contacts sorted by engagement score

---

## 13. Settings <a name="settings"></a>

Go to **Settings** to configure system-wide defaults.

| Section | Settings |
|---|---|
| General | Application name, URL, support email |
| Email Sending | Default sender name and email, global daily send limit |
| IP Warmup | Default initial volume and daily increase percentage |

After making changes, click **Save Settings**.

---

## 14. Webmail <a name="webmail"></a>

MailForge includes a built-in webmail client (Roundcube) for checking received email.

**Access:** `https://mail.your-domain.com`

**Login:** Use the full email address as username (e.g. `hello@your-domain.com`) and the email account password.

The webmail client connects to the Dovecot IMAP server running on the same host.

---

## 15. Tips & Best Practices <a name="tips"></a>

### Deliverability
- Always set up SPF, DKIM, and DMARC before sending
- Set the PTR (rDNS) record for your sending IP to match your mail hostname
- Warm up new IPs gradually — never send large volumes from a fresh IP
- Monitor bounce rates: >2% is concerning, >5% is dangerous

### List hygiene
- Remove hard bounces immediately — they stay in your database but are auto-skipped
- Suppress complainers immediately
- Re-engage or remove contacts who haven't opened in 90+ days
- Never buy email lists — use only opt-in contacts

### Content
- Always include `{{unsubscribeUrl}}` — it is required by law
- Keep subject lines under 60 characters
- Avoid spam trigger words: FREE, URGENT, WINNER, ACT NOW, !!!, $$$
- Test your email in multiple clients (Gmail, Outlook, Apple Mail) before sending
- Optimize for mobile — over 60% of emails are opened on phones

### Sending volume
- Start with small batches (100–500) to new lists
- Use throttling (30–60 emails/minute) to avoid server blacklisting
- Schedule large campaigns at off-peak hours (10:00–11:00 AM recipient's local time)

### Monitoring
- Check the Dashboard daily for anomalies
- Investigate any spike in bounces or complaints immediately
- Check Deliverability checks monthly, especially after server changes

---

*MailForge — Self-hosted email delivery platform*
