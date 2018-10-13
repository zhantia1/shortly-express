const models = require('../models');
const Promise = require('bluebird');

module.exports.createSession = (req, res, next) => {
  if (!req.cookies.shortlyid) {
    models.Sessions.create()
      .then((result) => {
        return models.Sessions.get({'id': result.insertId});
      })
      .then((sessionData) => {
        res.session = sessionData;
        req.session = sessionData;
        console.log('DATABASEHASH', sessionData.hash);
        req.cookies.shortlyid = sessionData.hash;
        res.cookie('shortlyid', sessionData.hash);
        console.log('cookiehash after create', req.cookies.shortlyid);
        next();
      });
  } else {
    models.Sessions.get({'hash': req.cookies.shortlyid})
      .then((sessionData) => {
        req.session = sessionData;
        res.session = sessionData;
        next();
      })
      .catch(() => {
        req.cookies.shortlyid = false;
        module.exports.createSession(req, res, next);
      });
  }
};

module.exports.verifySession = (req, res, next) => {
  let hash = req.cookies.shortlyid;
  if (!req.session) {
    console.log('cookiehash', hash);
  }
  if (!hash) { console.log('no hash!'); }
  models.Sessions.get({hash})
    .then(sessionData => {
      console.log('DATA', sessionData);
      req.session = sessionData;
      if (models.Sessions.isLoggedIn(req.session)) {
        next();
      } else {
        res.redirect('/login');
      }
    })
    .catch(() => res.redirect('/login'));
};

/************************************************************/
// Add additional authentication middleware functions below
/************************************************************/

