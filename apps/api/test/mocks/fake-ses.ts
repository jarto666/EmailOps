/**
 * Fake SES provider for testing
 * Records all "sent" emails without actually sending anything
 */

export interface FakeEmail {
  id: string;
  to: string;
  from: string;
  subject: string;
  html?: string;
  text?: string;
  sentAt: Date;
}

export interface FakeBounce {
  messageId: string;
  email: string;
  bounceType: 'Permanent' | 'Transient';
  timestamp: Date;
}

export interface FakeComplaint {
  messageId: string;
  email: string;
  timestamp: Date;
}

export class FakeSES {
  private emails: FakeEmail[] = [];
  private bounces: FakeBounce[] = [];
  private complaints: FakeComplaint[] = [];

  private shouldFail = false;
  private failureMessage = 'SES Error';
  private failureRate = 0; // 0-1, percentage of sends that should fail
  private latencyMs = 0;

  /**
   * Configure the mock to fail all sends
   */
  setFailure(fail: boolean, message = 'SES Error'): void {
    this.shouldFail = fail;
    this.failureMessage = message;
  }

  /**
   * Configure random failure rate (0-1)
   */
  setFailureRate(rate: number): void {
    this.failureRate = Math.max(0, Math.min(1, rate));
  }

  /**
   * Add artificial latency to simulate network delays
   */
  setLatency(ms: number): void {
    this.latencyMs = ms;
  }

  /**
   * Send an email (mock implementation)
   */
  async sendEmail(params: {
    to: string;
    from: string;
    subject: string;
    html?: string;
    text?: string;
  }): Promise<{ messageId: string }> {
    // Simulate latency
    if (this.latencyMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.latencyMs));
    }

    // Check for configured failures
    if (this.shouldFail) {
      throw new Error(this.failureMessage);
    }

    // Random failure rate
    if (this.failureRate > 0 && Math.random() < this.failureRate) {
      throw new Error('Random SES failure');
    }

    // Generate message ID
    const messageId = `fake-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Record the email
    this.emails.push({
      id: messageId,
      to: params.to,
      from: params.from,
      subject: params.subject,
      html: params.html,
      text: params.text,
      sentAt: new Date(),
    });

    return { messageId };
  }

  /**
   * Send batch of emails
   */
  async sendBatch(
    emails: Array<{
      to: string;
      from: string;
      subject: string;
      html?: string;
      text?: string;
    }>
  ): Promise<Array<{ to: string; messageId: string } | { to: string; error: string }>> {
    const results = [];

    for (const email of emails) {
      try {
        const { messageId } = await this.sendEmail(email);
        results.push({ to: email.to, messageId });
      } catch (err) {
        results.push({ to: email.to, error: (err as Error).message });
      }
    }

    return results;
  }

  /**
   * Simulate a bounce event
   */
  simulateBounce(messageId: string, bounceType: 'Permanent' | 'Transient' = 'Permanent'): FakeBounce {
    const email = this.emails.find((e) => e.id === messageId);
    if (!email) {
      throw new Error(`Email with messageId ${messageId} not found`);
    }

    const bounce: FakeBounce = {
      messageId,
      email: email.to,
      bounceType,
      timestamp: new Date(),
    };

    this.bounces.push(bounce);
    return bounce;
  }

  /**
   * Simulate a complaint event
   */
  simulateComplaint(messageId: string): FakeComplaint {
    const email = this.emails.find((e) => e.id === messageId);
    if (!email) {
      throw new Error(`Email with messageId ${messageId} not found`);
    }

    const complaint: FakeComplaint = {
      messageId,
      email: email.to,
      timestamp: new Date(),
    };

    this.complaints.push(complaint);
    return complaint;
  }

  /**
   * Get all sent emails
   */
  getSentEmails(): FakeEmail[] {
    return [...this.emails];
  }

  /**
   * Get emails sent to a specific address
   */
  getEmailsTo(address: string): FakeEmail[] {
    return this.emails.filter((e) => e.to === address);
  }

  /**
   * Get email by message ID
   */
  getEmailByMessageId(messageId: string): FakeEmail | undefined {
    return this.emails.find((e) => e.id === messageId);
  }

  /**
   * Get all bounces
   */
  getBounces(): FakeBounce[] {
    return [...this.bounces];
  }

  /**
   * Get all complaints
   */
  getComplaints(): FakeComplaint[] {
    return [...this.complaints];
  }

  /**
   * Clear all recorded data
   */
  clear(): void {
    this.emails = [];
    this.bounces = [];
    this.complaints = [];
  }

  /**
   * Reset all configuration to defaults
   */
  reset(): void {
    this.clear();
    this.shouldFail = false;
    this.failureMessage = 'SES Error';
    this.failureRate = 0;
    this.latencyMs = 0;
  }

  /**
   * Get statistics
   */
  getStats(): {
    sent: number;
    bounced: number;
    complained: number;
  } {
    return {
      sent: this.emails.length,
      bounced: this.bounces.length,
      complained: this.complaints.length,
    };
  }
}

// Singleton for easy access in tests
export const fakeSES = new FakeSES();
