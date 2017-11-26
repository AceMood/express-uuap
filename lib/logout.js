/**
 * @file provide logout middleware
 */

const url = require('url');

const config = require('./config');
const StatusCode = require('./StatusCode')

module.exports = function(options) {

  let service = options.service

  return function(req, res, next) {
    delete req.session.uuap

    let options = config.getOptions();
    let redirectUrl = url.format({
      protocol: options.protocol,
      hostname: options.hostname,
      port: options.port,
      pathname: '/logout',
      query: {
        service: service
      }
    })

    if (req.xhr) {
      res.json({
        code: StatusCode.Redirect,
        Location: redirectUrl
      })
    } else {
      res.redirect(redirectUrl)
    }
  }
}

