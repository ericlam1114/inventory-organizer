const COLORS = ['bg-sand', 'bg-sand2', 'bg-success/20', 'bg-info/20', 'bg-warning/20'];

function colorFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return COLORS[Math.abs(h) % COLORS.length];
}

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || '?'
  );
}

export function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  return (
    <div
      className={`${colorFor(name)} text-ink rounded-full flex items-center justify-center font-medium shrink-0`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
      aria-hidden
    >
      {initials(name)}
    </div>
  );
}
