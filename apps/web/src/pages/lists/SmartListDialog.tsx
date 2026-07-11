import { useState, useEffect, type ReactNode } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Building2, Globe, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { listsApi } from '@/api/index';
import { formatNumber } from '@/utils/format';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/utils/cn';

type EmailType = 'ALL' | 'CORPORATE' | 'FREE';

interface Filter {
  emailType: EmailType;
  excludeDomains: string;
  includeDomains: string;
  excludeSubdomainsOf: string;
  requireWebsite: boolean;
}

const EMPTY: Filter = {
  emailType: 'CORPORATE',
  excludeDomains: '',
  includeDomains: '',
  excludeSubdomainsOf: '',
  requireWebsite: false,
};

function toList(s: string): string[] {
  return s.split(/[\s,;\n]+/).map((x) => x.trim().toLowerCase().replace(/^@/, '')).filter(Boolean);
}

function toPayload(f: Filter) {
  return {
    emailType: f.emailType,
    excludeDomains: toList(f.excludeDomains),
    includeDomains: toList(f.includeDomains),
    excludeSubdomainsOf: toList(f.excludeSubdomainsOf),
    requireWebsite: f.requireWebsite,
  };
}

export function SmartListDialog({ children, onCreated }: { children: ReactNode; onCreated?: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [f, setF] = useState<Filter>(EMPTY);
  const [preview, setPreview] = useState<{ total: number; corporate: number; free: number } | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Debounced live preview of matching count
  useEffect(() => {
    if (!open) return;
    setLoadingPreview(true);
    const t = setTimeout(async () => {
      try {
        const r = await listsApi.previewFilter(toPayload(f));
        setPreview(r as any);
      } catch {
        setPreview(null);
      } finally {
        setLoadingPreview(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [f, open]);

  const create = useMutation({
    mutationFn: () => listsApi.createFromFilter({ name, filter: toPayload(f) }),
    onSuccess: (r: any) => {
      toast({ title: 'Умный список создан', description: `Добавлено контактов: ${formatNumber(r?.added ?? 0)}` });
      onCreated?.();
      setOpen(false);
      setName('');
      setF(EMPTY);
      setPreview(null);
    },
    onError: () => toast({ title: 'Не удалось создать список', variant: 'destructive' }),
  });

  const set = (patch: Partial<Filter>) => setF((prev) => ({ ...prev, ...patch }));

  const typeBtn = (val: EmailType, label: string, Icon: typeof Users) => (
    <button
      type="button"
      onClick={() => set({ emailType: val })}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-[9px] border text-[12.5px] font-semibold transition',
        f.emailType === val
          ? 'border-brand bg-brand-soft text-brand'
          : 'border-border text-ink-2 hover:bg-hover',
      )}
    >
      <Icon className="w-4 h-4" strokeWidth={1.8} />
      {label}
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Умный список по доменам</DialogTitle></DialogHeader>

        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <div className="space-y-1">
            <Label>Название списка</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Корпоративные контакты" />
          </div>

          <div className="space-y-1.5">
            <Label>Тип адресов</Label>
            <div className="flex gap-2 flex-wrap">
              {typeBtn('ALL', 'Все', Users)}
              {typeBtn('CORPORATE', 'Только корпоративные', Building2)}
              {typeBtn('FREE', 'Только бесплатные', Globe)}
            </div>
            <p className="text-[11.5px] text-ink-3">
              Корпоративные — адреса на собственном домене компании. Бесплатные — Gmail, ukr.net и подобные.
            </p>
          </div>

          <div className="space-y-1">
            <Label>Исключить домены</Label>
            <Input value={f.excludeDomains} onChange={(e) => set({ excludeDomains: e.target.value })}
              placeholder="gmail.com, ukr.net, i.ua" />
            <p className="text-[11.5px] text-ink-3">Через запятую. Эти домены не попадут в список.</p>
          </div>

          <div className="space-y-1">
            <Label>Только эти домены</Label>
            <Input value={f.includeDomains} onChange={(e) => set({ includeDomains: e.target.value })}
              placeholder="company.com, partner.ua" />
            <p className="text-[11.5px] text-ink-3">Если заполнено — оставить только адреса на указанных доменах.</p>
          </div>

          <div className="space-y-1">
            <Label>Исключить поддомены</Label>
            <Input value={f.excludeSubdomainsOf} onChange={(e) => set({ excludeSubdomainsOf: e.target.value })}
              placeholder="prom.ua" />
            <p className="text-[11.5px] text-ink-3">Исключит домен и все его поддомены (напр. prom.ua и *.prom.ua).</p>
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input type="checkbox" checked={f.requireWebsite} onChange={(e) => set({ requireWebsite: e.target.checked })}
              className="w-4 h-4 accent-[var(--accent)]" />
            <span className="text-[13px] text-ink-2">Только контакты с известным сайтом</span>
          </label>

          {/* Live preview */}
          <div className="rounded-[10px] border border-border bg-surface-2 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] text-ink-3 font-medium">Под фильтр попадает</span>
              {loadingPreview && <span className="text-[11px] text-ink-3">считаю…</span>}
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-[20px] font-extrabold font-mono text-brand">{formatNumber(preview?.total ?? 0)}</div>
                <div className="text-[11px] text-ink-3">всего</div>
              </div>
              <div>
                <div className="text-[20px] font-extrabold font-mono text-success">{formatNumber(preview?.corporate ?? 0)}</div>
                <div className="text-[11px] text-ink-3">корпоративных</div>
              </div>
              <div>
                <div className="text-[20px] font-extrabold font-mono text-ink-2">{formatNumber(preview?.free ?? 0)}</div>
                <div className="text-[11px] text-ink-3">бесплатных</div>
              </div>
            </div>
          </div>
        </div>

        <Button
          onClick={() => create.mutate()}
          disabled={!name.trim() || create.isPending || (preview?.total ?? 0) === 0}
          className="w-full"
        >
          {create.isPending ? 'Создаю…' : `Создать список (${formatNumber(preview?.total ?? 0)})`}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
