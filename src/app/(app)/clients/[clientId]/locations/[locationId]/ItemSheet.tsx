'use client';

import { useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { toast } from '@/lib/toast';
import { reportError } from '@/lib/friendly-errors';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { createClient } from '@/lib/supabase/client';

type Item = {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'donated' | 'archived';
  metadata: Record<string, string>;
  createdAt: string;
  coverSignedUrl: string | null;
};
type Field = {
  id: string;
  name: string;
  key: string;
  type: 'text' | 'date' | 'select';
  options: string[] | null;
};

type CellMeta = { saving: boolean; error: string | null };

export function ItemSheet({ clientId, items, fields }: { clientId: string; items: Item[]; fields: Field[] }) {
  const router = useRouter();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [cellState, setCellState] = useState<Record<string, CellMeta>>({});
  const supabase = useMemo(() => createClient(), []);

  const setMeta = (key: string, meta: Partial<CellMeta>) => {
    setCellState((s) => ({
      ...s,
      [key]: { saving: s[key]?.saving ?? false, error: s[key]?.error ?? null, ...meta },
    }));
  };

  async function saveCell(
    itemId: string,
    column: 'title' | 'description' | 'status' | `meta:${string}`,
    value: string,
  ) {
    const key = `${itemId}:${column}`;
    setMeta(key, { saving: true, error: null });
    let payload: Record<string, unknown>;

    if (column === 'title' || column === 'description' || column === 'status') {
      payload = { [column]: column === 'description' ? (value || null) : value };
    } else {
      // meta:<fieldKey>
      const fieldKey = column.slice(5);
      const item = items.find((i) => i.id === itemId);
      const newMeta = { ...(item?.metadata ?? {}) };
      if (value) newMeta[fieldKey] = value;
      else delete newMeta[fieldKey];
      payload = { metadata: newMeta };
    }

    const { error } = await supabase.from('items').update(payload).eq('id', itemId);
    if (error) {
      const msg = reportError(error, "Couldn't save that change.");
      setMeta(key, { saving: false, error: msg });
      toast.error(msg);
      return;
    }
    setMeta(key, { saving: false, error: null });
    router.refresh();
  }

  const columns = useMemo<ColumnDef<Item>[]>(() => {
    const cols: ColumnDef<Item>[] = [
      {
        id: 'cover',
        header: '',
        size: 48,
        cell: (info) => {
          const r = info.row.original;
          return (
            <Link href={`/clients/${clientId}/items/${r.id}`}>
              {r.coverSignedUrl ? (
                <div className="relative w-10 h-10">
                  <Image src={r.coverSignedUrl} alt={r.title} fill className="object-cover" sizes="40px" />
                </div>
              ) : (
                <div className="w-10 h-10 bg-paper" />
              )}
            </Link>
          );
        },
      },
      {
        id: 'title',
        header: 'Title',
        accessorKey: 'title',
        cell: (info) => (
          <InlineText
            value={info.row.original.title}
            onSave={(v) => saveCell(info.row.original.id, 'title', v)}
            cellKey={`${info.row.original.id}:title`}
            cellState={cellState}
            required
          />
        ),
      },
      {
        id: 'status',
        header: 'Status',
        accessorKey: 'status',
        cell: (info) => (
          <InlineSelect
            value={info.row.original.status}
            options={['active', 'donated', 'archived']}
            onSave={(v) => saveCell(info.row.original.id, 'status', v)}
            cellKey={`${info.row.original.id}:status`}
            cellState={cellState}
          />
        ),
      },
      {
        id: 'description',
        header: 'Description',
        accessorKey: 'description',
        cell: (info) => (
          <InlineText
            value={info.row.original.description}
            onSave={(v) => saveCell(info.row.original.id, 'description', v)}
            cellKey={`${info.row.original.id}:description`}
            cellState={cellState}
          />
        ),
      },
      ...fields.map<ColumnDef<Item>>((f) => ({
        id: `meta:${f.key}`,
        header: f.name,
        accessorFn: (row) => row.metadata[f.key] ?? '',
        cell: (info) => {
          const item = info.row.original;
          const v = item.metadata[f.key] ?? '';
          const cellKey = `${item.id}:meta:${f.key}`;
          if (f.type === 'select') {
            return (
              <InlineSelect
                value={v}
                options={['', ...(f.options ?? [])]}
                onSave={(val) => saveCell(item.id, `meta:${f.key}`, val)}
                cellKey={cellKey}
                cellState={cellState}
              />
            );
          }
          return (
            <InlineText
              value={v}
              type={f.type === 'date' ? 'date' : 'text'}
              onSave={(val) => saveCell(item.id, `meta:${f.key}`, val)}
              cellKey={cellKey}
              cellState={cellState}
            />
          );
        },
      })),
      {
        id: 'created',
        header: 'Created',
        accessorKey: 'createdAt',
        cell: (info) => (
          <span className="text-ink3 text-[12px] tabular-nums">
            {new Date(info.row.original.createdAt).toLocaleDateString()}
          </span>
        ),
      },
    ];
    return cols;
  }, [fields, cellState, clientId]);

  const table = useReactTable({
    data: items,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="bg-surface border border-rule rounded-[4px] overflow-x-auto">
      <table className="min-w-full">
        <thead>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id} className="border-b border-rule">
              {hg.headers.map((h) => (
                <th
                  key={h.id}
                  className="text-left text-[11px] font-medium uppercase tracking-wide text-ink3 px-4 py-3 cursor-pointer select-none"
                  onClick={h.column.getToggleSortingHandler()}
                >
                  {flexRender(h.column.columnDef.header, h.getContext())}
                  {h.column.getIsSorted() === 'asc' ? ' ↑' : h.column.getIsSorted() === 'desc' ? ' ↓' : ''}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="border-b border-rule last:border-b-0">
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-4 py-3 text-[14px] align-middle">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InlineText({
  value,
  onSave,
  type = 'text',
  cellKey,
  cellState,
  required,
}: {
  value: string;
  onSave: (v: string) => void;
  type?: 'text' | 'date';
  cellKey: string;
  cellState: Record<string, CellMeta>;
  required?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const meta = cellState[cellKey];
  return (
    <div className="relative">
      <input
        ref={inputRef}
        type={type}
        defaultValue={value}
        required={required}
        onBlur={(e) => {
          if (e.target.value !== value) onSave(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            (e.target as HTMLInputElement).blur();
          }
          if (e.key === 'Escape') {
            (e.target as HTMLInputElement).value = value;
            (e.target as HTMLInputElement).blur();
          }
        }}
        className={`w-full bg-transparent border ${
          meta?.error ? 'border-danger' : 'border-transparent hover:border-rule focus:border-ink'
        } px-2 py-1 rounded-[2px] focus:outline-none`}
      />
      {meta?.saving && <span className="absolute right-1 top-1 text-[10px] text-ink3">…</span>}
      {meta?.error && (
        <span className="absolute -bottom-4 left-2 text-[10px] text-danger">{meta.error}</span>
      )}
    </div>
  );
}

function InlineSelect({
  value,
  options,
  onSave,
  cellKey,
  cellState,
}: {
  value: string;
  options: string[];
  onSave: (v: string) => void;
  cellKey: string;
  cellState: Record<string, CellMeta>;
}) {
  const meta = cellState[cellKey];
  return (
    <div className="relative">
      <select
        defaultValue={value}
        onBlur={(e) => {
          if (e.target.value !== value) onSave(e.target.value);
        }}
        onChange={(e) => onSave(e.target.value)}
        className={`w-full bg-transparent border ${
          meta?.error ? 'border-danger' : 'border-transparent hover:border-rule focus:border-ink'
        } px-2 py-1 rounded-[2px] focus:outline-none text-[14px]`}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o || '—'}
          </option>
        ))}
      </select>
      {meta?.saving && <span className="absolute right-6 top-1 text-[10px] text-ink3">…</span>}
      {meta?.error && (
        <span className="absolute -bottom-4 left-2 text-[10px] text-danger">{meta.error}</span>
      )}
    </div>
  );
}
