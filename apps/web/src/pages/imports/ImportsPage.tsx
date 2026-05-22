import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/data-table/DataTable';
import { importsApi } from '@/api/index';
import { formatDate, STATUS_COLORS } from '@/utils/format';
import { cn } from '@/utils/cn';
import { toast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';

interface Import { id: string; filename: string; status: string; totalRows: number; processedRows: number; successRows: number; errorRows: number; createdAt: string; }

export function ImportsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [page, setPage] = useState(1);
  const [isDragging, setIsDragging] = useState(false);

  const { data } = useQuery({ queryKey: ['imports', page], queryFn: () => importsApi.findAll({ page, limit: 20 }) });
  const result = data as { items: Import[]; total: number } | undefined;

  const upload = useMutation({
    mutationFn: (file: File) => { const fd = new FormData(); fd.append('file', file); return importsApi.upload(fd); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['imports'] }); toast({ title: 'Import started', description: 'Processing in background' }); },
    onError: () => toast({ title: 'Upload failed', variant: 'destructive' }),
  });

  const handleFile = (file: File) => upload.mutate(file);

  const columns: ColumnDef<Import>[] = [
    {
      accessorKey: 'filename',
      header: 'File',
      cell: ({ row }) => (
        <button onClick={() => navigate(`/imports/${row.original.id}`)} className="flex items-center gap-2 text-primary hover:underline">
          <FileText className="h-4 w-4" />{row.original.filename}
        </button>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ getValue }) => <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', STATUS_COLORS[getValue() as string] ?? 'bg-gray-100')}>{getValue() as string}</span>,
    },
    {
      id: 'progress',
      header: 'Progress',
      cell: ({ row }) => {
        const { totalRows, processedRows, successRows, errorRows } = row.original;
        const pct = totalRows > 0 ? (processedRows / totalRows) * 100 : 0;
        return (
          <div className="space-y-1 min-w-32">
            <Progress value={pct} className="h-1.5" />
            <p className="text-xs text-muted-foreground">{successRows} ok / {errorRows} errors</p>
          </div>
        );
      },
    },
    { accessorKey: 'createdAt', header: 'Date', cell: ({ getValue }) => formatDate(getValue() as string) },
  ];

  return (
    <div className="space-y-4">
      <div
        className={cn('border-2 border-dashed rounded-lg p-8 text-center transition-colors', isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/20')}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
      >
        <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
        <p className="text-sm font-medium mb-1">Drop a file here or</p>
        <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={upload.isPending}>
          {upload.isPending ? 'Uploading...' : 'Browse files'}
        </Button>
        <p className="text-xs text-muted-foreground mt-2">CSV, XLSX, JSON, TXT — max 50MB</p>
        <input ref={fileRef} type="file" accept=".csv,.xlsx,.json,.txt" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
      </div>
      <DataTable data={result?.items ?? []} columns={columns} total={result?.total ?? 0} page={page} pageSize={20} onPageChange={setPage} />
    </div>
  );
}
