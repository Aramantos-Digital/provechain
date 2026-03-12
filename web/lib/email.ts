import { Resend } from 'resend';

// Initialize Resend with API key from environment
// Use a placeholder during build if API key is not set
const resend = new Resend(process.env.RESEND_API_KEY || 'placeholder_key');

// Email configuration
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'ProveChain <provechain@aramantos.dev>';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export interface TeamInvitationEmailParams {
  toEmail: string;
  teamName: string;
  inviterName: string;
  invitationToken: string;
  expiresAt: Date;
}

/**
 * Send team invitation email
 */
export async function sendTeamInvitationEmail(params: TeamInvitationEmailParams) {
  const { toEmail, teamName, inviterName, invitationToken, expiresAt } = params;

  const acceptUrl = `${APP_URL}/team/accept?token=${invitationToken}`;
  const expiresInDays = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  const subject = `You've been invited to join ${teamName} on ProveChain`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: white;
      border-radius: 8px;
      padding: 40px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .logo {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo h1 {
      color: #0066cc;
      margin: 0;
      font-size: 28px;
    }
    h2 {
      color: #333;
      margin-top: 0;
    }
    .button {
      display: inline-block;
      background-color: #0066cc;
      color: white;
      text-decoration: none;
      padding: 12px 30px;
      border-radius: 6px;
      margin: 20px 0;
      font-weight: 600;
    }
    .button:hover {
      background-color: #0052a3;
    }
    .info-box {
      background-color: #f8f9fa;
      border-left: 4px solid #0066cc;
      padding: 15px;
      margin: 20px 0;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
      font-size: 14px;
      color: #666;
    }
    .expiry-warning {
      color: #d93025;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <h1>ProveChain</h1>
    </div>

    <h2>You've been invited to join a team!</h2>

    <p>Hi there,</p>

    <p><strong>${inviterName}</strong> has invited you to join their team <strong>"${teamName}"</strong> on ProveChain.</p>

    <div class="info-box">
      <p style="margin: 0;"><strong>What is ProveChain?</strong></p>
      <p style="margin: 5px 0 0 0;">ProveChain is a cryptographic proof system that provides tamper-proof evidence of file integrity and timestamps. Team collaboration allows you to create, share, and manage proofs together.</p>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${acceptUrl}" class="button">Accept Invitation</a>
    </div>

    <p style="text-align: center; color: #666; font-size: 14px;">Or copy and paste this link into your browser:<br>
    <a href="${acceptUrl}" style="color: #0066cc; word-break: break-all;">${acceptUrl}</a></p>

    <p class="expiry-warning">⚠️ This invitation expires in ${expiresInDays} day${expiresInDays !== 1 ? 's' : ''}.</p>

    <div class="footer">
      <p>If you have any questions or didn't expect this invitation, please contact the person who invited you or reach out to us at <a href="mailto:provechain@aramantos.dev">provechain@aramantos.dev</a>.</p>

      <p style="margin-top: 20px;">
        <strong>ProveChain</strong><br>
        Cryptographic Proof System<br>
        <a href="${APP_URL}">provechain.io</a>
      </p>
    </div>
  </div>
</body>
</html>
`;

  const text = `
You've been invited to join ${teamName} on ProveChain

Hi there,

${inviterName} has invited you to join their team "${teamName}" on ProveChain.

What is ProveChain?
ProveChain is a cryptographic proof system that provides tamper-proof evidence of file integrity and timestamps. Team collaboration allows you to create, share, and manage proofs together.

Accept your invitation by clicking this link:
${acceptUrl}

⚠️ This invitation expires in ${expiresInDays} day${expiresInDays !== 1 ? 's' : ''}.

If you have any questions or didn't expect this invitation, please contact the person who invited you or reach out to us at provechain@aramantos.dev.

---
ProveChain - Cryptographic Proof System
${APP_URL}
`;

  // Check if API key is properly configured
  if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 'placeholder_key') {
    console.error('RESEND_API_KEY is not configured');
    throw new Error('Email service is not configured. Please contact support.');
  }

  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: toEmail,
      subject,
      html,
      text,
    });

    return { success: true, messageId: result.data?.id };
  } catch (error) {
    console.error('Failed to send team invitation email:', error);
    throw new Error('Failed to send invitation email');
  }
}

/**
 * Send welcome email to new users
 */
export async function sendWelcomeEmail(toEmail: string, userName?: string) {
  const subject = 'Welcome to ProveChain!';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: white;
      border-radius: 8px;
      padding: 40px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .logo {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo h1 {
      color: #0066cc;
      margin: 0;
      font-size: 28px;
    }
    h2 {
      color: #333;
      margin-top: 0;
    }
    .button {
      display: inline-block;
      background-color: #0066cc;
      color: white;
      text-decoration: none;
      padding: 12px 30px;
      border-radius: 6px;
      margin: 20px 0;
      font-weight: 600;
    }
    .feature-list {
      list-style: none;
      padding: 0;
    }
    .feature-list li {
      padding: 10px 0;
      padding-left: 30px;
      position: relative;
    }
    .feature-list li:before {
      content: "✓";
      position: absolute;
      left: 0;
      color: #0066cc;
      font-weight: bold;
      font-size: 20px;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
      font-size: 14px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <h1>ProveChain</h1>
    </div>

    <h2>Welcome to ProveChain${userName ? `, ${userName}` : ''}!</h2>

    <p>Thank you for signing up. You're now ready to create cryptographically secure proofs of your files.</p>

    <h3>What you can do with ProveChain:</h3>
    <ul class="feature-list">
      <li>Create tamper-proof cryptographic proofs</li>
      <li>Timestamp files on the blockchain</li>
      <li>Version control for critical documents</li>
      <li>Verify file integrity at any time</li>
      <li>Collaborate with teams (Pro+ tiers)</li>
    </ul>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${APP_URL}/dashboard" class="button">Go to Dashboard</a>
    </div>

    <div class="footer">
      <p>Need help getting started? Check out our <a href="${APP_URL}/faq">FAQ</a> or reach out to us at <a href="mailto:provechain@aramantos.dev">provechain@aramantos.dev</a>.</p>

      <p style="margin-top: 20px;">
        <strong>ProveChain</strong><br>
        Cryptographic Proof System<br>
        <a href="${APP_URL}">provechain.io</a>
      </p>
    </div>
  </div>
</body>
</html>
`;

  const text = `
Welcome to ProveChain${userName ? `, ${userName}` : ''}!

Thank you for signing up. You're now ready to create cryptographically secure proofs of your files.

What you can do with ProveChain:
✓ Create tamper-proof cryptographic proofs
✓ Timestamp files on the blockchain
✓ Version control for critical documents
✓ Verify file integrity at any time
✓ Collaborate with teams (Pro+ tiers)

Get started: ${APP_URL}/dashboard

Need help? Check out our FAQ at ${APP_URL}/faq or reach out to provechain@aramantos.dev

---
ProveChain - Cryptographic Proof System
${APP_URL}
`;

  // Check if API key is properly configured
  if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 'placeholder_key') {
    console.error('RESEND_API_KEY is not configured');
    // Don't throw for welcome emails - they're nice to have but not critical
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: toEmail,
      subject,
      html,
      text,
    });

    return { success: true, messageId: result.data?.id };
  } catch (error) {
    console.error('Failed to send welcome email:', error);
    // Don't throw - welcome emails are nice to have but not critical
    return { success: false, error: String(error) };
  }
}
