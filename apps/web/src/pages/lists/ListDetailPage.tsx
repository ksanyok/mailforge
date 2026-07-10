import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/data-table/DataTable';
import { listsApi, contactsApi } from '@/api/index';
import { formatDate, STATUS_COLORS } from '@/utils/format';
import { cn } from '@/utils/cn';
import { toast } from '@/hooks/use-toast';
import { useState } from 'react';

interface Member { contactId: string; contact: { email: string; status: string; firstName?: string; lastName?: string }; addedAt: string; }

export function ListDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);

  const verifyList = useMutation({
    mutationFn: () => contactsApi.verifyList(id!),
    onSuccess: (res: any) => {
      const r = res as { total: number; noMx: number; marked: number };
      toast({
        title: `Проверка завершена`,
        description: `Проверено контактов: ${r.total}. Найдено невалидных доменов: ${r.noMx}, помечено как «Отказ»: ${r.marked}.`,
      });
    },
    onError: () => toast({ title: 'Не удалось выполнить проверку', variant: 'destructive' }),
  });

  const { data: list } = useQuery({ queryKey: ['list', id], queryFn: () => listsApi.findOne(id!), enabled: !!id });
  const { data: members } = useQuery({ queryKey: ['list-members', id, page], queryFn: () => listsApi.members(id!, { page, limit: 20 }), enabled: !!id });

  const l = list as Record<string, unknown> | undefined;
  const m = members as { data: Member[]; total: number } | undefined;

  const columns: ColumnDef<Member>[] = [
    { accessorKey: 'contact.email', header: 'Email' },
    { id: 'name', header: 'Имя', cell: ({ row }) => [row.original.contact?.firstName, row.original.contact?.lastName].filter(Boolean).join(' ') || '—' },
    {
      accessorKey: 'contact.status', header: 'Статус',
      cell: ({ getValue }) => <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', STATUS_COLORS[getValue() as string] ?? 'bg-gray-100')}>{getValue() as string}</span>,
    },
    { accessorKey: 'addedAt', header: 'Добавлен', cell: ({ getValue }) => formatDate(getValue() as string) },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4 mr-2" />Назад</Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => verifyList.mutate()}
          disabled={verifyList.isPending || !id}
          className="text-indigo-700 border-indigo-300 hover:bg-indigo-50"
          title="Проверить MX-записи всех контактов в списке и пометить невалидные домены как «Отказ»"
        >
          <ShieldCheck className="h-4 w-4 mr-2" />
          {verifyList.isPending ? 'Проверка...' : 'Проверить MX-записи'}
        </Button>
      </div>
      {l && (
        <Card>
          <CardHeader>
            <CardTitle>{l.name as string}</CardTitle>
            {l.description && <p className="text-sm text-muted-foreground">{l.description as string}</p>}
          </CardHeader>
          <CardContent>
            <p className="text-sm"><span className="font-medium">{l.contactCount as number}</span> контактов</p>
          </CardContent>
        </Card>
      )}
      <DataTable data={m?.data ?? []} columns={columns} total={m?.total ?? 0} page={page} pageSize={20} onPageChange={setPage} />
    </div>
  );
}
