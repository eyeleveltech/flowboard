import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export function usePosts(filters = {}, { enabled = true } = {}) {
  const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v != null && v !== ''));
  return useQuery({
    queryKey: ['posts', params],
    queryFn: () => api.get('/posts', { params }).then((r) => r.data),
    enabled,
  });
}

export function usePost(id) {
  return useQuery({
    queryKey: ['posts', id],
    queryFn: () => api.get(`/posts/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/posts', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['posts'] }),
  });
}

export function useUpdatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => api.put(`/posts/${id}`, data).then((r) => r.data),
    onMutate: async (variables) => {
      // Cancel any outgoing refetches
      await qc.cancelQueries({ queryKey: ['posts', variables.id] });
      // Snapshot the previous value
      const previousPost = qc.getQueryData(['posts', variables.id]);
      // Optimistically update to the new value
      qc.setQueryData(['posts', variables.id], (old) => {
        if (!old) return old;
        return { ...old, ...variables };
      });

      // Optimistically update list queries
      const previousLists = qc.getQueriesData({ queryKey: ['posts'] });
      
      // Find the post data from anywhere (single cache or any list)
      let fullPost = qc.getQueryData(['posts', variables.id]);
      if (!fullPost) {
        for (const [key, data] of previousLists) {
          if (data && Array.isArray(data.posts)) {
            const found = data.posts.find(p => p.id === variables.id);
            if (found) {
              fullPost = found;
              break;
            }
          }
        }
      }

      previousLists.forEach(([queryKey, old]) => {
        // Skip non-list queries or queries without posts array
        if (!old || !Array.isArray(old.posts)) return;

        let newPosts = [...old.posts];
        const postIndex = newPosts.findIndex(p => p.id === variables.id);
        const queryParams = queryKey[1] || {};

        // If status changed, we might need to move it between lists
        if (postIndex !== -1) {
          // It's currently in this list
          if (variables.status && queryParams.status && variables.status !== queryParams.status) {
            // No longer matches this list's status, remove it
            newPosts.splice(postIndex, 1);
          } else {
            // Still belongs here, just update properties
            newPosts[postIndex] = { ...newPosts[postIndex], ...variables };
          }
        } else {
          // It's not in this list. Should it be?
          if (variables.status && queryParams.status === variables.status) {
            // Yes! Insert it using the found post data
            if (fullPost) {
              newPosts.unshift({ ...fullPost, ...variables });
            }
          }
        }

        qc.setQueryData(queryKey, { ...old, posts: newPosts, total: newPosts.length });
      });

      return { previousPost, previousLists };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousPost) {
        qc.setQueryData(['posts', variables.id], context.previousPost);
      }
      if (context?.previousLists) {
        context.previousLists.forEach(([queryKey, data]) => {
          qc.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: (data, error, variables) => {
      // Always refetch after error or success to ensure backend sync
      qc.invalidateQueries({ queryKey: ['posts', variables.id] });
      qc.invalidateQueries({ queryKey: ['posts'] });
    },
  });
}

export function useDeletePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/posts/${id}`),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['posts'] });
      const previousLists = qc.getQueriesData({ queryKey: ['posts'] });
      
      previousLists.forEach(([queryKey, old]) => {
        if (!old || !Array.isArray(old.posts)) return;
        const newPosts = old.posts.filter(p => p.id !== id);
        qc.setQueryData(queryKey, { ...old, posts: newPosts, total: newPosts.length });
      });
      return { previousLists };
    },
    onError: (err, variables, context) => {
      if (context?.previousLists) {
        context.previousLists.forEach(([queryKey, data]) => {
          qc.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['posts'] });
    },
  });
}
