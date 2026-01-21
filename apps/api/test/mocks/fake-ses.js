"use strict";
/**
 * Fake SES provider for testing
 * Records all "sent" emails without actually sending anything
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.fakeSES = exports.FakeSES = void 0;
class FakeSES {
    constructor() {
        this.emails = [];
        this.bounces = [];
        this.complaints = [];
        this.shouldFail = false;
        this.failureMessage = 'SES Error';
        this.failureRate = 0; // 0-1, percentage of sends that should fail
        this.latencyMs = 0;
    }
    /**
     * Configure the mock to fail all sends
     */
    setFailure(fail, message = 'SES Error') {
        this.shouldFail = fail;
        this.failureMessage = message;
    }
    /**
     * Configure random failure rate (0-1)
     */
    setFailureRate(rate) {
        this.failureRate = Math.max(0, Math.min(1, rate));
    }
    /**
     * Add artificial latency to simulate network delays
     */
    setLatency(ms) {
        this.latencyMs = ms;
    }
    /**
     * Send an email (mock implementation)
     */
    async sendEmail(params) {
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
    async sendBatch(emails) {
        const results = [];
        for (const email of emails) {
            try {
                const { messageId } = await this.sendEmail(email);
                results.push({ to: email.to, messageId });
            }
            catch (err) {
                results.push({ to: email.to, error: err.message });
            }
        }
        return results;
    }
    /**
     * Simulate a bounce event
     */
    simulateBounce(messageId, bounceType = 'Permanent') {
        const email = this.emails.find((e) => e.id === messageId);
        if (!email) {
            throw new Error(`Email with messageId ${messageId} not found`);
        }
        const bounce = {
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
    simulateComplaint(messageId) {
        const email = this.emails.find((e) => e.id === messageId);
        if (!email) {
            throw new Error(`Email with messageId ${messageId} not found`);
        }
        const complaint = {
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
    getSentEmails() {
        return [...this.emails];
    }
    /**
     * Get emails sent to a specific address
     */
    getEmailsTo(address) {
        return this.emails.filter((e) => e.to === address);
    }
    /**
     * Get email by message ID
     */
    getEmailByMessageId(messageId) {
        return this.emails.find((e) => e.id === messageId);
    }
    /**
     * Get all bounces
     */
    getBounces() {
        return [...this.bounces];
    }
    /**
     * Get all complaints
     */
    getComplaints() {
        return [...this.complaints];
    }
    /**
     * Clear all recorded data
     */
    clear() {
        this.emails = [];
        this.bounces = [];
        this.complaints = [];
    }
    /**
     * Reset all configuration to defaults
     */
    reset() {
        this.clear();
        this.shouldFail = false;
        this.failureMessage = 'SES Error';
        this.failureRate = 0;
        this.latencyMs = 0;
    }
    /**
     * Get statistics
     */
    getStats() {
        return {
            sent: this.emails.length,
            bounced: this.bounces.length,
            complained: this.complaints.length,
        };
    }
}
exports.FakeSES = FakeSES;
// Singleton for easy access in tests
exports.fakeSES = new FakeSES();
