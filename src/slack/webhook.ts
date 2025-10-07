// src/slack/webhook.ts
import { retry } from '../utils/retry';

/**
 * Send message to Slack via webhook
 */
export async function sendToSlack(
  webhookUrl: string,
  message: any
): Promise<void> {
  await retry(
    async () => {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(
          `Slack webhook failed: ${response.status} ${response.statusText} - ${text}`
        );
      }

      const responseText = await response.text();
      if (responseText !== 'ok') {
        throw new Error(`Slack returned unexpected response: ${responseText}`);
      }
    },
    { maxAttempts: 3, initialDelayMs: 1000 }
  );

  console.log('Message sent to Slack successfully');
}
