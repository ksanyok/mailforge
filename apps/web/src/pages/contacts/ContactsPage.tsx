import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Trash2 } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DataTable } from '@/components/data-table/DataTable';
import { contactsApi } from '@/api/contacts';
import { cn } from '@/utils/cn';
import { formatDate, STATUS_COLORS } from '@/utils/format';
import { toast } from '@/hooks/use-toast';

interface Contact {
  id: string; email: string; firstName?: string; lastName?: string;
  status: string; engagementScore: number; riskScore: number; createdAt: string;
}

const STATUSES = ['SUBSCRIBED', 'UNSUBSCRIBED', 'BOUNCED', 'COMPLAINED', 'SUPPRESSED'];

export function ContactsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['contacts', page, search],
    queryFn: () => contactsApi.findAll({ page, limit: 20, search }),
  });
  const result = data as { data: Contact[]; total: number } | undefined;

  const { register, handleSubmit, reset, setValue } = useForm<{
    email: string; firstName: string; lastName: string;
    phone: string; company: string; status: string;
  }>({ defaultValues: { status: 'SUBSCRIBED' } });

  const create = useMutation({
    mutationFn: (d: unknown) => contactsApi.create(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contacts'] });
      setAddOpen(false);
      reset();
      toast({ title: 'Contact added' });
    },
    onError: (err: any) => toast({ title: err?.response?.data?.message ?? 'Failed to add contact', variant: 'destructive' }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => contactsApi.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contacts'] }); toast({ title: 'Contact deleted' }); },
    onError: () => toast({ title: 'Failed to delete contact', variant: 'destructive' }),
  });

  const changeStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      contactsApi.update(id, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contacts'] }); toast({ title: 'Status updated' }); },
    onError: () => toast({ title: 'Failed to update status', variant: 'destructive' }),
  });

  const columns: ColumnDef<Contact>[] = [
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ row }) => (
        <button onClick={() => navigate(`/contacts/${row.original.id}`)} className="text-primary hover:underline text-left font-medium">
          {row.original.email}
        </button>
      ),
    },
    {
      id: 'name',
      header: 'Name',
      cell: ({ row }) => [row.original.firstName, row.original.lastName].filter(Boolean).join(' ') || '—',
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Select
          value={row.original.status}
          onValueChange={(val) => changeStatus.mutate({ id: row.original.id, status: val })}
        >
          <SelectTrigger className="h-7 w-36 text-xs border-0 p-0 focus:ring-0 shadow-none">
            <SelectValue>
              <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', STATUS_COLORS[row.original.status] ?? 'bg-gray-100')}>
                {row.original.status}
              </span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map(s => (
              <SelectItem key={s} value={s}>
                <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', STATUS_COLORS[s] ?? 'bg-gray-100')}>{s}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
    },
    {
      accessorKey: 'engagementScore',
      header: 'Engagement',
      cell: ({ getValue }) => {
        const v = getValue() as number;
        return <span className={cn('font-medium', v >= 70 ? 'text-green-600' : v >= 40 ? 'text-yellow-600' : 'text-red-600')}>{v}</span>;
      },
    },
    {
      accessorKey: 'createdAt',
      header: 'Created',
      cell: ({ getValue }) => formatDate(getValue() as string),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <Button
          size="sm" variant="ghost"
          className="text-destructive hover:bg-destructive/10 h-7 w-7 p-0"
          onClick={() => {
            if (confirm(`Delete ${row.original.email}?`)) remove.mutate(row.original.id);
          }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            className="pl-9"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />Add Contact
        </Button>
      </div>

      <DataTable
        data={result?.data ?? []}
        columns={columns}
        total={result?.total ?? 0}
        page={page}
        pageSize={20}
        onPageChange={setPage}
        isLoading={isLoading}
      />

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Contact</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit((d) => create.mutate(d))} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input type="email" {...register('email', { required: true })} placeholder="name@example.com" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>First Name</Label>
                <Input {...register('firstName')} />
              </div>
              <div className="space-y-1.5">
                <Label>Last Name</Label>
                <Input {...register('lastName')} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input {...register('phone')} />
              </div>
              <div className="space-y-1.5">
                <Label>Company</Label>
                <Input {...register('company')} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select defaultValue="SUBSCRIBED" onValueChange={(v) => setValue('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={create.isPending}>{create.isPending ? 'Adding…' : 'Add Contact'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
