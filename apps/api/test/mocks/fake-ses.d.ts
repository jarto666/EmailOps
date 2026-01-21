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
export declare class FakeSES {
    private emails;
    private bounces;
    private complaints;
    private shouldFail;
    private failureMessage;
    private failureRate;
    private latencyMs;
    /**
     * Configure the mock to fail all sends
     */
    setFailure(fail: boolean, message?: string): void;
    /**
     * Configure random failure rate (0-1)
     */
    setFailureRate(rate: number): void;
    /**
     * Add artificial latency to simulate network delays
     */
    setLatency(ms: number): void;
    /**
     * Send an email (mock implementation)
     */
    sendEmail(params: {
        to: string;
        from: string;
        subject: string;
        html?: string;
        text?: string;
    }): Promise<{
        messageId: string;
    }>;
    /**
     * Send batch of emails
     */
    sendBatch(emails: Array<{
        to: string;
        from: string;
        subject: string;
        html?: string;
        text?: string;
    }>): Promise<Array<{
        to: string;
        messageId: string;
    } | {
        to: string;
        error: string;
    }>>;
    /**
     * Simulate a bounce event
     */
    simulateBounce(messageId: string, bounceType?: 'Permanent' | 'Transient'): FakeBounce;
    /**
     * Simulate a complaint event
     */
    simulateComplaint(messageId: string): FakeComplaint;
    /**
     * Get all sent emails
     */
    getSentEmails(): FakeEmail[];
    /**
     * Get emails sent to a specific address
     */
    getEmailsTo(address: string): FakeEmail[];
    /**
     * Get email by message ID
     */
    getEmailByMessageId(messageId: string): FakeEmail | undefined;
    /**
     * Get all bounces
     */
    getBounces(): FakeBounce[];
    /**
     * Get all complaints
     */
    getComplaints(): FakeComplaint[];
    /**
     * Clear all recorded data
     */
    clear(): void;
    /**
     * Reset all configuration to defaults
     */
    reset(): void;
    /**
     * Get statistics
     */
    getStats(): {
        sent: number;
        bounced: number;
        complained: number;
    };
}
export declare const fakeSES: FakeSES;
