"use strict";

const passport = require('passport');
const PassportLocalStrategy = require('passport-local');

passport.use(new PassportLocalStrategy(
  function(username, password, callback) {

  }
));

/** Serializes user to the session -- keep the session (and session cookie) lightweight! */
passport.serializeUser(function(user, callback) {
  callback(user.userId);
});

/**
 * Deserialize user from the session cookie -- get the full user object out of the DB
 * (which passport puts into req.user
 */
passport.deserializeUser(function(userId, callback) {

});

module.exports = passport;