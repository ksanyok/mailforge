import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { importsApi } from '@/api/index';
import { formatDate, STATUS_COLORS } from '@/utils/format';
import { cn } from '@/utils/cn';

export function ImportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: imp } = useQuery({ queryKey: ['import', id], queryFn: () => importsApi.findOne(id!), enabled: !!id });
  const { data: errors } = useQuery({ queryKey: ['import-errors', id], queryFn: () => importsApi.errors(id!), enabled: !!id });

  const i = imp as Record<string, unknown> | undefined;
  const errs = errors as { rowNumber: number; email?: string; error: string }[] | undefined;

  return (
    <div className="space-y-4 max-w-2xl">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4 mr-2" />Back</Button>
      {i && (
        <Card>
          <CardHeader>
            <CardTitle>{i.filename as string}</CardTitle>
            <span className={cn('w-fit px-2 py-0.5 rounded-full text-xs font-medium', STATUS_COLORS[i.status as string] ?? 'bg-gray-100')}>{i.status as string}</span>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={i.totalRows as number > 0 ? ((i.processedRows as number) / (i.totalRows as number)) * 100 : 0} />
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div><p className="text-muted-foreground">Total</p><p className="font-medium">{i.totalRows as number}</p></div>
              <div><p className="text-muted-foreground">Success</p><p className="font-medium text-green-600">{i.successRows as number}</p></div>
              <div><p className="text-muted-foreground">Errors</p><p className="font-medium text-red-600">{i.errorRows as number}</p></div>
            </div>
            <p className="text-xs text-muted-foreground">Started {formatDate(i.createdAt as string)}</p>
          </CardContent>
        </Card>
      )}
      {errs && errs.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Import Errors ({errs.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2 text-xs">
              {errs.slice(0, 50).map((e, i) => (
                <div key={i} className="flex gap-3 border-b pb-2">
                  <span className="text-muted-foreground w-16">Row {e.rowNumber}</span>
                  {e.email && <span className="text-muted-foreground w-48">{e.email}</span>}
                  <span className="text-red-600">{e.error}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
