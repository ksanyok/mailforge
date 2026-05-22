import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, List } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { listsApi } from '@/api/index';
import { formatDate, formatNumber } from '@/utils/format';
import { toast } from '@/hooks/use-toast';
import { useState } from 'react';

interface ContactList { id: string; name: string; description?: string; contactCount: number; createdAt: string; }

export function ListsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data } = useQuery({ queryKey: ['lists'], queryFn: () => listsApi.findAll() });
  const lists = ((data as any)?.data ?? []) as ContactList[];

  const { register, handleSubmit, reset } = useForm<{ name: string; description: string }>();

  const create = useMutation({
    mutationFn: (d: { name: string; description: string }) => listsApi.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['lists'] }); setOpen(false); reset(); toast({ title: 'List created' }); },
  });

  const remove = useMutation({
    mutationFn: (id: string) => listsApi.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['lists'] }); toast({ title: 'List deleted' }); },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />New List</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Contact List</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit((d) => create.mutate(d))} className="space-y-4">
              <div className="space-y-1">
                <Label>Name</Label>
                <Input {...register('name', { required: true })} placeholder="Newsletter subscribers" />
              </div>
              <div className="space-y-1">
                <Label>Description</Label>
                <Input {...register('description')} placeholder="Optional description" />
              </div>
              <Button type="submit" disabled={create.isPending} className="w-full">Create</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {lists.map((list) => (
          <Card key={list.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/lists/${list.id}`)}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <List className="h-4 w-4 text-primary" />
                {list.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {list.description && <p className="text-sm text-muted-foreground mb-2">{list.description}</p>}
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{formatNumber(list.contactCount)} contacts</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{formatDate(list.createdAt)}</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); remove.mutate(list.id); }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {lists.length === 0 && (
          <div className="col-span-3 text-center py-12 text-muted-foreground">No lists yet. Create your first one.</div>
        )}
      </div>
    </div>
  );
}
