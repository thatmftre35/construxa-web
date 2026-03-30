'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { pricingPlans } from '@/constants/mockData';

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

export default function PricingPage() {
  const router = useRouter();
  const { setOnboarded } = useAuthStore();
  const [selectedPlan, setSelectedPlan] = useState('free');

  const handleGetStarted = () => {
    setOnboarded(true);
    router.push('/dashboard');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center max-w-3xl mx-auto"
    >
      <ProgressDots current={2} />

      <h2 className="text-xl font-bold text-dark-navy text-center mb-1">Choose Your Plan</h2>
      <p className="text-sm text-slate-blue-gray text-center mb-6">
        Start free, upgrade anytime
      </p>

      {/* Pricing Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 w-full mb-6">
        {pricingPlans.map((plan) => {
          const isSelected = selectedPlan === plan.id;
          return (
            <motion.button
              key={plan.id}
              whileTap={{ scale: 0.97 }}
              onClick={() => setSelectedPlan(plan.id)}
              className={`relative flex flex-col p-4 rounded-xl border-2 text-left transition-all ${
                isSelected
                  ? 'border-steel-blue bg-white shadow-md'
                  : 'border-light-gray bg-white hover:border-ice-blue'
              }`}
            >
              {/* Most Popular Badge */}
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-steel-blue text-white text-[10px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wide">
                  Most Popular
                </div>
              )}

              <p className="text-sm font-semibold text-dark-navy mb-2">{plan.name}</p>
              <p className="font-display text-3xl text-dark-navy leading-none">{plan.price}</p>
              {plan.period && (
                <p className="text-xs text-slate-blue-gray mt-0.5">{plan.period}</p>
              )}

              <div className="mt-4 flex-1 space-y-2">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-1.5">
                    <Check className="w-3.5 h-3.5 text-approved mt-0.5 shrink-0" />
                    <span className="text-xs text-slate-blue-gray">{feature}</span>
                  </div>
                ))}
              </div>

              <div
                className={`mt-4 py-2 rounded-lg text-center text-sm font-semibold transition-colors ${
                  isSelected
                    ? 'bg-steel-blue text-white'
                    : 'bg-frost-white text-steel-blue'
                }`}
              >
                {isSelected ? 'Selected' : 'Select'}
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Fee Note */}
      <p className="text-xs text-slate-blue-gray text-center mb-4">
        All plans include a 14-day free trial. No credit card required to start.
        Enterprise plans include custom SLA and compliance certifications.
      </p>

      {/* Get Started */}
      <button onClick={handleGetStarted} className="btn-primary w-full max-w-md">
        Get Started
      </button>
    </motion.div>
  );
}
