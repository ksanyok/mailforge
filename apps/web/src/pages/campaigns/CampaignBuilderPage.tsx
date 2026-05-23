import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  ArrowLeft, ArrowRight, Send, Eye, Code2, AlertTriangle,
  CheckCircle, Users, Mail, Zap, FileText, Settings2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { campaignsApi, sendersApi, listsApi, templatesApi } from '@/api/index';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/utils/cn';

interface BuilderForm {
  name: string; subject: string; preheader: string;
  senderId: string; htmlContent: string; textContent: string;
  throttlePerMinute: number; trackOpens: boolean; trackClicks: boolean;
}

const STEPS = [
  { label: 'Basics',     icon: FileText   },
  { label: 'Sender',     icon: Mail       },
  { label: 'Recipients', icon: Users      },
  { label: 'Content',    icon: Code2      },
  { label: 'Settings',   icon: Settings2  },
  { label: 'Review',     icon: CheckCircle},
];

const VARIABLE_HINTS = [
  { var: '{{firstName}}',    desc: 'Contact first name'   },
  { var: '{{lastName}}',     desc: 'Contact last name'    },
  { var: '{{email}}',        desc: 'Contact email'        },
  { var: '{{unsubscribeUrl}}', desc: 'Unsubscribe link — required by law' },
];

const STARTER_TEMPLATE = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:40px 20px">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden">
        <!-- Header -->
        <tr><td style="background:#6366f1;padding:32px;text-align:center">
          <h1 style="margin:0;color:#ffffff;font-size:24px">Your Newsletter</h1>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:32px">
          <p style="margin:0 0 16px;color:#374151;font-size:16px;line-height:1.6">
            Hi {{firstName}},
          </p>
          <p style="margin:0 0 16px;color:#374151;font-size:16px;line-height:1.6">
            Write your message here.
          </p>
          <p style="text-align:center;margin:32px 0">
            <a href="#" style="background:#6366f1;color:#fff;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block">
              Call to Action
            </a>
          </p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#f9fafb;padding:24px;text-align:center;border-top:1px solid #e5e7eb">
          <p style="margin:0;color:#9ca3af;font-size:12px">
            You received this email because you subscribed.<br>
            <a href="{{unsubscribeUrl}}" style="color:#6b7280">Unsubscribe</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

