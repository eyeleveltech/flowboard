import jwt from 'jsonwebtoken';

const activePostViewers = {};

export function initSocket(io) {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = payload;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(`user:${socket.user.id}`);
    socket.emit('connected', { userId: socket.user.id });

    socket.on('join_post', ({ postId, user }) => {
      // Leave previous post if any
      if (socket.currentPostId && socket.currentPostId !== postId) {
        leavePost(socket, socket.currentPostId, io);
      }
      
      socket.join(`post:${postId}`);
      socket.currentPostId = postId;
      socket.userInfo = user;
      
      if (!activePostViewers[postId]) {
        activePostViewers[postId] = new Map();
      }
      activePostViewers[postId].set(socket.id, user);

      io.to(`post:${postId}`).emit('presence_update', Array.from(activePostViewers[postId].values()));
    });

    socket.on('leave_post', ({ postId }) => {
      leavePost(socket, postId, io);
    });

    socket.on('disconnect', () => {
      if (socket.currentPostId) {
        leavePost(socket, socket.currentPostId, io);
      }
      socket.leave(`user:${socket.user.id}`);
    });
  });
}

function leavePost(socket, postId, io) {
  socket.leave(`post:${postId}`);
  socket.currentPostId = null;

  if (activePostViewers[postId]) {
    activePostViewers[postId].delete(socket.id);
    io.to(`post:${postId}`).emit('presence_update', Array.from(activePostViewers[postId].values()));
    if (activePostViewers[postId].size === 0) {
      delete activePostViewers[postId];
    }
  }
}
