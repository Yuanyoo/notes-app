"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { ChevronDown, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { useCategories } from "@/hooks/useCategories";
import { useDeleteNote, useUpdateNote } from "@/hooks/useNotes";
import { formatNoteDateTime } from "@/lib/tiptap-utils";
import { Note } from "@/types";

interface NoteEditorProps {
  note: Note;
}

const AUTOSAVE_DELAY = 800;

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function NoteEditor({ note }: NoteEditorProps) {
  const router = useRouter();
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();
  const { data: categories = [] } = useCategories();
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [currentCategoryId, setCurrentCategoryId] = useState(note.category_id);

  const category = categories.find((c) => c.id === currentCategoryId);
  const color = category?.color ?? "#957139";
  const bgColor = hexToRgba(color, 0.5);
  const borderColor = color;

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: "Pour your heart out..." }),
    ],
    content: note.data.content ?? { type: "doc", content: [] },
    editorProps: {
      attributes: {
        class: "outline-none flex-1 w-full font-sans text-base leading-[27px] text-black",
      },
    },
    onUpdate: ({ editor }) => {
      scheduleSave({ content: editor.getJSON() });
    },
  });

  const scheduleSave = useCallback(
    (partial: { title?: string; content?: object; category_id?: string | null }) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        try {
          const title = titleRef.current?.value ?? note.title;
          const content = partial.content ?? note.data.content;
          const cat = partial.category_id !== undefined ? partial.category_id : currentCategoryId;
          await updateNote.mutateAsync({
            id: note.id,
            title,
            category_id: cat,
            data: { ...note.data, content },
          });
        } catch {
          toast.error("Failed to save note");
        }
      }, AUTOSAVE_DELAY);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [note, updateNote, currentCategoryId]
  );

  useEffect(() => {
    if (editor && note.data.content) {
      editor.commands.setContent(note.data.content);
    }
    if (titleRef.current) {
      titleRef.current.value = note.title;
    }
    setCurrentCategoryId(note.category_id);
  }, [editor, note.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  const handleCategoryChange = (catId: string) => {
    setCurrentCategoryId(catId);
    setCategoryOpen(false);
    scheduleSave({ category_id: catId });
  };

  return (
    <div className="flex-1 flex flex-col h-full relative">
      {/* Top bar: category dropdown + close button */}
      <div className="flex items-center justify-between pt-[33px] pb-0 relative z-10">
        {/* Category dropdown */}
        <div className="relative">
          <button
            onClick={() => setCategoryOpen(!categoryOpen)}
            className="flex items-center gap-2 border border-[#957139] rounded-md h-[39px] px-4 text-xs font-sans bg-transparent hover:bg-[#957139]/5 transition-colors"
          >
            {category && (
              <span
                className="w-[11px] h-[11px] rounded-full flex-shrink-0"
                style={{ backgroundColor: category.color }}
              />
            )}
            <span className="text-black">{category?.name ?? "No category"}</span>
            <ChevronDown className="w-4 h-4 text-[#957139]" />
          </button>

          {categoryOpen && (
            <div className="absolute top-full mt-1 left-0 bg-[#faf1e3] border border-[#957139] rounded-md shadow-md z-20 min-w-[180px]">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryChange(cat.id)}
                  className="flex items-center gap-2 w-full px-4 h-[36px] text-xs font-sans hover:bg-[#957139]/10 transition-colors text-left"
                >
                  <span
                    className="w-[11px] h-[11px] rounded-full flex-shrink-0"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span>{cat.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right actions: delete + close */}
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              if (!confirm("Delete this note?")) return;
              try {
                await deleteNote.mutateAsync(note.id);
                router.push("/notes");
              } catch {
                toast.error("Could not delete note");
              }
            }}
            className="w-7 h-7 flex items-center justify-center text-black/40 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
            aria-label="Delete note"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => router.back()}
            className="w-7 h-7 flex items-center justify-center text-black hover:text-[#957139] transition-colors"
            aria-label="Close note"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Note card — takes full height */}
      <div
        className="flex-1 flex flex-col rounded-[11px] mt-[51px] overflow-hidden"
        style={{
          border: `3px solid ${borderColor}`,
          backgroundColor: bgColor,
          boxShadow: "1px 1px 2px 0px rgba(0,0,0,0.25)",
        }}
      >
        <div className="flex flex-col gap-6 h-full px-16 pt-10 pb-16 overflow-y-auto">
          {/* Last edited */}
          <p className="font-sans text-xs text-right text-black w-full self-end">
            Last Edited: {formatNoteDateTime(note.updated_at)}
            {updateNote.isPending && " · Saving…"}
          </p>

          {/* Title */}
          <input
            ref={titleRef}
            defaultValue={note.title}
            placeholder="Note Title"
            className="font-serif font-bold text-2xl leading-tight bg-transparent outline-none placeholder:text-black/40 w-full"
            onChange={(e) => scheduleSave({ title: e.target.value })}
          />

          {/* Body — tiptap */}
          <div className="flex-1">
            <EditorContent
              editor={editor}
              className="font-sans text-base leading-[27px] text-black w-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
