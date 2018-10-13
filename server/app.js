const express = require('express');
const path = require('path');
const utils = require('./lib/hashUtils');
const partials = require('express-partials');
const bodyParser = require('body-parser');
const Auth = require('./middleware/auth');
const models = require('./models');
const cookieParser = require('./middleware/cookieParser');

const app = express();

app.set('views', `${__dirname}/views`);
app.set('view engine', 'ejs');
app.use(partials());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser);
app.use(Auth.createSession);
//app.use(Auth.verifySession);
app.use(express.static(path.join(__dirname, '../public')));



var assignSessionObject = (request, userId, username, hash) => {
  if (!request.session) {
    request.session = {};
  }
  request.session.userId = userId;
  request.session.hash = hash;
  request.session.user = {username};
  return true;
};



app.get('/', Auth.verifySession, 
(req, res) => {
  res.render('index');
});

app.get('/create', Auth.verifySession,
(req, res) => {
  res.render('index');
});

app.get('/links', Auth.verifySession,
(req, res, next) => {
  models.Links.getAll()
    .then(links => {
      res.status(200).send(links);
    })
    .error(error => {
      res.status(500).send(error);
    });
});

app.post('/links', Auth.verifySession,
(req, res, next) => {
  var url = req.body.url;
  console.log(url);
  if (!models.Links.isValidUrl(url)) {
    // send back a 404 if link is not valid
    return res.sendStatus(404);
  }

  return models.Links.get({ url })
    .then(link => {
      if (link) {
        throw link;
      }
      return models.Links.getUrlTitle(url);
    })
    .then(title => {
      return models.Links.create({
        url: url,
        title: title,
        baseUrl: req.headers.origin
      });
    })
    .then(results => {
      return models.Links.get({ id: results.insertId });
    })
    .then(link => {
      // console.log(link);
      throw link;
    })
    .error(error => {
      res.status(500).send(error);
    })
    .catch(link => {
      res.status(200).send(link);
    });
});

app.post('/signup', (req, res, next) => {
  models.Users.create(req.body)
    .then(({insertId}) => models.Sessions.update({hash: req.cookies.shortlyid}, {userId: insertId}))
    .then(() => {
      return models.Users.get({username: req.body.username});
    })
    .then((userObj) => {
      assignSessionObject(req, userObj.id, userObj.username, req.cookies.shortlyid);
      return;
    })
    .then(() => res.status(201).redirect('/'))
    .catch((err) => {console.log('SIGNUP ERR', err); res.status(400).redirect('/signup')});
});

app.post('/login', (req, res, next) => {
  console.log('REQUESTBODYLOGIN:', req.body);
  models.Users.get({username: req.body.username})
    .then(userObj => {
      //console.log(userObj);
      if (models.Users.compare(req.body.password, userObj.password, userObj.salt)) {
        models.Sessions.update({hash: req.cookies.shortlyid}, {userId: userObj.id})
          .then(() => assignSessionObject(req, userObj.id, req.body.username, req.cookies.shortlyid))
          //.then((data) => {console.log('SESSION DATA2:', data); Object.assign(req.session, data)})
          .then(() => res.status(201).redirect('/'));
      } else {
        res.status(400).redirect('/login');
      }
      return userObj;
    })
    .catch((err) => {console.log("caught", err); res.status(400).redirect('/login');});
});

app.get('/logout', (req, res, next) => {
  models.Sessions.delete({hash: req.cookies.shortlyid})
    .then(() => res.cookie('shortlyid', '').status(200).redirect('/'));
});
/************************************************************/
// Write your authentication routes here
/************************************************************/



app.get('/login', (req, res, next) => {
  console.log('LOGIN COOKIE:', req.cookies);
  res.render('login');
});

app.get('/signup', (req, res, next) => {
  res.render('signup');
});

/************************************************************/
// Handle the code parameter route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/:code', (req, res, next) => {

  return models.Links.get({ code: req.params.code })
    .tap(link => {

      if (!link) {
        throw new Error('Link does not exist');
      }
      return models.Clicks.create({ linkId: link.id });
    })
    .tap(link => {
      return models.Links.update(link, { visits: link.visits + 1 });
    })
    .then(({ url }) => {
      res.redirect(url);
    })
    .error(error => {
      res.status(500).send(error);
    })
    .catch(() => {
      res.redirect('/');
    });
});

module.exports = app;
