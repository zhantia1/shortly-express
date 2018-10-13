const models = require('../models');
const Promise = require('bluebird');

module.exports.createSession = (req, res, next) => {
  if (!req.cookies.shortlyid) {
    models.Sessions.create()
      .then((result) => {
        return models.Sessions.get({'id': result.insertId});
      })
      .then((sessionData) => {
        req.session = sessionData;
        req.cookies.shortlyid = sessionData.hash;
        res.cookie('shortlyid', sessionData.hash);
      })
      .then(next);
  } else {
    models.Sessions.get({'hash': req.cookies.shortlyid})
      .then((sessionData) => {
        req.session = sessionData;
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

