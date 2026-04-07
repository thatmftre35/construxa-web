'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import { useProjectStore } from '@/stores/projectStore';
import {
  fetchMessages,
  fetchAnnouncements,
  sendMessage,
  createAnnouncement,
  getProjectMembers,
  markMessageRead,
  type InboxMessage,
  type InboxAnnouncement,
  type ProjectMember,
} from '@/lib/inbox';

type Tab = 'messages' | 'announcements' | 'approvals';

const urgencyColors = {
  red: '#E5484D',
  yellow: '#F5A623',
  green: '#2EBD85',
} as const;

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

export default function InboxPage() {
  const [activeTab, setActiveTab] = useState<Tab>('messages');
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [announcements, setAnnouncements] = useState<InboxAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [showNewAnnouncement, setShowNewAnnouncement] = useState(false);

  const projects = useProjectStore((s) => s.projects);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [m, a] = await Promise.all([fetchMessages(), fetchAnnouncements()]);
    setMessages(m);
    setAnnouncements(a);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const unreadCount = messages.filter((m) => !m.read).length;

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'messages', label: 'Messages', count: unreadCount || undefined },
    { key: 'announcements', label: 'Announcements' },
    { key: 'approvals', label: 'Approvals' },
  ];

  const handleMessageClick = async (msg: InboxMessage) => {
    if (!msg.read) {
      await markMessageRead(msg.id);
      setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, read: true } : m)));
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-[1400px] mx-auto space-y-6"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold text-dark-navy">Inbox</h1>
        {activeTab !== 'approvals' && (
          <button
            onClick={() =>
              activeTab === 'messages'
                ? setShowNewMessage(true)
                : setShowNewAnnouncement(true)
            }
            className="bg-steel-blue hover:bg-steel-blue/90 text-white px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 transition-colors"
          >
            <span className="text-lg leading-none">+</span>
            {activeTab === 'messages' ? 'New Message' : 'New Announcement'}
          </button>
        )}
      </div>

      {/* Segmented Control */}
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

      {/* Messages */}
      {!loading && activeTab === 'messages' && (
        <div className="space-y-3">
          {messages.length === 0 ? (
            <div className="text-center text-slate-blue-gray py-12 text-sm">
              No messages yet
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                onClick={() => handleMessageClick(msg)}
                className="cursor-pointer"
              >
              <Card className="hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-steel-blue text-white flex items-center justify-center flex-shrink-0 text-sm font-semibold">
                    {getInitials(msg.senderName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm truncate ${
                          !msg.read ? 'font-bold text-dark-navy' : 'font-medium text-dark-navy'
                        }`}
                      >
                        {msg.senderName}
                      </span>
                      {msg.projectName && (
                        <span className="text-[11px] bg-frost-white text-steel-blue px-2 py-0.5 rounded-full flex-shrink-0">
                          {msg.projectName}
                        </span>
                      )}
                      {!msg.read && (
                        <span className="w-2 h-2 rounded-full bg-steel-blue flex-shrink-0" />
                      )}
                    </div>
                    {msg.subject && (
                      <p className="text-xs text-steel-blue mt-0.5 truncate">{msg.subject}</p>
                    )}
                    <p
                      className={`text-sm mt-1 truncate ${
                        !msg.read ? 'text-dark-navy' : 'text-slate-blue-gray'
                      }`}
                    >
                      {msg.body}
                    </p>
                  </div>
                  <span className="text-xs text-slate-blue-gray whitespace-nowrap flex-shrink-0">
                    {timeAgo(msg.createdAt)}
                  </span>
                </div>
              </Card>
              </div>
            ))
          )}
        </div>
      )}

      {/* Announcements */}
      {!loading && activeTab === 'announcements' && (
        <div className="space-y-3">
          {announcements.length === 0 ? (
            <div className="text-center text-slate-blue-gray py-12 text-sm">
              No announcements yet
            </div>
          ) : (
            announcements.map((ann) => (
              <Card key={ann.id}>
                <div
                  className="border-l-4 -ml-6 pl-6"
                  style={{ borderLeftColor: urgencyColors[ann.urgency] }}
                >
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
                    <span className="text-xs font-medium text-steel-blue">
                      {ann.authorName}
                    </span>
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

      {/* Approvals */}
      {!loading && activeTab === 'approvals' && (
        <div className="text-center text-slate-blue-gray py-12 text-sm">
          No approvals yet
        </div>
      )}

      {showNewMessage && (
        <NewMessageModal
          projects={projects}
          onClose={() => setShowNewMessage(false)}
          onSent={() => {
            setShowNewMessage(false);
            refresh();
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

function NewMessageModal({
  projects,
  onClose,
  onSent,
}: {
  projects: { id: string; name: string }[];
  onClose: () => void;
  onSent: () => void;
}) {
  const [projectId, setProjectId] = useState<string>('');
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [recipientUserId, setRecipientUserId] = useState<string>('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (projectId) {
      getProjectMembers(projectId).then(setMembers);
    } else {
      setMembers([]);
    }
    setRecipientUserId('');
  }, [projectId]);

  const handleSend = async () => {
    setError(null);
    if (!body.trim()) {
      setError('Message required');
      return;
    }
    if (!recipientUserId && !recipientEmail.trim()) {
      setError('Pick a recipient or enter an email');
      return;
    }
    setSending(true);
    const res = await sendMessage({
      body,
      subject,
      projectId: projectId || null,
      recipientUserId: recipientUserId || null,
      recipientEmail: recipientEmail.trim() || null,
    });
    setSending(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    onSent();
  };

  return (
    <ModalShell title="New Message" onClose={onClose}>
      <div>
        <label className="text-xs uppercase font-medium text-slate-blue-gray tracking-wide">
          Project (optional)
        </label>
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

      {members.length > 0 && (
        <div>
          <label className="text-xs uppercase font-medium text-slate-blue-gray tracking-wide">
            Project members
          </label>
          <div className="flex flex-wrap gap-2 mt-1">
            {members.map((m) => (
              <button
                key={m.userId}
                onClick={() => {
                  setRecipientUserId(m.userId);
                  setRecipientEmail('');
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                  recipientUserId === m.userId
                    ? 'bg-steel-blue text-white border-steel-blue'
                    : 'border-frost-white text-dark-navy hover:bg-frost-white'
                }`}
              >
                {m.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="text-xs uppercase font-medium text-slate-blue-gray tracking-wide">
          Or send to email
        </label>
        <input
          type="email"
          value={recipientEmail}
          onChange={(e) => {
            setRecipientEmail(e.target.value);
            if (e.target.value) setRecipientUserId('');
          }}
          placeholder="someone@example.com"
          className="mt-1 w-full border border-frost-white rounded-lg px-3 py-2 text-sm text-dark-navy"
        />
      </div>

      <div>
        <label className="text-xs uppercase font-medium text-slate-blue-gray tracking-wide">
          Subject (optional)
        </label>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
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
    if (!title.trim()) {
      setError('Title required');
      return;
    }
    setCreating(true);
    const res = await createAnnouncement({
      title,
      description,
      announcementDate: sameDay ? today : date,
      urgency,
      projectId: projectId || null,
    });
    setCreating(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    onCreated();
  };

  return (
    <ModalShell title="New Announcement" onClose={onClose}>
      <div>
        <label className="text-xs uppercase font-medium text-slate-blue-gray tracking-wide">
          Title
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 w-full border border-frost-white rounded-lg px-3 py-2 text-sm text-dark-navy"
        />
      </div>

      <div>
        <label className="text-xs uppercase font-medium text-slate-blue-gray tracking-wide">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="mt-1 w-full border border-frost-white rounded-lg px-3 py-2 text-sm text-dark-navy"
        />
      </div>

      <div>
        <label className="text-xs uppercase font-medium text-slate-blue-gray tracking-wide">
          Date
        </label>
        <div className="flex gap-2 mt-1">
          <button
            onClick={() => setSameDay(true)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
              sameDay
                ? 'bg-steel-blue text-white border-steel-blue'
                : 'border-frost-white text-dark-navy'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setSameDay(false)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
              !sameDay
                ? 'bg-steel-blue text-white border-steel-blue'
                : 'border-frost-white text-dark-navy'
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
        <label className="text-xs uppercase font-medium text-slate-blue-gray tracking-wide">
          Urgency
        </label>
        <select
          value={urgency}
          onChange={(e) => setUrgency(e.target.value as 'red' | 'yellow' | 'green')}
          className="mt-1 w-full border border-frost-white rounded-lg px-3 py-2 text-sm text-dark-navy"
          style={{
            borderLeftWidth: 6,
            borderLeftColor: urgencyColors[urgency],
          }}
        >
          <option value="green">🟢 Green — Low</option>
          <option value="yellow">🟡 Yellow — Medium</option>
          <option value="red">🔴 Red — High</option>
        </select>
      </div>

      <div>
        <label className="text-xs uppercase font-medium text-slate-blue-gray tracking-wide">
          Project (optional)
        </label>
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
