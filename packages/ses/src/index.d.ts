export declare class SesService {
    private client;
    constructor(region: string, credentials: {
        accessKeyId: string;
        secretAccessKey: string;
    });
    sendEmail(params: {
        from: string;
        to: string[];
        subject: string;
        html: string;
        headers?: Record<string, string>;
    }): Promise<import("@aws-sdk/client-sesv2").SendEmailCommandOutput>;
}
