import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Wifi, RotateCcw, Trash2, Server, AlertTriangle } from 'lucide-react';
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

interface Sender {
  id: string; name: string; fromEmail: string; smtpHost: string;
  status: string; healthScore: number; warmupEnabled: boolean;
  warmupStage: number; warmupCurrentDailyLimit: number; dailyLimit: number; totalSent: number;
}

export function SendersPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [mailboxSender, setMailboxSender] = useState<Sender | null>(null);
  const [mailboxPassword, setMailboxPassword] = useState('');
  const [deleteFiles, setDeleteFiles] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const { data } = useQuery({ queryKey: ['senders'], queryFn: () => sendersApi.findAll() });
  const senders = ((data as any)?.data ?? []) as Sender[];

  const { register, handleSubmit, setValue, reset } = useForm<{
    name: string; fromName: string; fromEmail: string; smtpHost: string;
    smtpPort: number; smtpEncryption: string; smtpUser: string; smtpPassword: string;
    dailyLimit: number; warmupEnabled: boolean;
  }>({ defaultValues: { smtpPort: 587, smtpEncryption: 'STARTTLS', dailyLimit: 500, warmupEnabled: true } });

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

  const remove = useMutation({
    mutationFn: (id: string) => sendersApi.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['senders'] }); toast({ title: 'Sender deleted' }); },
    onError: () => toast({ title: 'Failed to delete sender', variant: 'destructive' }),
  });

  const resetStatus = useMutation({
    mutationFn: (id: string) => sendersApi.resetStatus(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['senders'] }); toast({ title: 'Sender set to Active' }); },
  });

  const provisionMailbox = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      sendersApi.provisionMailbox(id, password),
    onSuccess: (res: any) => {
      toast({ title: res?.message ?? 'Mailbox created successfully' });
      setMailboxSender(null);
      setMailboxPassword('');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'Failed to create mailbox';
      toast({ title: msg, variant: 'destructive' });
    },
  });

  const removeMailbox = useMutation({
    mutationFn: ({ id, deleteFiles }: { id: string; deleteFiles: boolean }) =>
      sendersApi.removeMailbox(id, deleteFiles),
    onSuccess: (res: any) => {
      toast({ title: res?.message ?? 'Mailbox removed' });
      setMailboxSender(null);
      setDeleteFiles(false);
      setDeleteConfirm(false);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'Failed to remove mailbox';
      toast({ title: msg, variant: 'destructive' });
    },
  });

  const closeMailboxDialog = () => {
    setMailboxSender(null);
    setMailboxPassword('');
    setDeleteFiles(false);
    setDeleteConfirm(false);
  };

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
                <div className="space-y-1"><Label>SMTP Host *</Label><Input {...register('smtpHost', { required: true })} placeholder="mail.yourdomain.com" /></div>
                <div className="space-y-1"><Label>Port</Label><Input type="number" {...register('smtpPort', { valueAsNumber: true })} /></div>
                <div className="space-y-1">
                  <Label>Encryption</Label>
                  <Select defaultValue="STARTTLS" onValueChange={(v) => setValue('smtpEncryption', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TLS">TLS (port 465)</SelectItem>
                      <SelectItem value="STARTTLS">STARTTLS (port 587)</SelectItem>
                      <SelectItem value="NONE">None</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label>SMTP Username *</Label><Input {...register('smtpUser', { required: true })} /></div>
                <div className="space-y-1"><Label>SMTP Password *</Label><Input type="password" {...register('smtpPassword', { required: true })} /></div>
                <div className="space-y-1"><Label>Daily Limit</Label><Input type="number" {...register('dailyLimit', { valueAsNumber: true })} /></div>
              </div>
              <p className="text-xs text-muted-foreground">
                For <strong>@senior-dev.cloud</strong> senders, the mailbox is created on the server automatically. For external SMTP providers, no provisioning is needed.
              </p>
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
              <div className="flex gap-2 flex-wrap">
                <Button
                  size="sm" variant="outline" className="flex-1"
                  onClick={(e) => { e.stopPropagation(); test.mutate(s.id); }}
                  disabled={test.isPending}
                  title="Test SMTP connection"
                >
                  <Wifi className="h-3.5 w-3.5 mr-1" />Test
                </Button>
                <Button
                  size="sm" variant="outline"
                  className="text-indigo-700 border-indigo-300 hover:bg-indigo-50"
                  onClick={(e) => { e.stopPropagation(); setMailboxSender(s); setDeleteConfirm(false); }}
                  title="Manage server mailbox"
                >
                  <Server className="h-3.5 w-3.5" />
                </Button>
                {s.status === 'ERROR' && (
                  <Button
                    size="sm" variant="outline"
                    className="text-yellow-700 border-yellow-300 hover:bg-yellow-50"
                    onClick={(e) => { e.stopPropagation(); resetStatus.mutate(s.id); }}
                    disabled={resetStatus.isPending}
                    title="Reset status to Active"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button
                  size="sm" variant="ghost"
                  className="text-destructive hover:bg-destructive/10"
                  onClick={(e) => { e.stopPropagation(); if (confirm(`Delete sender "${s.name}"?`)) remove.mutate(s.id); }}
                  disabled={remove.isPending}
                  title="Delete sender"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {senders.length === 0 && <div className="col-span-3 text-center py-12 text-muted-foreground">No senders configured yet.</div>}
      </div>

      {/* Mailbox management dialog */}
      <Dialog open={!!mailboxSender} onOpenChange={(o) => { if (!o) closeMailboxDialog(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Server className="h-4 w-4 text-indigo-600" />
              Server Mailbox — {mailboxSender?.fromEmail}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Create / Update section */}
            <div className="rounded-lg border p-4 space-y-3">
              <div>
                <p className="text-sm font-medium">Create / Update Mailbox</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Creates the mailbox on the server (Dovecot + Postfix). If it already exists, updates the password.
                </p>
              </div>
              <div className="space-y-1">
                <Label>Mailbox Password</Label>
                <Input
                  type="password"
                  value={mailboxPassword}
                  onChange={(e) => setMailboxPassword(e.target.value)}
                  placeholder="Enter mailbox password"
                />
              </div>
              <Button
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                disabled={!mailboxPassword || provisionMailbox.isPending}
                onClick={() => {
                  if (mailboxSender) {
                    provisionMailbox.mutate({ id: mailboxSender.id, password: mailboxPassword });
                  }
                }}
              >
                {provisionMailbox.isPending ? 'Creating…' : 'Create Mailbox on Server'}
              </Button>
            </div>

            {/* Delete section */}
            <div className="rounded-lg border border-red-200 bg-red-50/40 p-4 space-y-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-700">Remove Mailbox</p>
                  <p className="text-xs text-red-600 mt-0.5">
                    Removes the mailbox from Dovecot and Postfix config. Emails already received can optionally be deleted.
                  </p>
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={deleteFiles}
                  onChange={(e) => setDeleteFiles(e.target.checked)}
                  className="accent-red-600"
                />
                <span className="text-red-700">Also delete all email files (permanent)</span>
              </label>
              {!deleteConfirm ? (
                <Button
                  variant="outline"
                  className="w-full text-red-600 border-red-300 hover:bg-red-50"
                  onClick={() => setDeleteConfirm(true)}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />Remove Mailbox
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    className="flex-1"
                    disabled={removeMailbox.isPending}
                    onClick={() => {
                      if (mailboxSender) {
                        removeMailbox.mutate({ id: mailboxSender.id, deleteFiles });
                      }
                    }}
                  >
                    {removeMailbox.isPending ? 'Removing…' : 'Confirm Remove'}
                  </Button>
                  <Button variant="ghost" onClick={() => setDeleteConfirm(false)}>Cancel</Button>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
