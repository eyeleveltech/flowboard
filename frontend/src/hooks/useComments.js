import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

export function useAddComment(postId) {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user); // Need user to mock the comment
  return useMutation({
    mutationFn: (body) => api.post(`/posts/${postId}/comments`, { body }).then((r) => r.data),
    onMutate: async (body) => {
      await qc.cancelQueries({ queryKey: ['posts', postId] });
      const previousPost = qc.getQueryData(['posts', postId]);
      
      qc.setQueryData(['posts', postId], (old) => {
        if (!old) return old;
        const newComment = {
          id: 'temp-' + Date.now(),
          body,
          createdAt: new Date().toISOString(),
          user: { id: user?.id, name: user?.name },
        };
        return { ...old, comments: [...(old.comments || []), newComment] };
      });
      
      return { previousPost };
    },
    onError: (err, variables, context) => {
      if (context?.previousPost) {
        qc.setQueryData(['posts', postId], context.previousPost);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['posts', postId] });
    },
  });
}

export function useDeleteComment(postId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (commentId) => api.delete(`/posts/${postId}/comments/${commentId}`),
    onMutate: async (commentId) => {
      await qc.cancelQueries({ queryKey: ['posts', postId] });
      const previousPost = qc.getQueryData(['posts', postId]);
      qc.setQueryData(['posts', postId], (old) => {
        if (!old) return old;
        return { ...old, comments: (old.comments || []).filter(c => c.id !== commentId) };
      });
      return { previousPost };
    },
    onError: (err, variables, context) => {
      if (context?.previousPost) qc.setQueryData(['posts', postId], context.previousPost);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['posts', postId] });
    },
  });
}
