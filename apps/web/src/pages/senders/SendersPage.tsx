import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Wifi, RotateCcw } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { sendersApi } from '@/api/index';
import { cn } from '@/utils/cn';
import { healthBg, STATUS_COLORS } from '@/utils/format';
import { toast } from '@/hooks/use-toast';

interface Sender { id: string; name: string; fromEmail: string; smtpHost: string; status: string; healthScore: number; warmupEnabled: boolean; warmupStage: number; warmupCurrentDailyLimit: number; dailyLimit: number; totalSent: number; }

export function SendersPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data } = useQuery({ queryKey: ['senders'], queryFn: () => sendersApi.findAll() });
  const senders = ((data as any)?.data ?? []) as Sender[];

  const { register, handleSubmit, setValue, reset } = useForm<{
    name: string; fromName: string; fromEmail: string; smtpHost: string;
    smtpPort: number; smtpEncryption: string; smtpUser: string; smtpPassword: string;
    dailyLimit: number; warmupEnabled: boolean;
  }>({ defaultValues: { smtpPort: 587, smtpEncryption: 'TLS', dailyLimit: 500, warmupEnabled: true } });

  const create = useMutation({
    mutationFn: (d: unknown) => sendersApi.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['senders'] }); setOpen(false); reset(); toast({ title: 'Sender created' }); },
    onError: () => toast({ title: 'Failed to create sender', variant: 'destructive' }),
  });

  const test = useMutation({
    mutationFn: (id: string) => sendersApi.testConnection(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['senders'] }); toast({ title: 'Connection successful' }); },
    onError: (err: any) => {
      qc.invalidateQueries({ queryKey: ['senders'] });
      const msg = err?.response?.data?.message || 'Connection failed';
      toast({ title: msg, variant: 'destructive' });
    },
  });

  const reset = useMutation({
    mutationFn: (id: string) => sendersApi.resetStatus(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['senders'] }); toast({ title: 'Sender set to Active' }); },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Add Sender</Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader><DialogTitle>Add SMTP Sender</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit((d) => create.mutate(d))} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Account Name *</Label><Input {...register('name', { required: true })} /></div>
                <div className="space-y-1"><Label>From Name *</Label><Input {...register('fromName', { required: true })} /></div>
                <div className="space-y-1"><Label>From Email *</Label><Input type="email" {...register('fromEmail', { required: true })} /></div>
                <div className="space-y-1"><Label>SMTP Host *</Label><Input {...register('smtpHost', { required: true })} placeholder="smtp.example.com" /></div>
                <div className="space-y-1"><Label>Port</Label><Input type="number" {...register('smtpPort', { valueAsNumber: true })} /></div>
                <div className="space-y-1">
                  <Label>Encryption</Label>
                  <Select defaultValue="TLS" onValueChange={(v) => setValue('smtpEncryption', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TLS">TLS</SelectItem>
                      <SelectItem value="STARTTLS">STARTTLS</SelectItem>
                      <SelectItem value="NONE">None</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label>SMTP Username *</Label><Input {...register('smtpUser', { required: true })} /></div>
                <div className="space-y-1"><Label>SMTP Password *</Label><Input type="password" {...register('smtpPassword', { required: true })} /></div>
                <div className="space-y-1"><Label>Daily Limit</Label><Input type="number" {...register('dailyLimit', { valueAsNumber: true })} /></div>
              </div>
              <Button type="submit" disabled={create.isPending} className="w-full">Add Sender</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {senders.map((s) => (
          <Card key={s.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/senders/${s.id}`)}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{s.name}</CardTitle>
                <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', STATUS_COLORS[s.status] ?? 'bg-gray-100')}>{s.status}</span>
              </div>
              <p className="text-xs text-muted-foreground">{s.fromEmail}</p>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Health</span>
                <span className={cn('text-sm font-bold px-2 py-0.5 rounded', healthBg(s.healthScore))}>{s.healthScore}</span>
              </div>
              {s.warmupEnabled && (
                <p className="text-xs text-muted-foreground">Warmup Stage {s.warmupStage} — {s.warmupCurrentDailyLimit}/{s.dailyLimit}/day</p>
              )}
              <div className="flex gap-2">
                <Button
                  size="sm" variant="outline" className="flex-1"
                  onClick={(e) => { e.stopPropagation(); test.mutate(s.id); }}
                  disabled={test.isPending}
                >
                  <Wifi className="h-3.5 w-3.5 mr-1" />Test
                </Button>
                {s.status === 'ERROR' && (
                  <Button
                    size="sm" variant="outline"
                    className="text-yellow-700 border-yellow-300 hover:bg-yellow-50"
                    onClick={(e) => { e.stopPropagation(); reset.mutate(s.id); }}
                    disabled={reset.isPending}
                    title="Reset status to Active"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {senders.length === 0 && <div className="col-span-3 text-center py-12 text-muted-foreground">No senders configured yet.</div>}
      </div>
    </div>
  );
}
