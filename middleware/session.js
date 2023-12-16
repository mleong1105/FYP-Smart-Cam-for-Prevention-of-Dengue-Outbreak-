const checkSession = (req, res, next) => {
  // Check if user is authenticated based on session
  const isAuthenticated = req.session.isAuthenticated || false;

  // If not authenticated and not on the login page, redirect to the login page
  if (!isAuthenticated && req.url !== '/login' && req.url !== '/api/authenticate/accountlogin' && req.url !== '/favicon.ico' && req.url !== '/api/exampleapi/example') {
    console.log(isAuthenticated, req.url)
    res.redirect('/login');
    return;
  }

  // User is authenticated or on the login page, continue to the next middleware or route handler
  next();
};

module.exports = { checkSession };