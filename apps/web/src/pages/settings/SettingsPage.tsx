import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { settingsApi } from '@/api/index';
import { toast } from '@/hooks/use-toast';

interface Setting { key: string; value: string; description?: string; }

const SETTING_GROUPS = [
  {
    title: 'General',
    keys: ['app.name', 'app.url', 'app.supportEmail'],
  },
  {
    title: 'Email Sending',
    keys: ['sending.defaultFromName', 'sending.defaultFromEmail', 'sending.maxDailyGlobal'],
  },
  {
    title: 'Warmup',
    keys: ['warmup.defaultInitialVolume', 'warmup.defaultDailyIncrease'],
  },
];

export function SettingsPage() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['settings'], queryFn: () => settingsApi.findAll() });
  const settings = (data as Setting[]) ?? [];

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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['settings'] }); toast({ title: 'Settings saved' }); },
    onError: () => toast({ title: 'Save failed', variant: 'destructive' }),
  });

  const getKey = (key: string) => key.replace(/\./g, '_');

  return (
    <form onSubmit={handleSubmit((d) => save.mutate(d))} className="space-y-4 max-w-2xl">
      {SETTING_GROUPS.map((group) => (
        <Card key={group.title}>
          <CardHeader><CardTitle className="text-sm">{group.title}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {group.keys.map((key) => {
              const setting = settings.find((s) => s.key === key);
              return (
                <div key={key} className="space-y-1">
                  <Label>{key}</Label>
                  <Input {...register(getKey(key))} />
                  {setting?.description && <p className="text-xs text-muted-foreground">{setting.description}</p>}
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}

      {settings.filter((s) => !SETTING_GROUPS.flatMap((g) => g.keys).includes(s.key)).length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Other Settings</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {settings.filter((s) => !SETTING_GROUPS.flatMap((g) => g.keys).includes(s.key)).map((s) => (
              <div key={s.key} className="space-y-1">
                <Label>{s.key}</Label>
                <Input {...register(getKey(s.key))} />
                {s.description && <p className="text-xs text-muted-foreground">{s.description}</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Button type="submit" disabled={save.isPending}>
        <Save className="h-4 w-4 mr-2" />{save.isPending ? 'Saving...' : 'Save Settings'}
      </Button>
    </form>
  );
}
