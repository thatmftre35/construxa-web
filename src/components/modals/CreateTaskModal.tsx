'use client';

import { useState, useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import { useTaskStore } from '@/stores/taskStore';
import { useProjectStore } from '@/stores/projectStore';
import type { Task, TaskUrgency } from '@/types/project';

interface Props {
  open: boolean;
  onClose: () => void;
  initialData?: Task | null;
}

export default function CreateTaskModal({ open, onClose, initialData }: Props) {
  const addTask = useTaskStore((s) => s.addTask);
  const updateTask = useTaskStore((s) => s.updateTask);
  const projects = useProjectStore((s) => s.projects);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [urgency, setUrgency] = useState<TaskUrgency>('low');
  const [assignee, setAssignee] = useState('');
  const [projectSearch, setProjectSearch] = useState('');
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isEdit = !!initialData;

  useEffect(() => {
    if (open && initialData) {
      setTitle(initialData.title);
      setDescription(initialData.description);
      setProjectId(initialData.projectId);
      setProjectSearch(initialData.projectName);
      setDueDate(new Date(initialData.dueDate).toISOString().slice(0, 16));
      setUrgency(initialData.urgency);
      setAssignee(initialData.assignee);
    } else if (open) {
      setTitle('');
      setDescription('');
      setProjectId('');
      setProjectSearch('');
      setDueDate('');
      setUrgency('low');
      setAssignee('');
    }
    setError('');
  }, [open, initialData]);

  const filteredProjects = useMemo(() => {
    if (!projectSearch.trim()) return projects;
    const q = projectSearch.toLowerCase();
    return projects.filter((p) => p.name.toLowerCase().includes(q));
  }, [projects, projectSearch]);

  const handleSubmit = async () => {
    if (!title.trim() || !projectId || !dueDate) {
      setError('Title, project, and due date are required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      if (isEdit && initialData) {
        await updateTask(initialData.id, { projectId, title: title.trim(), description, dueDate: new Date(dueDate).toISOString(), urgency, assignee: assignee.trim() });
      } else {
        await addTask({ projectId, title: title.trim(), description, dueDate: new Date(dueDate).toISOString(), urgency, assignee: assignee.trim() });
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save task');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-light-gray">
          <h2 className="text-lg font-semibold text-dark-navy">{isEdit ? 'Edit Task' : 'Create Task'}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-frost-white text-slate-blue-gray"><X className="w-5 h-5" /></button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-blue-gray mb-1 block">Title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="input-field w-full" placeholder="Task title" />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-blue-gray mb-1 block">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="input-field w-full" rows={2} placeholder="Optional details" />
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-blue-gray mb-1 block">Due Date & Time</label>
              <input type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="input-field w-full" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-blue-gray mb-1 block">Urgency</label>
              <select value={urgency} onChange={(e) => setUrgency(e.target.value as TaskUrgency)} className="input-field w-full">
                <option value="low">Low</option>
                <option value="moderate">Moderate</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-blue-gray mb-1 block">Assignee</label>
            <input type="text" value={assignee} onChange={(e) => setAssignee(e.target.value)} className="input-field w-full" placeholder="Who's responsible?" />
          </div>

          {error && <p className="text-xs text-rejected">{error}</p>}
        </div>

        <div className="px-5 py-4 border-t border-light-gray">
          <button onClick={handleSubmit} disabled={loading} className="btn-primary w-full disabled:opacity-50">
            {loading ? 'Saving...' : isEdit ? 'Update Task' : 'Create Task'}
          </button>
        </div>
      </div>
    </div>
  );
}
