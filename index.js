/**
 * @file export all APIs
 */

exports.setOptions = require('./lib/config').setOptions
exports.getOptions = require('./lib/config').getOptions
exports.middleware = require('./lib/middleware')
exports.getUserInfo = require('./lib/user').getUserInfo

exports.logout = require('./lib/logout')