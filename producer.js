import { Connection, SenderEvents } from 'rhea-promise'
import * as R from 'ramda'

const SEND_INTERVAL = 10_000

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
  let runs = new Map()

  let sendMessage = () => {
    let runId = Math.floor(Math.random() * 10)
    console.log(
      `Current runs: ${[...runs.keys()].length ? `${[...runs.keys()]}` : 0}`
    )

    if (runs.has(runId)) {
      let { percent } = runs.get(runId)
      if (percent + 15 >= 100) {
        sender.send({
          body: JSON.stringify({
            runId,
            percent: 100,
          }),
        })
        runs.delete(runId)
      } else {
        let updatedPercent = percent + 15
        runs.set(runId, { percent: updatedPercent })
        sender.send({
          body: JSON.stringify({
            runId,
            percent: updatedPercent,
          }),
        })
      }
    } else {
      runs.set(runId, {
        percent: 0,
      })

      sender.send({
        body: JSON.stringify({
          runId,
          percent: 0,
        }),
      })
    }
  }

  setInterval(sendMessage, SEND_INTERVAL)
}

function main() {
  R.pipe(connectToAMQ, R.andThen(startProducer), R.andThen(produceMessages))()
}

main()
