import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle, XCircle, Clock, Loader2, FileText, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { importsApi } from '@/api/index';
import { formatDate } from '@/utils/format';

const STATUS_ICON: Record<string, React.ReactNode> = {
  COMPLETED: <CheckCircle className="h-4 w-4 text-green-600" />,
  FAILED:    <XCircle    className="h-4 w-4 text-red-600" />,
  PROCESSING:<Loader2   className="h-4 w-4 text-blue-600 animate-spin" />,
  PENDING:   <Clock      className="h-4 w-4 text-gray-400" />,
};

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  COMPLETED: 'default',
  FAILED: 'destructive',
  PROCESSING: 'secondary',
  PENDING: 'outline',
};

export function ImportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: imp } = useQuery({
    queryKey: ['import', id],
    queryFn: () => importsApi.findOne(id!),
    enabled: !!id,
    refetchInterval: (data) => {
      const status = (data as any)?.status;
      return status === 'PROCESSING' || status === 'PENDING' ? 2000 : false;
    },
  });

  const { data: errorsResp } = useQuery({
    queryKey: ['import-errors', id],
    queryFn: () => importsApi.errors(id!),
    enabled: !!id,
  });

  const i = imp as Record<string, unknown> | undefined;
  const errs = ((errorsResp as any)?.data ?? (Array.isArray(errorsResp) ? errorsResp : [])) as { rowNumber: number; email?: string; error: string }[];

  const totalRows = (i?.totalRows as number) ?? 0;
  const processedRows = (i?.processedRows as number) ?? 0;
  const successRows = (i?.successRows as number) ?? 0;
  const errorRows = (i?.errorRows as number) ?? 0;
  const pct = totalRows > 0 ? (processedRows / totalRows) * 100 : 0;
  const status = (i?.status as string) ?? '';

  return (
    <div className="space-y-4 max-w-2xl">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4 mr-2" />Назад к импортам
      </Button>

      {i && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div>
                  <CardTitle className="text-base">{i.filename as string}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">Начат {formatDate(i.createdAt as string)}</p>
                </div>
              </div>
              <Badge variant={STATUS_VARIANT[status] ?? 'outline'} className="flex items-center gap-1">
                {STATUS_ICON[status]}
                {status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Прогресс</span>
                <span>{processedRows} / {totalRows} строк</span>
              </div>
              <Progress value={pct} className="h-2" />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border p-3 text-center">
                <p className="text-2xl font-bold">{totalRows}</p>
                <p className="text-xs text-muted-foreground">Всего строк</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <p className="text-2xl font-bold text-green-600">{successRows}</p>
                <p className="text-xs text-muted-foreground">Импортировано</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <p className="text-2xl font-bold text-red-600">{errorRows}</p>
                <p className="text-xs text-muted-foreground">Ошибок</p>
              </div>
            </div>

            {i.list && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <List className="h-4 w-4" />
                Добавлено в список: <span className="font-medium text-foreground">{(i.list as any).name}</span>
              </div>
            )}

            {i.completedAt && (
              <p className="text-xs text-muted-foreground">Завершён {formatDate(i.completedAt as string)}</p>
            )}
          </CardContent>
        </Card>
      )}

      {errs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              Ошибки импорта ({errs.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-3 py-2 text-muted-foreground font-medium">Строка</th>
                    <th className="text-left px-3 py-2 text-muted-foreground font-medium">Email</th>
                    <th className="text-left px-3 py-2 text-muted-foreground font-medium">Ошибка</th>
                  </tr>
                </thead>
                <tbody>
                  {errs.slice(0, 100).map((e, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="px-3 py-2 text-muted-foreground">{e.rowNumber}</td>
                      <td className="px-3 py-2">{e.email ?? '—'}</td>
                      <td className="px-3 py-2 text-red-600">{e.error}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {errs.length > 100 && (
              <p className="text-xs text-muted-foreground mt-2">Показаны первые 100 из {errs.length} ошибок.</p>
            )}
          </CardContent>
        </Card>
      )}

      {i && status === 'COMPLETED' && errs.length === 0 && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
          <CheckCircle className="h-5 w-5 shrink-0" />
          <span>Все контакты ({successRows}) импортированы успешно, без ошибок.</span>
        </div>
      )}
    </div>
  );
}
