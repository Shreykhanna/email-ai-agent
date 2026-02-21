import { createMiddleware, AIMessage } from "langchain";

export const contentFilterMiddleware = (bannedKeyWords: string[]) => {
  const keywords = bannedKeyWords.map((keyword) => keyword.toLowerCase());
  console.log("keywords", keywords);
  return createMiddleware({
    name: "ContentFilterMiddleware",
    beforeAgent: {
      hook: (state) => {
        if (!state.messages || !state.messages.length) {
          return;
        }
        const firstMessage = state.messages[0];

        if (firstMessage.getType() !== "human") {
          return;
        }
        const content = firstMessage.content.toString().toLowerCase();
        for (const keyword of keywords) {
          if (content.includes(keyword)) {
            return {
              messages: [
                new AIMessage(
                  " I cannot process this requests as it contains inappropriate content. Please rephrase your requests",
                ),
              ],
              jumpTo: "end",
            };
          }
        }
        return;
      },
    },
  });
};
