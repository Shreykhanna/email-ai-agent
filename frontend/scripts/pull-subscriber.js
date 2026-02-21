const { PubSub } = require("@google-cloud/pubsub");

const subscriptionName = process.env.PUBSUB_SUBSCRIPTION;

if (!subscriptionName) {
  throw new Error("Missing PUBSUB_SUBSCRIPTION env var.");
}

const pubSubClient = new PubSub();
const subscription = pubSubClient.subscription(subscriptionName);
const webhookEndpoint =
  process.env.WEBHOOK_ENDPOINT || "http://localhost:3000/api/webhooks";

subscription.on("message", (message) => {
  console.log(`Received message ${message.id}`);
  console.log(`Data: ${message.data.toString()}`);
  console.log("Attributes:", message.attributes);
  message.ack();

  fetch(webhookEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: {
        data: message.data.toString("base64"),
        messageId: message.id,
        attributes: message.attributes,
      },
      subscription: subscriptionName,
    }),
  }).catch((error) => {
    console.error("Failed to forward to webhook:", error);
  });
});

subscription.on("error", (error) => {
  console.error("Subscription error:", error);
});

console.log(`Listening for messages on ${subscriptionName}`);
