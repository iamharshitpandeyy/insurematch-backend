const nodemailer = require('nodemailer');

// Create reusable transporter
const createTransporter = () => {
  // Check if we have email credentials configured
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('Email credentials not configured. Emails will be logged to console.');
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

/**
 * Send email verification code to user
 * @param {string} email - Recipient email address
 * @param {string} name - Recipient name
 * @param {string} verificationCode - 6-digit verification code
 * @returns {Promise<Object>} - Result of email send operation
 */
const sendVerificationEmail = async (email, name, verificationCode) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"InsureMatch" <${process.env.EMAIL_FROM || 'noreply@insurematch.com'}>`,
      to: email,
      subject: 'Verify Your Email - InsureMatch',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background-color: #4CAF50;
              color: white;
              padding: 20px;
              text-align: center;
            }
            .content {
              background-color: #f9f9f9;
              padding: 30px;
              border-radius: 5px;
              margin-top: 20px;
            }
            .verification-code {
              font-size: 32px;
              font-weight: bold;
              color: #4CAF50;
              text-align: center;
              padding: 20px;
              background-color: #fff;
              border-radius: 5px;
              letter-spacing: 5px;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              font-size: 12px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to InsureMatch!</h1>
            </div>
            <div class="content">
              <p>Hi ${name},</p>
              <p>Thank you for registering with InsureMatch. To complete your registration and verify your email address, please use the verification code below:</p>

              <div class="verification-code">
                ${verificationCode}
              </div>

              <p>This code will expire in 15 minutes.</p>
              <p>If you didn't create an account with InsureMatch, please ignore this email.</p>

              <p>Best regards,<br>The InsureMatch Team</p>
            </div>
            <div class="footer">
              <p>This is an automated message, please do not reply to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Hi ${name},

        Thank you for registering with InsureMatch. To complete your registration and verify your email address, please use the verification code below:

        ${verificationCode}

        This code will expire in 15 minutes.

        If you didn't create an account with InsureMatch, please ignore this email.

        Best regards,
        The InsureMatch Team
      `
    };

    // If no transporter is configured, log to console (for development)
    if (!transporter) {
      console.log('\n=== EMAIL SIMULATION ===');
      console.log(`To: ${email}`);
      console.log(`Subject: ${mailOptions.subject}`);
      console.log(`Verification Code: ${verificationCode}`);
      console.log('========================\n');

      return {
        success: true,
        message: 'Email logged to console (no SMTP configured)',
        messageId: 'simulated-' + Date.now()
      };
    }

    // Send actual email
    const info = await transporter.sendMail(mailOptions);

    return {
      success: true,
      message: 'Verification email sent successfully',
      messageId: info.messageId
    };
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw new Error('Failed to send verification email: ' + error.message);
  }
};

/**
 * Send welcome email after successful registration
 * @param {string} email - Recipient email address
 * @param {string} name - Recipient name
 * @returns {Promise<Object>} - Result of email send operation
 */
const sendWelcomeEmail = async (email, name) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"InsureMatch" <${process.env.EMAIL_FROM || 'noreply@insurematch.com'}>`,
      to: email,
      subject: 'Welcome to InsureMatch!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background-color: #4CAF50;
              color: white;
              padding: 20px;
              text-align: center;
            }
            .content {
              background-color: #f9f9f9;
              padding: 30px;
              border-radius: 5px;
              margin-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to InsureMatch!</h1>
            </div>
            <div class="content">
              <p>Hi ${name},</p>
              <p>Your email has been successfully verified and your account is now active!</p>
              <p>You can now start exploring insurance options and find the best match for your needs.</p>
              <p>Best regards,<br>The InsureMatch Team</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Hi ${name},

        Your email has been successfully verified and your account is now active!

        You can now start exploring insurance options and find the best match for your needs.

        Best regards,
        The InsureMatch Team
      `
    };

    if (!transporter) {
      console.log('\n=== EMAIL SIMULATION ===');
      console.log(`To: ${email}`);
      console.log(`Subject: ${mailOptions.subject}`);
      console.log('Welcome email');
      console.log('========================\n');

      return {
        success: true,
        message: 'Welcome email logged to console (no SMTP configured)'
      };
    }

    const info = await transporter.sendMail(mailOptions);

    return {
      success: true,
      message: 'Welcome email sent successfully',
      messageId: info.messageId
    };
  } catch (error) {
    console.error('Error sending welcome email:', error);
    // Don't throw error for welcome email - it's not critical
    return {
      success: false,
      message: 'Failed to send welcome email'
    };
  }
};

