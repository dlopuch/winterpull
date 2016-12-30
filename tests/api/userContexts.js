"use strict";

/* User Contexts
 *
 * Exposes some supertest instances scoped to cookie jars holding specific user login credentials.
 *
 * To use:
 *   myUser = userContexts.someUser;  // supertest instance
 *
 *   before('should be logged-in', () => myUser.promiseLogin());  // logs-in the user context if not already so
 *
 *   it('should hit some endpoint', function() {
 *     return myUser.post('/foo').send(...).expect(...); // use it like any supertest instance
 *   });
 */

const request = require('supertest');

const app = requireApp('app');

function makeUserContext(userId, password) {
  let agent = request.agent(app); // creates new cookie jar for login cookies

  let isLoggedIn = false;

  agent.userId = userId;

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
  dolores: makeUserContext('dolores@hosts.com', 'm@ze')
};

