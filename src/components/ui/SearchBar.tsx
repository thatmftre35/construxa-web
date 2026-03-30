'use client';

import { Search } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export default function SearchBar({
  value,
  onChange,
  placeholder = 'Search...',
  autoFocus = false,
}: SearchBarProps) {
  return (
    <div className="relative">
      <Search
        size={18}
        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-blue-gray pointer-events-none"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="w-full bg-frost-white rounded-full pl-11 pr-4 py-3 text-dark-navy placeholder:text-slate-blue-gray focus:outline-none focus:ring-2 focus:ring-steel-blue/30 transition-all duration-200"
      />
    </div>
  );
}
