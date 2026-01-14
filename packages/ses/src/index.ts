import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";

export class SesService {
  private client: SESv2Client;

  constructor(
    region: string,
    credentials: { accessKeyId: string; secretAccessKey: string }
  ) {
    this.client = new SESv2Client({ region, credentials });
  }

  async sendEmail(params: {
    from: string;
    to: string[];
    subject: string;
    html: string;
    headers?: Record<string, string>;
  }) {
    const command = new SendEmailCommand({
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
