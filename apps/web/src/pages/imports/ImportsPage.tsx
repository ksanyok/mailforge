import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, Info, X, ChevronDown, ChevronUp, Plus } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/data-table/DataTable';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { importsApi, listsApi } from '@/api/index';
import { formatDate } from '@/utils/format';
import { cn } from '@/utils/cn';
import { toast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';

interface Import {
  id: string; filename: string; status: string;
  totalRows: number; processedRows: number; successRows: number; errorRows: number;
  createdAt: string;
  list?: { id: string; name: string };
}

const STATUS_BADGE: Record<string, string> = {
  COMPLETED: 'bg-success-soft text-success',
  FAILED: 'bg-danger-soft text-danger',
  PROCESSING: 'bg-info-soft text-info',
  PENDING: 'bg-surface-3 text-ink-2',
};

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
  const [newListName, setNewListName] = useState<string>('');
  const [creatingList, setCreatingList] = useState(false);
  const [dedupeRule, setDedupeRule] = useState<string>('SKIP');
  const [showHints, setShowHints] = useState(false);

  const { data } = useQuery({ queryKey: ['imports', page], queryFn: () => importsApi.findAll({ page, limit: 20 }) });
  const { data: listsData } = useQuery({ queryKey: ['lists'], queryFn: () => listsApi.findAll({ limit: 100 }) });

  const result = data as { data: Import[]; total: number } | undefined;
  const lists = ((listsData as any)?.data ?? []) as { id: string; name: string; contactCount: number }[];

  const createList = useMutation({
    mutationFn: (name: string) => listsApi.create({ name }),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ['lists'] });
      setListId(res.id);
      setNewListName('');
      setCreatingList(false);
      toast({ title: `Список «${res.name}» создан` });
    },
    onError: () => toast({ title: 'Не удалось создать список', variant: 'destructive' }),
  });

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
      toast({ title: 'Импорт запущен', description: 'Обработка идёт в фоне. Следите за прогрессом импорта ниже.' });
      navigate(`/imports/${(result as any).id}`);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'Не удалось загрузить. Проверьте формат файла.';
      toast({ title: 'Не удалось загрузить', description: msg, variant: 'destructive' });
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
      header: 'Файл',
      cell: ({ row }) => (
        <button onClick={() => navigate(`/imports/${row.original.id}`)} className="flex items-center gap-2 text-brand hover:underline text-left">
          <FileText className="h-4 w-4 shrink-0" strokeWidth={1.7} />
          <span className="truncate max-w-48">{row.original.filename}</span>
        </button>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Статус',
      cell: ({ getValue }) => (
        <span className={cn('px-2 py-0.5 rounded text-[10.5px] font-semibold', STATUS_BADGE[getValue() as string] ?? 'bg-surface-3 text-ink-2')}>
          {getValue() as string}
        </span>
      ),
    },
    {
      id: 'list',
      header: 'Список',
      cell: ({ row }) => row.original.list?.name
        ? <span className="text-xs bg-surface-3 text-ink-2 px-2 py-0.5 rounded">{row.original.list.name}</span>
        : <span className="text-xs text-ink-3">—</span>,
    },
    {
      id: 'progress',
      header: 'Прогресс',
      cell: ({ row }) => {
        const { totalRows, processedRows, successRows, errorRows } = row.original;
        const pct = totalRows > 0 ? (processedRows / totalRows) * 100 : 0;
        return (
          <div className="space-y-1 min-w-36">
            <Progress value={pct} className="h-1.5" />
            <p className="text-xs text-ink-3">
              <span className="text-success font-mono">{successRows}</span> успешно
              {errorRows > 0 && <> / <span className="text-danger font-mono">{errorRows}</span> ошибок</>}
              {' '}из <span className="font-mono">{totalRows}</span>
            </p>
          </div>
        );
      },
    },
    { accessorKey: 'createdAt', header: 'Дата', cell: ({ getValue }) => formatDate(getValue() as string) },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[22px] font-extrabold tracking-[-0.4px]">Импорт контактов</h1>
        <p className="text-[13px] text-ink-3 mt-1">Загрузите файл CSV, XLSX, JSON или TXT, чтобы добавить контакты массово</p>
      </div>

      {/* Upload card */}
      <div className="rounded-xl border border-border bg-surface p-6 space-y-4 shadow-soft">
        {/* Drop zone */}
        <div
          className={cn(
            'border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer',
            isDragging ? 'border-brand bg-brand-softer' : 'border-border-2 hover:border-brand/50',
            selectedFile && 'border-success bg-success-soft',
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
              <FileText className="h-8 w-8 text-success" strokeWidth={1.7} />
              <div className="text-left">
                <p className="font-medium text-sm">{selectedFile.name}</p>
                <p className="text-xs text-ink-3 font-mono">{(selectedFile.size / 1024).toFixed(1)} KB</p>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                className="ml-2 text-ink-3 hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <>
              <Upload className="h-10 w-10 mx-auto mb-3 text-ink-3" strokeWidth={1.7} />
              <p className="text-sm font-medium mb-1">Перетащите файл сюда или нажмите для выбора</p>
              <p className="text-xs text-ink-3">CSV, XLSX, JSON, TXT — до 50 МБ</p>
            </>
          )}
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.json,.txt" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        </div>

        {/* Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Добавить в список (необязательно)</Label>
            {creatingList ? (
              <div className="flex gap-2">
                <Input
                  autoFocus
                  placeholder="Название нового списка…"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newListName.trim()) createList.mutate(newListName.trim());
                    if (e.key === 'Escape') { setCreatingList(false); setNewListName(''); }
                  }}
                  className="flex-1"
                />
                <Button
                  type="button"
                  size="sm"
                  disabled={!newListName.trim() || createList.isPending}
                  onClick={() => newListName.trim() && createList.mutate(newListName.trim())}
                >
                  {createList.isPending ? '…' : 'Создать'}
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => { setCreatingList(false); setNewListName(''); }}>
                  Отмена
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Select value={listId} onValueChange={setListId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="— Без списка —" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Без списка —</SelectItem>
                    {lists.map((l) => (
                      <SelectItem key={l.id} value={l.id}>{l.name} ({l.contactCount})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" size="sm" variant="outline" onClick={() => setCreatingList(true)} title="Создать новый список">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )}
            <p className="text-xs text-ink-3">Выберите существующий список или создайте новый, чтобы сгруппировать импортированные контакты</p>
          </div>

          <div className="space-y-1.5">
            <Label>Обработка дубликатов</Label>
            <Select value={dedupeRule} onValueChange={setDedupeRule}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SKIP">Пропускать дубликаты — сохранить существующие данные</SelectItem>
                <SelectItem value="UPDATE">Обновлять дубликаты — перезаписать новыми данными</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-ink-3">Что делать, если email уже есть в базе данных</p>
          </div>
        </div>

        <Button onClick={startImport} disabled={!selectedFile || upload.isPending} className="w-full sm:w-auto gap-2">
          <Upload className="h-4 w-4" />
          {upload.isPending ? 'Загрузка…' : 'Начать импорт'}
        </Button>
      </div>

      {/* Column hints */}
      <div className="rounded-xl border border-border bg-surface-2">
        <button
          type="button"
          className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium"
          onClick={() => setShowHints((v) => !v)}
        >
          <span className="flex items-center gap-2">
            <Info className="h-4 w-4 text-brand" strokeWidth={1.7} />
            Ожидаемые названия столбцов в файле
          </span>
          {showHints ? <ChevronUp className="h-4 w-4 text-ink-3" /> : <ChevronDown className="h-4 w-4 text-ink-3" />}
        </button>
        {showHints && (
          <div className="px-4 pb-4">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-ink-3">
                  <th className="text-left py-1 font-medium">Поле</th>
                  <th className="text-left py-1 font-medium">Допустимые названия столбцов</th>
                  <th className="text-left py-1 font-medium">Обязательно</th>
                </tr>
              </thead>
              <tbody>
                {COLUMN_HINTS.map((h) => (
                  <tr key={h.field} className="border-t border-border">
                    <td className="py-1.5 font-mono font-medium text-brand">{h.field}</td>
                    <td className="py-1.5 text-ink-3">{h.aliases}</td>
                    <td className="py-1.5">{h.required ? <span className="text-danger font-medium">Да</span> : 'Нет'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-ink-3 mt-2">
              Названия столбцов не чувствительны к регистру. Все лишние столбцы сохраняются в пользовательских полях.
            </p>
          </div>
        )}
      </div>

      {/* History */}
      <div>
        <h2 className="text-[15px] font-bold mb-3">История импорта</h2>
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
