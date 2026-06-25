import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export function useBulkPosts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, action, data }) => api.post('/bulk/posts', { ids, action, data }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['posts'] }),
  });
}
