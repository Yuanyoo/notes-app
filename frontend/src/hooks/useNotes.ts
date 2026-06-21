import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import api from "@/lib/api";
import { Note, NoteData, NoteListItem } from "@/types";

const BASE = "/proxy/notes";

interface NotesFilter {
  category?: string;
  search?: string;
  pinned?: boolean;
}

export function useNotes(filter: NotesFilter = {}) {
  const params = new URLSearchParams();
  if (filter.category) params.set("category", filter.category);
  if (filter.search) params.set("search", filter.search);
  if (filter.pinned !== undefined) params.set("pinned", String(filter.pinned));

  return useQuery<NoteListItem[]>({
    queryKey: ["notes", filter],
    queryFn: async () => {
      const res = await api.get<{ results?: NoteListItem[] } | NoteListItem[]>(
        `${BASE}?${params.toString()}`
      );
      const data = res.data;
      return Array.isArray(data) ? data : (data.results ?? []);
    },
  });
}

export function useNote(id: string) {
  return useQuery<Note>({
    queryKey: ["note", id],
    queryFn: () => api.get<Note>(`${BASE}/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { title: string; category_id?: string; data?: NoteData }) =>
      api.post<Note>(BASE, payload).then((r) => r.data),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["notes"] }),
  });
}

export function useUpdateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string; title?: string; data?: NoteData; category_id?: string | null }) =>
      api.patch<Note>(`${BASE}/${id}`, payload).then((r) => r.data),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: ["notes"] });
      void qc.invalidateQueries({ queryKey: ["note", vars.id] });
    },
  });
}

export function useDeleteNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`${BASE}/${id}`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["notes"] }),
  });
}
