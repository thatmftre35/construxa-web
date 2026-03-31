'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { mockMessages, mockAnnouncements, mockApprovals } from '@/constants/mockData';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';

type Tab = 'messages' | 'announcements' | 'approvals';

const stepStatusColors: Record<string, string> = {
  approved: 'bg-approved border-approved',
  pending: 'bg-pending border-pending',
  rejected: 'bg-rejected border-rejected',
  waiting: 'bg-light-gray border-light-gray',
};

const stepLineColors: Record<string, string> = {
  approved: 'bg-approved',
  pending: 'bg-pending',
  rejected: 'bg-rejected',
  waiting: 'bg-light-gray',
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function InboxPage() {
  const [activeTab, setActiveTab] = useState<Tab>('messages');

  const unreadCount = useMemo(
    () => mockMessages.filter((m) => m.unread).length,
    []
  );

  const pendingCount = useMemo(
    () => mockApprovals.filter((a) => a.status === 'pending').length,
    []
  );

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'messages', label: 'Messages', count: unreadCount || undefined },
    { key: 'announcements', label: 'Announcements' },
    { key: 'approvals', label: 'Approvals', count: pendingCount || undefined },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-[1400px] mx-auto space-y-6"
    >
      <h1 className="text-2xl sm:text-3xl font-bold text-dark-navy">Inbox</h1>

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

      {/* Messages Tab */}
      {activeTab === 'messages' && (
        <div className="space-y-3">
          {mockMessages.map((msg) => (
            <Card key={msg.id} className="cursor-pointer hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-steel-blue text-white flex items-center justify-center flex-shrink-0 text-sm font-semibold">
                  {getInitials(msg.senderName)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm truncate ${
                        msg.unread ? 'font-bold text-dark-navy' : 'font-medium text-dark-navy'
                      }`}
                    >
                      {msg.senderName}
                    </span>
                    <span className="text-[11px] bg-frost-white text-steel-blue px-2 py-0.5 rounded-full flex-shrink-0">
                      {msg.projectName}
                    </span>
                    {msg.unread && (
                      <span className="w-2 h-2 rounded-full bg-steel-blue flex-shrink-0" />
                    )}
                  </div>
                  <p
                    className={`text-sm mt-1 truncate ${
                      msg.unread ? 'text-dark-navy' : 'text-slate-blue-gray'
                    }`}
                  >
                    {msg.preview}
                  </p>
                </div>
                <span className="text-xs text-slate-blue-gray whitespace-nowrap flex-shrink-0">
                  {msg.timestamp}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Announcements Tab */}
      {activeTab === 'announcements' && (
        <div className="space-y-3">
          {mockAnnouncements.map((ann) => (
            <Card
              key={ann.id}
              className={`${ann.priority === 'important' ? 'border-l-4 border-l-pending' : ''}`}
            >
              <div>
                <h3 className="font-semibold text-dark-navy">{ann.title}</h3>
                <p className="text-sm text-slate-blue-gray mt-2 leading-relaxed">
                  {ann.body}
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-xs font-medium text-steel-blue">{ann.author}</span>
                  <span className="text-xs text-slate-blue-gray">&middot;</span>
                  <span className="text-xs text-slate-blue-gray">{ann.timestamp}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Approvals Tab */}
      {activeTab === 'approvals' && (
        <div className="space-y-3">
          {mockApprovals.map((approval) => (
            <Card key={approval.id}>
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-dark-navy truncate">
                      {approval.documentName}
                    </h3>
                    <p className="text-sm text-slate-blue-gray mt-0.5">
                      {approval.type.charAt(0).toUpperCase() + approval.type.slice(1)} &middot;{' '}
                      {approval.requester}
                    </p>
                  </div>
                  <Badge
                    status={approval.status === 'pending' ? 'pending' : approval.status === 'approved' ? 'approved' : 'overdue'}
                    size="small"
                  />
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-blue-gray">
                  <span className="bg-frost-white px-2 py-0.5 rounded-full text-steel-blue font-medium">
                    {approval.projectName}
                  </span>
                  <span>&middot;</span>
                  <span>{approval.date}</span>
                </div>

                {/* Flow Steps */}
                <div className="flex items-center gap-0">
                  {approval.flowSteps.map((step, i) => (
                    <div key={i} className="flex items-center">
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-7 h-7 rounded-full border-2 flex items-center justify-center ${stepStatusColors[step.status]}`}
                        >
                          {step.status === 'approved' && (
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                              <path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                          {step.status === 'pending' && (
                            <span className="w-2 h-2 rounded-full bg-white" />
                          )}
                        </div>
                        <span className="text-[10px] text-slate-blue-gray mt-1 whitespace-nowrap">
                          {step.role}
                        </span>
                      </div>
                      {i < approval.flowSteps.length - 1 && (
                        <div
                          className={`w-8 h-0.5 mb-4 ${
                            stepLineColors[approval.flowSteps[i + 1].status === 'waiting' ? 'waiting' : step.status]
                          }`}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </motion.div>
  );
}
