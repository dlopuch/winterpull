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

module.exports = passport;
