import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/data-table/DataTable';
import { contactsApi } from '@/api/contacts';
import { cn } from '@/utils/cn';
import { formatDate, STATUS_COLORS } from '@/utils/format';

interface Contact {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  status: string;
  engagementScore: number;
  riskScore: number;
  createdAt: string;
}

export function ContactsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['contacts', page, search],
    queryFn: () => contactsApi.findAll({ page, limit: 20, search }),
  });

  const result = data as { items: Contact[]; total: number } | undefined;

  const columns: ColumnDef<Contact>[] = [
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ row }) => (
        <button onClick={() => navigate(`/contacts/${row.original.id}`)} className="text-primary hover:underline text-left">
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
      cell: ({ getValue }) => (
        <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', STATUS_COLORS[getValue() as string] ?? 'bg-gray-100')}>
          {getValue() as string}
        </span>
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
      accessorKey: 'riskScore',
      header: 'Risk',
      cell: ({ getValue }) => {
        const v = getValue() as number;
        return <span className={cn('font-medium', v <= 20 ? 'text-green-600' : v <= 50 ? 'text-yellow-600' : 'text-red-600')}>{v}</span>;
      },
    },
    {
      accessorKey: 'createdAt',
      header: 'Created',
      cell: ({ getValue }) => formatDate(getValue() as string),
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
        <Button onClick={() => navigate('/contacts/new')}>
          <Plus className="h-4 w-4 mr-2" />
          Add Contact
        </Button>
      </div>
      <DataTable
        data={result?.items ?? []}
        columns={columns}
        total={result?.total ?? 0}
        page={page}
        pageSize={20}
        onPageChange={setPage}
        isLoading={isLoading}
      />
    </div>
  );
}
