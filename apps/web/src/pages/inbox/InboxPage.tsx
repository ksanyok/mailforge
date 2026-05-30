import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, RefreshCw, Mail, ChevronLeft, Circle } from 'lucide-react';
import { inboxApi } from '@/api/index';
import { cn } from '@/utils/cn';

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

function cleanText(raw: string): string {
  return raw
    .replace(/=\r?\n/g, '')          // quoted-printable soft breaks
    .replace(/=([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/<[^>]+>/g, '')
    .trim();
}

export function InboxPage() {
  const [search, setSearch] = useState('');
  const [active, setActive] = useState<Conversation | null>(null);
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

  const convs = (convRaw as Conversation[]).filter(
    (c) =>
      !search ||
      c.contactEmail.toLowerCase().includes(search.toLowerCase()) ||
      c.contactName.toLowerCase().includes(search.toLowerCase()),
  );

  const openConversation = (conv: Conversation) => {
    setActive(conv);
    const unread = (thread as Message[]).filter((m) => !m.isRead && m.from.address !== conv.senderEmail);
    unread.forEach((m) => markRead.mutate({ senderId: conv.senderId, uid: m.uid }));
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

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loadingConvs && convs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2 text-gray-400">
              <RefreshCw className="h-5 w-5 animate-spin" />
              <span className="text-sm">Loading…</span>
            </div>
          ) : convs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2 text-gray-400">
              <Mail className="h-7 w-7 opacity-40" />
              <span className="text-sm">No conversations yet</span>
            </div>
          ) : (
            convs.map((c) => {
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
                  {/* Avatar */}
                  <div className="shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-sm font-semibold">
                    {initials(c.contactName, c.contactEmail)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className={cn('text-sm truncate', c.unreadCount > 0 ? 'font-semibold text-gray-900' : 'font-medium text-gray-700')}>
                        {c.contactName || c.contactEmail}
                      </span>
                      <span className="text-xs text-gray-400 shrink-0">
                        {timeAgo(c.lastMessageAt)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 truncate mt-0.5">{c.senderEmail}</p>
                    <p className={cn('text-xs truncate mt-0.5', c.unreadCount > 0 ? 'text-gray-700 font-medium' : 'text-gray-400')}>
                      {c.lastMessage || '…'}
                    </p>
                  </div>

                  {/* Unread badge */}
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
              <button
                className="md:hidden p-1 rounded hover:bg-gray-100"
                onClick={() => setActive(null)}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-sm font-semibold shrink-0">
                {initials(active.contactName, active.contactEmail)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {active.contactName || active.contactEmail}
                </p>
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
                  const body = cleanText(msg.text || msg.html || '');
                  const prev = i > 0 ? (thread as Message[])[i - 1] : null;
                  const showDate = !prev || new Date(msg.date).toDateString() !== new Date(prev.date).toDateString();

                  return (
                    <div key={`${msg.uid}-${i}`}>
                      {/* Date separator */}
                      {showDate && (
                        <div className="flex items-center justify-center my-3">
                          <span className="bg-white text-xs text-gray-500 px-3 py-1 rounded-full shadow-sm">
                            {new Date(msg.date).toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' })}
                          </span>
                        </div>
                      )}

                      <div className={cn('flex items-end gap-1.5', isSent ? 'flex-row-reverse' : 'flex-row')}>
                        {/* Avatar (received only) */}
                        {!isSent && (
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-[10px] font-semibold shrink-0 mb-0.5">
                            {initials(msg.from.name, msg.from.address)}
                          </div>
                        )}

                        {/* Bubble */}
                        <div className={cn(
                          'max-w-[70%] rounded-2xl px-3.5 py-2 shadow-sm',
                          isSent
                            ? 'bg-[#25d366] text-white rounded-tr-sm'
                            : 'bg-white text-gray-800 rounded-tl-sm',
                        )}>
                          {/* Subject (first message in chain or subject changes) */}
                          {msg.subject && msg.subject !== '(no subject)' && (
                            <p className={cn(
                              'text-[11px] font-semibold mb-1 truncate',
                              isSent ? 'text-green-100' : 'text-indigo-500',
                            )}>
                              {msg.subject}
                            </p>
                          )}

                          {/* Body */}
                          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                            {body || '(empty)'}
                          </p>

                          {/* Time + read status */}
                          <div className={cn(
                            'flex items-center gap-1 mt-1 justify-end',
                            isSent ? 'text-green-100' : 'text-gray-400',
                          )}>
                            <span className="text-[10px]">{formatTime(msg.date)}</span>
                            {isSent && (
                              <span className="text-[10px]">✓✓</span>
                            )}
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
            </div>

            {/* Bottom hint */}
            <div className="bg-white border-t px-4 py-2.5 flex items-center gap-2">
              <p className="text-xs text-gray-400 flex-1">
                Reply via your email client at <span className="font-medium text-indigo-500">{active.senderEmail}</span>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
