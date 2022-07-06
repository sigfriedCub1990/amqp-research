import { Connection, SenderEvents } from 'rhea-promise'
import * as R from 'ramda'

let amqpSettings = {
  hostname: 'localhost',
  port: 5672,
  username: 'luminai',
  password: 'luminai',
  queue: 'rubens_queue',
  transport: 'tcp',
  timeout: 60000,
}

let connectToAMQ = async () => {
  let connectionOptions = {
    ...amqpSettings,
  }

  let connection = new Connection(connectionOptions)
  await connection.open()

  return connection
}

let startProducer = async (connection) => {
  let senderName = 'test-producer'
  let senderOptions = {
    name: senderName,
    target: {
      address: amqpSettings.queue,
    },
    onError: (context) => {
      const senderError = context.sender && context.sender.error
      if (senderError) {
        console.log(
          ">>>>> [%s] An error occurred for sender '%s': %O.",
          connection.id,
          senderName,
          senderError
        )
      }
    },
    onSessionError: (context) => {
      const sessionError = context.session && context.session.error
      if (sessionError) {
        console.log(
          ">>>>> [%s] An error occurred for session of sender '%s': %O.",
          connection.id,
          senderName,
          sessionError
        )
      }
    },
  }

  let sender = await connection.createSender(senderOptions)

  sender.on(SenderEvents.senderOpen, () => console.log('Sender connected'))
  sender.on(SenderEvents.senderClose, () => console.log('Sender close'))

  return sender
}

let produceMessages = (sender) => {
  sender.send({
    body: JSON.stringify({
      message: 'Hello there',
    }),
  })
}

function main() {
  R.pipe(connectToAMQ, R.andThen(startProducer), R.andThen(produceMessages))()
}

main()
