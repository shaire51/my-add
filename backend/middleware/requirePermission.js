module.exports = function requirePermission(permissionCode) {
  return (req, res, next) => {
    const permissions = req.user?.permissions || [];

    if (!permissions.includes(permissionCode)) {
      return res.status(403).json({ message: "沒有權限" });
    }

    next();
  };
};
