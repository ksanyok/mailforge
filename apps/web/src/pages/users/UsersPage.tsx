import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Plus, UserPlus } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DataTable } from '@/components/data-table/DataTable';
import { usersApi } from '@/api/index';
import { formatDate } from '@/utils/format';
import { cn } from '@/utils/cn';
import { toast } from '@/hooks/use-toast';

interface User { id: string; name: string; email: string; role: string; isActive: boolean; lastLoginAt?: string; createdAt: string; }

export function UsersPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [inviteOpen, setInviteOpen] = useState(false);
  const { data, isLoading } = useQuery({ queryKey: ['users', page], queryFn: () => usersApi.findAll({ page, limit: 20 }) });
  const result = data as { data: User[]; total: number } | undefined;

  const { register, handleSubmit, reset, setValue } = useForm<{
    name: string; email: string; password: string; role: string;
  }>({ defaultValues: { role: 'USER' } });

  const invite = useMutation({
    mutationFn: (d: { name: string; email: string; password: string; role: string }) => usersApi.invite(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      setInviteOpen(false);
      reset();
      toast({ title: 'User created successfully' });
    },
    onError: (err: any) => toast({ title: err?.response?.data?.message ?? 'Failed to create user', variant: 'destructive' }),
  });

  const toggle = useMutation({
    mutationFn: (id: string) => usersApi.toggleActive(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast({ title: 'User updated' }); },
    onError: (err: any) => toast({ title: err?.response?.data?.message ?? 'Failed to update user', variant: 'destructive' }),
  });

  const columns: ColumnDef<User>[] = [
    {
      id: 'user',
      header: 'User',
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-sm">{row.original.name}</p>
          <p className="text-xs text-muted-foreground">{row.original.email}</p>
        </div>
      ),
    },
    {
      accessorKey: 'role',
      header: 'Role',
      cell: ({ getValue }) => (
        <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium',
          getValue() === 'ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800',
        )}>
          {getValue() as string}
        </span>
      ),
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ getValue }) => (
        <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', getValue() ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800')}>
          {getValue() ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    { accessorKey: 'lastLoginAt', header: 'Last Login', cell: ({ getValue }) => getValue() ? formatDate(getValue() as string) : 'Never' },
    { accessorKey: 'createdAt', header: 'Joined', cell: ({ getValue }) => formatDate(getValue() as string) },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <Button
          variant="outline" size="sm"
          disabled={toggle.isPending}
          onClick={() => toggle.mutate(row.original.id)}
          className={row.original.isActive ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}
        >
          {row.original.isActive ? 'Deactivate' : 'Activate'}
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage team members and their access levels</p>
        </div>
        <Button onClick={() => setInviteOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />Invite User
        </Button>
      </div>

      <DataTable data={result?.data ?? []} columns={columns} total={result?.total ?? 0} page={page} pageSize={20} onPageChange={setPage} isLoading={isLoading} />

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Invite User</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit((d) => invite.mutate(d))} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Full Name *</Label>
              <Input {...register('name', { required: true })} placeholder="John Smith" />
            </div>
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input type="email" {...register('email', { required: true })} placeholder="john@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Temporary Password *</Label>
              <Input type="password" {...register('password', { required: true, minLength: 6 })} placeholder="Min. 6 characters" />
              <p className="text-xs text-muted-foreground">User can change it after first login</p>
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select defaultValue="USER" onValueChange={(v) => setValue('role', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USER">User — standard access</SelectItem>
                  <SelectItem value="ADMIN">Admin — full access</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => { setInviteOpen(false); reset(); }}>Cancel</Button>
              <Button type="submit" disabled={invite.isPending}>{invite.isPending ? 'Creating…' : 'Create User'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
