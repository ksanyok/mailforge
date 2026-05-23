import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, Info, X, ChevronDown, ChevronUp } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/data-table/DataTable';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { importsApi, listsApi } from '@/api/index';
import { formatDate, STATUS_COLORS } from '@/utils/format';
import { cn } from '@/utils/cn';
import { toast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';

interface Import {
  id: string; filename: string; status: string;
  totalRows: number; processedRows: number; successRows: number; errorRows: number;
  createdAt: string;
  list?: { id: string; name: string };
}

const COLUMN_HINTS = [
  { field: 'email',     aliases: 'email, e-mail, mail',         required: true  },
  { field: 'firstName', aliases: 'firstName, first_name, name', required: false },
  { field: 'lastName',  aliases: 'lastName, last_name, surname', required: false },
  { field: 'phone',     aliases: 'phone, tel, telephone',        required: false },
  { field: 'company',   aliases: 'company, org, organization',   required: false },
];

export function ImportsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [page, setPage] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [listId, setListId] = useState<string>('');
  const [dedupeRule, setDedupeRule] = useState<string>('SKIP');
  const [showHints, setShowHints] = useState(false);

  const { data } = useQuery({ queryKey: ['imports', page], queryFn: () => importsApi.findAll({ page, limit: 20 }) });
  const { data: listsData } = useQuery({ queryKey: ['lists'], queryFn: () => listsApi.findAll({ limit: 100 }) });

  const result = data as { data: Import[]; total: number } | undefined;
  const lists = ((listsData as any)?.data ?? []) as { id: string; name: string; contactCount: number }[];

  const upload = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      if (listId && listId !== '__none__') fd.append('listId', listId);
      fd.append('dedupeRule', dedupeRule);
      return importsApi.upload(fd);
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['imports'] });
      setSelectedFile(null);
      toast({ title: 'Import started', description: 'Processing in the background. Check the import below for progress.' });
      navigate(`/imports/${(result as any).id}`);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'Upload failed. Check file format.';
      toast({ title: 'Upload failed', description: msg, variant: 'destructive' });
    },
  });

  const handleFile = (file: File) => setSelectedFile(file);

  const startImport = () => {
    if (!selectedFile) return;
    upload.mutate(selectedFile);
  };

  const columns: ColumnDef<Import>[] = [
    {
      accessorKey: 'filename',
      header: 'File',
      cell: ({ row }) => (
        <button onClick={() => navigate(`/imports/${row.original.id}`)} className="flex items-center gap-2 text-primary hover:underline text-left">
          <FileText className="h-4 w-4 shrink-0" />
          <span className="truncate max-w-48">{row.original.filename}</span>
        </button>
      ),
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
      id: 'list',
      header: 'List',
      cell: ({ row }) => row.original.list?.name
        ? <span className="text-xs bg-muted px-2 py-0.5 rounded">{row.original.list.name}</span>
        : <span className="text-xs text-muted-foreground">—</span>,
    },
    {
      id: 'progress',
      header: 'Progress',
      cell: ({ row }) => {
        const { totalRows, processedRows, successRows, errorRows } = row.original;
        const pct = totalRows > 0 ? (processedRows / totalRows) * 100 : 0;
        return (
          <div className="space-y-1 min-w-36">
            <Progress value={pct} className="h-1.5" />
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">{successRows} ok</span>
              {errorRows > 0 && <span className="text-red-600"> / {errorRows} err</span>}
              {' '}of {totalRows}
            </p>
          </div>
        );
      },
    },
    { accessorKey: 'createdAt', header: 'Date', cell: ({ getValue }) => formatDate(getValue() as string) },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Import Contacts</h1>
        <p className="text-sm text-muted-foreground mt-1">Upload a CSV, XLSX, JSON, or TXT file to add contacts in bulk</p>
      </div>

      {/* Upload card */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        {/* Drop zone */}
        <div
          className={cn(
            'border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer',
            isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50',
            selectedFile && 'border-green-400 bg-green-50',
          )}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault(); setIsDragging(false);
            const f = e.dataTransfer.files[0];
            if (f) handleFile(f);
          }}
          onClick={() => !selectedFile && fileRef.current?.click()}
        >
          {selectedFile ? (
            <div className="flex items-center justify-center gap-3">
              <FileText className="h-8 w-8 text-green-600" />
              <div className="text-left">
                <p className="font-medium text-sm">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">{(selectedFile.size / 1024).toFixed(1)} KB</p>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                className="ml-2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <>
              <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm font-medium mb-1">Drop a file here or click to browse</p>
              <p className="text-xs text-muted-foreground">CSV, XLSX, JSON, TXT — max 50 MB</p>
            </>
          )}
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.json,.txt" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        </div>

        {/* Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Add to list (optional)</Label>
            <Select value={listId} onValueChange={setListId}>
              <SelectTrigger>
                <SelectValue placeholder="— No list —" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— No list —</SelectItem>
                {lists.map((l) => (
                  <SelectItem key={l.id} value={l.id}>{l.name} ({l.contactCount} contacts)</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Imported contacts will be automatically added to this list</p>
          </div>

          <div className="space-y-1.5">
            <Label>Duplicate handling</Label>
            <Select value={dedupeRule} onValueChange={setDedupeRule}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SKIP">Skip duplicates — keep existing data</SelectItem>
                <SelectItem value="UPDATE">Update duplicates — overwrite with new data</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">What to do when an email already exists in the database</p>
          </div>
        </div>

        <Button onClick={startImport} disabled={!selectedFile || upload.isPending} className="w-full sm:w-auto gap-2">
          <Upload className="h-4 w-4" />
          {upload.isPending ? 'Uploading…' : 'Start Import'}
        </Button>
      </div>

      {/* Column hints */}
      <div className="rounded-lg border bg-muted/30">
        <button
          type="button"
          className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium"
          onClick={() => setShowHints((v) => !v)}
        >
          <span className="flex items-center gap-2">
            <Info className="h-4 w-4 text-primary" />
            Expected column names in your file
          </span>
          {showHints ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {showHints && (
          <div className="px-4 pb-4">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted-foreground">
                  <th className="text-left py-1 font-medium">Field</th>
                  <th className="text-left py-1 font-medium">Accepted column names</th>
                  <th className="text-left py-1 font-medium">Required</th>
                </tr>
              </thead>
              <tbody>
                {COLUMN_HINTS.map((h) => (
                  <tr key={h.field} className="border-t">
                    <td className="py-1.5 font-mono font-medium">{h.field}</td>
                    <td className="py-1.5 text-muted-foreground">{h.aliases}</td>
                    <td className="py-1.5">{h.required ? <span className="text-red-600 font-medium">Yes</span> : 'No'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-muted-foreground mt-2">
              Column names are case-insensitive. Any extra columns are stored in custom fields.
            </p>
          </div>
        )}
      </div>

      {/* History */}
      <div>
        <h2 className="text-base font-semibold mb-3">Import History</h2>
        <DataTable
          data={result?.data ?? []}
          columns={columns}
          total={result?.total ?? 0}
          page={page}
          pageSize={20}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
