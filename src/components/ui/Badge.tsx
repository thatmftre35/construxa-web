interface BadgeProps {
  status: 'active' | 'pending' | 'overdue' | 'approved' | 'inactive';
  label?: string;
  size?: 'small' | 'default';
}

const statusClassMap: Record<BadgeProps['status'], string> = {
  active: 'badge-active',
  pending: 'badge-pending',
  overdue: 'badge-overdue',
  approved: 'badge-approved',
  inactive: 'bg-light-gray text-slate-blue-gray',
};

export default function Badge({ status, label, size = 'default' }: BadgeProps) {
  const displayLabel = label ?? status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <span
      className={`
        badge ${statusClassMap[status]}
        ${size === 'small' ? 'text-[10px] px-2 py-0' : ''}
      `}
    >
      {displayLabel}
    </span>
  );
}
