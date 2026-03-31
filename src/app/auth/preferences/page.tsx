'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Mic, Camera, FileText, CheckSquare,
  Shield, AlertTriangle, CheckCircle, Check,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { workflowFeatures } from '@/constants/mockData';

const iconMap: Record<string, React.ElementType> = {
  mic: Mic,
  camera: Camera,
  document: FileText,
  task: CheckSquare,
  shield: Shield,
  alert: AlertTriangle,
  checkCircle: CheckCircle,
};

function ProgressDots({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={`h-2 rounded-full transition-all ${
            i === current
              ? 'w-8 bg-steel-blue'
              : i < current
                ? 'w-2 bg-approved'
                : 'w-2 bg-light-gray'
          }`}
        />
      ))}
    </div>
  );
}

export default function PreferencesPage() {
  const router = useRouter();
  const { updateProfile } = useAuthStore();
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleNext = async () => {
    try {
      await updateProfile({ workflow_preferences: selected });
    } catch {
      // silently handle
    }
    router.push('/auth/pricing');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center max-w-md mx-auto"
    >
      <ProgressDots current={1} />

      <h2 className="text-xl font-bold text-dark-navy text-center mb-2">
        Which features are most important to your work?
      </h2>
      <p className="text-sm text-slate-blue-gray text-center mb-6">
        Select all that apply — we&apos;ll personalize your experience
      </p>

      {/* Feature Grid */}
      <div className="grid grid-cols-2 gap-3 w-full mb-6">
        {workflowFeatures.map((feature) => {
          const Icon = iconMap[feature.icon] || FileText;
          const isSelected = selected.includes(feature.id);
          return (
            <motion.button
              key={feature.id}
              whileTap={{ scale: 0.97 }}
              onClick={() => toggle(feature.id)}
              className={`relative p-4 rounded-xl border-2 text-left transition-all ${
                isSelected
                  ? 'border-steel-blue bg-ice-blue/20'
                  : 'border-light-gray bg-white hover:border-ice-blue'
              }`}
            >
              {isSelected && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-steel-blue rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
              <Icon className={`w-6 h-6 mb-2 ${isSelected ? 'text-steel-blue' : 'text-slate-blue-gray'}`} />
              <p className="text-sm font-semibold text-dark-navy">{feature.label}</p>
              <p className="text-xs text-slate-blue-gray mt-0.5">{feature.description}</p>
            </motion.button>
          );
        })}
      </div>

      {/* Next Button */}
      <button onClick={handleNext} className="btn-primary">
        Next ({selected.length} selected)
      </button>

      {/* Skip */}
      <button
        onClick={() => router.push('/auth/pricing')}
        className="btn-ghost mt-2"
      >
        Skip
      </button>
    </motion.div>
  );
}
