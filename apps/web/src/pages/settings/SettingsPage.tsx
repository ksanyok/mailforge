import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, Globe, Mail, Zap, Shield, Bell } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { settingsApi } from '@/api/index';
import { toast } from '@/hooks/use-toast';

interface Setting { key: string; value: string; description?: string; }

const LABEL_MAP: Record<string, { label: string; description: string; placeholder?: string; type?: string }> = {
  'app.name':                   { label: 'Application Name',            description: 'Display name shown in the interface',                  placeholder: 'MailForge' },
  'app.url':                    { label: 'Application URL',             description: 'Public URL of this application',                      placeholder: 'https://your-domain.com' },
  'app.supportEmail':           { label: 'Support Email',               description: 'Email address for user support requests',             placeholder: 'support@your-domain.com' },
  'sending.defaultFromName':    { label: 'Default Sender Name',         description: 'Default "From" name when no sender is specified',     placeholder: 'My Company' },
  'sending.defaultFromEmail':   { label: 'Default From Email',          description: 'Default "From" email address for outgoing mail',      placeholder: 'noreply@your-domain.com' },
  'sending.maxDailyGlobal':     { label: 'Global Daily Send Limit',     description: 'Maximum total emails per day across all senders',     placeholder: '10000', type: 'number' },
  'warmup.defaultInitialVolume':{ label: 'Initial Warmup Volume',       description: 'Emails per day to start with during IP warmup',       placeholder: '20',    type: 'number' },
  'warmup.defaultDailyIncrease':{ label: 'Daily Warmup Increase (%)',   description: 'Percentage increase in daily volume during warmup',   placeholder: '20',    type: 'number' },
  'notifications.forwardEmail': { label: 'Forward Notifications To',    description: 'System alerts will be emailed here (leave blank to disable)', placeholder: 'you@example.com' },
};

const SETTING_GROUPS = [
  {
    title: 'General',
    description: 'Basic application configuration',
    icon: Globe,
    keys: ['app.name', 'app.url', 'app.supportEmail'],
  },
  {
    title: 'Email Sending',
    description: 'Default values and limits for outgoing emails',
    icon: Mail,
    keys: ['sending.defaultFromName', 'sending.defaultFromEmail', 'sending.maxDailyGlobal'],
  },
  {
    title: 'IP Warmup',
    description: 'Controls how new sending IPs are gradually ramped up',
    icon: Zap,
    keys: ['warmup.defaultInitialVolume', 'warmup.defaultDailyIncrease'],
  },
  {
    title: 'Notifications',
    description: 'Receive system alerts outside the interface',
    icon: Bell,
    keys: ['notifications.forwardEmail'],
  },
];

export function SettingsPage() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['settings'], queryFn: () => settingsApi.findAll() });
  const settings = ((data as any)?.data ?? (Array.isArray(data) ? data : [])) as Setting[];

  const { register, handleSubmit, reset } = useForm<Record<string, string>>();

  useEffect(() => {
    if (settings.length > 0) {
      const values = Object.fromEntries(settings.map((s) => [s.key.replace(/\./g, '_'), s.value]));
      reset(values);
    }
  }, [settings, reset]);

  const save = useMutation({
    mutationFn: (d: Record<string, string>) => {
      const payload = Object.entries(d).map(([k, v]) => ({ key: k.replace(/_/g, '.'), value: v }));
      return settingsApi.bulkUpdate(payload);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['settings'] }); toast({ title: 'Settings saved successfully' }); },
    onError: () => toast({ title: 'Failed to save settings', variant: 'destructive' }),
  });

  const knownKeys = SETTING_GROUPS.flatMap((g) => g.keys);
  const otherSettings = settings.filter((s) => !knownKeys.includes(s.key));

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Configure your MailForge instance</p>
      </div>

      <form onSubmit={handleSubmit((d) => save.mutate(d))} className="space-y-4">
        {SETTING_GROUPS.map((group) => (
          <Card key={group.title}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <group.icon className="h-4 w-4 text-primary" />
                {group.title}
              </CardTitle>
              <CardDescription>{group.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {group.keys.map((key) => {
                const meta = LABEL_MAP[key];
                const fieldKey = key.replace(/\./g, '_');
                return (
                  <div key={key} className="space-y-1.5">
                    <Label htmlFor={fieldKey}>{meta?.label ?? key}</Label>
                    <Input
                      id={fieldKey}
                      type={meta?.type ?? 'text'}
                      placeholder={meta?.placeholder}
                      {...register(fieldKey)}
                    />
                    <p className="text-xs text-muted-foreground">{meta?.description}</p>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}

        {otherSettings.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Other Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {otherSettings.map((s) => {
                const fieldKey = s.key.replace(/\./g, '_');
                return (
                  <div key={s.key} className="space-y-1.5">
                    <Label htmlFor={fieldKey}>{LABEL_MAP[s.key]?.label ?? s.key}</Label>
                    <Input id={fieldKey} {...register(fieldKey)} />
                    {s.description && <p className="text-xs text-muted-foreground">{s.description}</p>}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end">
          <Button type="submit" disabled={save.isPending} className="gap-2">
            <Save className="h-4 w-4" />
            {save.isPending ? 'Saving…' : 'Save Settings'}
          </Button>
        </div>
      </form>
    </div>
  );
}
