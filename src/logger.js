const { createLogger, format, transports } = require('winston')

module.exports = (app) => {
  // Configure the Winston logger. For the complete documentation see https://github.com/winstonjs/winston
  const logger = createLogger({
    // To see more detailed errors, change this to 'debug'
    level: 'info',
    format: format.combine(format.splat(), format.json(), format.prettyPrint()),
    transports: [new transports.Console()],
  })

  app.set('logger', logger)
}
