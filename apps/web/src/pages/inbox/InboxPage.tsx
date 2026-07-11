import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search, RefreshCw, Mail, Send, Star, ChevronDown, MailOpen, Inbox,
  CheckCheck, X, EyeOff, Trash2, Reply, Forward, MoreHorizontal,
  Archive, FileText, Bold, Italic, Underline, List, Link2, Paperclip,
  Building2, Phone, Calendar, Filter, ChevronLeft,
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

// readState: key → lastMessageAt string we last read
// If current lastMessageAt > stored value, there are new messages
type ReadState = Record<string, string>;
function loadReadState(): ReadState {
  try { return JSON.parse(localStorage.getItem('inbox-read-state') ?? '{}'); }
  catch { return {}; }
}
function saveReadState(s: ReadState) {
  localStorage.setItem('inbox-read-state', JSON.stringify(s));
}
function convKey(c: Pick<Conversation, 'senderId' | 'contactEmail'>) {
  return `${c.senderId}::${c.contactEmail}`;
}

// Split body into reply text + quoted block (lines starting with ">", "On ... wrote:", etc.)
function splitEmailBody(text: string): { main: string; quoted: string | null } {
  if (!text) return { main: '', quoted: null };
  // "On [date] [name] wrote:" quote header
  const onWroteMatch = text.match(/\n{0,2}On .{5,300}?wrote:\s*\n/s);
  if (onWroteMatch && onWroteMatch.index !== undefined && onWroteMatch.index > 0) {
    return { main: text.slice(0, onWroteMatch.index).trim(), quoted: text.slice(onWroteMatch.index).trim() };
  }
  // Lines starting with ">"
  const lines = text.split('\n');
  const qi = lines.findIndex(l => l.trimStart().startsWith('>'));
  if (qi > 0) {
    return { main: lines.slice(0, qi).join('\n').trim(), quoted: lines.slice(qi).join('\n').trim() };
  }
  // Entire message is quoted
  if (text.trimStart().startsWith('>') || /^On .{5,300}?wrote:/s.test(text.trimStart())) {
    return { main: '', quoted: text };
  }
  return { main: text, quoted: null };
}
function initials(name: string, email: string): string {
  const n = name || email;
  return n.split(/[\s@]/).slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('');
}
function timeAgo(d: string): string {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'сейчас';
  if (m < 60) return `${m} мин`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ч`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days} дн`;
  return new Date(d).toLocaleDateString('ru', { month: 'short', day: 'numeric' });
}
function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('ru', { month: 'short', day: 'numeric' });
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
const DOT_COLORS = ['bg-brand', 'bg-info', 'bg-success', 'bg-warn', 'bg-danger'];

/* ── Skeleton ───────────────────────────────────────────────────────── */
function ConvSkeleton() {
  return (
    <div className="flex items-center gap-3 px-3 py-3 border-b border-border">
      <div className="skeleton w-9 h-9 rounded-[10px] shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="skeleton h-3 w-28 rounded" />
        <div className="skeleton h-2.5 w-40 rounded" />
        <div className="skeleton h-2.5 w-24 rounded" />
      </div>
    </div>
  );
}

