const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'ADMIN', 'MANAGER']);

export function requireAdmin(req, res, next) {
  if (!ADMIN_ROLES.has(req.user?.role)) {
    return res.status(403).json({ error: 'Admin only' });
  }
  next();
}

export function requireSuperAdmin(req, res, next) {
  if (req.user?.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Super admin only' });
  }
  next();
}

export function requireManager(req, res, next) {
  const MANAGER_ROLES = new Set(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ADMIN_MANAGER']);
  if (!MANAGER_ROLES.has(req.user?.role)) {
    return res.status(403).json({ error: 'Manager or above required' });
  }
  next();
}
