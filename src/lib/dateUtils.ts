export type ProximityColor = 'green' | 'yellow' | 'red' | 'overdue';

export function getProximityColor(dateStr: string): ProximityColor {
  const now = new Date();
  const target = new Date(dateStr);
  const diffMs = target.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffDays < 0) return 'overdue';
  if (diffDays <= 1) return 'red';
  if (diffDays <= 3) return 'yellow';
  return 'green';
}

export function formatEventDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
