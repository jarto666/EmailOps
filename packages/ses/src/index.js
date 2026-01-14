"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SesService = void 0;
const client_sesv2_1 = require("@aws-sdk/client-sesv2");
class SesService {
    constructor(region, credentials) {
        this.client = new client_sesv2_1.SESv2Client({ region, credentials });
    }
    async sendEmail(params) {
        const command = new client_sesv2_1.SendEmailCommand({
            FromEmailAddress: params.from,
            Destination: { ToAddresses: params.to },
            Content: {
                Simple: {
                    Subject: { Data: params.subject },
                    Body: { Html: { Data: params.html } },
                },
            },
            // Headers mapping needed for v2
        });
        return this.client.send(command);
    }
}
exports.SesService = SesService;
