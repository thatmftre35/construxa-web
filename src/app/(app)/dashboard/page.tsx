'use client';

import { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Mic,
  Camera,
  ChevronRight,
  Plus,
  Check,
  Pencil,
  Search,
  Clock,
  Shield,
  Box,
  Users,
  Footprints,
  FlaskConical,
  Truck,
  Package,
  DollarSign,
  Calendar,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useProjectStore } from '@/stores/projectStore';
import { useEventStore } from '@/stores/eventStore';
import { useTaskStore } from '@/stores/taskStore';
import { getProximityColor, formatEventDate } from '@/lib/dateUtils';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import CreateEventModal from '@/components/modals/CreateEventModal';
import CreateTaskModal from '@/components/modals/CreateTaskModal';
import type { Event, Task } from '@/types/project';

const EVENT_TYPE_LABELS: Record<string, string> = {
  inspection: 'Inspection',
  deadline: 'Deadline',
  safety_training: 'Safety / Training',
  concrete_pour: 'Concrete Pour',
  meeting: 'Meeting',
  walkthrough: 'Walkthrough',
  testing: 'Testing',
  equipment_delivery: 'Equipment Delivery',
  material_delivery: 'Material Delivery',
  financial: 'Financial',
  other: 'Other',
};

const EVENT_TYPE_ICONS: Record<string, typeof Search> = {
  inspection: Search,
  deadline: Clock,
  safety_training: Shield,
  concrete_pour: Box,
  meeting: Users,
  walkthrough: Footprints,
  testing: FlaskConical,
  equipment_delivery: Truck,
  material_delivery: Package,
  financial: DollarSign,
  other: Calendar,
};

const proximityBorderColors: Record<string, string> = {
  green: 'border-l-approved',
  yellow: 'border-l-pending',
  red: 'border-l-rejected',
  overdue: 'border-l-rejected',
};

const proximityBgColors: Record<string, string> = {
  green: '',
  yellow: '',
  red: '',
  overdue: 'bg-rejected/5',
};

