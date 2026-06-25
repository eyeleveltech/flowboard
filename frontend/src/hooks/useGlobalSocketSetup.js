import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import { useAuthStore } from '@/stores/authStore';

export function useGlobalSocketSetup() {
  const token = useAuthStore((s) => s.token);
  const qc = useQueryClient();

  useEffect(() => {
    if (!token) {
      disconnectSocket();
      return;
    }

    const socket = connectSocket();

    const handlePostUpdated = (updatedPost) => {
      // Invalidate the global 'posts' list so Dashboards and Lists update
      qc.invalidateQueries({ queryKey: ['posts'] });
      // Update the specific post cache directly if we have it
      if (updatedPost?.id) {
        qc.setQueryData(['posts', updatedPost.id], (old) => {
          if (!old) return old;
          // Merge to prevent losing nested data that might not be in the update payload
          return { ...old, ...updatedPost };
        });
      }
    };

    const handlePostDeleted = ({ id }) => {
      qc.invalidateQueries({ queryKey: ['posts'] });
      if (id) {
        qc.removeQueries({ queryKey: ['posts', id] });
      }
    };

    const handleCrisis = () => {
      qc.invalidateQueries({ queryKey: ['posts'] });
    };

    socket.on('post:updated', handlePostUpdated);
    socket.on('post:deleted', handlePostDeleted);
    socket.on('posts:crisis', handleCrisis);

    return () => {
      socket.off('post:updated', handlePostUpdated);
      socket.off('post:deleted', handlePostDeleted);
      socket.off('posts:crisis', handleCrisis);
      // We don't necessarily disconnect here because the app might just be re-rendering,
      // the disconnect happens when the token becomes null.
    };
  }, [token, qc]);
}
