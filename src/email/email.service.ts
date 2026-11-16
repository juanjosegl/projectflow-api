import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

// User-controlled text (names, team names) must not inject HTML into emails.
const esc = (v: string) =>
  v.replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ],
  );

@Injectable()
export class EmailService {
  private resend: Resend | null;
  private readonly logger = new Logger(EmailService.name);
  private readonly appUrl: string;
  private readonly from = 'ProjectFlow <onboarding@resend.dev>';

  constructor(private config: ConfigService) {
    // Email is optional so the API runs locally without a Resend account.
    const key = config.get<string>('RESEND_API_KEY');
    this.resend = key ? new Resend(key) : null;
    if (!key)
      this.logger.warn(
        'RESEND_API_KEY not set: emails will be logged, not sent',
      );
    this.appUrl = config.get('APP_URL') ?? 'http://localhost:3000';
  }

  async sendTeamInvitation(params: {
    to: string;
    inviterName: string;
    teamName: string;
    role: string;
    token: string;
  }) {
    const acceptUrl = `${this.appUrl}/invitations/${params.token}`;
    if (!this.resend)
      return this.logger.log(
        `[email skipped] invitation for ${params.to}: ${acceptUrl}`,
      );
    try {
      await this.resend.emails.send({
        from: this.from,
        to: params.to,
        subject: `You have been invited to join ${params.teamName} on ProjectFlow`,
        html: `
          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;padding:48px 32px;background:#ffffff;">
            <div style="margin-bottom:32px;">
              <span style="font-size:18px;font-weight:700;color:#0f172a;letter-spacing:-0.5px;">ProjectFlow</span>
            </div>
            <h1 style="font-size:22px;font-weight:600;color:#0f172a;margin:0 0 12px;">You have been invited</h1>
            <p style="color:#64748b;font-size:15px;line-height:1.7;margin:0 0 28px;">
              <strong style="color:#334155;">${esc(params.inviterName)}</strong> has invited you to join
              <strong style="color:#334155;">${esc(params.teamName)}</strong> as <strong style="color:#334155;">${esc(params.role)}</strong> on ProjectFlow.
            </p>
            <a href="${acceptUrl}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:13px 28px;border-radius:8px;font-size:14px;font-weight:600;letter-spacing:0.2px;">
              Accept Invitation
            </a>
            <p style="color:#94a3b8;font-size:13px;margin-top:36px;line-height:1.6;">
              This invitation expires in 7 days.<br/>
              If you did not expect this invitation, you can safely ignore this email.
            </p>
            <hr style="border:none;border-top:1px solid #f1f5f9;margin:36px 0 24px;" />
            <p style="color:#cbd5e1;font-size:12px;margin:0;">ProjectFlow &mdash; Team Project Management</p>
          </div>
        `,
      });
    } catch (error) {
      this.logger.error('Failed to send invitation email', error);
    }
  }

  async sendWelcomeEmail(params: { to: string; name: string }) {
    const loginUrl = `${this.appUrl}/login`;
    if (!this.resend)
      return this.logger.log(`[email skipped] welcome email for ${params.to}`);
    try {
      await this.resend.emails.send({
        from: this.from,
        to: params.to,
        subject: 'Welcome to ProjectFlow',
        html: `
          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;padding:48px 32px;background:#ffffff;">
            <div style="margin-bottom:32px;">
              <span style="font-size:18px;font-weight:700;color:#0f172a;letter-spacing:-0.5px;">ProjectFlow</span>
            </div>
            <h1 style="font-size:22px;font-weight:600;color:#0f172a;margin:0 0 12px;">Welcome, ${esc(params.name)}!</h1>
            <p style="color:#64748b;font-size:15px;line-height:1.7;margin:0 0 28px;">
              Your ProjectFlow account has been created successfully.<br/>
              Sign in to start managing your team projects, tasks, and workflows.
            </p>
            <a href="${loginUrl}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:13px 28px;border-radius:8px;font-size:14px;font-weight:600;letter-spacing:0.2px;">
              Sign in to ProjectFlow
            </a>
            <div style="margin-top:36px;padding:20px;background:#f8fafc;border-radius:8px;border:1px solid #f1f5f9;">
              <p style="color:#475569;font-size:13px;margin:0 0 8px;font-weight:600;">Get started quickly:</p>
              <ul style="color:#64748b;font-size:13px;margin:0;padding-left:20px;line-height:2;">
                <li>Create or join a team</li>
                <li>Set up your first project</li>
                <li>Invite your colleagues</li>
                <li>Start tracking tasks on the Kanban board</li>
              </ul>
            </div>
            <hr style="border:none;border-top:1px solid #f1f5f9;margin:36px 0 24px;" />
            <p style="color:#cbd5e1;font-size:12px;margin:0;">ProjectFlow &mdash; Team Project Management</p>
          </div>
        `,
      });
    } catch (error) {
      this.logger.error('Failed to send welcome email', error);
    }
  }
}
