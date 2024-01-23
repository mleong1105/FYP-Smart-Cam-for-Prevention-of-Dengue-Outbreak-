const checkSession = (req, res, next) => {
  // Check if user is authenticated based on session
  const isAuthenticated = req.session.isAuthenticated || false;
  const userId = req.session.userId || null;
  const userRole = req.session.userRole || null;

  // If not authenticated and not on the login page, redirect to the login page
  if (!isAuthenticated && req.url !== '/login' && req.url !== '/signup' && req.url !== '/api/authenticate/accountlogin' && req.url !== '/api/authenticate/accountloginAP' && req.url !== '/api/authenticate/accountsignup' && req.url !== '/favicon.ico'
  && req.url !== '/api/predictionDcWeather/getPrediction'
  && req.url !== '/api/imageReport/addImageReport'
  && req.url !== '/api/time'
  && req.url !== '/api/tryapi'
  ) {
    console.log(isAuthenticated, req.url)
    res.redirect('/login');
    return;
  }

  req.isAuthenticated = isAuthenticated
  req.userId = userId;
  req.userRole = userRole;
  // User is authenticated or on the login page, continue to the next middleware or route handler
  next();
};

module.exports = { checkSession };