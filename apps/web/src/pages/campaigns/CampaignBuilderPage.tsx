import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { campaignsApi, sendersApi, listsApi } from '@/api/index';
import { toast } from '@/hooks/use-toast';

interface BuilderForm {
  name: string; subject: string; preheader: string;
  senderId: string; htmlContent: string; textContent: string;
  throttlePerMinute: number;
}

const STEPS = ['Basic Info', 'Sender', 'Recipients', 'Content', 'Review'];

export function CampaignBuilderPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [selectedLists, setSelectedLists] = useState<string[]>([]);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<BuilderForm>({
    defaultValues: { throttlePerMinute: 60 },
  });

  const { data: senders } = useQuery({ queryKey: ['senders'], queryFn: () => sendersApi.findAll() });
  const { data: listsData } = useQuery({ queryKey: ['lists'], queryFn: () => listsApi.findAll() });

  const sendersArr = ((senders as any)?.data ?? []) as { id: string; name: string; fromEmail: string }[];
  const listsArr = ((listsData as any)?.data ?? []) as { id: string; name: string; contactCount: number }[];

  const save = useMutation({
    mutationFn: (data: BuilderForm & { listIds: string[] }) =>
      id ? campaignsApi.update(id, data) : campaignsApi.create(data),
    onSuccess: (result) => {
      const camp = result as { id: string };
      toast({ title: id ? 'Campaign updated' : 'Campaign created' });
      navigate(`/campaigns/${camp.id}`);
    },
    onError: () => toast({ title: 'Save failed', variant: 'destructive' }),
  });

  const onSubmit = (data: BuilderForm) => {
    if (selectedLists.length === 0) { toast({ title: 'Select at least one list', variant: 'destructive' }); return; }
    save.mutate({ ...data, listIds: selectedLists });
  };

  const htmlContent = watch('htmlContent');

  return (
    <div className="max-w-3xl space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4 mr-2" />Back</Button>

      <div>
        <h2 className="text-xl font-semibold">{id ? 'Edit Campaign' : 'New Campaign'}</h2>
        <div className="flex gap-2 mt-3">
          {STEPS.map((s, i) => (
            <div key={s} className={`flex-1 h-1 rounded-full ${i <= step ? 'bg-primary' : 'bg-muted'}`} />
          ))}
        </div>
        <p className="text-sm text-muted-foreground mt-1">Step {step + 1} of {STEPS.length}: {STEPS[step]}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        {step === 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Basic Info</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label>Campaign Name *</Label>
                <Input {...register('name', { required: true })} placeholder="Monthly Newsletter" />
              </div>
              <div className="space-y-1">
                <Label>Subject Line *</Label>
                <Input {...register('subject', { required: true })} placeholder="Your subject here" />
              </div>
              <div className="space-y-1">
                <Label>Preheader</Label>
                <Input {...register('preheader')} placeholder="Preview text shown in inbox" />
              </div>
              <div className="space-y-1">
                <Label>Throttle (emails/min)</Label>
                <Input type="number" {...register('throttlePerMinute', { valueAsNumber: true })} />
              </div>
            </CardContent>
          </Card>
        )}

        {step === 1 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Select Sender</CardTitle></CardHeader>
            <CardContent>
              <Select onValueChange={(v) => setValue('senderId', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a sender account..." />
                </SelectTrigger>
                <SelectContent>
                  {sendersArr?.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name} ({s.fromEmail})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Select Recipient Lists</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {listsArr.map((list) => (
                <label key={list.id} className="flex items-center gap-3 p-3 rounded-md border hover:bg-muted/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedLists.includes(list.id)}
                    onChange={(e) => setSelectedLists(e.target.checked ? [...selectedLists, list.id] : selectedLists.filter((l) => l !== list.id))}
                  />
                  <div>
                    <p className="font-medium text-sm">{list.name}</p>
                    <p className="text-xs text-muted-foreground">{list.contactCount} contacts</p>
                  </div>
                </label>
              ))}
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Email Content</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label>HTML Content *</Label>
                <Textarea
                  {...register('htmlContent', { required: true })}
                  rows={14}
                  className="font-mono text-xs"
                  placeholder="<html>...</html>"
                />
                <p className="text-xs text-muted-foreground">Variables: {'{{firstName}}'}, {'{{lastName}}'}, {'{{email}}'}, {'{{unsubscribeUrl}}'}</p>
              </div>
              <div className="space-y-1">
                <Label>Plain Text (optional)</Label>
                <Textarea {...register('textContent')} rows={6} placeholder="Plain text version..." />
              </div>
            </CardContent>
          </Card>
        )}

        {step === 4 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Review & Save</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">Name</span><span className="font-medium">{watch('name')}</span></div>
              <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">Subject</span><span className="font-medium">{watch('subject')}</span></div>
              <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">Lists</span><span className="font-medium">{selectedLists.length} selected</span></div>
              <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">Throttle</span><span>{watch('throttlePerMinute')}/min</span></div>
              {!htmlContent?.includes('{{unsubscribeUrl}}') && (
                <div className="p-3 rounded-md bg-yellow-50 border border-yellow-200 text-yellow-700 text-xs">
                  Warning: Your HTML does not contain an unsubscribe link. Add {'{{unsubscribeUrl}}'} to comply with email laws.
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="flex justify-between mt-4">
          <Button type="button" variant="outline" onClick={() => setStep((s) => s - 1)} disabled={step === 0}>
            <ArrowLeft className="h-4 w-4 mr-2" />Previous
          </Button>
          {step < STEPS.length - 1 ? (
            <Button type="button" onClick={() => setStep((s) => s + 1)}>
              Next<ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button type="submit" disabled={save.isPending}>
              <Send className="h-4 w-4 mr-2" />{save.isPending ? 'Saving...' : 'Save Campaign'}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