/* ── Email card (single message in the reading thread) ──────────────── */
function EmailCard({ msg, senderEmail, contactEmail, onDelete }: {
  msg: Message; senderEmail: string; contactEmail: string; onDelete?: () => void;
}) {
  const [showQuoted, setShowQuoted] = useState(false);
  const { main, quoted } = splitEmailBody((msg.text || '').trim());
  const isSent = msg.from.address.toLowerCase() === senderEmail.toLowerCase();
  const toLabel = isSent ? contactEmail : senderEmail;

  return (
    <div className="group bg-surface border border-border rounded-xl shadow-soft p-[18px]">
      <div className="flex items-center gap-3 mb-4">
        <div className={cn(
          'w-[42px] h-[42px] flex-none rounded-[11px] bg-gradient-to-br flex items-center justify-center text-white font-bold text-sm',
          avatarGradient(msg.from.address),
        )}>
          {initials(msg.from.name, msg.from.address)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm truncate">
            {msg.from.name || msg.from.address}
            <span className="font-normal text-ink-3 text-[12.5px]"> &lt;{msg.from.address}&gt;</span>
          </div>
          <div className="text-xs text-ink-3 truncate">
            кому: {toLabel} · {timeAgo(msg.date)} назад
          </div>
        </div>
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            title="Удалить письмо"
            className="opacity-0 group-hover:opacity-100 transition-opacity w-8 h-8 rounded-lg flex items-center justify-center text-ink-3 hover:text-danger hover:bg-hover"
          >
            <Trash2 className="h-4 w-4" strokeWidth={1.7} />
          </button>
        )}
      </div>

      <div className="text-[13.5px] leading-[1.65] text-ink whitespace-pre-wrap break-words">
        {main || (quoted ? '' : '(пусто)')}
      </div>

      {quoted && (
        <div className="mt-3 border-t border-border pt-2">
          <button
            type="button"
            onClick={() => setShowQuoted(v => !v)}
            className="text-[11px] flex items-center gap-1 text-ink-3 hover:text-ink-2 transition-colors select-none"
          >
            <span className="text-[9px]">{showQuoted ? '▲' : '▼'}</span>
            {showQuoted ? 'Скрыть цитируемый текст' : 'Показать цитируемый текст'}
          </button>
          {showQuoted && (
            <p className="mt-2 text-[12px] leading-relaxed whitespace-pre-wrap break-words text-ink-3">
              {quoted}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Section label ──────────────────────────────────────────────────── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 pt-4 pb-2 text-[10.5px] font-bold tracking-[0.6px] text-ink-3 uppercase">
      {children}
    </div>
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
  const [readState, setReadState] = useState<ReadState>(loadReadState);
  const [markAllConfirm, setMarkAllConfirm] = useState(false);
  const [deleteConvConfirm, setDeleteConvConfirm] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const prevConvsRef = useRef<Map<string, string>>(new Map());
  const notifInitRef = useRef(false);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const { data: convRaw = [], isFetching: loadingConvs, refetch } = useQuery({
    queryKey: ['inbox-conversations'],
    queryFn: () => inboxApi.conversations() as Promise<Conversation[]>,
    refetchInterval: 30_000,
    staleTime: 15_000,
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
      toast({ title: '✓ Ответ отправлен' });
    },
    onError: () => toast({ title: 'Не удалось отправить ответ', variant: 'destructive' }),
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
        setReadState(prev => {
          const next = { ...prev };
          delete next[convKey(active)];
          saveReadState(next);
          return next;
        });
        setTimeout(() => qc.invalidateQueries({ queryKey: ['inbox-conversations'] }), 500);
      }
      toast({ title: '✓ Отмечено как непрочитанное' });
    },
    onError: () => toast({ title: 'Не удалось отметить как непрочитанное', variant: 'destructive' }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => inboxApi.markAllRead(),
    onSuccess: () => {
      const convs = convRaw as Conversation[];
      setReadState(prev => {
        const next = { ...prev };
        convs.forEach(c => { next[convKey(c)] = c.lastMessageAt; });
        saveReadState(next);
        return next;
      });
      setMarkAllConfirm(false);
      setTimeout(() => qc.invalidateQueries({ queryKey: ['inbox-conversations'] }), 1500);
      toast({ title: '✓ Все переписки отмечены как прочитанные' });
    },
    onError: () => toast({ title: 'Не удалось отметить все как прочитанные', variant: 'destructive' }),
  });

  const deleteMessageMutation = useMutation({
    mutationFn: ({ senderId, uid }: { senderId: string; uid: number }) =>
      inboxApi.deleteMessage(senderId, uid),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inbox-thread', active?.senderId, active?.contactEmail] });
      qc.invalidateQueries({ queryKey: ['inbox-conversations'] });
      toast({ title: '✓ Письмо удалено' });
    },
    onError: () => toast({ title: 'Не удалось удалить письмо', variant: 'destructive' }),
  });

  const deleteConversationMutation = useMutation({
    mutationFn: ({ senderId, contactEmail }: { senderId: string; contactEmail: string }) =>
      inboxApi.deleteConversation(senderId, contactEmail),
    onSuccess: () => {
      setActive(null);
      setDeleteConvConfirm(false);
      qc.invalidateQueries({ queryKey: ['inbox-conversations'] });
      toast({ title: '✓ Переписка удалена' });
    },
    onError: () => toast({ title: 'Не удалось удалить переписку', variant: 'destructive' }),
  });

  /* ── Browser notifications for new messages ──────────────────────── */
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    const convs = convRaw as Conversation[];
    if (!convs.length) return;

    const current = new Map(convs.map(c => [convKey(c), c.lastMessageAt]));

    if (notifInitRef.current) {
      for (const [key, lastAt] of current) {
        const prevLastAt = prevConvsRef.current.get(key);
        const isNew = prevLastAt !== undefined && new Date(String(prevLastAt)) < new Date(String(lastAt));
        if (isNew) {
          const conv = convs.find(c => convKey(c) === key);
          if (!conv) continue;
          const title = `Новое письмо от ${conv.contactName || conv.contactEmail}`;
          const body = (conv.lastMessage || '').slice(0, 80);
          if ('Notification' in window && Notification.permission === 'granted' && document.visibilityState !== 'visible') {
            const notif = new Notification(title, { body, icon: '/favicon.ico', tag: key });
            const targetSenderId = conv.senderId;
            const targetEmail = conv.contactEmail;
            notif.onclick = () => {
              window.focus();
              navigate(`/inbox?senderId=${encodeURIComponent(targetSenderId)}&contactEmail=${encodeURIComponent(targetEmail)}`);
            };
          } else {
            toast({
              title,
              description: body,
              action: (
                <button
                  className="text-xs text-brand underline"
                  onClick={() => openConversation(conv)}
                >
                  Открыть
                </button>
              ) as any,
            });
          }
        }
      }
    }

    notifInitRef.current = true;
    prevConvsRef.current = current;
  }, [convRaw, navigate]);

  /* ── Auto-open conversation from URL params (notification click) ──── */
  useEffect(() => {
    const senderId = searchParams.get('senderId');
    const contactEmail = searchParams.get('contactEmail');
    if (senderId && contactEmail && convRaw && (convRaw as Conversation[]).length > 0) {
      const conv = (convRaw as Conversation[]).find(
        c => c.senderId === senderId && c.contactEmail === contactEmail,
      );
      if (conv && (!active || active.contactEmail !== contactEmail)) {
        openConversation(conv);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, convRaw]);

  /* ── Mark as read: optimistic + IMAP background ─────────────────── */
  const markConversationRead = useCallback(async (conv: Conversation, msgs: Message[]) => {
    const key = convKey(conv);

    // Persist read state immediately to localStorage — survives page refresh
    setReadState(prev => {
      const next = { ...prev, [key]: conv.lastMessageAt };
      saveReadState(next);
      return next;
    });

    const unread = msgs.filter(
      m => !m.isRead && m.from.address.toLowerCase() !== conv.senderEmail.toLowerCase()
    );
    if (!unread.length) return;

    await Promise.allSettled(
      unread.map(m => inboxApi.markRead(conv.senderId, m.uid).catch(() => null))
    );

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

  /* ── Effective conversations — suppress unread if user already read ── */
  const effectiveConvs = allConvs.map(c => {
    const key = convKey(c);
    const readAt = readState[key];
    // Show unread only if a new message arrived after we last read it
    const hasNewMsg = !readAt || new Date(String(c.lastMessageAt)) > new Date(readAt);
    return { ...c, unreadCount: hasNewMsg ? c.unreadCount : 0 };
  });

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
    setDeleteConvConfirm(false);
    // Optimistically mark as read immediately when opening
    setReadState(prev => {
      const next = { ...prev, [convKey(conv)]: conv.lastMessageAt };
      saveReadState(next);
      return next;
    });
    setTimeout(() => textareaRef.current?.focus(), 300);
  };

  const handleReply = () => {
    if (!active || !replyText.trim()) return;
    const lastMsg = (thread as Message[]).slice().reverse()
      .find(m => m.from.address !== active.senderEmail);
    reply.mutate({
      senderId: active.senderId,
      to: active.contactEmail,
      subject: lastMsg?.subject ?? 'Re: ваше письмо',
      body: replyText.trim(),
      inReplyTo: lastMsg?.messageId,
    });
  };

  const focusReply = () => {
    textareaRef.current?.focus();
    textareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // Static folder metaphor mapped to the real filter state
  const FOLDERS: { key: Filter; label: string; icon: typeof Inbox; count: number }[] = [
    { key: 'all',     label: 'Входящие',      icon: Inbox,   count: counts.all },
    { key: 'unread',  label: 'Непрочитанные', icon: MailOpen, count: counts.unread },
    { key: 'starred', label: 'Избранные',     icon: Star,    count: counts.starred },
  ];

  const curSubject = active
    ? ((thread as Message[]).find(m => m.subject)?.subject || active.lastMessage || 'Без темы')
    : '';
  const firstMsgDate = (thread as Message[])[0]?.date;
  const contactDomain = active ? (active.contactEmail.split('@')[1] || '—') : '—';

  return (
    <div className="h-full flex overflow-hidden bg-canvas text-ink">

      {/* ── Column 1 · Mailboxes / Folders / Labels ─────────────────── */}
      <aside className="hidden lg:flex w-[214px] flex-none flex-col border-r border-border bg-surface overflow-y-auto">
        <SectionLabel>Ящики</SectionLabel>
        <div className="px-2 flex flex-col gap-px">
          <button
            type="button"
            onClick={() => setSenderFilter(null)}
            className={cn(
              'flex items-center gap-[9px] px-[9px] py-[7px] rounded-lg text-left w-full transition-colors',
              senderFilter === null ? 'bg-brand-softer' : 'hover:bg-hover',
            )}
          >
            <span className="w-2 h-2 rounded-full flex-none bg-ink-3" />
            <span className={cn('flex-1 min-w-0 truncate text-[13px]', senderFilter === null ? 'font-semibold text-brand' : 'text-ink-2')}>
              Все ящики
            </span>
            <span className="text-[11px] font-bold font-mono text-ink-3">{allConvs.length}</span>
          </button>
          {senders.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSenderFilter(s.id)}
              className={cn(
                'flex items-center gap-[9px] px-[9px] py-[7px] rounded-lg text-left w-full transition-colors',
                senderFilter === s.id ? 'bg-brand-softer' : 'hover:bg-hover',
              )}
            >
              <span className={cn('w-2 h-2 rounded-full flex-none', DOT_COLORS[i % DOT_COLORS.length])} />
              <span className={cn('flex-1 min-w-0 truncate text-[13px]', senderFilter === s.id ? 'font-semibold text-brand' : 'text-ink-2')}>
                {s.email}
              </span>
              <span className="text-[11px] font-bold font-mono text-ink-3">{s.count}</span>
            </button>
          ))}
        </div>

        <SectionLabel>Папки</SectionLabel>
        <div className="px-2 flex flex-col gap-px">
          {FOLDERS.map(({ key, label, icon: Icon, count }) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={cn(
                'flex items-center gap-[10px] px-[9px] py-[7px] rounded-lg text-left w-full transition-colors',
                filter === key ? 'bg-brand-softer text-brand font-semibold' : 'text-ink-2 hover:bg-hover',
              )}
            >
              <Icon className="h-4 w-4 flex-none" strokeWidth={1.7} />
              <span className="flex-1 truncate text-[13px]">{label}</span>
              {count > 0 && <span className="text-[11px] font-bold font-mono text-ink-3">{count}</span>}
            </button>
          ))}
          {/* Visual-only folders (no backing API) */}
          <div className="flex items-center gap-[10px] px-[9px] py-[7px] rounded-lg text-ink-3 text-[13px]">
            <Send className="h-4 w-4 flex-none" strokeWidth={1.7} /><span className="flex-1">Отправленные</span>
          </div>
          <div className="flex items-center gap-[10px] px-[9px] py-[7px] rounded-lg text-ink-3 text-[13px]">
            <FileText className="h-4 w-4 flex-none" strokeWidth={1.7} /><span className="flex-1">Черновики</span>
          </div>
          <div className="flex items-center gap-[10px] px-[9px] py-[7px] rounded-lg text-ink-3 text-[13px]">
            <Archive className="h-4 w-4 flex-none" strokeWidth={1.7} /><span className="flex-1">Архив</span>
          </div>
        </div>

        <SectionLabel>Метки</SectionLabel>
        <div className="px-3 flex flex-col gap-1.5 pb-4">
          <div className="flex items-center gap-2 text-[12.5px] text-ink-2">
            <span className="w-[9px] h-[9px] rounded-[3px] bg-info" />Лиды
          </div>
          <div className="flex items-center gap-2 text-[12.5px] text-ink-2">
            <span className="w-[9px] h-[9px] rounded-[3px] bg-success" />Клиенты
          </div>
          <div className="flex items-center gap-2 text-[12.5px] text-ink-2">
            <span className="w-[9px] h-[9px] rounded-[3px] bg-warn" />Ответы на кампании
          </div>
        </div>
      </aside>

      {/* ── Column 2 · Message list ─────────────────────────────────── */}
      <section className={cn(
        'w-full md:w-[372px] flex-none flex flex-col border-r border-border bg-surface min-h-0',
        active && 'hidden md:flex',
      )}>
        <div className="h-[46px] flex-none flex items-center gap-1.5 px-3 border-b border-border">
          <span className="font-bold text-[13.5px]">Входящие</span>
          <span className="text-[11.5px] text-ink-3 font-mono">{filtered.length}</span>
          <div className="flex-1" />
          <button
            type="button"
            onClick={() => setFilter(f => (f === 'unread' ? 'all' : 'unread'))}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-[5px] border rounded-lg text-xs transition-colors',
              filter === 'unread'
                ? 'bg-brand-softer border-brand text-brand'
                : 'border-border text-ink-2 hover:bg-hover',
            )}
          >
            <Filter className="h-3 w-3" strokeWidth={2} />
            Непрочитанные
          </button>
          {totalUnread > 0 && (
            markAllConfirm ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => markAllReadMutation.mutate()}
                  disabled={markAllReadMutation.isPending}
                  className="flex items-center gap-1 text-[11px] font-medium bg-brand text-white px-2 py-1 rounded-lg hover:brightness-105"
                >
                  {markAllReadMutation.isPending ? <RefreshCw className="h-3 w-3 animate-spin" /> : <CheckCheck className="h-3 w-3" />}
                  ОК
                </button>
                <button type="button" onClick={() => setMarkAllConfirm(false)} className="w-6 h-6 rounded-lg hover:bg-hover flex items-center justify-center text-ink-3">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setMarkAllConfirm(true)}
                title="Отметить все как прочитанные"
                className="w-[30px] h-[30px] rounded-lg flex items-center justify-center text-ink-3 hover:bg-hover"
              >
                <CheckCheck className="h-4 w-4" strokeWidth={1.8} />
              </button>
            )
          )}
          <button
            type="button"
            onClick={() => refetch()}
            title="Обновить"
            className="w-[30px] h-[30px] rounded-lg flex items-center justify-center text-ink-3 hover:bg-hover"
          >
            <RefreshCw className={cn('h-4 w-4', loadingConvs && 'animate-spin')} strokeWidth={1.8} />
          </button>
        </div>

        {/* Search */}
        <div className="flex-none px-3 py-2.5 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-3 pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Поиск контактов…"
              className="w-full pl-9 pr-8 py-2 text-sm bg-surface-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all placeholder:text-ink-3 text-ink"
            />
            {search && (
              <button type="button" onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink-2">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {loadingConvs && filtered.length === 0 ? (
            <div>{[...Array(6)].map((_, i) => <ConvSkeleton key={i} />)}</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-ink-3">
              {filter === 'starred'
                ? <><Star className="h-9 w-9 opacity-20" /><span className="text-sm font-medium">Нет избранных переписок</span></>
                : filter === 'unread'
                ? <><MailOpen className="h-9 w-9 opacity-20" /><span className="text-sm font-medium">Всё прочитано</span></>
                : <><Mail className="h-9 w-9 opacity-20" /><span className="text-sm font-medium">Пока нет переписок</span></>
              }
            </div>
          ) : (
            filtered.map(c => {
              const key = convKey(c);
              const isActive = active?.contactEmail === c.contactEmail && active?.senderId === c.senderId;
              const isStarred = starred.has(key);
              const hasUnread = c.unreadCount > 0;
              const rowBorder = isActive ? 'border-l-brand' : hasUnread ? 'border-l-brand/60' : 'border-l-transparent';

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => openConversation(c)}
                  className={cn(
                    'group relative w-full flex gap-[11px] text-left px-[13px] py-[11px] border-b border-border border-l-[2.5px] transition-colors',
                    rowBorder,
                    isActive ? 'bg-brand-softer' : 'hover:bg-hover',
                  )}
                >
                  <div className={cn(
                    'w-9 h-9 flex-none rounded-[10px] bg-gradient-to-br flex items-center justify-center text-white font-bold text-[12.5px]',
                    avatarGradient(c.contactEmail),
                  )}>
                    {initials(c.contactName, c.contactEmail)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      {hasUnread && <span className="w-[7px] h-[7px] rounded-full bg-brand flex-none" />}
                      <span className={cn('flex-1 min-w-0 truncate text-[13px]', hasUnread ? 'font-bold text-ink' : 'font-medium text-ink-2')}>
                        {c.contactName || c.contactEmail}
                      </span>
                      <span className="text-[11px] text-ink-3 flex-none font-mono">{timeAgo(c.lastMessageAt)}</span>
                    </div>
                    <div className="text-[12px] text-ink-3 truncate mb-1.5">{c.lastMessage || '…'}</div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10.5px] font-semibold px-[7px] py-0.5 rounded-[5px] bg-surface-3 text-ink-2 truncate max-w-[180px]">
                        {c.senderEmail}
                      </span>
                      {hasUnread && (
                        <span className="text-[10.5px] font-semibold px-[7px] py-0.5 rounded-[5px] bg-brand-soft text-brand">Новое</span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={e => toggleStar(e, key)}
                    className={cn(
                      'absolute right-2.5 top-2.5 transition-colors',
                      isStarred ? 'text-warn' : 'text-ink-3 opacity-0 group-hover:opacity-100 hover:text-warn',
                    )}
                  >
                    <Star className={cn('h-3.5 w-3.5', isStarred && 'fill-warn')} />
                  </button>
                </button>
              );
            })
          )}
        </div>
      </section>

      {/* ── Column 3 · Reading pane ─────────────────────────────────── */}
      <div className={cn('flex-1 min-w-0 flex flex-col bg-canvas', !active && 'hidden md:flex')}>
        {!active ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-ink-3">
            <div className="w-16 h-16 rounded-2xl bg-surface border border-border flex items-center justify-center">
              <Mail className="h-7 w-7 text-brand" strokeWidth={1.7} />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-ink-2">Выберите переписку</p>
              <p className="text-xs text-ink-3 mt-1">Выберите письмо из списка, чтобы начать чтение</p>
            </div>
            {totalUnread > 0 && (
              <div className="bg-brand-softer border border-brand/30 rounded-xl px-5 py-3 text-center">
                <p className="text-[13px] font-semibold text-brand">Непрочитанных писем: {totalUnread}</p>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Toolbar */}
            <div className="h-[46px] flex-none flex items-center gap-1 px-3.5 border-b border-border bg-surface">
              <button
                type="button"
                className="md:hidden w-8 h-8 rounded-lg flex items-center justify-center text-ink-3 hover:bg-hover"
                onClick={() => setActive(null)}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={focusReply}
                className="flex items-center gap-1.5 px-[11px] py-1.5 rounded-lg text-[12.5px] font-semibold text-ink-2 hover:bg-hover"
              >
                <Reply className="h-[15px] w-[15px]" strokeWidth={2} />Ответить
              </button>
              <button
                type="button"
                onClick={focusReply}
                className="flex items-center gap-1.5 px-[11px] py-1.5 rounded-lg text-[12.5px] font-semibold text-ink-2 hover:bg-hover"
              >
                <Forward className="h-[15px] w-[15px]" strokeWidth={2} />Переслать
              </button>
              <div className="flex-1" />
              <button
                type="button"
                onClick={() => markConvUnreadMutation.mutate(active)}
                disabled={markConvUnreadMutation.isPending}
                title="Отметить как непрочитанное"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-3 hover:bg-hover"
              >
                {markConvUnreadMutation.isPending
                  ? <RefreshCw className="h-4 w-4 animate-spin" strokeWidth={1.8} />
                  : <EyeOff className="h-4 w-4" strokeWidth={1.8} />}
              </button>
              {deleteConvConfirm ? (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => deleteConversationMutation.mutate({ senderId: active.senderId, contactEmail: active.contactEmail })}
                    disabled={deleteConversationMutation.isPending}
                    className="flex items-center gap-1 text-[11px] font-medium bg-danger text-white px-2.5 py-1 rounded-lg hover:brightness-105"
                  >
                    {deleteConversationMutation.isPending ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                    Удалить
                  </button>
                  <button type="button" onClick={() => setDeleteConvConfirm(false)} className="w-6 h-6 rounded-lg hover:bg-hover flex items-center justify-center text-ink-3">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setDeleteConvConfirm(true)}
                  title="Удалить переписку"
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-3 hover:bg-hover hover:text-danger"
                >
                  <Trash2 className="h-4 w-4" strokeWidth={1.8} />
                </button>
              )}
              <button type="button" title="Ещё" className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-3 hover:bg-hover">
                <MoreHorizontal className="h-4 w-4" strokeWidth={1.8} />
              </button>
            </div>

            <div className="flex-1 min-h-0 flex">
              {/* Reading + compose */}
              <div className="flex-1 min-w-0 overflow-y-auto px-6 py-5">
                <div className="flex items-start gap-2.5 mb-4">
                  <h1 className="flex-1 text-[19px] font-bold tracking-[-0.3px] leading-tight">{curSubject}</h1>
                  <button
                    type="button"
                    onClick={e => toggleStar(e, convKey(active))}
                    className={cn('w-[30px] h-[30px] flex-none flex items-center justify-center', starred.has(convKey(active)) ? 'text-warn' : 'text-ink-3 hover:text-warn')}
                  >
                    <Star className={cn('h-[18px] w-[18px]', starred.has(convKey(active)) && 'fill-warn')} strokeWidth={1.6} />
                  </button>
                </div>
                <div className="flex items-center gap-1.5 mb-4 flex-wrap">
                  <span className="text-[11px] font-semibold px-[9px] py-[3px] rounded-md bg-surface-3 text-ink-2">{active.senderEmail}</span>
                  {active.unreadCount > 0 && (
                    <span className="text-[11px] font-semibold px-[9px] py-[3px] rounded-md bg-brand-soft text-brand">Новое</span>
                  )}
                </div>

                {/* Thread */}
                {loadingThread ? (
                  <div className="space-y-4">
                    {[...Array(2)].map((_, i) => (
                      <div key={i} className="skeleton h-32 rounded-xl" />
                    ))}
                  </div>
                ) : (thread as Message[]).length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 gap-3 text-ink-3">
                    <Mail className="h-8 w-8 opacity-20" /><span className="text-sm">Пока нет писем</span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {(thread as Message[]).map((msg, i) => {
                      const isSent = msg.from.address.toLowerCase() === active.senderEmail.toLowerCase();
                      return (
                        <EmailCard
                          key={`${msg.uid}-${i}`}
                          msg={msg}
                          senderEmail={active.senderEmail}
                          contactEmail={active.contactEmail}
                          onDelete={!isSent ? () => deleteMessageMutation.mutate({ senderId: active.senderId, uid: msg.uid }) : undefined}
                        />
                      );
                    })}
                  </div>
                )}

                {/* Compose */}
                <div className="mt-4 bg-surface border border-border rounded-xl shadow-soft">
                  <div className="px-4 py-3 border-b border-border flex items-center gap-2.5 flex-wrap">
                    <span className="text-xs text-ink-3">Ответить с</span>
                    <div className="flex items-center gap-1.5 px-2.5 py-[5px] border border-border rounded-lg bg-surface-2 font-semibold text-[12.5px]">
                      <span className={cn('w-2 h-2 rounded-full bg-gradient-to-br', avatarGradient(active.contactEmail))} />
                      {active.senderEmail}
                    </div>
                    <div className="flex-1" />
                    <span className="text-xs text-ink-3 truncate">кому {active.contactName || active.contactEmail}</span>
                  </div>
                  <div className="flex items-center gap-0.5 px-3 py-[7px] border-b border-border text-ink-3">
                    {[Bold, Italic, Underline].map((Ic, i) => (
                      <button key={i} type="button" className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-hover">
                        <Ic className="h-[15px] w-[15px]" strokeWidth={1.8} />
                      </button>
                    ))}
                    <span className="w-px h-4 bg-border mx-1" />
                    {[List, Link2, Paperclip].map((Ic, i) => (
                      <button key={i} type="button" className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-hover">
                        <Ic className="h-[15px] w-[15px]" strokeWidth={1.8} />
                      </button>
                    ))}
                  </div>
                  <textarea
                    ref={textareaRef}
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleReply(); }}
                    placeholder="Напишите ответ…"
                    className="w-full min-h-[96px] resize-y border-none outline-none px-4 py-3.5 bg-transparent text-[13.5px] leading-relaxed text-ink placeholder:text-ink-3"
                  />
                  <div className="flex items-center gap-2 px-3.5 py-2.5 border-t border-border">
                    <button
                      type="button"
                      onClick={handleReply}
                      disabled={reply.isPending || !replyText.trim()}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-[9px] text-white font-semibold text-[13px] hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ background: 'linear-gradient(135deg,var(--accent),var(--accent-2))', boxShadow: '0 6px 14px -6px var(--accent)' }}
                    >
                      {reply.isPending ? <RefreshCw className="h-[15px] w-[15px] animate-spin" /> : <>Отправить<Send className="h-[15px] w-[15px]" strokeWidth={2} /></>}
                    </button>
                    <div className="flex-1" />
                    <span className="text-[11.5px] text-ink-3">Ctrl+Enter — отправить</span>
                  </div>
                </div>
                <div ref={bottomRef} />
              </div>

              {/* Contact profile column */}
              <aside className="hidden xl:block w-[288px] flex-none border-l border-border bg-surface overflow-y-auto px-4 py-[18px]">
                <div className="flex flex-col items-center text-center pb-4 border-b border-border">
                  <div className={cn(
                    'w-[60px] h-[60px] rounded-2xl bg-gradient-to-br flex items-center justify-center text-white font-bold text-xl mb-2.5',
                    avatarGradient(active.contactEmail),
                  )}>
                    {initials(active.contactName, active.contactEmail)}
                  </div>
                  <div className="font-bold text-[15px]">{active.contactName || active.contactEmail}</div>
                  <div className="text-xs text-ink-3 mb-2 truncate max-w-full">{active.contactEmail}</div>
                  <span className={cn(
                    'text-[11px] font-semibold px-2.5 py-[3px] rounded-full',
                    active.unreadCount > 0 ? 'bg-brand-soft text-brand' : 'bg-success-soft text-success',
                  )}>
                    {active.unreadCount > 0 ? 'Новое сообщение' : 'Активный контакт'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 py-4 border-b border-border">
                  <div className="bg-surface-2 rounded-[10px] px-[11px] py-2.5">
                    <div className="text-[10.5px] text-ink-3 mb-0.5">Писем</div>
                    <div className="text-lg font-bold font-mono text-success">{(thread as Message[]).length}</div>
                  </div>
                  <div className="bg-surface-2 rounded-[10px] px-[11px] py-2.5">
                    <div className="text-[10.5px] text-ink-3 mb-0.5">Непрочитано</div>
                    <div className="text-lg font-bold font-mono text-ink-2">{active.unreadCount}</div>
                  </div>
                </div>

                <div className="py-4 border-b border-border flex flex-col gap-[11px]">
                  <div className="flex items-center gap-2.5">
                    <Building2 className="h-[15px] w-[15px] flex-none text-ink-3" strokeWidth={1.8} />
                    <div className="min-w-0">
                      <div className="text-[10.5px] text-ink-3">Компания</div>
                      <div className="font-semibold text-[12.5px] truncate">{contactDomain}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Phone className="h-[15px] w-[15px] flex-none text-ink-3" strokeWidth={1.8} />
                    <div className="min-w-0">
                      <div className="text-[10.5px] text-ink-3">Ящик</div>
                      <div className="font-semibold text-[12.5px] truncate">{active.senderEmail}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Calendar className="h-[15px] w-[15px] flex-none text-ink-3" strokeWidth={1.8} />
                    <div className="min-w-0">
                      <div className="text-[10.5px] text-ink-3">Первое письмо</div>
                      <div className="font-semibold text-[12.5px]">{firstMsgDate ? formatDate(firstMsgDate) : '—'}</div>
                    </div>
                  </div>
                </div>

                <div className="py-4">
                  <div className="text-[10.5px] font-bold tracking-[0.5px] text-ink-3 uppercase mb-2.5">История</div>
                  <div className="flex flex-col gap-[11px]">
                    {(thread as Message[]).slice(-4).reverse().map((m, i) => {
                      const isSent = m.from.address.toLowerCase() === active.senderEmail.toLowerCase();
                      return (
                        <div key={`${m.uid}-h${i}`} className="flex gap-2.5">
                          <span className={cn('w-2 h-2 rounded-full mt-1 flex-none', isSent ? 'bg-info' : 'bg-success')} />
                          <div className="min-w-0">
                            <div className="text-[12.5px] font-semibold truncate">
                              {isSent ? 'Вы ответили' : 'Получено письмо'}
                            </div>
                            <div className="text-[11px] text-ink-3">{timeAgo(m.date)} назад</div>
                          </div>
                        </div>
                      );
                    })}
                    {(thread as Message[]).length === 0 && (
                      <div className="text-[12px] text-ink-3">Нет активности</div>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => navigate('/contacts')}
                  className="w-full mt-2 py-2.5 rounded-[9px] border border-border font-semibold text-[12.5px] text-brand hover:bg-brand-softer transition-colors"
                >
                  Открыть профиль контакта
                </button>
              </aside>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
