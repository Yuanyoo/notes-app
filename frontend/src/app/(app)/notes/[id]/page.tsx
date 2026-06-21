"use client";

import { useParams } from "next/navigation";

import { NoteEditor } from "@/components/notes/NoteEditor";
import { useNote } from "@/hooks/useNotes";

export default function NotePage() {
  const { id } = useParams<{ id: string }>();
  const { data: note, isLoading } = useNote(id);

  return (
    <div className="flex flex-col h-full px-[37px]">
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="h-8 w-8 rounded-full border-4 border-[#957139] border-t-transparent animate-spin" />
        </div>
      ) : note ? (
        <NoteEditor note={note} />
      ) : (
        <div className="flex-1 flex items-center justify-center font-sans text-sm text-[#957139]">
          Note not found
        </div>
      )}
    </div>
  );
}
