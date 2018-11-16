'use strict';
global.DATABASE_URL = 'mongodb://localhost/jwt-auth-demo-test';
const chai = require('chai');
const chaiHttp = require('chai-http');
const jwt = require('jsonwebtoken');

const {app, runServer, closeServer} = require('../server');
const {User} = require('../users');
const  { Link, Category } = require('../links/models');
const {JWT_SECRET} = require('../config');

const expect = chai.expect;

// This let's us make HTTP requests
// in our tests.
// see: https://github.com/chaijs/chai-http
chai.use(chaiHttp);

describe('/api/links', function() {
    const username = 'exampleUser';
    const password = 'examplePass';
    const firstName = 'Example';
    const lastName = 'User';
    const usernameB = 'exampleUserB';
    const passwordB = 'examplePassB';
    const firstNameB = 'ExampleB';
    const lastNameB = 'UserB';

    let testUser = null;

    before(function() {
        return runServer();
      });
    
    after(function() {
      return closeServer();
    });
  
    beforeEach(function() {
      testUser = null;
      return User.hashPassword(password).then(password =>
        User.create({
          username,
          password,
          firstName,
          lastName
        })
        .then(user => {         
          testUser = user;   
          //Promise.resolve();       
        })
      );
    });
  
    afterEach(function() {
      testUser = null;
      User.remove({})
      .then(function() {
        return Link.remove({});
      });
    });

    describe('/api/links', function() {
      it ('should not add link if no authenticated user (jwt)', function() {
        return chai
          .request(app)
          .post('/api/links')
          .send({
            href: 'https://www.google.com'
          })
          .then(() =>
            expect.fail(null, null, 'Request should not succeed')
          )
          .catch(err => {
            if (err instanceof chai.AssertionError) {
              throw err;
            }

            const res = err.response;
            expect(res).to.have.status(401);            
          });
      });

      it ('should not add a link without an href', function() {        
        const token = jwt.sign(
          {
            user: {
              username,
              firstName,
              lastName,
              id: testUser._id
            }
          },
          JWT_SECRET,
          {
            algorithm: 'HS256',
            subject: username,
            expiresIn: '7d'
          }
        );
        return chai
          .request(app)
          .post('/api/links')
          .set('authorization', `Bearer ${token}`)          
          
          .then(() =>
            expect.fail(null, null, 'Request should not succeed')
          )
          .catch(err => {
            if (err instanceof chai.AssertionError) {
              throw err;
            }

            const res = err.response;
            expect(res).to.have.status(422);
            expect(res.body.reason).to.equal('ValidationError');
            expect(res.body.message).to.equal('Missing field');
            expect(res.body.location).to.equal('url');
          });
      });

      it ('should not add a link with an invalid url', function() {        
        const url = 'https://wwwlkj';
        const token = jwt.sign(
          {
            user: {
              username,
              firstName,
              lastName,
              id: testUser._id
            }
          },
          JWT_SECRET,
          {
            algorithm: 'HS256',
            subject: username,
            expiresIn: '7d'
          }
        );
        return chai
          .request(app)
          .post('/api/links')
          .set('authorization', `Bearer ${token}`)
          .send({
            url
          })                    
          .then(() =>
            expect.fail(null, null, 'Request should not succeed')
          )
          .catch(err => {
            if (err instanceof chai.AssertionError) {
              throw err;
            }

            const res = err.response;
            expect(res).to.have.status(422);
            expect(res.body.reason).to.equal('ValidationError');
            expect(res.body.message).to.equal(`URL '${url}' is not formatted properly`);
            expect(res.body.location).to.equal('url');
          });
      });

      it ('should add a link without a category (defaults to "none")', function() {
        let response = null;
        const url = 'https://www.google.com';
        const token = jwt.sign(
          {
            user: {
              username,
              firstName,
              lastName,
              id: testUser._id
            }
          },
          JWT_SECRET,
          {
            algorithm: 'HS256',
            subject: username,
            expiresIn: '7d'
          }
        );
        return chai
          .request(app)
          .post('/api/links')
          .set('authorization', `Bearer ${token}`)
          .send({
            url            
          })                    
          .then((res) => {
            console.log(res.body);
            response = res;
            return Category.findById(res.body.data.category.toString());
          })
          .then(category => {            
            console.log(response.body);
            expect(category.name).to.equal('none');
            expect(response.body.data.href).to.equal(url);
            expect(response.body.data.user).to.equal(testUser._id.toString());
            expect(response).to.have.status(201);
          });
      }).timeout(20000);

      it ('should add a link with the provied category', function() {
        let response = null;
        const catInput = 'news';
        const url = 'https://www.google.com';
        const token = jwt.sign(
          {
            user: {
              username,
              firstName,
              lastName,
              id: testUser._id
            }
          },
          JWT_SECRET,
          {
            algorithm: 'HS256',
            subject: username,
            expiresIn: '7d'
          }
        );
        return chai
          .request(app)
          .post('/api/links')
          .set('authorization', `Bearer ${token}`)
          .send({
            url,
            category: catInput         
          })                    
          .then((res) => {
            console.log(res.body);
            response = res;
            return Category.findById(res.body.data.category.toString());
          })
          .then(category => {            
            console.log(response.body);
            expect(category.name).to.equal(catInput);
            expect(response.body.data.href).to.equal(url);
            expect(response.body.data.user).to.equal(testUser._id.toString());
            expect(response).to.have.status(201);
          });
      }).timeout(20000);

    });

});