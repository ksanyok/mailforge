import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, RefreshCw, Mail, ChevronLeft, Send, Users, Inbox, Circle } from 'lucide-react';
import { inboxApi } from '@/api/index';
import { cn } from '@/utils/cn';
import { toast } from '@/hooks/use-toast';

interface Conversation {
  contactEmail: string;
  contactName: string;
  senderId: string;
  senderEmail: string;
  senderName: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

interface Message {
  uid: number;
  messageId: string;
  subject: string;
  from: { name: string; address: string };
  to: { name: string; address: string }[];
  date: string;
  text: string;
  html: string | null;
  isRead: boolean;
}

type Filter = 'all' | 'unread' | 'external';
interface SenderOption { id: string; email: string; name: string; count: number; }

function initials(name: string, email: string): string {
  const n = name || email;
  const parts = n.split(/[\s@]/);
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('');
}

function timeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return d.toLocaleDateString('en', { month: 'short', day: 'numeric' });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });
}

function isExternalEmail(email: string, senderDomain: string): boolean {
  const domain = email.split('@')[1] ?? '';
  return domain !== senderDomain && !email.includes('dmarc') && !email.includes('postmaster');
}

export function InboxPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('external');
  const [senderFilter, setSenderFilter] = useState<string | null>(null);
  const [active, setActive] = useState<Conversation | null>(null);
  const [replyText, setReplyText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();

  const { data: convRaw = [], isFetching: loadingConvs, refetch } = useQuery({
    queryKey: ['inbox-conversations'],
    queryFn: () => inboxApi.conversations() as Promise<Conversation[]>,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const { data: thread = [], isFetching: loadingThread } = useQuery({
    queryKey: ['inbox-thread', active?.senderId, active?.contactEmail],
    queryFn: () => inboxApi.thread(active!.senderId, active!.contactEmail) as Promise<Message[]>,
    enabled: !!active,
    staleTime: 15_000,
  });

  const markRead = useMutation({
    mutationFn: ({ senderId, uid }: { senderId: string; uid: number }) =>
      inboxApi.markRead(senderId, uid),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inbox-conversations'] });
      qc.invalidateQueries({ queryKey: ['inbox-thread'] });
    },
  });

  const reply = useMutation({
    mutationFn: (data: { senderId: string; to: string; subject: string; body: string; inReplyTo?: string }) =>
      inboxApi.reply(data),
    onSuccess: () => {
      setReplyText('');
      qc.invalidateQueries({ queryKey: ['inbox-thread', active?.senderId, active?.contactEmail] });
      toast({ title: 'Reply sent' });
    },
    onError: () => toast({ title: 'Failed to send reply', variant: 'destructive' }),
  });

  // Scroll to bottom when thread loads
  useEffect(() => {
    if (thread.length > 0) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [thread.length]);

  const allConvs = convRaw as Conversation[];

  // Build unique sender list
  const senderMap = new Map<string, SenderOption>();
  for (const c of allConvs) {
    if (!senderMap.has(c.senderId)) {
      senderMap.set(c.senderId, { id: c.senderId, email: c.senderEmail, name: c.senderName, count: 0 });
    }
    senderMap.get(c.senderId)!.count++;
  }
  const senders = Array.from(senderMap.values()).sort((a, b) => b.count - a.count);

  const filtered = allConvs.filter((c) => {
    const matchSearch = !search ||
      c.contactEmail.toLowerCase().includes(search.toLowerCase()) ||
      c.contactName.toLowerCase().includes(search.toLowerCase());

    const matchSender = !senderFilter || c.senderId === senderFilter;

    const domain = c.senderEmail.split('@')[1] ?? '';
    const isExternal = isExternalEmail(c.contactEmail, domain);
    const matchFilter =
      filter === 'all' ? true :
      filter === 'unread' ? c.unreadCount > 0 :
      isExternal;

    return matchSearch && matchSender && matchFilter;
  });

  // Counts respect sender filter
  const base = senderFilter ? allConvs.filter((c) => c.senderId === senderFilter) : allConvs;
  const counts = {
    all: base.length,
    unread: base.filter((c) => c.unreadCount > 0).length,
    external: base.filter((c) => {
      const domain = c.senderEmail.split('@')[1] ?? '';
      return isExternalEmail(c.contactEmail, domain);
    }).length,
  };

  const openConversation = (conv: Conversation) => {
    setActive(conv);
    setReplyText('');
  };

  const handleReply = () => {
    if (!active || !replyText.trim()) return;
    const lastMsg = (thread as Message[]).slice().reverse().find((m) => m.from.address !== active.senderEmail);
    reply.mutate({
      senderId: active.senderId,
      to: active.contactEmail,
      subject: lastMsg?.subject ?? 'Re: your message',
      body: replyText.trim(),
      inReplyTo: lastMsg?.messageId,
    });
  };

  return (
    <div className="-m-6 h-[calc(100vh-56px)] flex overflow-hidden bg-white">

      {/* ── Conversation list ────────────────────────────── */}
      <aside className={cn(
        'flex flex-col border-r bg-white transition-all duration-200',
        active ? 'w-0 md:w-80 overflow-hidden' : 'w-full md:w-80',
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="font-semibold text-base">Inbox</h2>
          <button
            onClick={() => refetch()}
            className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500"
          >
            <RefreshCw className={cn('h-4 w-4', loadingConvs && 'animate-spin')} />
          </button>
        </div>

        {/* Search */}
        <div className="px-3 py-2 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations…"
              className="w-full pl-8 pr-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
          </div>
        </div>

        {/* Sender filter chips */}
        {senders.length > 1 && (
          <div className="px-3 py-2 border-b overflow-x-auto">
            <div className="flex gap-1.5 min-w-max">
              <button
                onClick={() => setSenderFilter(null)}
                className={cn(
                  'px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
                  !senderFilter
                    ? 'bg-indigo-500 text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200',
                )}
              >
                All senders
              </button>
              {senders.map((s) => {
                const localPart = s.email.split('@')[0];
                const isActive = senderFilter === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setSenderFilter(isActive ? null : s.id)}
                    title={s.email}
                    className={cn(
                      'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
                      isActive
                        ? 'bg-indigo-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-indigo-50 hover:text-indigo-600',
                    )}
                  >
                    <span className={cn(
                      'w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0',
                      isActive ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-600',
                    )}>
                      {localPart[0]?.toUpperCase()}
                    </span>
                    {localPart}
                    <span className={cn(
                      'text-[10px] px-1 rounded-full',
                      isActive ? 'bg-white/20' : 'bg-gray-200 text-gray-500',
                    )}>
                      {s.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex border-b text-xs font-medium">
          {([
            { key: 'external', label: 'Clients', icon: Users },
            { key: 'unread', label: 'Unread', icon: Circle },
            { key: 'all', label: 'All', icon: Inbox },
          ] as { key: Filter; label: string; icon: any }[]).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={cn(
                'flex-1 flex flex-col items-center py-2 gap-0.5 transition-colors',
                filter === key
                  ? 'text-indigo-600 border-b-2 border-indigo-500'
                  : 'text-gray-500 hover:text-gray-700',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{label}</span>
              {counts[key] > 0 && (
                <span className={cn(
                  'text-[10px] px-1 rounded-full',
                  filter === key ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500',
                )}>
                  {counts[key]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loadingConvs && filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2 text-gray-400">
              <RefreshCw className="h-5 w-5 animate-spin" />
              <span className="text-sm">Loading…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2 text-gray-400">
              <Mail className="h-7 w-7 opacity-40" />
              <span className="text-sm">No conversations</span>
            </div>
          ) : (
            filtered.map((c) => {
              const isActive = active?.contactEmail === c.contactEmail && active?.senderId === c.senderId;
              return (
                <button
                  key={`${c.senderId}-${c.contactEmail}`}
                  onClick={() => openConversation(c)}
                  className={cn(
                    'w-full flex items-start gap-3 px-3 py-3 text-left transition-colors border-b border-gray-50',
                    isActive ? 'bg-indigo-50' : 'hover:bg-gray-50',
                  )}
                >
                  <div className="shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-sm font-semibold">
                    {initials(c.contactName, c.contactEmail)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className={cn('text-sm truncate', c.unreadCount > 0 ? 'font-semibold text-gray-900' : 'font-medium text-gray-700')}>
                        {c.contactName || c.contactEmail}
                      </span>
                      <span className="text-xs text-gray-400 shrink-0">{timeAgo(c.lastMessageAt)}</span>
                    </div>
                    <p className="text-xs text-gray-400 truncate mt-0.5">{c.senderEmail}</p>
                    <p className={cn('text-xs truncate mt-0.5', c.unreadCount > 0 ? 'text-gray-700 font-medium' : 'text-gray-400')}>
                      {c.lastMessage || '…'}
                    </p>
                  </div>
                  {c.unreadCount > 0 && (
                    <span className="shrink-0 mt-1 min-w-[18px] h-[18px] rounded-full bg-indigo-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
                      {c.unreadCount}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* ── Chat window ──────────────────────────────────── */}
      <div className={cn(
        'flex-1 flex flex-col overflow-hidden bg-[#f0f2f5]',
        !active && 'hidden md:flex',
      )}>
        {!active ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-3">
            <Mail className="h-12 w-12 opacity-20" />
            <p className="text-sm">Select a conversation to start reading</p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-3 px-4 py-3 bg-white border-b shadow-sm">
              <button className="md:hidden p-1 rounded hover:bg-gray-100" onClick={() => setActive(null)}>
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-sm font-semibold shrink-0">
                {initials(active.contactName, active.contactEmail)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{active.contactName || active.contactEmail}</p>
                <p className="text-xs text-gray-500 truncate">{active.contactEmail}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-gray-400">via</p>
                <p className="text-xs font-medium text-indigo-600 truncate max-w-[160px]">{active.senderEmail}</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
              {loadingThread ? (
                <div className="flex items-center justify-center h-40 text-gray-400 gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Loading messages…</span>
                </div>
              ) : thread.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-gray-400 gap-2">
                  <Mail className="h-8 w-8 opacity-30" />
                  <span className="text-sm">No messages found</span>
                </div>
              ) : (
                (thread as Message[]).map((msg, i) => {
                  const isSent = msg.from.address.toLowerCase() === active.senderEmail.toLowerCase();
                  const body = (msg.text || '').trim();
                  const prev = i > 0 ? (thread as Message[])[i - 1] : null;
                  const showDate = !prev || new Date(msg.date).toDateString() !== new Date(prev.date).toDateString();

                  return (
                    <div key={`${msg.uid}-${i}`}>
                      {showDate && (
                        <div className="flex items-center justify-center my-3">
                          <span className="bg-white text-xs text-gray-500 px-3 py-1 rounded-full shadow-sm">
                            {new Date(msg.date).toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' })}
                          </span>
                        </div>
                      )}

                      <div className={cn('flex items-end gap-1.5', isSent ? 'flex-row-reverse' : 'flex-row')}>
                        {!isSent && (
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-[10px] font-semibold shrink-0 mb-0.5">
                            {initials(msg.from.name, msg.from.address)}
                          </div>
                        )}

                        <div className={cn(
                          'max-w-[70%] rounded-2xl px-3.5 py-2.5 shadow-sm',
                          isSent
                            ? 'bg-[#25d366] text-white rounded-tr-sm'
                            : 'bg-white text-gray-800 rounded-tl-sm',
                        )}>
                          {msg.subject && msg.subject !== '(no subject)' && (
                            <p className={cn(
                              'text-[11px] font-semibold mb-1.5 truncate',
                              isSent ? 'text-green-100' : 'text-indigo-500',
                            )}>
                              {msg.subject}
                            </p>
                          )}
                          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                            {body || '(empty)'}
                          </p>
                          <div className={cn(
                            'flex items-center gap-1 mt-1 justify-end',
                            isSent ? 'text-green-100' : 'text-gray-400',
                          )}>
                            <span className="text-[10px]">{formatTime(msg.date)}</span>
                            {isSent && <span className="text-[10px]">✓✓</span>}
                            {!isSent && !msg.isRead && (
                              <Circle className="h-2 w-2 fill-indigo-500 text-indigo-500" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Reply compose */}
            <div className="bg-white border-t px-4 py-3">
              <div className="flex items-end gap-2">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleReply();
                  }}
                  placeholder={`Reply to ${active.contactName || active.contactEmail}…`}
                  rows={2}
                  className="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-gray-50"
                />
                <button
                  onClick={handleReply}
                  disabled={!replyText.trim() || reply.isPending}
                  className={cn(
                    'shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors',
                    replyText.trim() && !reply.isPending
                      ? 'bg-indigo-500 text-white hover:bg-indigo-600'
                      : 'bg-gray-100 text-gray-300 cursor-not-allowed',
                  )}
                >
                  {reply.isPending
                    ? <RefreshCw className="h-4 w-4 animate-spin" />
                    : <Send className="h-4 w-4" />
                  }
                </button>
              </div>
              <p className="text-[10px] text-gray-400 mt-1 text-right">Ctrl+Enter to send</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
