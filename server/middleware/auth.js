const models = require('../models');
const Promise = require('bluebird');



var assignSessionObject = (request, userId, username, hash) => {
  if (!request.session) {
    request.session = {};
  }
  request.session.userId = userId;
  request.session.hash = hash;
  request.session.user = {username};
};


module.exports.createSession = (req, res, next) => {
  if (!req.cookies.shortlyid) {
    models.Sessions.create()
      .then((result) => {
        return models.Sessions.get({'id': result.insertId});
      })
      .then((sessionData) => {
        assignSessionObject(req, null, null, sessionData.hash);
        req.cookies.shortlyid = sessionData.hash;
        res.cookie('shortlyid', sessionData.hash);
      })
      .then(next);
  } else {
    models.Sessions.get({'hash': req.cookies.shortlyid})
      .then((sessionData) => {
        if (sessionData) {
          if (sessionData.user) {
            assignSessionObject(req, sessionData.userId, sessionData.user.username, sessionData.hash);
          }
        }
        next();
      })
      .catch(() => {
        req.cookies.shortlyid = undefined;
        module.exports.createSession(req, res, next);
      });
  }
};

/************************************************************/
// Add additional authentication middleware functions below
/************************************************************/
module.exports.verifySession = (req, res, next) => {
  //console.log(req);
  // models.Sessions.isLoggedIn(req.session) ? next() : res.status(400).redirect('/login');
  req.session = {user: true, hash: req.cookies.shortlyid};
  console.log('LABEL', req.cookies.shortlyid);
  models.Sessions.get({'hash': req.cookies.shortlyid})
    .then((data) => {
      if (data.userId !== null) {
        next();
      } else {
        res.status(400).redirect('/login');
      }
    })
    .catch((err) => res.status(400).redirect('/login'));
    
};
