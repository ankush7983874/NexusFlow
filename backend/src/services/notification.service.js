export class NotificationService {
  /**
   * Mock SMS Notification Dispatcher
   * As specified: Never send real SMS without explicit user configuration.
   */
  static async sendMockSMS({ recipient, message, ruleName, deviceId, value }) {
    const formattedRecipient = recipient || '+1 (555) 019-2834';
    const alertMessage = message || `[NexusFlow Alert] Rule "${ruleName}" triggered for device ${deviceId}. Current value: ${value}`;

    console.log('\n======================================================');
    console.log('📱 [MOCK SMS DISPATCHED]');
    console.log(`To:        ${formattedRecipient}`);
    console.log(`Device:    ${deviceId}`);
    console.log(`Rule:      ${ruleName}`);
    console.log(`Value:     ${value}`);
    console.log(`Message:   ${alertMessage}`);
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log('======================================================\n');

    return {
      sent: true,
      recipient: formattedRecipient,
      timestamp: new Date(),
      mock: true,
      message: alertMessage
    };
  }

  /**
   * Webhook Notification Dispatcher
   */
  static async triggerWebhook({ url, method = 'POST', payload }) {
    if (!url || typeof url !== 'string') {
      console.warn('[Webhook] No valid URL provided, skipping webhook dispatch.');
      return { sent: false, error: 'No URL provided' };
    }

    try {
      console.log(`🌐 [WEBHOOK DISPATCH] Triggering ${method} -> ${url}`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3-second safety timeout

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'NexusFlow-IoT-Engine/1.0'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      console.log(`[Webhook] Response status from ${url}: ${response.status}`);
      return {
        sent: response.ok,
        url,
        statusCode: response.status,
        timestamp: new Date()
      };
    } catch (error) {
      console.error(`[Webhook] Dispatch failed for ${url}:`, error.message);
      return {
        sent: false,
        url,
        error: error.message,
        timestamp: new Date()
      };
    }
  }
}
