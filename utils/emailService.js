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

module.exports = {
  sendVerificationEmail,
  sendWelcomeEmail
};
