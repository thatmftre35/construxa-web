'use client';

import { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Mic,
  Camera,
  Truck,
  Clock,
  CloudLightning,
  ClipboardCheck,
  ChevronRight,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useProjectStore } from '@/stores/projectStore';
import { mockTasks, mockAlerts } from '@/constants/mockData';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';

const alertBorderColors: Record<string, string> = {
  delivery: 'border-l-steel-blue',
  rental: 'border-l-pending',
  weather: 'border-l-rejected',
  inspection: 'border-l-approved',
  deadline: 'border-l-rejected',
};

const alertIcons: Record<string, React.ReactNode> = {
  delivery: <Truck size={18} className="text-steel-blue" />,
  rental: <Clock size={18} className="text-pending" />,
  weather: <CloudLightning size={18} className="text-rejected" />,
  inspection: <ClipboardCheck size={18} className="text-approved" />,
  deadline: <Clock size={18} className="text-rejected" />,
};

const priorityDotColors: Record<string, string> = {
  urgent: 'bg-rejected',
  high: 'bg-orange-500',
  medium: 'bg-pending',
  low: 'bg-approved',
};

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardPage() {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const userProjects = useProjectStore((s) => s.projects);

  const displayName = profile?.full_name || profile?.first_name || 'Builder';

  const [greeting, setGreeting] = useState('Welcome');
  useEffect(() => {
    setGreeting(getGreeting());
  }, []);

  const allProjects = useMemo(() => {
    return userProjects.slice(0, 6);
  }, [userProjects]);

  const tasks = mockTasks.slice(0, 4);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-6xl mx-auto space-y-8"
    >
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-dark-navy">
          {greeting}, {displayName}
        </h1>
        <p className="text-slate-blue-gray mt-1">
          Here&apos;s what&apos;s happening across your projects
        </p>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-4">
        <button className="w-14 h-14 rounded-full bg-steel-blue text-white flex items-center justify-center shadow-md hover:bg-dark-navy transition-colors">
          <Mic size={22} />
        </button>
        <button className="w-14 h-14 rounded-full bg-ice-blue text-steel-blue flex items-center justify-center shadow-md hover:bg-steel-blue hover:text-white transition-colors">
          <Camera size={22} />
        </button>
      </div>

      {/* Needs Attention */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-dark-navy">Needs Attention</h2>
          <span className="text-sm text-slate-blue-gray">{mockAlerts.length} alerts</span>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          {mockAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`card-subtle min-w-[280px] max-w-[320px] flex-shrink-0 border-l-4 ${alertBorderColors[alert.type] || 'border-l-steel-blue'}`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">{alertIcons[alert.type]}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-dark-navy text-sm truncate">{alert.title}</h3>
                    {alert.urgent && (
                      <span className="w-2 h-2 rounded-full bg-rejected flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-slate-blue-gray mt-1 line-clamp-2">
                    {alert.description}
                  </p>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-[11px] text-ice-blue font-medium bg-frost-white px-2 py-0.5 rounded-full">
                      {alert.projectName}
                    </span>
                    <span className="text-[11px] text-slate-blue-gray">{alert.time}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Recent Projects */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-dark-navy">Recent Projects</h2>
          <button
            onClick={() => router.push('/search')}
            className="text-sm text-steel-blue hover:text-dark-navy font-medium flex items-center gap-1"
          >
            View all <ChevronRight size={14} />
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {allProjects.map((project) => (
            <Card
              key={project.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
            >
              <button
                onClick={() => router.push(`/project/${project.id}`)}
                className="w-full text-left"
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-dark-navy truncate">{project.name}</h3>
                    <p className="text-sm text-slate-blue-gray mt-0.5">
                      {project.city}, {project.state}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {project.isShared && (
                      <Badge status="pending" label="Shared" size="small" />
                    )}
                    <Badge
                      status="active"
                      label={project.stage}
                      size="small"
                    />
                  </div>
                </div>
                {/* Progress bar */}
                <div className="mt-4">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-blue-gray">Progress</span>
                    <span className="font-medium text-dark-navy">
                      {Math.round(project.progress * 100)}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-frost-white rounded-full overflow-hidden">
                    <div
                      className="h-full bg-steel-blue rounded-full transition-all duration-500"
                      style={{ width: `${project.progress * 100}%` }}
                    />
                  </div>
                </div>
                <p className="text-xs text-slate-blue-gray mt-3">{project.lastActivity}</p>
              </button>
            </Card>
          ))}
        </div>
      </section>

      {/* Upcoming Tasks */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-dark-navy">Upcoming Tasks</h2>
        </div>
        <Card padding={false}>
          <div className="divide-y divide-light-gray">
            {tasks.map((task) => (
              <div key={task.id} className="flex items-center gap-4 p-4">
                <span
                  className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${priorityDotColors[task.priority]}`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-dark-navy truncate">{task.title}</p>
                  <p className="text-xs text-slate-blue-gray mt-0.5">
                    {task.assignee} &middot; {task.projectName}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-xs text-slate-blue-gray hidden sm:block">
                    {task.dueDate}
                  </span>
                  <Badge
                    status={task.status === 'overdue' ? 'overdue' : task.status === 'in_progress' ? 'pending' : 'active'}
                    label={task.status === 'in_progress' ? 'In Progress' : task.status === 'overdue' ? 'Overdue' : 'To Do'}
                    size="small"
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </motion.div>
  );
}
