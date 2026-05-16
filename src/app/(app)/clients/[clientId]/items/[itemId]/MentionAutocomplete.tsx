'use client';

import { useRef, useState } from 'react';

export type MentionUser = { id: string; displayName: string };

export function MentionAutocomplete({
  value, onChange, mentionable, placeholder, rows = 2,
}: {
  value: string;
  onChange: (v: string) => void;
  mentionable: MentionUser[];
  placeholder?: string;
  rows?: number;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [openAt, setOpenAt] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);

  function onInput(e: React.FormEvent<HTMLTextAreaElement>) {
    const ta = e.currentTarget;
    const text = ta.value;
    const caret = ta.selectionStart;
    onChange(text);

    // Look for @<word> immediately before caret with no whitespace
    const before = text.slice(0, caret);
    const match = before.match(/(^|\s)@([\w]*)$/);
    if (match) {
      setOpenAt(caret - match[2].length - 1);
      setQuery(match[2]);
      setHighlight(0);
    } else {
      setOpenAt(null);
      setQuery('');
    }
  }

  function pick(u: MentionUser) {
    if (openAt === null) return;
    const ta = ref.current;
    if (!ta) return;
    const before = value.slice(0, openAt);
    const afterCaret = value.slice(ta.selectionStart);
    const mentionToken = `@[${u.displayName}](${u.id}) `;
    const next = before + mentionToken + afterCaret;
    onChange(next);
    setOpenAt(null); setQuery('');
    requestAnimationFrame(() => {
      ta.focus();
      const newPos = before.length + mentionToken.length;
      ta.setSelectionRange(newPos, newPos);
    });
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (openAt === null) return;
    const filtered = filter(mentionable, query);
    if (e.key === 'Escape') { setOpenAt(null); return; }
    if (filtered.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight((h) => (h + 1) % filtered.length); return; }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setHighlight((h) => (h - 1 + filtered.length) % filtered.length); return; }
    if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); pick(filtered[highlight]); return; }
  }

  const filtered = openAt !== null ? filter(mentionable, query) : [];

  return (
    <div className="relative">
      <textarea
        ref={ref}
        value={value}
        onChange={onInput}
        onKeyDown={onKeyDown}
        rows={rows}
        placeholder={placeholder}
        className="w-full bg-surface border border-rule px-3 py-2 rounded-[2px] text-[14px] resize-y"
      />
      {openAt !== null && filtered.length > 0 && (
        <ul className="absolute z-50 left-0 right-0 mt-1 bg-surface border border-rule rounded-[2px] shadow-sm max-h-48 overflow-y-auto">
          {filtered.map((u, i) => (
            <li key={u.id}>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); pick(u); }}
                className={`block w-full text-left px-3 py-2 text-[13px] ${i === highlight ? 'bg-sand2' : 'hover:bg-paper'}`}
              >
                {u.displayName}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function filter(list: MentionUser[], q: string): MentionUser[] {
  const needle = q.toLowerCase();
  return list.filter((u) => u.displayName.toLowerCase().includes(needle)).slice(0, 8);
}
