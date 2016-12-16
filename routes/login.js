"use strict";

const passportMw = requireApp('middleware/passport');
const router = require('express').Router();

router.post('/login', passportMw.authenticationMw);

router.get('/logout', (req, res) => {
  req.logout();
  res.redirect('/login');
});
router.post('/logout', (req, res) => {
  req.logout();
  res.redirect('/login');
});

router.get('/login/status', passportMw.getAuthenticateMessagesMw);

router.get('/login', function(req, res) {
  // messages from failed logins, set by passport
  let messages = req.session.messages;
  delete req.session.messages;

  if (!req.xhr && req.accepts(['text/html'])) {
    return res
    .set('Content-Type', 'text/html')
    .send(`
    ${ !messages || !messages.length ? '' :
      ` <ul>
        ${messages.map(msg => `<li>${msg}</li>`)}
      </ul>
    `
      }
    <form action="/login" method="post">
      Email: <input type="text" name="userId" value="ski@haus.com"><br>
      
      Password: <input type="password" name="password" value=""><br><br>
      
      <input type="submit" value="Submit">
    </form>
  `);
  }

  res.json({
    toLogin: 'To login, POST userId and password to /login',
    messages: messages
  });
});

module.exports = router;
