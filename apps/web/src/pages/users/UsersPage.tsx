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

const ROLE_LABELS: Record<string, string> = { ADMIN: 'Администратор', USER: 'Пользователь' };

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
      toast({ title: 'Пользователь успешно создан' });
    },
    onError: (err: any) => toast({ title: err?.response?.data?.message ?? 'Не удалось создать пользователя', variant: 'destructive' }),
  });

  const toggle = useMutation({
    mutationFn: (id: string) => usersApi.toggleActive(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast({ title: 'Пользователь обновлён' }); },
    onError: (err: any) => toast({ title: err?.response?.data?.message ?? 'Не удалось обновить пользователя', variant: 'destructive' }),
  });

  const columns: ColumnDef<User>[] = [
    {
      id: 'user',
      header: 'Пользователь',
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-sm">{row.original.name}</p>
          <p className="text-xs text-muted-foreground">{row.original.email}</p>
        </div>
      ),
    },
    {
      accessorKey: 'role',
      header: 'Роль',
      cell: ({ getValue }) => (
        <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium',
          getValue() === 'ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800',
        )}>
          {ROLE_LABELS[getValue() as string] ?? (getValue() as string)}
        </span>
      ),
    },
    {
      accessorKey: 'isActive',
      header: 'Статус',
      cell: ({ getValue }) => (
        <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', getValue() ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800')}>
          {getValue() ? 'Активен' : 'Неактивен'}
        </span>
      ),
    },
    { accessorKey: 'lastLoginAt', header: 'Последний вход', cell: ({ getValue }) => getValue() ? formatDate(getValue() as string) : 'Никогда' },
    { accessorKey: 'createdAt', header: 'Зарегистрирован', cell: ({ getValue }) => formatDate(getValue() as string) },
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
          {row.original.isActive ? 'Деактивировать' : 'Активировать'}
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Управление пользователями</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Управляйте участниками команды и их уровнями доступа</p>
        </div>
        <Button onClick={() => setInviteOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />Пригласить пользователя
        </Button>
      </div>

      <DataTable data={result?.data ?? []} columns={columns} total={result?.total ?? 0} page={page} pageSize={20} onPageChange={setPage} isLoading={isLoading} />

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Пригласить пользователя</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit((d) => invite.mutate(d))} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Полное имя *</Label>
              <Input {...register('name', { required: true })} placeholder="Иван Иванов" />
            </div>
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input type="email" {...register('email', { required: true })} placeholder="john@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Временный пароль *</Label>
              <Input type="password" {...register('password', { required: true, minLength: 6 })} placeholder="Не менее 6 символов" />
              <p className="text-xs text-muted-foreground">Пользователь сможет изменить его после первого входа</p>
            </div>
            <div className="space-y-1.5">
              <Label>Роль</Label>
              <Select defaultValue="USER" onValueChange={(v) => setValue('role', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USER">Пользователь — стандартный доступ</SelectItem>
                  <SelectItem value="ADMIN">Администратор — полный доступ</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => { setInviteOpen(false); reset(); }}>Отмена</Button>
              <Button type="submit" disabled={invite.isPending}>{invite.isPending ? 'Создание…' : 'Создать пользователя'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