/**
 * Send invitation email for admin/agent roles
 * @param {string} email - Recipient email address
 * @param {string} name - Recipient name
 * @param {string} invitationLink - Invitation link with token
 * @param {string} roleType - Type of role (e.g., 'Insurer Admin', 'Insurer Agent')
 * @returns {Promise<Object>} - Result of email send operation
 */
const sendInvitationEmail = async (email, name, invitationLink, roleType) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"InsureMatch" <${process.env.EMAIL_FROM || 'noreply@insurematch.com'}>`,
      to: email,
      subject: `You're Invited to Join InsureMatch as ${roleType}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background-color: #4CAF50;
              color: white;
              padding: 20px;
              text-align: center;
            }
            .content {
              background-color: #f9f9f9;
              padding: 30px;
              border-radius: 5px;
              margin-top: 20px;
            }
            .button {
              display: inline-block;
              padding: 15px 30px;
              background-color: #4CAF50;
              color: white;
              text-decoration: none;
              border-radius: 5px;
              margin: 20px 0;
              font-weight: bold;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              font-size: 12px;
              color: #666;
            }
            .warning {
              background-color: #fff3cd;
              border-left: 4px solid #ffc107;
              padding: 10px;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to InsureMatch!</h1>
            </div>
            <div class="content">
              <p>Hi ${name},</p>
              <p>You have been invited to join InsureMatch as a <strong>${roleType}</strong>.</p>
              <p>To accept this invitation and set up your account, please click the button below:</p>

              <div style="text-align: center;">
                <a href="${invitationLink}" class="button">Accept Invitation</a>
              </div>

              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; background-color: #fff; padding: 10px; border-radius: 5px;">
                ${invitationLink}
              </p>

              <div class="warning">
                <strong>Important:</strong> This invitation link will expire in 48 hours. Please complete your registration before then.
              </div>

              <p>If you did not expect this invitation or have any questions, please contact our support team.</p>

              <p>Best regards,<br>The InsureMatch Team</p>
            </div>
            <div class="footer">
              <p>This is an automated message, please do not reply to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Hi ${name},

        You have been invited to join InsureMatch as a ${roleType}.

        To accept this invitation and set up your account, please visit the following link:

        ${invitationLink}

        Important: This invitation link will expire in 48 hours. Please complete your registration before then.

        If you did not expect this invitation or have any questions, please contact our support team.

        Best regards,
        The InsureMatch Team
      `
    };

    // If no transporter is configured, log to console (for development)
    if (!transporter) {
      console.log('\n=== EMAIL SIMULATION ===');
      console.log(`To: ${email}`);
      console.log(`Subject: ${mailOptions.subject}`);
      console.log(`Role: ${roleType}`);
      console.log(`Invitation Link: ${invitationLink}`);
      console.log('========================\n');

      return {
        success: true,
        message: 'Invitation email logged to console (no SMTP configured)',
        messageId: 'simulated-' + Date.now()
      };
    }

    // Send actual email
    const info = await transporter.sendMail(mailOptions);

    return {
      success: true,
      message: 'Invitation email sent successfully',
      messageId: info.messageId
    };
  } catch (error) {
    console.error('Error sending invitation email:', error);
    throw new Error('Failed to send invitation email: ' + error.message);
  }
};

/**
 * Send session expiry warning email to user
 * @param {string} email - Recipient email address
 * @param {string} name - Recipient name
 * @param {number} timeUntilExpiry - Time until session expires (in seconds)
 * @returns {Promise<Object>} - Result of email send operation
 */
const sendSessionExpiryWarningEmail = async (email, name, timeUntilExpiry) => {
  try {
    const transporter = createTransporter();

    // Convert seconds to minutes for display
    const minutesUntilExpiry = Math.ceil(timeUntilExpiry / 60);

    const mailOptions = {
      from: `"InsureMatch" <${process.env.EMAIL_FROM || 'noreply@insurematch.com'}>`,
      to: email,
      subject: 'Session Expiry Warning - InsureMatch',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background-color: #ff9800;
              color: white;
              padding: 20px;
              text-align: center;
            }
            .content {
              background-color: #f9f9f9;
              padding: 30px;
              border-radius: 5px;
              margin-top: 20px;
            }
            .warning-box {
              background-color: #fff3cd;
              border-left: 4px solid #ff9800;
              padding: 15px;
              margin: 20px 0;
            }
            .button {
              display: inline-block;
              padding: 12px 24px;
              background-color: #4CAF50;
              color: white;
              text-decoration: none;
              border-radius: 5px;
              margin: 20px 0;
              font-weight: bold;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              font-size: 12px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⏰ Session Expiry Warning</h1>
            </div>
            <div class="content">
              <p>Hi ${name},</p>
              <p>This is a friendly reminder that your InsureMatch session is about to expire.</p>

              <div class="warning-box">
                <strong>⚠️ Your session will expire in approximately ${minutesUntilExpiry} minute${minutesUntilExpiry !== 1 ? 's' : ''}.</strong>
              </div>

              <p>If you would like to continue your session, please:</p>
              <ul>
                <li>Return to the InsureMatch application and click "Extend Session" when prompted</li>
                <li>Or simply perform any action in the application to refresh your session</li>
              </ul>

              <p><strong>What happens if my session expires?</strong></p>
              <ul>
                <li>You will be automatically logged out</li>
                <li>Any unsaved data will be lost</li>
                <li>You will need to log in again to continue</li>
              </ul>

              <p>If you have already finished using InsureMatch, you can safely ignore this email.</p>

              <p>Best regards,<br>The InsureMatch Team</p>
            </div>
            <div class="footer">
              <p>This is an automated security message from InsureMatch.</p>
              <p>If you did not initiate this session, please secure your account immediately.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Hi ${name},

        This is a friendly reminder that your InsureMatch session is about to expire.

        ⚠️ Your session will expire in approximately ${minutesUntilExpiry} minute${minutesUntilExpiry !== 1 ? 's' : ''}.

        If you would like to continue your session, please:
        - Return to the InsureMatch application and click "Extend Session" when prompted
        - Or simply perform any action in the application to refresh your session

        What happens if my session expires?
        - You will be automatically logged out
        - Any unsaved data will be lost
        - You will need to log in again to continue

        If you have already finished using InsureMatch, you can safely ignore this email.

        Best regards,
        The InsureMatch Team

        ---
        This is an automated security message from InsureMatch.
        If you did not initiate this session, please secure your account immediately.
      `
    };

    // If no transporter is configured, log to console (for development)
    if (!transporter) {
      console.log('\n=== SESSION EXPIRY WARNING EMAIL SIMULATION ===');
      console.log(`To: ${email}`);
      console.log(`Subject: ${mailOptions.subject}`);
      console.log(`Session expires in: ${minutesUntilExpiry} minute(s)`);
      console.log('===============================================\n');

      return {
        success: true,
        message: 'Session expiry warning logged to console (no SMTP configured)',
        messageId: 'simulated-' + Date.now()
      };
    }

    // Send actual email
    const info = await transporter.sendMail(mailOptions);

    return {
      success: true,
      message: 'Session expiry warning email sent successfully',
      messageId: info.messageId
    };
  } catch (error) {
    console.error('Error sending session expiry warning email:', error);
    // Don't throw error - this is a non-critical notification
    return {
      success: false,
      message: 'Failed to send session expiry warning email'
    };
  }
};

module.exports = {
  sendVerificationEmail,
  sendWelcomeEmail,
  sendInvitationEmail,
  sendSessionExpiryWarningEmail
};
