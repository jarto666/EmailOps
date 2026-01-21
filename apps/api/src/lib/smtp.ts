import * as nodemailer from "nodemailer";

export interface SmtpConfig {
  host: string;
  port: number;
  secure?: boolean; // true for 465, false for other ports
  auth?: {
    user: string;
    pass: string;
  };
}

export class SmtpService {
  private transporter: nodemailer.Transporter;

  constructor(config: SmtpConfig) {
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure ?? config.port === 465,
      auth: config.auth,
      // For local dev (Mailpit), skip certificate validation
      tls: {
        rejectUnauthorized: false,
      },
    });
  }

  async sendEmail(params: {
    from: string;
    to: string[];
    subject: string;
    html: string;
    headers?: Record<string, string>;
  }): Promise<{ messageId: string }> {
    const info = await this.transporter.sendMail({
      from: params.from,
      to: params.to.join(", "),
      subject: params.subject,
      html: params.html,
      headers: params.headers,
    });

    return { messageId: info.messageId };
  }

  async verify(): Promise<true> {
    await this.transporter.verify();
    return true;
  }
}
