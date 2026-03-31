'use client';

import { useState, useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import { useEventStore } from '@/stores/eventStore';
import { useProjectStore } from '@/stores/projectStore';
import type { Event, EventType } from '@/types/project';

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
}

export default function CreateEventModal({ open, onClose, initialData }: Props) {
  const addEvent = useEventStore((s) => s.addEvent);
  const updateEvent = useEventStore((s) => s.updateEvent);
  const projects = useProjectStore((s) => s.projects);

  const [type, setType] = useState<EventType>('inspection');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [projectSearch, setProjectSearch] = useState('');
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
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
      setProjectId('');
      setProjectSearch('');
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
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-light-gray">
          <h2 className="text-lg font-semibold text-dark-navy">{isEdit ? 'Edit Event' : 'Create Event'}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-frost-white text-slate-blue-gray"><X className="w-5 h-5" /></button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-blue-gray mb-1 block">Event Type</label>
            <select value={type} onChange={(e) => setType(e.target.value as EventType)} className="input-field w-full">
              {EVENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
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
              <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-light-gray rounded-xl shadow-lg max-h-40 overflow-y-auto">
                {filteredProjects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { setProjectId(p.id); setProjectSearch(p.name); setShowProjectDropdown(false); }}
                    className="w-full text-left px-4 py-2.5 text-sm text-dark-navy hover:bg-frost-white"
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

        <div className="px-5 py-4 border-t border-light-gray">
          <button onClick={handleSubmit} disabled={loading} className="btn-primary w-full disabled:opacity-50">
            {loading ? 'Saving...' : isEdit ? 'Update Event' : 'Create Event'}
          </button>
        </div>
      </div>
    </div>
  );
}
