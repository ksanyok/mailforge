import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Eye, Code2, Search, Tag } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { templatesApi } from '@/api/index';
import { formatDate } from '@/utils/format';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/utils/cn';
import { DEMO_TEMPLATES } from '@/utils/demoTemplates';

interface Template {
  id: string; name: string; category?: string; isSystem: boolean;
  variables: unknown; htmlContent?: string; createdAt: string;
}

const CATEGORIES = ['Все', 'newsletter', 'promotional', 'transactional', 'announcement'];

const STARTER_HTML = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f4f4f5">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px">
  <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden">
    <tr><td style="background:#6366f1;padding:32px;text-align:center">
      <h1 style="margin:0;color:#fff;font-size:24px">Заголовок письма</h1>
    </td></tr>
    <tr><td style="padding:32px">
      <p style="color:#374151;font-size:16px;line-height:1.7">Привет, {{firstName}}!</p>
      <p style="color:#374151;font-size:16px;line-height:1.7">Текст письма...</p>
      <p style="text-align:center;margin:28px 0">
        <a href="#" style="background:#6366f1;color:#fff;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:bold">Кнопка</a>
      </p>
    </td></tr>
    <tr><td style="background:#f9fafb;padding:20px;text-align:center;border-top:1px solid #e5e7eb">
      <p style="margin:0;color:#9ca3af;font-size:12px">
        <a href="{{unsubscribeUrl}}" style="color:#9ca3af">Отписаться</a>
      </p>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;

