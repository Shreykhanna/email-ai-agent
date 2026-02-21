"use server";

import { PubSub, Message } from "@google-cloud/pubsub";

const pubsubClient = new PubSub();

export const listenForMessagesEmail = async (
  subscriptionName: string,
  timeoutMs = 60000,
) => {
  const subscription = pubsubClient.subscription(subscriptionName);

  const messageHandler = (message: Message) => {
    console.log("Message data", message.data.toString());
    message.ack();
  };

  subscription.on("message", messageHandler);

  await new Promise<void>((resolve) => {
    setTimeout(() => {
      subscription.removeListener("message", messageHandler);
      resolve();
    }, timeoutMs);
  });
};
