"use client";

import { toast } from "sonner";

import { NoteList } from "@/components/notes/NoteList";
import { useCategories } from "@/hooks/useCategories";
import { useCreateNote } from "@/hooks/useNotes";

export default function NotesPage() {
  const createNote = useCreateNote();
  const { data: categories = [] } = useCategories();

  const handleCreate = async () => {
    try {
      const note = await createNote.mutateAsync({
        title: "Untitled",
        category_id: categories[0]?.id,
        data: { content: { type: "doc", content: [] }, pinned: false },
      });
      window.location.href = `/notes/${note.id}`;
    } catch {
      toast.error("Could not create note");
    }
  };

  return (
    <div className="flex flex-col h-full px-0">
      {/* Top bar with New Note button */}
      <div className="flex items-center justify-end pt-[39px] pr-[37px] pb-0 shrink-0">
        <button
          onClick={() => void handleCreate()}
          disabled={createNote.isPending}
          className="flex items-center gap-1.5 border border-[#957139] rounded-full px-4 h-[43px] text-[#957139] font-sans font-bold text-base hover:bg-[#957139]/10 transition-colors disabled:opacity-50"
        >
          <span className="text-lg leading-none">+</span>
          New Note
        </button>
      </div>

      {/* Notes grid starts at top-[101px] in Figma — matched via padding */}
      <div className="flex flex-1 pt-[19px] pl-0 pr-[37px] pb-8 overflow-y-auto">
        <NoteList />
      </div>
    </div>
  );
}
