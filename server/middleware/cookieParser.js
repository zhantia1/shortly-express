const parseCookies = (req, res, next) => {
  var cookiesObj = {};
  if (req.headers.cookie) {
    var cookies = req.headers.cookie.split('; ');
    cookies.forEach(cookie => {
      cookiesObj[cookie.split('=')[0]] = cookie.split('=')[1]; 
    });
  }
  req.cookies = cookiesObj;
  next();
};

module.exports = parseCookies;