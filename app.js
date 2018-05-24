const { memoize, partial, isString } = require('lodash');
const os = require('os');
const ip = require('ip')
const pmx = require('pmx');
const pm2 = require('pm2');
const pkg = require('./package')

pmx.initModule({}, function (err, conf) {
  function _getLogger(type) {
    console.log(`Creating logger for ${type}`)
    return require('logzio-nodejs').createLogger({
      token: conf.api_token,
      type
    })
  }

  const getLogger = memoize(_getLogger)

  function logEvent(source, data) {
    if (data.process.name !== pkg.name) {
      const logger = getLogger(data.process.name)
      const info = Object.assign({
        logger: 'pm2-logzio',
        host: os.hostname(),
        'host-ip': ip.address(),
        'io-stream': source
      }, data)
      info[conf.env_key_name] = process.env.NODE_ENV || conf.default_env
      if (conf.log_string_as_message && isString(data.data)) {
        info.message = data.data
      }
      logger.log(info)
    }
  }

  pm2.launchBus(function (err, bus) {
    bus.on('log:err', partial(logEvent, 'stderr'))
    bus.on('log:out', partial(logEvent, 'stdout'))
  });
})
