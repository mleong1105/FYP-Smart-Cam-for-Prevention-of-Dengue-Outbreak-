const checkAdminRole = (req, res, next) => {
    const userRole = req.session.userRole;
  
    if (userRole === 'admin' || userRole === 'superadmin') {
      next();
    } else {
      res.status(403).json({ status: 'fail', message: 'Permission denied' });
    }
};

module.exports = { checkAdminRole };