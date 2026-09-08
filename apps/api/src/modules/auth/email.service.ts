import { logger } from '../../core/logger/logger.js';

export interface SentEmailRecord {
  to: string;
  subject: string;
  url: string;
  token: string;
  sentAt: Date;
}

export interface IEmailProvider {
  sendPasswordResetEmail(to: string, resetToken: string, resetUrl: string): Promise<void>;
  sendEmailVerificationEmail(
    to: string,
    verificationToken: string,
    verifyUrl: string
  ): Promise<void>;
}

export class DevEmailProvider implements IEmailProvider {
  public sentEmails: SentEmailRecord[] = [];

  async sendPasswordResetEmail(to: string, resetToken: string, resetUrl: string): Promise<void> {
    const record: SentEmailRecord = {
      to,
      subject: 'Password Reset Request - EduSphere ERP',
      url: resetUrl,
      token: resetToken,
      sentAt: new Date(),
    };
    this.sentEmails.push(record);

    logger.info(
      {
        recipient: to,
        subject: record.subject,
        resetUrl,
      },
      '📧 [DEV EMAIL] Password reset instructions dispatched'
    );
  }

  async sendEmailVerificationEmail(
    to: string,
    verificationToken: string,
    verifyUrl: string
  ): Promise<void> {
    const record: SentEmailRecord = {
      to,
      subject: 'Verify Your Email Address - EduSphere ERP',
      url: verifyUrl,
      token: verificationToken,
      sentAt: new Date(),
    };
    this.sentEmails.push(record);

    logger.info(
      {
        recipient: to,
        subject: record.subject,
        verifyUrl,
      },
      '📧 [DEV EMAIL] Email verification link dispatched'
    );
  }

  clearSentEmails(): void {
    this.sentEmails = [];
  }

  getLastSentEmail(): SentEmailRecord | undefined {
    return this.sentEmails[this.sentEmails.length - 1];
  }
}

export const emailService = new DevEmailProvider();
