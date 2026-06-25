import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export function useChecklist(postId) {
  return useQuery({
    queryKey: ['checklist', postId],
    queryFn: () => api.get(`/posts/${postId}/checklist`).then((r) => r.data),
    enabled: !!postId,
  });
}

export function useAddChecklistItem(postId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post(`/posts/${postId}/checklist`, data).then((r) => r.data),
    onMutate: async (newItem) => {
      await qc.cancelQueries({ queryKey: ['checklist', postId] });
      const previousChecklist = qc.getQueryData(['checklist', postId]);
      qc.setQueryData(['checklist', postId], (old) => {
        if (!old) return old;
        return [...old, { id: 'temp-' + Date.now(), label: newItem.label, completed: false }];
      });
      return { previousChecklist };
    },
    onError: (err, variables, context) => {
      if (context?.previousChecklist) qc.setQueryData(['checklist', postId], context.previousChecklist);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['checklist', postId] });
    },
  });
}

export function useToggleChecklistItem(postId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.patch(`/posts/${postId}/checklist/${data.id}`, { completed: data.completed }).then((r) => r.data),
    onMutate: async (variables) => {
      await qc.cancelQueries({ queryKey: ['checklist', postId] });
      const previousChecklist = qc.getQueryData(['checklist', postId]);
      qc.setQueryData(['checklist', postId], (old) => {
        if (!old) return old;
        return old.map((item) =>
          item.id === variables.id ? { ...item, completed: variables.completed } : item
        );
      });
      return { previousChecklist };
    },
    onError: (err, variables, context) => {
      if (context?.previousChecklist) {
        qc.setQueryData(['checklist', postId], context.previousChecklist);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['checklist', postId] });
    },
  });
}

export function useDeleteChecklistItem(postId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (itemId) => api.delete(`/posts/${postId}/checklist/${itemId}`),
    onMutate: async (itemId) => {
      await qc.cancelQueries({ queryKey: ['checklist', postId] });
      const previousChecklist = qc.getQueryData(['checklist', postId]);
      qc.setQueryData(['checklist', postId], (old) => {
        if (!old) return old;
        return old.filter(item => item.id !== itemId);
      });
      return { previousChecklist };
    },
    onError: (err, variables, context) => {
      if (context?.previousChecklist) qc.setQueryData(['checklist', postId], context.previousChecklist);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['checklist', postId] });
    },
  });
}
