'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import { useProjectStore } from '@/stores/projectStore';
import { getSupabaseClient } from '@/lib/supabase';
import {
  fetchDirectConversations,
  fetchProjectConversations,
  fetchDirectThread,
  fetchProjectThread,
  fetchAnnouncements,
  sendMessage,
  createAnnouncement,
  type DirectConversation,
  type ProjectConversation,
  type InboxAnnouncement,
  type InboxMessage,
} from '@/lib/inbox';

const supabase = getSupabaseClient();

type Tab = 'direct' | 'projects' | 'announcements' | 'approvals';

const urgencyColors = {
  red: '#E5484D',
  yellow: '#F5A623',
  green: '#2EBD85',
} as const;

function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

export default function InboxPage() {
  const [activeTab, setActiveTab] = useState<Tab>('direct');
  const [direct, setDirect] = useState<DirectConversation[]>([]);
  const [projectConvos, setProjectConvos] = useState<ProjectConversation[]>([]);
  const [announcements, setAnnouncements] = useState<InboxAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDirect, setSelectedDirect] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [showNewAnnouncement, setShowNewAnnouncement] = useState(false);
  const [showNewMessage, setShowNewMessage] = useState(false);

  const projects = useProjectStore((s) => s.projects);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [d, p, a] = await Promise.all([
      fetchDirectConversations(),
      fetchProjectConversations(),
      fetchAnnouncements(),
    ]);
    setDirect(d);
    setProjectConvos(p);
    setAnnouncements(a);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const directUnread = direct.reduce((s, c) => s + c.unread, 0);
  const projectUnread = projectConvos.reduce((s, c) => s + c.unread, 0);

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'direct', label: 'Direct', count: directUnread || undefined },
    { key: 'projects', label: 'Projects', count: projectUnread || undefined },
    { key: 'announcements', label: 'Announcements' },
    { key: 'approvals', label: 'Approvals' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-[1400px] mx-auto space-y-6"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold text-dark-navy">Inbox</h1>
        {activeTab === 'direct' && (
          <button
            onClick={() => setShowNewMessage(true)}
            className="bg-steel-blue hover:bg-steel-blue/90 text-white px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 transition-colors"
          >
            <span className="text-lg leading-none">+</span>
            New Message
          </button>
        )}
        {activeTab === 'announcements' && (
          <button
            onClick={() => setShowNewAnnouncement(true)}
            className="bg-steel-blue hover:bg-steel-blue/90 text-white px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 transition-colors"
          >
            <span className="text-lg leading-none">+</span>
            New Announcement
          </button>
        )}
      </div>

      <div className="segmented-control">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`segment ${activeTab === tab.key ? 'segment-active' : ''}`}
          >
            {tab.label}
            {tab.count && (
              <span className="ml-1 text-[10px] bg-steel-blue text-white w-5 h-5 rounded-full inline-flex items-center justify-center">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading && <div className="text-slate-blue-gray text-sm">Loading...</div>}

      {!loading && activeTab === 'direct' && (
        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4 h-[70vh]">
          <Card padding={false} className="overflow-y-auto">
            {direct.length === 0 ? (
              <div className="text-center text-slate-blue-gray py-12 text-sm px-4">
                No conversations yet
              </div>
            ) : (
              direct.map((conv) => (
                <button
                  key={conv.otherUserId}
                  onClick={() => setSelectedDirect(conv.otherUserId)}
                  className={`w-full text-left flex items-start gap-3 p-4 border-b border-frost-white hover:bg-frost-white transition-colors ${
                    selectedDirect === conv.otherUserId ? 'bg-frost-white' : ''
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-steel-blue text-white flex items-center justify-center flex-shrink-0 text-sm font-semibold">
                    {getInitials(conv.otherName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-sm truncate ${conv.unread > 0 ? 'font-bold text-dark-navy' : 'font-medium text-dark-navy'}`}>
                        {conv.otherName}
                      </span>
                      <span className="text-[10px] text-slate-blue-gray flex-shrink-0">
                        {timeAgo(conv.lastAt)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-blue-gray truncate mt-0.5">{conv.lastBody}</p>
                  </div>
                  {conv.unread > 0 && (
                    <span className="bg-steel-blue text-white text-[10px] font-semibold rounded-full min-w-[18px] h-[18px] inline-flex items-center justify-center px-1.5 flex-shrink-0">
                      {conv.unread}
                    </span>
                  )}
                </button>
              ))
            )}
          </Card>

          <Card padding={false} className="flex flex-col overflow-hidden">
            {selectedDirect ? (
              <ChatThread
                key={selectedDirect}
                kind="direct"
                id={selectedDirect}
                onSent={refresh}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-blue-gray text-sm">
                Select a conversation
              </div>
            )}
          </Card>
        </div>
      )}

      {!loading && activeTab === 'projects' && (
        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4 h-[70vh]">
          <Card padding={false} className="overflow-y-auto">
            {projects.length === 0 ? (
              <div className="text-center text-slate-blue-gray py-12 text-sm px-4">
                No projects yet
              </div>
            ) : (
              projects.map((p) => {
                const conv = projectConvos.find((c) => c.projectId === p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedProject(p.id)}
                    className={`w-full text-left flex items-start gap-3 p-4 border-b border-frost-white hover:bg-frost-white transition-colors ${
                      selectedProject === p.id ? 'bg-frost-white' : ''
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-steel-blue/20 text-steel-blue flex items-center justify-center flex-shrink-0 text-sm font-semibold">
                      {getInitials(p.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-sm truncate ${conv && conv.unread > 0 ? 'font-bold text-dark-navy' : 'font-medium text-dark-navy'}`}>
                          {p.name}
                        </span>
                        {conv && (
                          <span className="text-[10px] text-slate-blue-gray flex-shrink-0">
                            {timeAgo(conv.lastAt)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-blue-gray truncate mt-0.5">
                        {conv?.lastBody || 'No messages yet'}
                      </p>
                    </div>
                    {conv && conv.unread > 0 && (
                      <span className="bg-steel-blue text-white text-[10px] font-semibold rounded-full min-w-[18px] h-[18px] inline-flex items-center justify-center px-1.5 flex-shrink-0">
                        {conv.unread}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </Card>

          <Card padding={false} className="flex flex-col overflow-hidden">
            {selectedProject ? (
              <ChatThread
                key={selectedProject}
                kind="project"
                id={selectedProject}
                onSent={refresh}
                projectName={projects.find((p) => p.id === selectedProject)?.name}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-blue-gray text-sm">
                Select a project
              </div>
            )}
          </Card>
        </div>
      )}

      {!loading && activeTab === 'announcements' && (
        <div className="space-y-3">
          {announcements.length === 0 ? (
            <div className="text-center text-slate-blue-gray py-12 text-sm">No announcements yet</div>
          ) : (
            announcements.map((ann) => (
              <Card key={ann.id}>
                <div className="border-l-4 -ml-6 pl-6" style={{ borderLeftColor: urgencyColors[ann.urgency] }}>
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold text-dark-navy">{ann.title}</h3>
                    <span
                      className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full text-white"
                      style={{ backgroundColor: urgencyColors[ann.urgency] }}
                    >
                      {ann.urgency === 'red' ? 'High' : ann.urgency === 'yellow' ? 'Medium' : 'Low'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-blue-gray mt-2 leading-relaxed whitespace-pre-wrap">
                    {ann.description}
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <span className="text-xs font-medium text-steel-blue">{ann.authorName}</span>
                    {ann.projectName && (
                      <>
                        <span className="text-xs text-slate-blue-gray">·</span>
                        <span className="text-xs text-slate-blue-gray">{ann.projectName}</span>
                      </>
                    )}
                    <span className="text-xs text-slate-blue-gray">·</span>
                    <span className="text-xs text-slate-blue-gray">{ann.announcementDate}</span>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {!loading && activeTab === 'approvals' && (
        <div className="text-center text-slate-blue-gray py-12 text-sm">No approvals yet</div>
      )}

      {showNewMessage && (
        <NewDirectModal
          onClose={() => setShowNewMessage(false)}
          onSent={(otherUserId) => {
            setShowNewMessage(false);
            refresh();
            if (otherUserId) {
              setSelectedDirect(otherUserId);
              setActiveTab('direct');
            }
          }}
        />
      )}

      {showNewAnnouncement && (
        <NewAnnouncementModal
          projects={projects}
          onClose={() => setShowNewAnnouncement(false)}
          onCreated={() => {
            setShowNewAnnouncement(false);
            refresh();
          }}
        />
      )}
    </motion.div>
  );
}

function ChatThread({
  kind,
  id,
  onSent,
  projectName,
}: {
  kind: 'direct' | 'project';
  id: string;
  onSent: () => void;
  projectName?: string;
}) {
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [myId, setMyId] = useState<string | null>(null);
  const [headerName, setHeaderName] = useState<string>(projectName || '');
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    const msgs = kind === 'direct' ? await fetchDirectThread(id) : await fetchProjectThread(id);
    setMessages(msgs);
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    }, 50);
  }, [kind, id]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setMyId(user?.id ?? null);
      if (kind === 'direct') {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', id)
          .maybeSingle();
        let name = (profile?.full_name as string) || '';
        if (!name) {
          const { data: emails } = await supabase.rpc('get_user_emails_by_ids', { ids: [id] });
          if (emails && (emails as Record<string, unknown>[]).length > 0) {
            name = ((emails as Record<string, unknown>[])[0].email as string) || 'User';
          }
        }
        setHeaderName(name || 'User');
      } else {
        setHeaderName(projectName || 'Project');
      }
      await refresh();
    })();
  }, [kind, id, projectName, refresh]);

  useEffect(() => {
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [refresh]);

  const handleSend = async () => {
    if (!body.trim()) return;
    setSending(true);
    setError(null);
    const text = body;
    setBody('');
    const res =
      kind === 'direct'
        ? await sendMessage({ body: text, recipientUserId: id, projectId: null })
        : await sendMessage({ body: text, projectId: id });
    setSending(false);
    if (res.error) {
      setError(res.error);
      setBody(text);
      return;
    }
    await refresh();
    onSent();
  };

  return (
    <>
      <div className="flex items-center gap-3 p-4 border-b border-frost-white">
        <div className="w-10 h-10 rounded-full bg-steel-blue/20 text-steel-blue flex items-center justify-center text-sm font-semibold">
          {getInitials(headerName || '?')}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-dark-navy text-sm truncate">{headerName}</div>
          {kind === 'project' && <div className="text-[11px] text-slate-blue-gray">Project chat</div>}
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2 bg-frost-white/30">
        {messages.length === 0 ? (
          <div className="text-center text-slate-blue-gray text-sm pt-8">
            {kind === 'project' ? 'No messages yet — say hello' : 'Start the conversation'}
          </div>
        ) : (
          messages.map((m, i) => {
            const mine = m.senderId === myId;
            const prev = messages[i - 1];
            const showSender =
              kind === 'project' && !mine && (!prev || prev.senderId !== m.senderId);
            return (
              <div
                key={m.id}
                className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
              >
                <div className="max-w-[75%]">
                  {showSender && (
                    <div className="text-[11px] text-slate-blue-gray ml-3 mb-0.5">{m.senderName}</div>
                  )}
                  <div
                    className={`px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap ${
                      mine
                        ? 'bg-steel-blue text-white rounded-br-sm'
                        : 'bg-white text-dark-navy rounded-bl-sm shadow-sm'
                    }`}
                  >
                    {m.body}
                    <div className={`text-[10px] mt-1 text-right ${mine ? 'text-white/70' : 'text-slate-blue-gray'}`}>
                      {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {error && <div className="text-xs text-rejected px-4 py-2 bg-rejected/5">{error}</div>}

      <div className="flex gap-2 items-end p-3 border-t border-frost-white bg-white">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          rows={1}
          placeholder={kind === 'project' ? 'Message the team...' : 'Message...'}
          className="flex-1 border border-frost-white rounded-2xl px-4 py-2 text-sm resize-none focus:outline-none focus:border-steel-blue text-dark-navy max-h-32"
        />
        <button
          onClick={handleSend}
          disabled={sending || !body.trim()}
          className="bg-steel-blue text-white px-4 py-2 rounded-full text-sm font-semibold disabled:opacity-50"
        >
          {sending ? '...' : 'Send'}
        </button>
      </div>
    </>
  );
}

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-frost-white sticky top-0 bg-white">
          <h2 className="text-lg font-semibold text-dark-navy">{title}</h2>
          <button
            onClick={onClose}
            className="text-slate-blue-gray hover:text-dark-navy text-2xl leading-none"
          >
            ×
          </button>
        </div>
        <div className="p-4 space-y-4">{children}</div>
      </div>
    </div>
  );
}

function NewDirectModal({
  onClose,
  onSent,
}: {
  onClose: () => void;
  onSent: (otherUserId: string | null) => void;
}) {
  const [recipientEmail, setRecipientEmail] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    setError(null);
    if (!body.trim()) return setError('Message required');
    if (!recipientEmail.trim()) return setError('Recipient email required');
    setSending(true);
    const res = await sendMessage({
      body,
      recipientEmail: recipientEmail.trim(),
      projectId: null,
    });
    setSending(false);
    if (res.error) return setError(res.error);
    // Try to resolve target user id
    const { data: targetId } = await supabase.rpc('lookup_user_id_by_email', {
      lookup_email: recipientEmail.trim(),
    });
    onSent((targetId as string) || null);
  };

  return (
    <ModalShell title="New Message" onClose={onClose}>
      <div>
        <label className="text-xs uppercase font-medium text-slate-blue-gray tracking-wide">
          Recipient email
        </label>
        <input
          type="email"
          value={recipientEmail}
          onChange={(e) => setRecipientEmail(e.target.value)}
          placeholder="someone@example.com"
          className="mt-1 w-full border border-frost-white rounded-lg px-3 py-2 text-sm text-dark-navy"
        />
      </div>

      <div>
        <label className="text-xs uppercase font-medium text-slate-blue-gray tracking-wide">
          Message
        </label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
          className="mt-1 w-full border border-frost-white rounded-lg px-3 py-2 text-sm text-dark-navy"
        />
      </div>

      {error && <p className="text-sm text-rejected">{error}</p>}

      <div className="flex gap-2 justify-end pt-2">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-slate-blue-gray hover:text-dark-navy"
        >
          Cancel
        </button>
        <button
          onClick={handleSend}
          disabled={sending}
          className="px-4 py-2 bg-steel-blue text-white rounded-full text-sm font-semibold disabled:opacity-50"
        >
          {sending ? 'Sending...' : 'Send'}
        </button>
      </div>
    </ModalShell>
  );
}

function NewAnnouncementModal({
  projects,
  onClose,
  onCreated,
}: {
  projects: { id: string; name: string }[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [projectId, setProjectId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sameDay, setSameDay] = useState(true);
  const [date, setDate] = useState(today);
  const [urgency, setUrgency] = useState<'red' | 'yellow' | 'green'>('green');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    setError(null);
    if (!title.trim()) return setError('Title required');
    setCreating(true);
    const res = await createAnnouncement({
      title,
      description,
      announcementDate: sameDay ? today : date,
      urgency,
      projectId: projectId || null,
    });
    setCreating(false);
    if (res.error) return setError(res.error);
    onCreated();
  };

  return (
    <ModalShell title="New Announcement" onClose={onClose}>
      <div>
        <label className="text-xs uppercase font-medium text-slate-blue-gray tracking-wide">Title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 w-full border border-frost-white rounded-lg px-3 py-2 text-sm text-dark-navy"
        />
      </div>

      <div>
        <label className="text-xs uppercase font-medium text-slate-blue-gray tracking-wide">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="mt-1 w-full border border-frost-white rounded-lg px-3 py-2 text-sm text-dark-navy"
        />
      </div>

      <div>
        <label className="text-xs uppercase font-medium text-slate-blue-gray tracking-wide">Date</label>
        <div className="flex gap-2 mt-1">
          <button
            onClick={() => setSameDay(true)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
              sameDay ? 'bg-steel-blue text-white border-steel-blue' : 'border-frost-white text-dark-navy'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setSameDay(false)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
              !sameDay ? 'bg-steel-blue text-white border-steel-blue' : 'border-frost-white text-dark-navy'
            }`}
          >
            Pick a date
          </button>
        </div>
        {!sameDay && (
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-2 w-full border border-frost-white rounded-lg px-3 py-2 text-sm text-dark-navy"
          />
        )}
      </div>

      <div>
        <label className="text-xs uppercase font-medium text-slate-blue-gray tracking-wide">Urgency</label>
        <select
          value={urgency}
          onChange={(e) => setUrgency(e.target.value as 'red' | 'yellow' | 'green')}
          className="mt-1 w-full border border-frost-white rounded-lg px-3 py-2 text-sm text-dark-navy"
          style={{ borderLeftWidth: 6, borderLeftColor: urgencyColors[urgency] }}
        >
          <option value="green">Green — Low</option>
          <option value="yellow">Yellow — Medium</option>
          <option value="red">Red — High</option>
        </select>
      </div>

      <div>
        <label className="text-xs uppercase font-medium text-slate-blue-gray tracking-wide">Project (optional)</label>
        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="mt-1 w-full border border-frost-white rounded-lg px-3 py-2 text-sm bg-white text-dark-navy"
        >
          <option value="">None</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-sm text-rejected">{error}</p>}

      <div className="flex gap-2 justify-end pt-2">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-slate-blue-gray hover:text-dark-navy"
        >
          Cancel
        </button>
        <button
          onClick={handleCreate}
          disabled={creating}
          className="px-4 py-2 bg-steel-blue text-white rounded-full text-sm font-semibold disabled:opacity-50"
        >
          {creating ? 'Posting...' : 'Post'}
        </button>
      </div>
    </ModalShell>
  );
}
