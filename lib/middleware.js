/**
 * @file provide express uuap middleware
 */

const qs = require('querystring')
const url = require('url')
const xml2js = require('xml-js')
const request = require('request-promise')

const config = require('./config')
const getCurrentUrlAsService = require('./getCurrentUrlAsService')
const StatusCode = require('./StatusCode')

const isUserInfoInSession = function isUserInfoInSession(req) {
  return req.session && req.session.uuap && req.session.uuap.userName
}

const needValidateST = function needValidateST(req) {
  return (Object.keys(req.query).length === 1) && req.query.ticket
}

const transform = function transform(res) {
  let userName
  let jsonStr

  try {
    jsonStr = xml2js.xml2json(res, {
      compact: true,
      spaces: 4
    })
  } catch (err) {
    return {
      code: StatusCode.Fail,
      msg: `Parse Error [xml2js.xml2json]: ${res}`
    }
  }

  let json;
  try {
    json = JSON.parse(jsonStr)
  } catch (err) {
    return {
      code: StatusCode.Fail,
      msg: `Parse Error [JSON.parse]: ${jsonStr}`
    }
  }

  if (json['cas:serviceResponse']['cas:authenticationFailure']) {
    let rep = json['cas:serviceResponse']['cas:authenticationFailure']

    return {
      code: rep['_attributes']['code'],
      text: rep['_text']
    }

  } else if (json['cas:serviceResponse']['cas:authenticationSuccess']) {

    let rep = json['cas:serviceResponse']['cas:authenticationSuccess']

    // uuap userName
    userName = rep['cas:user']['_text']

    return {
      code: StatusCode.Success,
      userName: userName
    }

  } else {
    return {
      code: StatusCode.Fail,
      msg: 'UNKNOWN_ERR'
    }
  }
}

module.exports = function middleware(options) {
  config.setOptions(options)

  let service

  return function middleware(req, res, next) {
    // have login
    if (isUserInfoInSession(req)) {
      return next()
    }

    // need validate st by cas server
    if (needValidateST(res)) {
      req.session.uuap = {}

      let postData = qs.stringify({
        ticket: req.query.ticket,
        service: service,
        appKey: options.appKey
      })

      request({
        method: 'POST',
        uri: url.format({
          protocol: options.protocol,
          hostname: options.hostname,
          port: options.port,
          pathname: options.validateMethod
        }),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData)
        },
        body: postData
      }).then(res => {
        // transform the xml information
        res = transform(res)
        if (res.code === StatusCode.Success) {
          req.session.uuap.userName = res.userName

          if (req.xhr) {
            res.json({
              code: StatusCode.Redirect,
              Location: service
            })
          } else {
            res.redirect(service)
          }
        } else {
          res.send('error' + JSON.stringify(res))
        }
      }).catch(err => console.error(err))

    } else {
      let options = config.getOptions()
      service = options.service || getCurrentUrlAsService(ctx)

      let redirectUrl = url.format({
        protocol: options.protocol,
        hostname: options.hostname,
        port: options.port,
        query: {
          service: service,
          appKey: options.appKey
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
}