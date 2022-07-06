import { createLogger, format, transports } from 'winston'

export default (app) => {
  // Configure the Winston logger. For the complete documentation see https://github.com/winstonjs/winston
  const logger = createLogger({
    // To see more detailed errors, change this to 'debug'
    level: 'info',
    format: format.combine(format.splat(), format.json(), format.prettyPrint()),
    transports: [new transports.Console()],
  })

  app.set('logger', logger)
}
