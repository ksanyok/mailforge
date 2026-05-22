import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, FileText } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { templatesApi } from '@/api/index';
import { formatDate } from '@/utils/format';
import { toast } from '@/hooks/use-toast';

interface Template { id: string; name: string; category?: string; isSystem: boolean; variables: string[]; createdAt: string; }

export function TemplatesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<Template | null>(null);
  const { data } = useQuery({ queryKey: ['templates'], queryFn: () => templatesApi.findAll() });
  const templates = ((data as any)?.data ?? []) as Template[];
  const { register, handleSubmit, reset } = useForm<{ name: string; category: string; htmlContent: string; textContent: string }>();

  const create = useMutation({
    mutationFn: (d: unknown) => templatesApi.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['templates'] }); setOpen(false); reset(); toast({ title: 'Template created' }); },
  });

  const remove = useMutation({
    mutationFn: (id: string) => templatesApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['templates'] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />New Template</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Create Template</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit((d) => create.mutate(d))} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Name *</Label>
                  <Input {...register('name', { required: true })} />
                </div>
                <div className="space-y-1">
                  <Label>Category</Label>
                  <Input {...register('category')} placeholder="newsletter, transactional..." />
                </div>
              </div>
              <div className="space-y-1">
                <Label>HTML Content *</Label>
                <Textarea {...register('htmlContent', { required: true })} rows={10} className="font-mono text-xs" />
              </div>
              <Button type="submit" disabled={create.isPending} className="w-full">Create</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((t) => (
          <Card key={t.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                {t.name}
              </CardTitle>
              {t.category && <p className="text-xs text-muted-foreground">{t.category}</p>}
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{formatDate(t.createdAt)}</span>
                {!t.isSystem && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => remove.mutate(t.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              {t.variables.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">Variables: {t.variables.join(', ')}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
