export function isAdmin(req, res, next) {
  try {
    if (req.user && req.user.role === 'admin') return next();
    return res
      .status(403)
      .json({ success: false, message: 'Forbidden: admin only' });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: 'Server error in isAdmin middleware' });
  }
}

export default isAdmin;
