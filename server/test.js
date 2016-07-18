var request = require('supertest');
var app = require('./app.js');

describe('Test API', function() {
  var token = '';

  before(function(done) {
    request(app)
      .get('/api/token')
      .end(function(err, response) {
        if (err) { return done(err); }
        var result = JSON.parse(response.text);
        token = result.token;
        done();
      });
  });

  it('should not be able to consume /api/protected since no token was sent', function(done) {
    request(app)
      .get('/api/protected')
      .expect(401, done);
  });

  it('should be able to consume /api/protected since token was sent', function(done) {
    request(app)
      .get('/api/protected')
      .set('Authorization', 'Bearer ' + token)
      .expect(200, done);
  });
});
