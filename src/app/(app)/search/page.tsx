'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, Building2, ClipboardList, X } from 'lucide-react';
import { useTaskStore } from '@/stores/taskStore';
import { useProjectStore } from '@/stores/projectStore';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';

const filterTabs = ['All', 'Projects', 'Tasks', 'Documents', 'People'] as const;
type FilterTab = (typeof filterTabs)[number];

const recentSearches = [
  'Foundation plans',
  'HVAC submittal',
  'Mike Torres',
  'Invoice #7',
];

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterTab>('All');
  const projects = useProjectStore((s) => s.projects);

  const filteredProjects = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.city.toLowerCase().includes(q) ||
        p.state.toLowerCase().includes(q)
    );
  }, [query]);

  const allTasks = useTaskStore((s) => s.tasks);
  const filteredTasks = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return allTasks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.projectName.toLowerCase().includes(q)
    );
  }, [query, allTasks]);

  const hasResults = filteredProjects.length > 0 || filteredTasks.length > 0;
  const showProjects = activeFilter === 'All' || activeFilter === 'Projects';
  const showTasks = activeFilter === 'All' || activeFilter === 'Tasks';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-[1400px] mx-auto space-y-6"
    >
      <h1 className="text-2xl sm:text-3xl font-bold text-dark-navy">Search</h1>

      {/* Search Bar */}
      <div className="relative">
        <Search
          size={20}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-blue-gray"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search projects, tasks, documents..."
          className="w-full bg-frost-white rounded-full pl-12 pr-10 py-3.5 text-dark-navy placeholder:text-slate-blue-gray focus:outline-none focus:ring-2 focus:ring-steel-blue transition-all"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-blue-gray hover:text-dark-navy"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Filter Chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {filterTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveFilter(tab)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              activeFilter === tab
                ? 'bg-steel-blue text-white'
                : 'bg-frost-white text-slate-blue-gray hover:bg-ice-blue/30'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* No query state */}
      {!query.trim() && (
        <div className="space-y-6">
          <div>
            <h2 className="text-sm font-semibold text-slate-blue-gray uppercase tracking-wider mb-3">
              Recent Searches
            </h2>
            <div className="space-y-1">
              {recentSearches.map((term) => (
                <button
                  key={term}
                  onClick={() => setQuery(term)}
                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-left hover:bg-frost-white transition-colors"
                >
                  <Search size={16} className="text-slate-blue-gray" />
                  <span className="text-sm text-dark-navy">{term}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 rounded-full bg-frost-white flex items-center justify-center mb-4">
              <Search size={32} className="text-ice-blue" />
            </div>
            <p className="text-slate-blue-gray text-sm">
              Search across all your projects, tasks, and documents
            </p>
          </div>
        </div>
      )}

      {/* Results */}
      {query.trim() && !hasResults && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 rounded-full bg-frost-white flex items-center justify-center mb-4">
            <Search size={32} className="text-ice-blue" />
          </div>
          <p className="text-dark-navy font-medium">No results found</p>
          <p className="text-slate-blue-gray text-sm mt-1">
            Try a different search term
          </p>
        </div>
      )}

      {query.trim() && hasResults && (
        <div className="space-y-6">
          {/* Projects */}
          {showProjects && filteredProjects.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-slate-blue-gray uppercase tracking-wider mb-3">
                Projects ({filteredProjects.length})
              </h2>
              <div className="space-y-2">
                {filteredProjects.map((project) => (
                  <Card key={project.id} className="hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-frost-white flex items-center justify-center flex-shrink-0">
                        <Building2 size={20} className="text-steel-blue" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-dark-navy truncate">{project.name}</h3>
                        <p className="text-sm text-slate-blue-gray">
                          {project.city}, {project.state} &middot; {project.stage}
                        </p>
                      </div>
                      <Badge status="active" size="small" />
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* Tasks */}
          {showTasks && filteredTasks.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-slate-blue-gray uppercase tracking-wider mb-3">
                Tasks ({filteredTasks.length})
              </h2>
              <div className="space-y-2">
                {filteredTasks.map((task) => (
                  <Card key={task.id} className="hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-frost-white flex items-center justify-center flex-shrink-0">
                        <ClipboardList size={20} className="text-steel-blue" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-dark-navy truncate">{task.title}</h3>
                        <p className="text-sm text-slate-blue-gray">
                          {task.projectName} &middot; {task.assignee}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </motion.div>
  );
}
