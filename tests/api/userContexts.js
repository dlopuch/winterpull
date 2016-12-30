"use strict";

const request = require('supertest');

const app = requireApp('app');

function makeUserContext(userId, password) {
  let agent = request.agent(app);

  let isLoggedIn = false;

  agent.promiseLogin = function() {
    if (isLoggedIn) {
      return Promise.resolve();
    }

    return agent
    .post('/login')
    .send({ userId, password })
    .redirects(0)
    .expect(302)
    .expect('Location', '/')
    .then(() => {
      isLoggedIn = true;
    });
  };

  agent.promiseLogout = function() {
    if (!isLoggedIn) {
      return Promise.resolve();
    }

    return agent
    .get('/logout')
    .redirects(0)
    .expect(302)
    .expect('Location', '/login')
    .then(() => {
      isLoggedIn = false;
    });
  };


  return agent;
}

module.exports = {
  newUser: makeUserContext('new@user.com', '999')
};

