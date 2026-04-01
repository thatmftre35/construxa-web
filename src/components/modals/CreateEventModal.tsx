'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  X, Search, Clock, Shield, Box, Users, Footprints, FlaskConical,
  Truck, Package, DollarSign, Calendar, ChevronDown,
} from 'lucide-react';
import { useEventStore } from '@/stores/eventStore';
import { useProjectStore } from '@/stores/projectStore';
import type { Event, EventType } from '@/types/project';

const EVENT_TYPE_ICONS: Record<EventType, typeof Search> = {
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

const EVENT_TYPES: { value: EventType; label: string }[] = [
  { value: 'inspection', label: 'Inspection' },
  { value: 'deadline', label: 'Deadline' },
  { value: 'safety_training', label: 'Safety / Training' },
  { value: 'concrete_pour', label: 'Concrete Pour' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'walkthrough', label: 'Walkthrough' },
  { value: 'testing', label: 'Testing' },
  { value: 'equipment_delivery', label: 'Equipment Delivery' },
  { value: 'material_delivery', label: 'Material Delivery' },
  { value: 'financial', label: 'Financial' },
  { value: 'other', label: 'Other' },
];

interface Props {
  open: boolean;
  onClose: () => void;
  initialData?: Event | null;
  initialProjectId?: string;
  initialProjectName?: string;
}

export default function CreateEventModal({ open, onClose, initialData, initialProjectId, initialProjectName }: Props) {
  const addEvent = useEventStore((s) => s.addEvent);
  const updateEvent = useEventStore((s) => s.updateEvent);
  const projects = useProjectStore((s) => s.projects);

  const [type, setType] = useState<EventType>('inspection');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [projectSearch, setProjectSearch] = useState('');
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isEdit = !!initialData;

  useEffect(() => {
    if (open && initialData) {
      setType(initialData.type);
      setDescription(initialData.description);
      setProjectId(initialData.projectId);
      setProjectSearch(initialData.projectName);
      setEventDate(new Date(initialData.eventDate).toISOString().slice(0, 16));
    } else if (open) {
      setType('inspection');
      setDescription('');
      setProjectId(initialProjectId || '');
      setProjectSearch(initialProjectName || '');
      setEventDate('');
    }
    setError('');
  }, [open, initialData]);

  const filteredProjects = useMemo(() => {
    if (!projectSearch.trim()) return projects;
    const q = projectSearch.toLowerCase();
    return projects.filter((p) => p.name.toLowerCase().includes(q));
  }, [projects, projectSearch]);

  const handleSubmit = async () => {
    if (!projectId || !eventDate) {
      setError('Project and date are required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      if (isEdit && initialData) {
        await updateEvent(initialData.id, { projectId, type, description, eventDate: new Date(eventDate).toISOString() });
      } else {
        await addEvent({ projectId, type, description, eventDate: new Date(eventDate).toISOString() });
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save event');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="rounded-2xl w-full max-w-lg shadow-xl backdrop-blur-2xl bg-white/70 border border-white/60 dark:bg-white/5 dark:border-white/8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/40 dark:border-white/6">
          <h2 className="text-lg font-semibold text-dark-navy dark:text-frost-white">{isEdit ? 'Edit Event' : 'Create Event'}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-frost-white dark:hover:bg-steel-blue/10 text-slate-blue-gray"><X className="w-5 h-5" /></button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="relative">
            <label className="text-xs font-medium text-slate-blue-gray mb-1 block">Event Type</label>
            <button
              type="button"
              onClick={() => setShowTypePicker(!showTypePicker)}
              className="input-field w-full flex items-center gap-2 text-left"
            >
              {(() => { const Icon = EVENT_TYPE_ICONS[type]; return <Icon className="w-4 h-4 text-steel-blue shrink-0" />; })()}
              <span className="flex-1">{EVENT_TYPES.find((t) => t.value === type)?.label}</span>
              <ChevronDown className="w-4 h-4 text-slate-blue-gray shrink-0" />
            </button>
            {showTypePicker && (
              <div className="absolute z-10 top-full left-0 right-0 mt-1 backdrop-blur-2xl bg-white/80 dark:bg-[#1e2a32]/95 border border-white/50 dark:border-white/8 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                {EVENT_TYPES.map((t) => {
                  const Icon = EVENT_TYPE_ICONS[t.value];
                  return (
                    <button
                      key={t.value}
                      onClick={() => { setType(t.value); setShowTypePicker(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2.5 hover:bg-frost-white dark:hover:bg-steel-blue/10 ${type === t.value ? 'text-steel-blue font-semibold' : 'text-dark-navy dark:text-frost-white'}`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      {t.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-medium text-slate-blue-gray mb-1 block">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="input-field w-full" rows={2} placeholder="What's happening?" />
          </div>

          <div className="relative">
            <label className="text-xs font-medium text-slate-blue-gray mb-1 block">Project</label>
            <input
              type="text"
              value={projectSearch}
              onChange={(e) => { setProjectSearch(e.target.value); setShowProjectDropdown(true); }}
              onFocus={() => setShowProjectDropdown(true)}
              className="input-field w-full"
              placeholder="Search projects..."
            />
            {showProjectDropdown && filteredProjects.length > 0 && (
              <div className="absolute z-10 top-full left-0 right-0 mt-1 backdrop-blur-2xl bg-white/80 dark:bg-[#1e2a32]/95 border border-white/50 dark:border-white/8 rounded-xl shadow-lg max-h-40 overflow-y-auto">
                {filteredProjects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { setProjectId(p.id); setProjectSearch(p.name); setShowProjectDropdown(false); }}
                    className="w-full text-left px-4 py-2.5 text-sm text-dark-navy dark:text-frost-white hover:bg-frost-white dark:hover:bg-steel-blue/10"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-medium text-slate-blue-gray mb-1 block">Date & Time</label>
            <input type="datetime-local" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="input-field w-full" />
          </div>

          {error && <p className="text-xs text-rejected">{error}</p>}
        </div>

        <div className="px-5 py-4 border-t border-white/40 dark:border-white/6">
          <button onClick={handleSubmit} disabled={loading} className="btn-primary w-full disabled:opacity-50">
            {loading ? 'Saving...' : isEdit ? 'Update Event' : 'Create Event'}
          </button>
        </div>
      </div>
    </div>
  );
}
