const amqp = require("amqplib");
const logger = require("./logger");
const { error } = require("winston");

let connection = null;
let channel = null;
const EXCHANGE_NAME = "bookworm_events";

async function connectToRabbitMq() {
  try {
    connection = await amqp.connect(process.env.RABBITMQ_URL);
    channel = await connection.createChannel();
    await channel.assertExchange(EXCHANGE_NAME, "topic", { durable: true });
    logger.info(`Connected to RabbitMQ`);

    connection.on("close", () => {
      logger.warn("RabbitMq connection closed! Recconecting....");
      setTimeout(reconnect, 5000);
    });

    connection.on("error", (err) => {
      logger.error(`RabbitMq connection error ${err.message}`);
    });
    return channel;
  } catch (error) {
    logger.error(`Error occurred while connecting to rabbitMQ:${error}`);
  }
}

let retries = 0;
const baseDelay = 5000;
const maxDelay = 60000;

async function reconnect() {
  try {
    await connectToRabbitMq();
    retries = 0;
  } catch (error) {
    retries++;
    const delay = Math.min(baseDelay * Math.pow(2, retries), maxDelay);
    logger.error(
      `Reconnection Failed ${error.message}. Retrying in ${delay / 1000}s...`
    );
    setTimeout(reconnect, delay);
  }
}

// Graceful shutdown
process.on("SIGINT", async () => {
  logger.info("Closing RabbitMQ connection...");
  if (connection) await connection.close();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  logger.info("Closing RabbitMQ connection...");
  if (connection) await connection.close();
  process.exit(0);
});

async function publishEvent(routingKey, message) {
  if (!channel) {
    channel = await connectToRabbitMq();
  }

  channel.publish(
    EXCHANGE_NAME,
    routingKey,
    Buffer.from(JSON.stringify(message)),
    { persistent: true }
  );

  logger.info(`Published event to RabbitMQ with routing key ${routingKey}`);
}

async function consumeEvent(routingKey, callback) {
  if (!channel) {
    await connectToRabbitMq();
  }

  const q = await channel.assertQueue("", { exclusive: true });

  await channel.bindQueue(q.queue, EXCHANGE_NAME, routingKey);

  channel.prefetch(1);

  channel.consume(q.queue, async (msg) => {
    if (msg !== null) {
      try {
        const message = JSON.parse(msg.content.toString());
        await callback(message);
        channel.ack(msg);
      } catch (error) {
        logger.error(`Error processing message: ${error.message}`);
        channel.nack(msg, false, true);
      }
    }
  });
  logger.info(`Waiting for messages with routing key ${routingKey}`);
}

module.exports = { connectToRabbitMq, publishEvent, consumeEvent };