export function CampaignBuilderPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [selectedLists, setSelectedLists] = useState<string[]>([]);
  const [previewMode, setPreviewMode] = useState<'code' | 'preview'>('code');

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<BuilderForm>({
    defaultValues: { throttlePerMinute: 60, trackOpens: true, trackClicks: true },
  });

  const { data: senders } = useQuery({ queryKey: ['senders'], queryFn: () => sendersApi.findAll() });
  const { data: listsData } = useQuery({ queryKey: ['lists'], queryFn: () => listsApi.findAll({ limit: 100 }) });
  const { data: tplData } = useQuery({ queryKey: ['templates'], queryFn: () => templatesApi.findAll({ limit: 50 }) });

  const sendersArr = ((senders as any)?.data ?? []) as { id: string; name: string; fromEmail: string; status: string }[];
  const listsArr = ((listsData as any)?.data ?? []) as { id: string; name: string; contactCount: number }[];
  const templates = ((tplData as any)?.data ?? []) as { id: string; name: string; htmlContent: string }[];

  const selectedSender = sendersArr.find((s) => s.id === watch('senderId'));

  const save = useMutation({
    mutationFn: (data: BuilderForm & { listIds: string[] }) =>
      id ? campaignsApi.update(id, data) : campaignsApi.create(data),
    onSuccess: (result) => {
      const camp = result as { id: string };
      toast({ title: id ? 'Campaign updated' : 'Campaign created successfully' });
      navigate(`/campaigns/${camp.id}`);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'Failed to save campaign';
      toast({ title: msg, variant: 'destructive' });
    },
  });

  const onSubmit = (data: BuilderForm) => {
    if (selectedLists.length === 0) {
      toast({ title: 'Select at least one recipient list', variant: 'destructive' });
      setStep(2);
      return;
    }
    save.mutate({ ...data, listIds: selectedLists });
  };

  const htmlContent = watch('htmlContent') ?? '';

  const spamChecks = [
    { ok: htmlContent.includes('{{unsubscribeUrl}}'), label: 'Contains unsubscribe link', critical: true  },
    { ok: htmlContent.length > 0,                     label: 'HTML content is not empty',  critical: true  },
    { ok: watch('subject')?.length > 0,               label: 'Subject line is set',         critical: true  },
    { ok: !watch('subject')?.match(/!{2,}|\$\$|FREE|URGENT/i), label: 'Subject has no spam trigger words', critical: false },
    { ok: !!watch('senderId'),                         label: 'Sender account is selected', critical: true  },
    { ok: selectedLists.length > 0,                   label: 'At least one list selected', critical: true  },
  ];
  const criticalFails = spamChecks.filter((c) => c.critical && !c.ok);

  const goNext = () => {
    if (step === 0 && !watch('name')) { toast({ title: 'Campaign name is required', variant: 'destructive' }); return; }
    if (step === 0 && !watch('subject')) { toast({ title: 'Subject line is required', variant: 'destructive' }); return; }
    if (step === 1 && !watch('senderId')) { toast({ title: 'Please select a sender', variant: 'destructive' }); return; }
    if (step === 2 && selectedLists.length === 0) { toast({ title: 'Select at least one list', variant: 'destructive' }); return; }
    setStep((s) => s + 1);
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />Back
        </Button>
        <div>
          <h1 className="text-xl font-bold">{id ? 'Edit Campaign' : 'New Campaign'}</h1>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-1">
        {STEPS.map(({ label, icon: Icon }, i) => (
          <button
            key={label}
            type="button"
            onClick={() => i < step && setStep(i)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all',
              i === step   ? 'bg-primary text-primary-foreground'  : '',
              i < step     ? 'bg-green-100 text-green-700 cursor-pointer hover:bg-green-200' : '',
              i > step     ? 'text-muted-foreground cursor-default' : '',
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
            {i < STEPS.length - 1 && <span className="ml-1 text-muted-foreground/40">›</span>}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* STEP 0 — Basics */}
        {step === 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><FileText className="h-4 w-4 text-primary" />Campaign Basics</CardTitle>
              <CardDescription>Name your campaign and set the subject line that recipients will see</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Campaign Name <span className="text-red-500">*</span></Label>
                <Input id="name" {...register('name', { required: true })} placeholder="e.g. May Newsletter, Black Friday Promo" />
                <p className="text-xs text-muted-foreground">Internal name — not visible to recipients</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="subject">Subject Line <span className="text-red-500">*</span></Label>
                <Input id="subject" {...register('subject', { required: true })} placeholder="e.g. 🚀 Big news from our team!" />
                <p className="text-xs text-muted-foreground">What recipients see in their inbox. Aim for 40–60 characters.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="preheader">Preheader Text</Label>
                <Input id="preheader" {...register('preheader')} placeholder="e.g. Here's what's new this month…" />
                <p className="text-xs text-muted-foreground">Preview text shown after the subject in most email clients (80–100 chars)</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 1 — Sender */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Mail className="h-4 w-4 text-primary" />Select Sender</CardTitle>
              <CardDescription>Choose which SMTP account this campaign will be sent from</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {sendersArr.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <Mail className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  No sender accounts configured.{' '}
                  <button type="button" className="text-primary underline" onClick={() => navigate('/senders')}>Add one first →</button>
                </div>
              ) : (
                sendersArr.map((s) => (
                  <label
                    key={s.id}
                    className={cn(
                      'flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors',
                      watch('senderId') === s.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50',
                    )}
                  >
                    <input
                      type="radio"
                      name="senderId"
                      value={s.id}
                      checked={watch('senderId') === s.id}
                      onChange={() => setValue('senderId', s.id)}
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.fromEmail}</p>
                    </div>
                    <span className={cn(
                      'text-xs px-2 py-0.5 rounded-full font-medium',
                      s.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700',
                    )}>{s.status}</span>
                  </label>
                ))
              )}
            </CardContent>
          </Card>
        )}

        {/* STEP 2 — Recipients */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Users className="h-4 w-4 text-primary" />Recipient Lists</CardTitle>
              <CardDescription>Select one or more contact lists to send this campaign to</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {listsArr.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  No contact lists found.{' '}
                  <button type="button" className="text-primary underline" onClick={() => navigate('/lists')}>Create a list first →</button>
                </div>
              ) : (
                <>
                  {listsArr.map((list) => (
                    <label key={list.id} className={cn(
                      'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                      selectedLists.includes(list.id) ? 'border-primary bg-primary/5' : 'hover:bg-muted/50',
                    )}>
                      <input
                        type="checkbox"
                        checked={selectedLists.includes(list.id)}
                        onChange={(e) => setSelectedLists(
                          e.target.checked
                            ? [...selectedLists, list.id]
                            : selectedLists.filter((l) => l !== list.id),
                        )}
                      />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{list.name}</p>
                      </div>
                      <span className="text-xs bg-muted px-2 py-0.5 rounded">{list.contactCount} contacts</span>
                    </label>
                  ))}
                  {selectedLists.length > 0 && (
                    <p className="text-xs text-muted-foreground pt-1">
                      {listsArr.filter((l) => selectedLists.includes(l.id)).reduce((a, l) => a + l.contactCount, 0)} total contacts selected (before deduplication)
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* STEP 3 — Content */}
        {step === 3 && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Code2 className="h-4 w-4 text-primary" />Email Content</CardTitle>
                <CardDescription>Write your HTML email. Use the Preview tab to see how it looks.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Template picker */}
                {templates.length > 0 && (
                  <div className="space-y-1.5">
                    <Label>Load from template</Label>
                    <Select onValueChange={(tplId) => {
                      const tpl = templates.find((t) => t.id === tplId);
                      if (tpl) setValue('htmlContent', tpl.htmlContent);
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="— Choose a saved template —" />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map((t) => (
                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Starter template button */}
                {!htmlContent && (
                  <button
                    type="button"
                    className="w-full border-2 border-dashed rounded-lg p-4 text-sm text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
                    onClick={() => setValue('htmlContent', STARTER_TEMPLATE)}
                  >
                    + Insert starter email template
                  </button>
                )}

                {/* Variable hints */}
                <div className="flex flex-wrap gap-2">
                  {VARIABLE_HINTS.map(({ var: v, desc }) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => {
                        const el = document.getElementById('htmlContent') as HTMLTextAreaElement;
                        if (el) {
                          const start = el.selectionStart;
                          const current = htmlContent;
                          setValue('htmlContent', current.slice(0, start) + v + current.slice(start));
                        }
                      }}
                      title={desc}
                      className="text-xs px-2 py-1 rounded bg-muted font-mono hover:bg-primary/10 hover:text-primary transition-colors"
                    >
                      {v}
                    </button>
                  ))}
                </div>

                {/* Code / Preview tabs */}
                <Tabs value={previewMode} onValueChange={(v) => setPreviewMode(v as any)}>
                  <TabsList>
                    <TabsTrigger value="code" className="gap-1.5"><Code2 className="h-3.5 w-3.5" />HTML Code</TabsTrigger>
                    <TabsTrigger value="preview" className="gap-1.5"><Eye className="h-3.5 w-3.5" />Preview</TabsTrigger>
                  </TabsList>
                  <TabsContent value="code">
                    <Textarea
                      id="htmlContent"
                      {...register('htmlContent', { required: true })}
                      rows={18}
                      className="font-mono text-xs resize-y"
                      placeholder="Paste or write your HTML here, or use the starter template above…"
                    />
                  </TabsContent>
                  <TabsContent value="preview">
                    <div className="border rounded-md overflow-hidden" style={{ height: 480 }}>
                      {htmlContent ? (
                        <iframe
                          srcDoc={htmlContent}
                          title="Email Preview"
                          className="w-full h-full"
                          sandbox="allow-same-origin"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                          <div className="text-center">
                            <Eye className="h-8 w-8 mx-auto mb-2 opacity-30" />
                            No HTML content yet — write some code to see the preview
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Plain Text Version (optional)</CardTitle>
                <CardDescription>Shown to email clients that can't render HTML. If empty, auto-generated.</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea {...register('textContent')} rows={5} placeholder="Hi {{firstName}},\n\nWrite your plain text message here.\n\nUnsubscribe: {{unsubscribeUrl}}" />
              </CardContent>
            </Card>
          </div>
        )}

        {/* STEP 4 — Settings */}
        {step === 4 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Settings2 className="h-4 w-4 text-primary" />Sending Settings</CardTitle>
              <CardDescription>Configure throttling and tracking options</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-1.5">
                <Label htmlFor="throttlePerMinute">Send Rate (emails per minute)</Label>
                <Input id="throttlePerMinute" type="number" min={1} max={500} {...register('throttlePerMinute', { valueAsNumber: true })} />
                <p className="text-xs text-muted-foreground">Lower values reduce spam risk. Recommended: 30–60/min. Max: 500/min.</p>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium">Tracking</p>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" {...register('trackOpens')} className="mt-0.5" defaultChecked />
                  <div>
                    <p className="text-sm font-medium">Track opens</p>
                    <p className="text-xs text-muted-foreground">Embed a 1×1 invisible tracking pixel to detect when the email is opened</p>
                  </div>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" {...register('trackClicks')} className="mt-0.5" defaultChecked />
                  <div>
                    <p className="text-sm font-medium">Track clicks</p>
                    <p className="text-xs text-muted-foreground">Wrap all links so clicks are counted before redirecting to destination</p>
                  </div>
                </label>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 5 — Review */}
        {step === 5 && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-primary" />Campaign Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-2 text-sm">
                  {[
                    { label: 'Name',      value: watch('name') },
                    { label: 'Subject',   value: watch('subject') },
                    { label: 'Preheader', value: watch('preheader') || '—' },
                    { label: 'Sender',    value: selectedSender ? `${selectedSender.name} <${selectedSender.fromEmail}>` : '—' },
                    { label: 'Lists',     value: `${selectedLists.length} list(s) — ${listsArr.filter((l) => selectedLists.includes(l.id)).reduce((a, l) => a + l.contactCount, 0)} contacts` },
                    { label: 'Send rate', value: `${watch('throttlePerMinute')} emails/min` },
                    { label: 'Track opens',  value: watch('trackOpens') ? 'Yes' : 'No' },
                    { label: 'Track clicks', value: watch('trackClicks') ? 'Yes' : 'No' },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between border-b pb-2 last:border-0 last:pb-0">
                      <dt className="text-muted-foreground">{label}</dt>
                      <dd className="font-medium text-right max-w-xs truncate">{value}</dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>

            {/* Checklist */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Pre-send Checklist</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {spamChecks.map(({ ok, label, critical }) => (
                  <div key={label} className={cn('flex items-center gap-2 text-sm', ok ? 'text-green-700' : critical ? 'text-red-600' : 'text-yellow-600')}>
                    {ok ? <CheckCircle className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
                    {label}
                    {!ok && critical && <span className="text-xs font-medium ml-auto">Required</span>}
                  </div>
                ))}
              </CardContent>
            </Card>

            {criticalFails.length > 0 && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>Fix {criticalFails.length} required item(s) before saving this campaign.</span>
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <Button type="button" variant="outline" onClick={() => setStep((s) => s - 1)} disabled={step === 0}>
            <ArrowLeft className="h-4 w-4 mr-2" />Previous
          </Button>
          {step < STEPS.length - 1 ? (
            <Button type="button" onClick={goNext}>
              Next<ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button type="submit" disabled={save.isPending || criticalFails.length > 0} className="gap-2">
              <Send className="h-4 w-4" />
              {save.isPending ? 'Saving…' : 'Save Campaign'}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
