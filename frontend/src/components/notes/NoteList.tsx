"use client";

import Link from "next/link";

import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useCategories } from "@/hooks/useCategories";
import { useCreateNote, useDeleteNote, useNotes } from "@/hooks/useNotes";
import { formatNoteDate, tiptapToText } from "@/lib/tiptap-utils";
import { Category, NoteListItem } from "@/types";

interface NoteGridProps {
  categorySlug?: string;
}

// Helper: hex → rgba with given opacity
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function NoteCard({
  note,
  category,
  onDelete,
}: {
  note: NoteListItem;
  category: Category | undefined;
  onDelete: (id: string) => void;
}) {
  const color = category?.color ?? "#957139";
  const bgColor = hexToRgba(color, 0.5);

  const preview = note.data?.content ? tiptapToText(note.data.content) : "";

  return (
    <div
      className="group relative flex flex-col gap-3 h-[246px] w-[303px] rounded-[11px] p-4 transition-shadow hover:shadow-md"
      style={{
        border: `3px solid ${color}`,
        backgroundColor: bgColor,
        boxShadow: "1px 1px 2px 0px rgba(0,0,0,0.25)",
      }}
    >
      {/* Delete button — appears on hover */}
      <button
        onClick={(e) => { e.preventDefault(); onDelete(note.id); }}
        className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity bg-black/10 hover:bg-red-400/80 text-black hover:text-white"
        aria-label="Delete note"
      >
        <Trash2 className="w-3 h-3" />
      </button>

      <Link href={`/notes/${note.id}`} className="flex flex-col gap-3 flex-1 min-h-0">
        {/* Date + category row */}
        <div className="flex items-center gap-2 text-xs whitespace-nowrap">
          <span className="font-sans font-bold">{formatNoteDate(note.updated_at)}</span>
          <span className="font-sans font-normal">{category?.name}</span>
        </div>

        {/* Title */}
        <h3 className="font-serif font-bold text-2xl leading-tight line-clamp-2" style={{ width: "268px" }}>
          {note.title || "Untitled"}
        </h3>

        {/* Preview */}
        <p
          className="font-sans font-normal text-xs overflow-hidden text-ellipsis flex-1"
          style={{ maxHeight: "125px", whiteSpace: "pre-wrap", display: "-webkit-box", WebkitLineClamp: 6, WebkitBoxOrient: "vertical" } as React.CSSProperties}
        >
          {preview || ""}
        </p>
      </Link>
    </div>
  );
}

function EmptyState({ onCreateNote }: { onCreateNote: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/illustrations/boba-tea.png"
        alt="Waiting for your notes"
        width={297}
        height={296}
        className="object-contain"
      />
      <p className="font-sans text-2xl text-[#88642a]">
        I&apos;m just here waiting for your charming notes...
      </p>
      <button
        onClick={onCreateNote}
        className="border border-[#957139] rounded-full px-6 py-2 text-[#957139] font-sans font-bold text-sm hover:bg-[#957139]/10 transition-colors"
      >
        + New Note
      </button>
    </div>
  );
}

export function NoteList({ categorySlug }: NoteGridProps) {
  const { data: notes = [], isLoading } = useNotes({ category: categorySlug });
  const { data: categories = [] } = useCategories();
  const createNote = useCreateNote();
  const deleteNote = useDeleteNote();

  const category = categories.find((c) => c.slug === categorySlug);

  const handleDelete = async (id: string) => {
    try {
      await deleteNote.mutateAsync(id);
      toast.success("Note deleted");
    } catch {
      toast.error("Could not delete note");
    }
  };

  const handleCreate = async () => {
    try {
      const note = await createNote.mutateAsync({
        title: "Untitled",
        category_id: category?.id,
        data: { content: { type: "doc", content: [] }, pinned: false },
      });
      window.location.href = `/notes/${note.id}`;
    } catch {
      toast.error("Could not create note");
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-wrap gap-4 p-8 content-start">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="w-[303px] h-[246px] rounded-[11px] animate-pulse"
            style={{ backgroundColor: "rgba(149,113,57,0.1)" }}
          />
        ))}
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="flex-1 flex flex-col">
        <EmptyState onCreateNote={() => void handleCreate()} />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-wrap gap-[13px] p-0 content-start">
      {notes.map((note) => {
        const cat = categories.find((c) => c.id === note.category_id);
        return (
          <NoteCard
            key={note.id}
            note={note}
            category={cat}
            onDelete={(id) => void handleDelete(id)}
          />
        );
      })}
    </div>
  );
}
