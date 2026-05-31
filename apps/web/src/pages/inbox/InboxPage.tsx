import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';
import {
  Search, RefreshCw, Mail, ChevronLeft, Send, Star,
  ChevronDown, MailOpen, Inbox, CheckCheck, X, EyeOff,
} from 'lucide-react';
import { inboxApi } from '@/api/index';
import { cn } from '@/utils/cn';
import { toast } from '@/hooks/use-toast';

/* ── Types ─────────────────────────────────────────────────────────── */
interface Conversation {
  contactEmail: string; contactName: string;
  senderId: string; senderEmail: string; senderName: string;
  lastMessage: string; lastMessageAt: string; unreadCount: number;
}
interface Message {
  uid: number; messageId: string; subject: string;
  from: { name: string; address: string };
  to: { name: string; address: string }[];
  date: string; text: string; html: string | null; isRead: boolean;
}
type Filter = 'all' | 'unread' | 'starred';
interface SenderOption { id: string; email: string; name: string; count: number; }

/* ── Helpers ────────────────────────────────────────────────────────── */
function loadStarred(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem('inbox-starred') ?? '[]')); }
  catch { return new Set(); }
}
function saveStarred(s: Set<string>) {
  localStorage.setItem('inbox-starred', JSON.stringify([...s]));
}
function convKey(c: Pick<Conversation, 'senderId' | 'contactEmail'>) {
  return `${c.senderId}::${c.contactEmail}`;
}
function initials(name: string, email: string): string {
  const n = name || email;
  return n.split(/[\s@]/).slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('');
}
function timeAgo(d: string): string {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d`;
  return new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric' });
}
function formatTime(d: string): string {
  return new Date(d).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });
}

/* ── Avatar with gradient ───────────────────────────────────────────── */
const GRADIENTS = [
  'from-violet-500 to-indigo-600',
  'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-600',
  'from-emerald-500 to-teal-600',
  'from-sky-500 to-blue-600',
  'from-fuchsia-500 to-purple-600',
];
function avatarGradient(email: string): string {
  let h = 0;
  for (const c of email) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
  return GRADIENTS[Math.abs(h) % GRADIENTS.length];
}

/* ── Skeleton ───────────────────────────────────────────────────────── */
function ConvSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-50/80">
      <div className="skeleton w-10 h-10 rounded-2xl shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="skeleton h-3.5 w-28 rounded" />
        <div className="skeleton h-3 w-40 rounded" />
        <div className="skeleton h-3 w-24 rounded" />
      </div>
    </div>
  );
}

/* ── Read receipt double-check icon ────────────────────────────────── */
function ReadTicks({ isRead }: { isRead: boolean }) {
  return (
    <svg viewBox="0 0 16 11" className={cn('w-3.5 h-3.5 fill-current transition-colors duration-300',
      isRead ? 'text-sky-300' : 'text-indigo-200 opacity-60')}>
      <path d="M11.071.653a.75.75 0 0 1 .025 1.06L5.01 8.42a.75.75 0 0 1-1.085 0L1.278 5.631a.75.75 0 1 1 1.085-1.036l2.104 2.202 5.544-6.12a.75.75 0 0 1 1.06-.024Z"/>
      <path d="M14.571.653a.75.75 0 0 1 .025 1.06L8.51 8.42a.75.75 0 0 1-.574.233V7.3l5.575-6.622a.75.75 0 0 1 1.06-.025Z" opacity=".5"/>
    </svg>
  );
}

/* ── Bubble message ─────────────────────────────────────────────────── */
function MessageBubble({ msg, isSent, index }: { msg: Message; isSent: boolean; index: number }) {
  const body = (msg.text || '').trim();
  const delay = Math.min(index * 0.04, 0.4);

  return (
    <div
      className={cn(
        'flex items-end gap-2 group',
        isSent ? 'flex-row-reverse' : 'flex-row',
        isSent ? 'animate-slide-right' : 'animate-slide-left',
      )}
      style={{ animationDelay: `${delay}s` }}
    >
      <div className={cn(
        'w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 mb-1 shadow-sm',
        'bg-gradient-to-br', avatarGradient(msg.from.address),
      )}>
        {initials(msg.from.name, msg.from.address)}
      </div>

      <div className={cn(
        'max-w-[72%] px-4 py-2.5 shadow-sm relative transition-shadow duration-200 group-hover:shadow-md',
        isSent ? [
          'bg-gradient-to-br from-indigo-500 to-violet-600 text-white',
          'rounded-2xl rounded-tr-sm',
        ] : [
          'bg-white text-gray-800 border border-gray-100',
          'rounded-2xl rounded-tl-sm',
        ],
      )}>
        {msg.subject && msg.subject !== '(no subject)' && (
          <p className={cn('text-[11px] font-semibold mb-1.5 truncate',
            isSent ? 'text-indigo-200' : 'text-indigo-500')}>
            {msg.subject}
          </p>
        )}
        <p className="text-[13.5px] leading-relaxed whitespace-pre-wrap break-words">
          {body || '(empty)'}
        </p>
        <div className={cn('flex items-center gap-1.5 mt-1.5 justify-end',
          isSent ? 'text-indigo-200' : 'text-gray-400')}>
          <span className="text-[10px]">{formatTime(msg.date)}</span>
          {isSent && <ReadTicks isRead={msg.isRead} />}
        </div>
      </div>
    </div>
  );
}

/* ── Unread badge ───────────────────────────────────────────────────── */
function UnreadBadge({ count }: { count: number }) {
  return (
    <span className="animate-pop-in min-w-[18px] h-[18px] rounded-full bg-indigo-500 text-white text-[10px] font-bold flex items-center justify-center px-1 shadow-sm shadow-indigo-300/50">
      {count > 99 ? '99+' : count}
    </span>
  );
}

/* ── Main component ─────────────────────────────────────────────────── */
export function InboxPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [senderFilter, setSenderFilter] = useState<string | null>(null);
  const [active, setActive] = useState<Conversation | null>(null);
  const [replyText, setReplyText] = useState('');
  const [starred, setStarred] = useState<Set<string>>(loadStarred);
  const [localRead, setLocalRead] = useState<Set<string>>(new Set());
  const [markAllConfirm, setMarkAllConfirm] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
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
    staleTime: 10_000,
  });

  const reply = useMutation({
    mutationFn: (data: Parameters<typeof inboxApi.reply>[0]) => inboxApi.reply(data),
    onSuccess: () => {
      setReplyText('');
      qc.invalidateQueries({ queryKey: ['inbox-thread', active?.senderId, active?.contactEmail] });
      toast({ title: '✓ Reply sent' });
    },
    onError: () => toast({ title: 'Failed to send reply', variant: 'destructive' }),
  });

  const markConvUnreadMutation = useMutation({
    mutationFn: async (conv: Conversation) => {
      const msgs = thread as Message[];
      const incoming = msgs.filter(
        m => m.from.address.toLowerCase() !== conv.senderEmail.toLowerCase()
      );
      const last = incoming[incoming.length - 1];
      if (last) await inboxApi.markUnread(conv.senderId, last.uid);
    },
    onSuccess: () => {
      if (active) {
        setLocalRead(prev => {
          const next = new Set(prev);
          next.delete(convKey(active));
          return next;
        });
        setTimeout(() => qc.invalidateQueries({ queryKey: ['inbox-conversations'] }), 500);
      }
      toast({ title: '✓ Marked as unread' });
    },
    onError: () => toast({ title: 'Failed to mark as unread', variant: 'destructive' }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => inboxApi.markAllRead(),
    onSuccess: () => {
      // Mark all conversations as read locally
      const allKeys = (convRaw as Conversation[]).map(c => convKey(c));
      setLocalRead(new Set(allKeys));
      setMarkAllConfirm(false);
      // Refresh after IMAP operations complete
      setTimeout(() => qc.invalidateQueries({ queryKey: ['inbox-conversations'] }), 1500);
      toast({ title: '✓ All conversations marked as read' });
    },
    onError: () => toast({ title: 'Failed to mark all as read', variant: 'destructive' }),
  });

  /* ── Mark as read: optimistic + IMAP background ─────────────────── */
  const markConversationRead = useCallback(async (conv: Conversation, msgs: Message[]) => {
    const key = convKey(conv);
    setLocalRead(prev => new Set([...prev, key]));

    const unread = msgs.filter(
      m => !m.isRead && m.from.address.toLowerCase() !== conv.senderEmail.toLowerCase()
    );
    if (!unread.length) return;

    await Promise.allSettled(
      unread.map(m => inboxApi.markRead(conv.senderId, m.uid).catch(() => null))
    );

    // Refresh conversations list to reflect new read state
    qc.invalidateQueries({ queryKey: ['inbox-conversations'] });
  }, [qc]);

  // Auto-mark when thread loads or active conversation changes
  useEffect(() => {
    if (!active || !thread.length) return;
    markConversationRead(active, thread as Message[]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.senderId, active?.contactEmail, thread.length]);

  // Scroll to bottom
  useEffect(() => {
    if (thread.length > 0)
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 150);
  }, [thread.length, active?.contactEmail]);

  const allConvs = convRaw as Conversation[];

  /* ── Effective conversations (respects optimistic localRead) ──────── */
  const effectiveConvs = allConvs.map(c => ({
    ...c,
    unreadCount: localRead.has(convKey(c)) ? 0 : c.unreadCount,
  }));

  const totalUnread = effectiveConvs.reduce((s, c) => s + c.unreadCount, 0);

  // Senders
  const senderMap = new Map<string, SenderOption>();
  for (const c of effectiveConvs) {
    if (!senderMap.has(c.senderId))
      senderMap.set(c.senderId, { id: c.senderId, email: c.senderEmail, name: c.senderName, count: 0 });
    senderMap.get(c.senderId)!.count++;
  }
  const senders = Array.from(senderMap.values()).sort((a, b) => b.count - a.count);

  const base = senderFilter ? effectiveConvs.filter(c => c.senderId === senderFilter) : effectiveConvs;
  const counts: Record<Filter, number> = {
    all: base.length,
    unread: base.filter(c => c.unreadCount > 0).length,
    starred: base.filter(c => starred.has(convKey(c))).length,
  };

  const filtered = base.filter(c => {
    const matchSearch = !search ||
      c.contactEmail.toLowerCase().includes(search.toLowerCase()) ||
      c.contactName.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === 'all'    ? true :
      filter === 'unread' ? c.unreadCount > 0 :
      starred.has(convKey(c));
    return matchSearch && matchFilter;
  });

  const toggleStar = (e: React.MouseEvent, key: string) => {
    e.stopPropagation();
    setStarred(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      saveStarred(next);
      return next;
    });
  };

  const openConversation = (conv: Conversation) => {
    setActive(conv);
    setReplyText('');
    setLocalRead(prev => new Set([...prev, convKey(conv)]));
    setTimeout(() => textareaRef.current?.focus(), 300);
  };

  const handleReply = () => {
    if (!active || !replyText.trim()) return;
    const lastMsg = (thread as Message[]).slice().reverse()
      .find(m => m.from.address !== active.senderEmail);
    reply.mutate({
      senderId: active.senderId,
      to: active.contactEmail,
      subject: lastMsg?.subject ?? 'Re: your message',
      body: replyText.trim(),
      inReplyTo: lastMsg?.messageId,
    });
  };

  const TABS: { key: Filter; label: string; icon?: React.ReactNode }[] = [
    { key: 'all',     label: 'All' },
    { key: 'unread',  label: 'Unread' },
    { key: 'starred', label: 'Starred' },
  ];

  return (
    <div className="-m-6 h-[calc(100vh-56px)] flex overflow-hidden inbox-bg">

      {/* ── Sidebar ─────────────────────────────────────────────────── */}
      <aside className={cn(
        'flex flex-col bg-white border-r border-gray-100/80 transition-all duration-300 ease-in-out shadow-sm',
        active ? 'w-0 md:w-[320px] overflow-hidden' : 'w-full md:w-[320px]',
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm shadow-indigo-200/50">
              <Inbox className="h-4 w-4 text-white" />
            </div>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-[15px] text-gray-900">Inbox</h2>
              {totalUnread > 0 && (
                <span className="animate-pop-in text-[10px] font-bold bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full">
                  {totalUnread}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {/* Mark all as read */}
            {totalUnread > 0 && (
              markAllConfirm ? (
                <div className="flex items-center gap-1 animate-scale-in">
                  <button
                    onClick={() => markAllReadMutation.mutate()}
                    disabled={markAllReadMutation.isPending}
                    className="flex items-center gap-1 text-[11px] font-medium bg-indigo-500 text-white px-2.5 py-1 rounded-lg hover:bg-indigo-600 transition-all active:scale-95 shadow-sm"
                  >
                    {markAllReadMutation.isPending
                      ? <RefreshCw className="h-3 w-3 animate-spin" />
                      : <CheckCheck className="h-3 w-3" />
                    }
                    Confirm
                  </button>
                  <button
                    onClick={() => setMarkAllConfirm(false)}
                    className="w-6 h-6 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setMarkAllConfirm(true)}
                  title="Mark all as read"
                  className="w-8 h-8 rounded-xl hover:bg-indigo-50 flex items-center justify-center text-gray-400 hover:text-indigo-500 transition-all duration-200 hover:scale-110 active:scale-95"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                </button>
              )
            )}
            <button
              onClick={() => refetch()}
              className="w-8 h-8 rounded-xl hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-all duration-200 hover:scale-110 active:scale-95"
            >
              <RefreshCw className={cn('h-3.5 w-3.5 transition-transform duration-500', loadingConvs && 'animate-spin')} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 py-2.5 border-b border-gray-50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search contacts…"
              className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-all placeholder:text-gray-400"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Sender filter */}
        {senders.length > 1 && (
          <div className="px-4 py-2 border-b border-gray-50">
            <div className="relative">
              <select
                value={senderFilter ?? ''}
                onChange={e => setSenderFilter(e.target.value || null)}
                className="w-full appearance-none text-xs bg-gray-50/80 border border-gray-100 rounded-xl px-3 py-2 pr-7 text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-200 cursor-pointer transition-all"
              >
                <option value="">All senders ({allConvs.length})</option>
                {senders.map(s => (
                  <option key={s.id} value={s.id}>{s.email} ({s.count})</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400 pointer-events-none" />
            </div>
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex px-3 py-2 gap-1 border-b border-gray-50">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={cn(
                'flex-1 flex flex-col items-center py-1.5 rounded-xl text-xs font-medium transition-all duration-200',
                filter === key
                  ? 'bg-indigo-500 text-white shadow-sm shadow-indigo-200/60 scale-[1.02]'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700',
              )}
            >
              <span>{label}</span>
              <span className={cn(
                'text-[10px] font-bold mt-0.5 tabular-nums',
                filter === key ? 'text-indigo-200' : counts[key] > 0 ? 'text-indigo-400' : 'text-gray-300',
              )}>
                {counts[key]}
              </span>
            </button>
          ))}
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {loadingConvs && filtered.length === 0 ? (
            <div className="animate-fade-in">
              {[...Array(6)].map((_, i) => <ConvSkeleton key={i} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-gray-400 animate-fade-in">
              {filter === 'starred'
                ? <><Star className="h-9 w-9 opacity-15 animate-float" /><span className="text-sm font-medium">No starred conversations</span></>
                : filter === 'unread'
                ? <><MailOpen className="h-9 w-9 opacity-15 animate-float" /><span className="text-sm font-medium text-gray-500">All caught up!</span><p className="text-xs text-gray-400">No unread messages</p></>
                : <><Mail className="h-9 w-9 opacity-15 animate-float" /><span className="text-sm font-medium">No conversations yet</span></>
              }
            </div>
          ) : (
            filtered.map((c, i) => {
              const key = convKey(c);
              const isActive = active?.contactEmail === c.contactEmail && active?.senderId === c.senderId;
              const isStarred = starred.has(key);
              const hasUnread = c.unreadCount > 0;

              return (
                <button
                  key={key}
                  onClick={() => openConversation(c)}
                  className={cn(
                    'w-full flex items-start gap-3 px-4 py-3.5 text-left transition-all duration-200 border-b border-gray-50/80 group relative',
                    'animate-slide-up',
                    isActive
                      ? 'bg-indigo-50/90 border-l-[3px] border-l-indigo-500 shadow-[inset_0_0_0_1px_rgba(99,102,241,0.08)]'
                      : 'hover:bg-gray-50/80 border-l-[3px] border-l-transparent hover:border-l-gray-200',
                  )}
                  style={{ animationDelay: `${Math.min(i * 0.025, 0.25)}s` }}
                >
                  {/* Unread indicator dot */}
                  {hasUnread && !isActive && (
                    <span className="absolute left-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse-dot" />
                  )}

                  {/* Avatar */}
                  <div className={cn(
                    'w-10 h-10 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white text-[13px] font-bold shrink-0 shadow-sm transition-transform duration-200',
                    avatarGradient(c.contactEmail),
                    'group-hover:scale-105',
                  )}>
                    {initials(c.contactName, c.contactEmail)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className={cn(
                        'text-[13.5px] truncate',
                        hasUnread ? 'font-semibold text-gray-900' : 'font-medium text-gray-700',
                      )}>
                        {c.contactName || c.contactEmail}
                      </span>
                      <span className={cn(
                        'text-[10px] shrink-0 tabular-nums',
                        hasUnread ? 'text-indigo-500 font-semibold' : 'text-gray-400',
                      )}>
                        {timeAgo(c.lastMessageAt)}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400 truncate mb-0.5">{c.senderEmail}</p>
                    <p className={cn(
                      'text-xs truncate',
                      hasUnread ? 'text-gray-600 font-medium' : 'text-gray-400',
                    )}>
                      {c.lastMessage || '…'}
                    </p>
                  </div>

                  {/* Right icons */}
                  <div className="flex flex-col items-end gap-1.5 shrink-0 pt-0.5">
                    <button
                      onClick={e => toggleStar(e, key)}
                      className={cn(
                        'transition-all duration-200',
                        isStarred
                          ? 'text-amber-400 scale-110'
                          : 'text-gray-200 group-hover:text-gray-300 hover:!text-amber-400 hover:scale-125',
                      )}
                    >
                      <Star className={cn('h-3.5 w-3.5', isStarred && 'fill-amber-400')} />
                    </button>
                    {hasUnread && <UnreadBadge count={c.unreadCount} />}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* ── Chat panel ──────────────────────────────────────────────── */}
      <div className={cn(
        'flex-1 flex flex-col overflow-hidden transition-all duration-300',
        !active && 'hidden md:flex',
      )}>
        {!active ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-5 animate-fade-in">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center animate-float shadow-inner">
              <Mail className="h-8 w-8 text-indigo-400" />
            </div>
            <div className="text-center space-y-1.5">
              <p className="text-sm font-semibold text-gray-700">Select a conversation</p>
              <p className="text-xs text-gray-400">Choose from the list on the left to start reading</p>
            </div>
            {totalUnread > 0 && (
              <div className="animate-scale-in bg-indigo-50 border border-indigo-100 rounded-2xl px-5 py-3 text-center">
                <p className="text-[13px] font-semibold text-indigo-700">{totalUnread} unread message{totalUnread > 1 ? 's' : ''}</p>
                <p className="text-[11px] text-indigo-400 mt-0.5">Waiting for your reply</p>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-3 px-5 py-3.5 bg-white/95 backdrop-blur-sm border-b border-gray-100/80 shadow-sm animate-slide-up">
              <button
                className="md:hidden w-8 h-8 rounded-xl hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-colors active:scale-95"
                onClick={() => setActive(null)}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              <div className={cn(
                'w-9 h-9 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white text-[13px] font-bold shrink-0 shadow-sm',
                avatarGradient(active.contactEmail),
              )}>
                {initials(active.contactName, active.contactEmail)}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{active.contactName || active.contactEmail}</p>
                <p className="text-xs text-gray-500 truncate">{active.contactEmail}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={e => toggleStar(e, convKey(active))}
                  className={cn(
                    'w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200',
                    starred.has(convKey(active))
                      ? 'bg-amber-50 text-amber-500 scale-110'
                      : 'hover:bg-gray-100 text-gray-300 hover:text-amber-400 hover:scale-110',
                  )}
                >
                  <Star className={cn('h-4 w-4', starred.has(convKey(active)) && 'fill-amber-400')} />
                </button>
                <button
                  onClick={() => markConvUnreadMutation.mutate(active)}
                  disabled={markConvUnreadMutation.isPending}
                  title="Mark as unread"
                  className="w-8 h-8 rounded-xl hover:bg-indigo-50 flex items-center justify-center text-gray-400 hover:text-indigo-500 transition-all duration-200 hover:scale-110 active:scale-95"
                >
                  {markConvUnreadMutation.isPending
                    ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    : <EyeOff className="h-3.5 w-3.5" />
                  }
                </button>
                <div className="text-right hidden sm:block">
                  <p className="text-[10px] text-gray-400">via</p>
                  <p className="text-xs font-semibold text-indigo-600 truncate max-w-[140px]">{active.senderEmail}</p>
                </div>
              </div>
            </div>

            {/* Messages area */}
            <div
              className="flex-1 overflow-y-auto overscroll-contain px-5 py-5 space-y-3"
              style={{
                background: 'linear-gradient(160deg, #eef0fd 0%, #f5f5fb 40%, #edf2ff 100%)',
              }}
            >
              {loadingThread ? (
                <div className="flex flex-col gap-4 animate-fade-in">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className={cn('flex gap-2', i % 2 === 0 ? 'flex-row' : 'flex-row-reverse')}>
                      {i % 2 === 0 && <div className="skeleton w-7 h-7 rounded-full shrink-0" />}
                      <div className={cn('skeleton rounded-2xl', i % 2 === 0 ? 'h-16 w-48' : 'h-14 w-56')} />
                    </div>
                  ))}
                </div>
              ) : (thread as Message[]).length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400 animate-fade-in">
                  <Mail className="h-8 w-8 opacity-30 animate-float" />
                  <span className="text-sm">No messages found</span>
                </div>
              ) : (
                (thread as Message[]).map((msg, i) => {
                  const isSent = msg.from.address.toLowerCase() === active.senderEmail.toLowerCase();
                  const prev = i > 0 ? (thread as Message[])[i - 1] : null;
                  const showDate = !prev ||
                    new Date(msg.date).toDateString() !== new Date(prev.date).toDateString();
                  const senderChanged = !prev || prev.from.address !== msg.from.address;
                  const showReceivedLabel = !isSent && senderChanged;
                  const showSentLabel = isSent && senderChanged;

                  return (
                    <div key={`${msg.uid}-${i}`}>
                      {showDate && (
                        <div className="flex items-center justify-center my-4 animate-fade-in">
                          <span className="bg-white/80 backdrop-blur-sm text-[11px] text-gray-500 font-medium px-4 py-1.5 rounded-full shadow-sm border border-gray-100/80">
                            {new Date(msg.date).toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' })}
                          </span>
                        </div>
                      )}
                      {showReceivedLabel && (
                        <p className="text-[10px] text-gray-400 ml-9 mb-1 font-medium animate-fade-in">
                          {msg.from.name || msg.from.address}
                        </p>
                      )}
                      {showSentLabel && (
                        <p className="text-[10px] text-indigo-400 mr-9 mb-1 font-medium animate-fade-in text-right">
                          {active.senderName || active.senderEmail}
                        </p>
                      )}
                      <MessageBubble msg={msg} isSent={isSent} index={i} />
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Reply compose */}
            <div className="bg-white/95 backdrop-blur-sm border-t border-gray-100/80 px-4 py-3 animate-slide-up shadow-[0_-1px_12px_rgba(0,0,0,0.04)]">
              <div className="flex items-end gap-2">
                <textarea
                  ref={textareaRef}
                  value={replyText}
                  onChange={e => {
                    setReplyText(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleReply();
                  }}
                  placeholder={`Reply to ${active.contactName || active.contactEmail}…`}
                  rows={1}
                  style={{ minHeight: '40px', maxHeight: '120px' }}
                  className="flex-1 resize-none rounded-2xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 bg-gray-50/80 transition-all placeholder:text-gray-400 overflow-hidden"
                />
                <button
                  onClick={handleReply}
                  disabled={!replyText.trim() || reply.isPending}
                  className={cn(
                    'shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-200',
                    replyText.trim() && !reply.isPending
                      ? 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-200/50 hover:shadow-lg hover:scale-110 active:scale-95'
                      : 'bg-gray-100 text-gray-300 cursor-not-allowed',
                  )}
                >
                  {reply.isPending
                    ? <RefreshCw className="h-4 w-4 animate-spin" />
                    : <Send className="h-4 w-4" />
                  }
                </button>
              </div>
              <p className="text-[10px] text-gray-400 mt-1.5 text-right">Ctrl+Enter to send</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