const urgencyDotColors: Record<string, string> = {
  low: 'bg-approved',
  moderate: 'bg-pending',
  high: 'bg-rejected',
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
  const projectsLoaded = useProjectStore((s) => s.isLoaded);
  const events = useEventStore((s) => s.events);
  const eventsLoaded = useEventStore((s) => s.isLoaded);
  const fetchEvents = useEventStore((s) => s.fetchEvents);
  const completeEvent = useEventStore((s) => s.completeEvent);
  const tasks = useTaskStore((s) => s.tasks);
  const tasksLoaded = useTaskStore((s) => s.isLoaded);
  const fetchTasks = useTaskStore((s) => s.fetchTasks);
  const completeTask = useTaskStore((s) => s.completeTask);

  const displayName = profile?.full_name || profile?.first_name || 'Builder';

  const [greeting, setGreeting] = useState('Welcome');
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  useEffect(() => {
    setGreeting(getGreeting());
  }, []);

  // Fetch events and tasks once projects are loaded
  useEffect(() => {
    if (projectsLoaded && !eventsLoaded) fetchEvents();
    if (projectsLoaded && !tasksLoaded) fetchTasks();
  }, [projectsLoaded, eventsLoaded, tasksLoaded, fetchEvents, fetchTasks]);

  const allProjects = useMemo(() => {
    return userProjects.slice(0, 6);
  }, [userProjects]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-[1400px] mx-auto space-y-8"
    >
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-dark-navy dark:text-frost-white">
          {greeting}, {displayName}
        </h1>
        <p className="text-slate-blue-gray dark:text-ice-blue mt-1">
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

      {/* Events / Alerts */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-dark-navy dark:text-frost-white">Events</h2>
          <button
            onClick={() => setShowCreateEvent(true)}
            className="text-sm text-steel-blue hover:text-dark-navy font-medium flex items-center gap-1"
          >
            <Plus size={16} /> New Event
          </button>
        </div>
        {events.length === 0 ? (
          <Card>
            <p className="text-sm text-slate-blue-gray text-center py-6">
              No upcoming events.{' '}
              <button onClick={() => setShowCreateEvent(true)} className="text-steel-blue font-medium hover:underline">
                Create one
              </button>
            </p>
          </Card>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide">
            {events.map((event) => {
              const color = getProximityColor(event.eventDate);
              const isExpanded = expandedEventId === event.id;
              return (
                <div
                  key={event.id}
                  className={`card-subtle min-w-[300px] flex-shrink-0 border-l-4 cursor-pointer transition-all ${proximityBorderColors[color]} ${proximityBgColors[color]}`}
                  onClick={() => setExpandedEventId(isExpanded ? null : event.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-dark-navy dark:text-frost-white text-sm flex items-center gap-1.5">
                        {(() => { const Icon = EVENT_TYPE_ICONS[event.type] || Calendar; return <Icon size={14} className="text-steel-blue shrink-0" />; })()}
                        {EVENT_TYPE_LABELS[event.type] || event.type}
                      </p>
                      <p className="text-xs text-slate-blue-gray mt-1 line-clamp-2">{event.description}</p>
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-[11px] text-steel-blue font-medium bg-frost-white px-2 py-0.5 rounded-full truncate max-w-[140px]">
                          {event.projectName}
                        </span>
                        <span className="text-[11px] text-slate-blue-gray">{formatEventDate(event.eventDate)}</span>
                      </div>
                    </div>
                    {color === 'overdue' && (
                      <span className="text-[10px] font-bold text-rejected bg-rejected/10 px-2 py-0.5 rounded-full shrink-0">OVERDUE</span>
                    )}
                  </div>
                  {isExpanded && (
                    <div className="flex gap-2 mt-3 pt-3 border-t border-light-gray">
                      <button
                        onClick={(e) => { e.stopPropagation(); completeEvent(event.id); setExpandedEventId(null); }}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-approved/10 text-approved text-xs font-medium hover:bg-approved/20"
                      >
                        <Check size={14} /> Complete
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingEvent(event); setExpandedEventId(null); }}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-frost-white text-steel-blue text-xs font-medium hover:bg-ice-blue/30"
                      >
                        <Pencil size={14} /> Edit
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Recent Projects */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-dark-navy dark:text-frost-white">Recent Projects</h2>
          <button
            onClick={() => router.push('/search')}
            className="text-sm text-steel-blue hover:text-dark-navy font-medium flex items-center gap-1"
          >
            View all <ChevronRight size={14} />
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {allProjects.map((project) => (
            <Card key={project.id} className="cursor-pointer hover:shadow-md transition-shadow">
              <button onClick={() => router.push(`/project/${project.id}`)} className="w-full text-left">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-dark-navy truncate">{project.name}</h3>
                    <p className="text-sm text-slate-blue-gray mt-0.5">{project.city}, {project.state}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {project.isShared && <Badge status="pending" label="Shared" size="small" />}
                    <Badge status="active" label={project.stage} size="small" />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-blue-gray">Progress</span>
                    <span className="font-medium text-dark-navy">{Math.round(project.progress * 100)}%</span>
                  </div>
                  <div className="w-full h-2 bg-frost-white dark:bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-steel-blue rounded-full transition-all duration-500" style={{ width: `${project.progress * 100}%` }} />
                  </div>
                </div>
                <p className="text-xs text-slate-blue-gray mt-3">{project.lastActivity}</p>
              </button>
            </Card>
          ))}
        </div>
      </section>

      {/* Tasks */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-dark-navy dark:text-frost-white">Tasks</h2>
          <button
            onClick={() => setShowCreateTask(true)}
            className="text-sm text-steel-blue hover:text-dark-navy font-medium flex items-center gap-1"
          >
            <Plus size={16} /> New Task
          </button>
        </div>
        {tasks.length === 0 ? (
          <Card>
            <p className="text-sm text-slate-blue-gray text-center py-6">
              No tasks yet.{' '}
              <button onClick={() => setShowCreateTask(true)} className="text-steel-blue font-medium hover:underline">
                Create one
              </button>
            </p>
          </Card>
        ) : (
          <Card padding={false}>
            <div className="divide-y divide-light-gray">
              {tasks.map((task) => {
                const isExpanded = expandedTaskId === task.id;
                return (
                  <div key={task.id}>
                    <div
                      className="flex items-center gap-4 p-4 cursor-pointer hover:bg-frost-white/50 transition-colors"
                      onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${urgencyDotColors[task.urgency]}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-dark-navy truncate">{task.title}</p>
                        <p className="text-xs text-slate-blue-gray mt-0.5">
                          {task.assignee || 'Unassigned'} &middot; {task.projectName}
                        </p>
                      </div>
                      <span className="text-xs text-slate-blue-gray hidden sm:block">
                        {formatEventDate(task.dueDate)}
                      </span>
                    </div>
                    {isExpanded && (
                      <div className="flex gap-2 px-4 pb-3">
                        <button
                          onClick={() => { completeTask(task.id); setExpandedTaskId(null); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-approved/10 text-approved text-xs font-medium hover:bg-approved/20"
                        >
                          <Check size={14} /> Complete
                        </button>
                        <button
                          onClick={() => { setEditingTask(task); setExpandedTaskId(null); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-frost-white text-steel-blue text-xs font-medium hover:bg-ice-blue/30"
                        >
                          <Pencil size={14} /> Edit
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </section>

      {/* Modals */}
      <CreateEventModal open={showCreateEvent} onClose={() => setShowCreateEvent(false)} />
      <CreateEventModal open={!!editingEvent} onClose={() => setEditingEvent(null)} initialData={editingEvent} />
      <CreateTaskModal open={showCreateTask} onClose={() => setShowCreateTask(false)} />
      <CreateTaskModal open={!!editingTask} onClose={() => setEditingTask(null)} initialData={editingTask} />
    </motion.div>
  );
}
