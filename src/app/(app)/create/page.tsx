'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { MapPin, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { useProjectStore } from '@/stores/projectStore';

interface MapboxFeature {
  id: string;
  place_name: string;
  context?: Array<{ id: string; text: string }>;
}

export default function CreatePage() {
  const router = useRouter();
  const addProject = useProjectStore((s) => s.addProject);

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [value, setValue] = useState('');
  const [startDate, setStartDate] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [showAddLater, setShowAddLater] = useState(false);
  const [suggestions, setSuggestions] = useState<MapboxFeature[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [success, setSuccess] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ name?: string; address?: string }>({});

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Close suggestions on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const searchAddress = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
      if (!token) return;

      try {
        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?access_token=${token}&country=us&types=address,place&limit=5`
        );
        const data = await res.json();
        if (data.features) {
          setSuggestions(data.features);
          setShowSuggestions(true);
        }
      } catch {
        // silently fail
      }
    }, 300);
  }, []);

  function selectSuggestion(feature: MapboxFeature) {
    setAddress(feature.place_name);
    setShowSuggestions(false);
    setSuggestions([]);

    // Extract city and state from context
    if (feature.context) {
      const placeCtx = feature.context.find((c) => c.id.startsWith('place'));
      const regionCtx = feature.context.find((c) => c.id.startsWith('region'));
      if (placeCtx) setCity(placeCtx.text);
      if (regionCtx) setState(regionCtx.text);
    }
  }

  function handleSubmit() {
    const newErrors: typeof errors = {};
    if (!name.trim()) newErrors.name = 'Project name is required';
    if (!address.trim()) newErrors.address = 'Address is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    const project = addProject({
      name: name.trim(),
      address: address.trim(),
      city: city.trim(),
      state: state.trim(),
      description: description.trim(),
      value: value.trim(),
      startDate: startDate || new Date().toISOString().split('T')[0],
      completionDate: null,
      stage: 'Pre-Construction',
      sector: 'General',
      squareFootage: '',
      trades: [],
      imageUrl: null,
    });

    setCreatedId(project.id);
    setSuccess(true);
  }

  const addLaterFields = [
    'Owner / Client',
    'Trades & Subcontractors',
    'Square Footage',
    'Completion Date',
    'Project Team',
    'Documents',
  ];

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="max-w-lg mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6"
      >
        <div className="w-16 h-16 rounded-full bg-approved/15 flex items-center justify-center">
          <Check size={32} className="text-approved" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-dark-navy">Project Created!</h1>
          <p className="text-slate-blue-gray mt-2">
            &ldquo;{name}&rdquo; has been set up and is ready to go.
          </p>
        </div>
        <div className="flex gap-3 w-full max-w-xs">
          <button
            onClick={() => router.push(`/project/${createdId}`)}
            className="btn-primary flex-1"
          >
            View Project
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className="btn-secondary flex-1"
          >
            Dashboard
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-2xl mx-auto space-y-6"
    >
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-dark-navy">Create New Project</h1>
        <p className="text-slate-blue-gray mt-1">Set up in under 60 seconds</p>
      </div>

      {/* Required Section */}
      <div className="card space-y-5">
        <p className="text-xs font-bold text-slate-blue-gray uppercase tracking-widest">
          Required
        </p>

        <div>
          <label className="block text-sm font-medium text-dark-navy mb-1.5">
            Project Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
            }}
            placeholder="e.g. Riverside Tower"
            className={`input-field ${errors.name ? 'border-rejected focus:border-rejected focus:ring-rejected' : ''}`}
          />
          {errors.name && (
            <p className="text-xs text-rejected mt-1">{errors.name}</p>
          )}
        </div>

        <div className="relative" ref={suggestionsRef}>
          <label className="block text-sm font-medium text-dark-navy mb-1.5">
            Address
          </label>
          <div className="relative">
            <MapPin
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-blue-gray"
            />
            <input
              type="text"
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                searchAddress(e.target.value);
                if (errors.address) setErrors((prev) => ({ ...prev, address: undefined }));
              }}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              placeholder="Start typing an address..."
              className={`input-field pl-11 ${errors.address ? 'border-rejected focus:border-rejected focus:ring-rejected' : ''}`}
            />
          </div>
          {errors.address && (
            <p className="text-xs text-rejected mt-1">{errors.address}</p>
          )}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-20 mt-1 w-full bg-white rounded-xl shadow-lg border border-light-gray overflow-hidden">
              {suggestions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => selectSuggestion(s)}
                  className="w-full text-left px-4 py-3 text-sm text-dark-navy hover:bg-frost-white transition-colors border-b border-light-gray last:border-0"
                >
                  {s.place_name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-dark-navy mb-1.5">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief project description..."
            rows={3}
            className="input-field resize-none"
          />
        </div>
      </div>

      {/* Optional Section */}
      <div className="card space-y-5">
        <p className="text-xs font-bold text-slate-blue-gray uppercase tracking-widest">
          Optional
        </p>

        <div>
          <label className="block text-sm font-medium text-dark-navy mb-1.5">
            Project Value
          </label>
          <input
            type="text"
            value={value}
            onChange={(e) => {
              const v = e.target.value.replace(/[^0-9.,$ ]/g, '');
              setValue(v);
            }}
            placeholder="$0"
            className="input-field"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-dark-navy mb-1.5">
            Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="input-field"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-dark-navy mb-1.5">
              City
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="City"
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-navy mb-1.5">
              State
            </label>
            <input
              type="text"
              value={state}
              onChange={(e) => setState(e.target.value)}
              placeholder="State"
              className="input-field"
            />
          </div>
        </div>
      </div>

      {/* Add Later */}
      <button
        onClick={() => setShowAddLater(!showAddLater)}
        className="flex items-center gap-2 text-sm font-medium text-steel-blue hover:text-dark-navy transition-colors"
      >
        {showAddLater ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        Add Later
      </button>

      {showAddLater && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="card-subtle"
        >
          <p className="text-xs font-semibold text-slate-blue-gray uppercase tracking-wider mb-3">
            You can configure these after creation
          </p>
          <ul className="space-y-2">
            {addLaterFields.map((field) => (
              <li
                key={field}
                className="flex items-center gap-2 text-sm text-dark-navy"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-ice-blue" />
                {field}
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* Submit */}
      <button onClick={handleSubmit} className="btn-primary">
        Create Project
      </button>
    </motion.div>
  );
}
