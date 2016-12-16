"use strict";

const passport = require('passport');
const PassportLocalStrategy = require('passport-local');

const user = requireApp('models/user');

passport.use('local', new PassportLocalStrategy({
    // Sets POST's body extraction params on login
    usernameField: 'userId',
    passwordField: 'password',
  },
  function(username, password, callback) {
    user.validatePassword(username, password)
    .then(pwGood => {
      if (!pwGood) {
        return callback(null, false, { message: 'Username or password incorrect.' });
      }

      return user.getUser(username).then(user => callback(null, user));
    })
    .catch(callback);
  }
));

/** Serializes user to the session -- keep the session (and session cookie) lightweight! */
passport.serializeUser(function(user, callback) {
  callback(null, user.userId);
});

/**
 * Deserialize user from the session cookie -- get the full user object out of the DB
 * (which passport puts into req.user
 */
passport.deserializeUser(function(userId, callback) {
  user.getUser(userId)
  .then(user => callback(null, user))
  .catch(callback);
});

/**
 * This is the MW that handles authentication.  Mount this at `POST /login` or similar
 */
const authenticationMw = passport.authenticate('local', {
  successRedirect: '/',
  failureMessage: true, // Sets any messages from validation callback onto req.session.messages
});

/**
 * On a failed login, a failure message will be added to session.messages.  This MW can pull those messages down in JSON.
 */
const getAuthenticateMessagesMw = function getAuthenticateMessagesMw(req, res, next) {
  let messages = req.session.messages;
  delete req.session.messages;
  res.json({ messages: messages || [] });
}

const makeUserIsAuthenticatedGate = function makeUserIsAuthenticatedGate(redirectUrl) {
  return (req, res, next) => {
    if (!req.user) {
      return res.redirect(401, redirectUrl);
    }

    next();
  };
};


module.exports = {
  authenticationMw,
  getAuthenticateMessagesMw,
  makeUserIsAuthenticatedGate,
  passport,
};
