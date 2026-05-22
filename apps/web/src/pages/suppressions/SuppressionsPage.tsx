import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import type { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DataTable } from '@/components/data-table/DataTable';
import { suppressionsApi } from '@/api/index';
import { formatDate, STATUS_COLORS } from '@/utils/format';
import { cn } from '@/utils/cn';
import { toast } from '@/hooks/use-toast';

interface Suppression { id: string; email: string; reason: string; notes?: string; createdAt: string; }

export function SuppressionsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({ queryKey: ['suppressions', page], queryFn: () => suppressionsApi.findAll({ page, limit: 20 }) });
  const result = data as { items: Suppression[]; total: number } | undefined;
  const { register, handleSubmit, setValue, reset } = useForm<{ email: string; reason: string; notes: string }>();

  const create = useMutation({
    mutationFn: (d: unknown) => suppressionsApi.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['suppressions'] }); setOpen(false); reset(); toast({ title: 'Email suppressed' }); },
  });

  const remove = useMutation({
    mutationFn: (id: string) => suppressionsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suppressions'] }),
  });

  const columns: ColumnDef<Suppression>[] = [
    { accessorKey: 'email', header: 'Email' },
    {
      accessorKey: 'reason', header: 'Reason',
      cell: ({ getValue }) => <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', 'bg-red-100 text-red-800')}>{getValue() as string}</span>,
    },
    { accessorKey: 'notes', header: 'Notes', cell: ({ getValue }) => (getValue() as string) || '—' },
    { accessorKey: 'createdAt', header: 'Suppressed', cell: ({ getValue }) => formatDate(getValue() as string) },
    {
      id: 'actions', header: '',
      cell: ({ row }) => <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => remove.mutate(row.original.id)}><Trash2 className="h-3.5 w-3.5" /></Button>,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Add Suppression</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Suppress Email</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit((d) => create.mutate(d))} className="space-y-4">
              <div className="space-y-1"><Label>Email *</Label><Input type="email" {...register('email', { required: true })} /></div>
              <div className="space-y-1">
                <Label>Reason</Label>
                <Select defaultValue="MANUAL" onValueChange={(v) => setValue('reason', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MANUAL">Manual</SelectItem>
                    <SelectItem value="BOUNCE_HARD">Hard Bounce</SelectItem>
                    <SelectItem value="COMPLAINT">Complaint</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Notes</Label><Input {...register('notes')} /></div>
              <Button type="submit" disabled={create.isPending} className="w-full">Suppress</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <DataTable data={result?.items ?? []} columns={columns} total={result?.total ?? 0} page={page} pageSize={20} onPageChange={setPage} isLoading={isLoading} />
    </div>
  );
}
