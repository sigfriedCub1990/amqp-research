const { curry } = require('ramda')
const { Connection, ConnectionEvents, ReceiverEvents } = require('rhea-promise')

let processIncomingMessage = curry((app, context) => {
  let Logger = app.get('logger')
  try {
    Logger.info('Processing incoming message from ActiveMQ')

    console.log(context._context.message.body)
    let messageBody = JSON.parse(context._context.message.body)
    Logger.info(`Message body is: ${messageBody} `)
  } catch (error) {
    Logger.error(
      `An exception happened while processing AMQ incoming message: ${error.message}`
    )
  }
})

let initializeAMQPConnection = async (app) => {
  try {
    let amqpConfiguration = app.get('amqp')
    let Logger = app.get('logger')
    let { host, port, user, password, transport } = amqpConfiguration

    const onConnect = () => Logger.info(`Connected to ${host}/${port}`)
    const onDisconnect = () => Logger.error(`Connected to ${host}/${port}`)

    let connectionOptions = {
      transport,
      host,
      port,
      username: user,
      password,
      connectionOpts: {
        onConnect,
        onDisconnect,
      },
    }

    let connection = new Connection(connectionOptions)

    connection.on(ConnectionEvents.connectionOpen, onConnect)
    connection.on(ConnectionEvents.disconnected, onDisconnect)
    connection.on(ConnectionEvents.error, () => Logger.error('Socket Error'))
    connection.on(ConnectionEvents.connectionError, (context) =>
      Logger.error(`Connection error: ${context.error}`)
    )

    await connection.open()

    app.set('amqp-connection', connection)

    return initializeAMQPConsumer(app)
      .then(() => {
        Logger.info('Consumer successfully initialized')
      })
      .catch((error) => {
        Logger.error(`Spawn live consumer error: ${error.message}`)
        return null
      })
  } catch (error) {
    throw new Error(error.message)
  }
}

let initializeAMQPConsumer = async (app) => {
  let amqpConfiguration = app.get('amqp')
  let amqpConnection = app.get('amqp-connection')
  let Logger = app.get('logger')
  try {
    const { queue } = amqpConfiguration
    const onSessionError = (context) => {
      const sessionError = context.session && context.session.error
      if (sessionError) {
        Logger.error(`Queue (${queue}) receiver session error: ${sessionError}`)
      }
    }
    const receiverOptions = {
      name: `${queue}-receiver`,
      source: { address: queue },
      credit_window: 1,
      onSessionError,
    }
    const receiver = await amqpConnection.createReceiver(receiverOptions)
    Logger.info(
      `Queue (${queue}) receiver is open : ${
        receiver ? receiver.isOpen() : 'false'
      }`
    )

    receiver.on(ReceiverEvents.message, processIncomingMessage(app))
    receiver.on(ReceiverEvents.receiverOpen, () =>
      Logger.info(`Queue (${queue}) receiver opened`)
    )
    receiver.on(ReceiverEvents.receiverClose, () =>
      Logger.info(`Queue (${queue}) receiver closed`)
    )
    receiver.on(ReceiverEvents.receiverError, (context) => {
      const receiverError = context.receiver && context.receiver.error
      if (receiverError) {
        Logger.log(
          //prettier-ignore
          ">>>>> [%s] An error occurred for receiver '%s': %O.",
          amqpConnection.id,
          queue,
          receiverError
        )
      }
    })

    return receiver
  } catch (error) {
    throw new Error(error.message)
  }
}

const bindAMQOnExitListeners = (app) => {
  const connection = app.get('amqp-connection')
  const Logger = app.get('logger')
  process.once('exit', () => {
    Logger.info('Closing AMQ connection due to application exit')
    if (connection) {
      connection.close()
    }
  })

  process.once('SIGINT', () => {
    Logger.info('Closing AMQ connection due to SIGINT')
    if (connection) {
      connection.close()
    }
  })
}

module.exports = {
  initializeAMQPConnection,
  bindAMQOnExitListeners,
}
