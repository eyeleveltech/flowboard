import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export function useHashtags(clientId) {
  return useQuery({
    queryKey: ['hashtags', clientId],
    queryFn: () => api.get('/hashtags', { params: { clientId } }).then((r) => r.data),
  });
}

export function useCreateHashtagSet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/hashtags', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hashtags'] }),
  });
}

export function useDeleteHashtagSet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/hashtags/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hashtags'] }),
  });
}
