import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import api from "@/lib/api";
import { Category } from "@/types";

const BASE = "/proxy/categories";

export function useCategories() {
  return useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await api.get<{ results?: Category[] } | Category[]>(BASE);
      const data = res.data;
      return Array.isArray(data) ? data : (data.results ?? []);
    },
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name: string; color: string }) =>
      api.post<Category>(BASE, payload).then((r) => r.data),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["categories"] }),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string; name?: string; color?: string }) =>
      api.patch<Category>(`${BASE}/${id}`, payload).then((r) => r.data),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["categories"] }),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`${BASE}/${id}`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["categories"] }),
  });
}
