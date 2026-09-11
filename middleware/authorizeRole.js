// 10. Authorization + RBAC: This middleware permits a route only when the
// authenticated user's role matches the required role, such as "admin".
const authorizeRole = (requiredRole) => {
    return (req, res, next) => {
        if (req.user.role !== requiredRole) {
            return res.status(403).json({
                message: "Access denied"
            })
        }
        next();
    }
}
export default authorizeRole;