export function TemplatesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [previewTpl, setPreviewTpl] = useState<{ name: string; html: string } | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Все');
  const [editorMode, setEditorMode] = useState<'code' | 'preview'>('code');

  const { data } = useQuery({ queryKey: ['templates'], queryFn: () => templatesApi.findAll({ limit: 100 }) });
  const templates = ((data as any)?.data ?? []) as Template[];

  const { register, handleSubmit, watch, setValue, reset } = useForm<{
    name: string; category: string; htmlContent: string;
  }>({ defaultValues: { htmlContent: STARTER_HTML } });

  const htmlContent = watch('htmlContent') ?? '';

  const create = useMutation({
    mutationFn: (d: unknown) => templatesApi.create(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['templates'] });
      setOpen(false);
      reset({ htmlContent: STARTER_HTML });
      toast({ title: 'Шаблон создан' });
    },
    onError: () => toast({ title: 'Ошибка при создании', variant: 'destructive' }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => templatesApi.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['templates'] }); toast({ title: 'Шаблон удалён' }); },
    onError: () => toast({ title: 'Нельзя удалить системный шаблон', variant: 'destructive' }),
  });

  const allTemplates = [
    ...DEMO_TEMPLATES.map((d) => ({
      id: d.id,
      name: d.name,
      category: d.category,
      isSystem: true,
      variables: [],
      htmlContent: d.htmlContent,
      createdAt: '',
      description: d.description,
    })),
    ...templates,
  ];

  const filtered = allTemplates.filter((t) => {
    const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === 'Все' || t.category === category;
    return matchSearch && matchCat;
  });

  const vars = (t: Template): string[] => {
    const v = t.variables;
    if (Array.isArray(v)) return v.filter((x) => typeof x === 'string') as string[];
    if (typeof v === 'string') {
      try { const parsed = JSON.parse(v); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
    }
    return [];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Шаблоны писем</h1>
          <p className="text-sm text-muted-foreground mt-1">Готовые шаблоны для быстрого создания кампаний</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" />Новый шаблон</Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Создать шаблон</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit((d) => create.mutate(d))} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Название *</Label>
                  <Input {...register('name', { required: true })} placeholder="Например: Ежемесячный дайджест" />
                </div>
                <div className="space-y-1.5">
                  <Label>Категория</Label>
                  <Input {...register('category')} placeholder="newsletter, promotional, transactional…" />
                </div>
              </div>

              {/* Quick demo template picker */}
              <div className="space-y-1.5">
                <Label>Начать с готового шаблона</Label>
                <div className="flex gap-2 flex-wrap">
                  {DEMO_TEMPLATES.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => { setValue('htmlContent', d.htmlContent); setValue('name', d.name); setValue('category', d.category); }}
                      className="text-xs px-3 py-1.5 rounded-full border hover:border-primary hover:bg-primary/5 hover:text-primary transition-colors"
                    >
                      {d.name}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setValue('htmlContent', STARTER_HTML)}
                    className="text-xs px-3 py-1.5 rounded-full border border-dashed hover:border-primary hover:bg-primary/5 transition-colors"
                  >
                    Чистый шаблон
                  </button>
                </div>
              </div>

              <Tabs value={editorMode} onValueChange={(v) => setEditorMode(v as any)}>
                <TabsList>
                  <TabsTrigger value="code" className="gap-1.5"><Code2 className="h-3.5 w-3.5" />HTML-код</TabsTrigger>
                  <TabsTrigger value="preview" className="gap-1.5"><Eye className="h-3.5 w-3.5" />Превью</TabsTrigger>
                </TabsList>
                <TabsContent value="code">
                  <Textarea
                    {...register('htmlContent', { required: true })}
                    rows={16}
                    className="font-mono text-xs resize-y"
                    placeholder="HTML-код письма…"
                  />
                </TabsContent>
                <TabsContent value="preview">
                  <div className="border rounded-md overflow-hidden" style={{ height: 420 }}>
                    {htmlContent ? (
                      <iframe srcDoc={htmlContent} title="preview" className="w-full h-full" sandbox="allow-same-origin" />
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Нет контента для превью</div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Отмена</Button>
                <Button type="submit" disabled={create.isPending}>
                  {create.isPending ? 'Сохранение…' : 'Сохранить шаблон'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск шаблонов…"
            className="pl-9 w-60"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                category === c ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80',
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((t) => (
          <Card key={t.id} className="overflow-hidden flex flex-col hover:shadow-md transition-shadow">
            {/* Mini preview */}
            <div className="relative bg-muted/30 border-b overflow-hidden" style={{ height: 160 }}>
              {t.htmlContent ? (
                <iframe
                  srcDoc={t.htmlContent}
                  title={t.name}
                  className="w-full origin-top-left pointer-events-none"
                  style={{ transform: 'scale(0.4)', width: '250%', height: '400px', transformOrigin: '0 0' }}
                  sandbox="allow-same-origin"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-xs">Нет превью</div>
              )}
              {t.isSystem && (
                <div className="absolute top-2 left-2 bg-primary/90 text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                  Демо
                </div>
              )}
            </div>

            <CardContent className="flex-1 p-4">
              <h3 className="font-semibold text-sm">{t.name}</h3>
              {t.category && (
                <div className="flex items-center gap-1 mt-1">
                  <Tag className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{t.category}</span>
                </div>
              )}
              {vars(t).length > 0 && (
                <p className="text-xs text-muted-foreground mt-1.5">
                  Переменные: {vars(t).join(', ')}
                </p>
              )}
              {t.createdAt && (
                <p className="text-xs text-muted-foreground mt-1">{formatDate(t.createdAt)}</p>
              )}
            </CardContent>

            <CardFooter className="p-3 pt-0 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 gap-1"
                onClick={() => setPreviewTpl({ name: t.name, html: t.htmlContent ?? '' })}
              >
                <Eye className="h-3.5 w-3.5" />Открыть
              </Button>
              {!t.isSystem && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10"
                  onClick={() => remove.mutate(t.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-3 text-center py-16 text-muted-foreground">
            <Code2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Шаблоны не найдены</p>
            <p className="text-sm mt-1">Измени фильтры или создай новый шаблон</p>
          </div>
        )}
      </div>

      {/* Preview modal */}
      <Dialog open={!!previewTpl} onOpenChange={(o) => !o && setPreviewTpl(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{previewTpl?.name}</DialogTitle>
          </DialogHeader>
          <div className="border rounded-lg overflow-hidden" style={{ height: 560 }}>
            {previewTpl?.html && (
              <iframe srcDoc={previewTpl.html} title="preview" className="w-full h-full" sandbox="allow-same-origin" />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
