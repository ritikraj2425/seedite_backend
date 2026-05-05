const nodemailer = require('nodemailer');

// Create transporter using SMTP
const createTransporter = () => {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: false, // true for 465, false for other ports
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });
};

/**
 * Send password reset email
 * @param {string} email - Recipient email
 * @param {string} resetUrl - Password reset URL with token
 * @param {string} userName - User's name for personalization
 */
const sendPasswordResetEmail = async (email, resetUrl, userName = 'User') => {
    const transporter = createTransporter();

    const mailOptions = {
        from: `"Seedite" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: email,
        subject: 'Password Reset Request - Seedite',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Password Reset</title>
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                    <h1 style="color: white; margin: 0; font-size: 28px;">Seedite</h1>
                </div>
                
                <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
                    <h2 style="color: #333; margin-top: 0;">Password Reset Request</h2>
                    
                    <p>Hello <strong>${userName}</strong>,</p>
                    
                    <p>We received a request to reset your password. Click the button below to create a new password:</p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetUrl}" 
                           style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                                  color: white; 
                                  padding: 14px 30px; 
                                  text-decoration: none; 
                                  border-radius: 5px; 
                                  font-weight: bold;
                                  display: inline-block;">
                            Reset Password
                        </a>
                    </div>
                    
                    <p style="color: #666; font-size: 14px;">This link will expire in <strong>15 minutes</strong>.</p>
                    
                    <p style="color: #666; font-size: 14px;">If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
                    
                    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                    
                    <p style="color: #999; font-size: 12px; text-align: center;">
                        If the button doesn't work, copy and paste this link into your browser:<br>
                        <a href="${resetUrl}" style="color: #667eea; word-break: break-all;">${resetUrl}</a>
                    </p>
                </div>
                
                <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
                    <p>&copy; ${new Date().getFullYear()} Seedite. All rights reserved.</p>
                </div>
            </body>
            </html>
        `,
        text: `
            Hello ${userName},
            
            We received a request to reset your password for your Seedite account.
            
            Click the link below to reset your password:
            ${resetUrl}
            
            This link will expire in 15 minutes.
            
            If you didn't request a password reset, you can safely ignore this email.
            
            - The Seedite Team
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('[Email] Password reset email sent:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('[Email] Error sending password reset email:', error);
        throw error;
    }
};

/**
 * Send welcome email on signup
 * @param {string} email - Recipient email
 * @param {string} userName - User's name
 */
const sendWelcomeEmail = async (email, userName = 'User') => {
    const transporter = createTransporter();
    const frontendUrl = process.env.FRONTEND_URL || 'https://www.seedite.in';
    const firstName = userName.split(' ')[0];

    const mailOptions = {
        from: `"Seedite" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: email,
        subject: `${firstName}, build the advantage most students miss 🚀`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Welcome to Seedite</title>
            </head>
            <body style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #334155; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f8fafc;">
                <div style="background-color: #ffffff; margin: 20px auto; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); border: 1px solid #e2e8f0;">
                    
                    <!-- Top blue border accent -->
                    <div style="height: 4px; background: linear-gradient(135deg, #2563eb 0%, #1e3a8a 100%);"></div>
                    
                    <!-- Header -->
                    <div style="padding: 40px 32px 24px; text-align: center;">
                        <h1 style="color: #0f172a; margin: 0 0 8px; font-size: 24px; font-weight: 700; letter-spacing: -0.02em;">Welcome to Seedite!</h1>
                        <p style="color: #64748b; margin: 0; font-size: 16px;">You've taken the first step toward building the skills that actually matter.</p>
                    </div>

                    <!-- Body -->
                    <div style="padding: 0 32px 32px;">
                        <p style="font-size: 15px; margin: 0 0 24px;">
                            Hi <strong>${firstName}</strong>,<br><br>
                            Most students start preparing after college begins. You're already ahead. Here's what you can do right now to build your advantage:
                        </p>

                        <!-- Buttons -->
                        <div style="text-align: center; margin-bottom: 32px;">
                            <a href="${frontendUrl}/courses"
                               style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block; margin: 0 8px 12px 0; border: 1px solid #2563eb;">
                                📚 Explore Courses
                            </a>
                            <a href="${frontendUrl}/iq-tests"
                               style="background-color: #f1f5f9; color: #0f172a; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block; margin: 0 0 12px 0; border: 1px solid #e2e8f0;">
                                🧠 Try Free IQ Test
                            </a>
                        </div>

                        <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; border: 1px solid #e2e8f0;">
                            <h3 style="color: #0f172a; font-size: 14px; margin: 0 0 12px;">What makes Seedite different?</h3>
                            <ul style="margin: 0; padding-left: 20px; color: #475569; font-size: 14px;">
                                <li style="margin-bottom: 8px;"><strong>Learn With Structure:</strong> Step-by-step paths designed by top minds.</li>
                                <li style="margin-bottom: 8px;"><strong>Test Your Knowledge:</strong> Realistic mock tests to track your progress.</li>
                                <li><strong>Think, Don't Memorize:</strong> Focus on problem-solving, not rote memorization.</li>
                            </ul>
                        </div>
                    </div>

                    <!-- Footer -->
                    <div style="background-color: #f1f5f9; padding: 24px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
                        <p style="color: #64748b; font-size: 12px; margin: 0 0 8px;">
                            Trusted by <strong>200+</strong> ambitious students building their advantage.
                        </p>
                        <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                            &copy; ${new Date().getFullYear()} Seedite. All rights reserved. | <a href="${frontendUrl}" style="color: #2563eb; text-decoration: none;">seedite.in</a>
                        </p>
                    </div>
                </div>
            </body>
            </html>
        `,
        text: `
            Hi ${firstName}!

            Welcome to Seedite! You've taken the first step toward building the skills that actually matter.

            Most students start preparing after college begins. You're already ahead. Here's what you can do right now to build your advantage:

            Explore Courses: ${frontendUrl}/courses
            Try Free IQ Test: ${frontendUrl}/iq-tests

            What makes Seedite different?
            - Learn With Structure: Step-by-step paths designed by top minds.
            - Test Your Knowledge: Realistic mock tests to track your progress.
            - Think, Don't Memorize: Focus on problem-solving, not rote memorization.

            Trusted by 200+ ambitious students building their advantage.

            - The Seedite Team
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('[Email] Welcome email sent:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('[Email] Error sending welcome email:', error);
        // Don't throw - welcome email is not critical
        return { success: false, error: error.message };
    }
};

/**
 * Send purchase confirmation email
 * @param {string} email - Recipient email
 * @param {string} userName - User's name
 * @param {object} courseDetails - { title, price }
 * @param {object} paymentDetails - { amount, paymentId, couponCode, discount }
 */
const sendPurchaseConfirmationEmail = async (email, userName, courseDetails, paymentDetails) => {
    const transporter = createTransporter();
    const frontendUrl = process.env.FRONTEND_URL || 'https://seedite.in';

    const mailOptions = {
        from: `"Seedite" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: email,
        subject: `🎉 Enrollment Confirmed: ${courseDetails.title}`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Enrollment Confirmed</title>
            </head>
            <body style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #334155; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f8fafc;">
                <div style="background-color: #ffffff; margin: 20px auto; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); border: 1px solid #e2e8f0;">
                    
                    <!-- Top green/blue border accent -->
                    <div style="height: 4px; background: linear-gradient(135deg, #10b981 0%, #2563eb 100%);"></div>
                    
                    <!-- Header -->
                    <div style="padding: 40px 32px 24px; text-align: center;">
                        <h1 style="color: #0f172a; margin: 0 0 8px; font-size: 24px; font-weight: 700; letter-spacing: -0.02em;">Enrollment Confirmed!</h1>
                        <p style="color: #64748b; margin: 0; font-size: 16px;">Hi ${userName}, you're officially in.</p>
                    </div>

                    <!-- Body -->
                    <div style="padding: 0 32px 32px;">
                        <p style="font-size: 15px; margin: 0 0 24px;">
                            Thank you for your purchase. Your learning journey begins now! You have successfully enrolled in:
                        </p>

                        <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; border: 1px solid #e2e8f0; border-left: 4px solid #2563eb; margin-bottom: 24px;">
                            <h3 style="color: #0f172a; font-size: 16px; margin: 0 0 4px;">${courseDetails.title}</h3>
                            <p style="color: #64748b; font-size: 14px; margin: 0;">Get ready to build your advantage.</p>
                        </div>

                        <h3 style="color: #0f172a; font-size: 14px; margin: 0 0 12px; text-transform: uppercase; letter-spacing: 0.05em;">Payment Summary</h3>
                        <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 32px;">
                            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                                <tr>
                                    <td style="padding: 8px 0; color: #64748b;">Original Price</td>
                                    <td style="padding: 8px 0; text-align: right; color: #0f172a;">₹${courseDetails.price}</td>
                                </tr>
                                ${paymentDetails.discount > 0 ? `
                                <tr>
                                    <td style="padding: 8px 0; color: #64748b;">Discount ${paymentDetails.couponCode ? `(${paymentDetails.couponCode})` : ''}</td>
                                    <td style="padding: 8px 0; text-align: right; color: #16a34a;">-₹${paymentDetails.discount}</td>
                                </tr>
                                ` : ''}
                                <tr><td colspan="2" style="border-top: 1px solid #e2e8f0; padding-top: 8px; margin-top: 8px;"></td></tr>
                                <tr>
                                    <td style="padding: 8px 0; font-weight: 600; color: #0f172a;">Total Paid</td>
                                    <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #2563eb;">₹${paymentDetails.amount}</td>
                                </tr>
                            </table>
                            <p style="color: #94a3b8; font-size: 11px; margin: 12px 0 0; text-align: right;">Payment ID: ${paymentDetails.paymentId || 'N/A'}</p>
                        </div>

                        <div style="text-align: center;">
                            <a href="${frontendUrl}/dashboard"
                               style="background-color: #2563eb; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);">
                                Start Learning Now →
                            </a>
                        </div>
                    </div>

                    <!-- Footer -->
                    <div style="background-color: #f1f5f9; padding: 24px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
                        <p style="color: #64748b; font-size: 12px; margin: 0 0 8px;">
                            &copy; ${new Date().getFullYear()} Seedite. All rights reserved.
                        </p>
                        <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                            If you have any questions, simply reply to this email.
                        </p>
                    </div>
                </div>
            </body>
            </html>
        `,
        text: `
            Hello ${userName}!
            
            Thank you for your purchase! You're now enrolled in: ${courseDetails.title}
            
            Payment Details:
            - Original Price: ₹${courseDetails.price}
            ${paymentDetails.discount > 0 ? `- Discount: -₹${paymentDetails.discount}` : ''}
            - Amount Paid: ₹${paymentDetails.amount}
            - Payment ID: ${paymentDetails.paymentId || 'N/A'}
            
            Start learning now: ${frontendUrl}/dashboard
            
            Happy Learning!
            - The Seedite Team
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('[Email] Purchase confirmation email sent:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('[Email] Error sending purchase confirmation email:', error);
        // Don't throw - confirmation email is not critical
        return { success: false, error: error.message };
    }
};

/**
 * Send live session registration confirmation email
 * @param {string} email - Recipient email
 * @param {string} userName - User's name
 * @param {object} sessionDetails - { title, sessionDate, sessionTime }
 */
const sendLiveSessionRegistrationEmail = async (email, userName, sessionDetails) => {
    const transporter = createTransporter();

    // Format dates for display
    const sessionDateObj = new Date(sessionDetails.sessionDate);
    const dateStr = sessionDateObj.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    // Format "14:30" to "2:30 PM"
    let timeStr = sessionDetails.sessionTime;
    if (timeStr && timeStr.includes(':')) {
        const [hours, minutes] = timeStr.split(':');
        const h = parseInt(hours, 10);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const formattedHours = h % 12 || 12;
        timeStr = `${formattedHours}:${minutes} ${ampm}`;
    }

    const mailOptions = {
        from: `"Seedite" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: email,
        subject: `Registration Confirmed: ${sessionDetails.title}`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Session Registration Confirmed</title>
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                    <h1 style="color: white; margin: 0; font-size: 28px;">Registration Confirmed! 📅</h1>
                </div>
                
                <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
                    <h2 style="color: #333; margin-top: 0;">Hello ${userName}!</h2>
                    
                    <p>Thank you for registering for this session! Your spot is confirmed for:</p>
                    
                    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                        <h3 style="margin: 0 0 10px 0; color: #333;">${sessionDetails.title}</h3>
                        <p style="margin: 5px 0 0 0; color: #555;"><strong>Date:</strong> ${dateStr}</p>
                        <p style="margin: 5px 0 0 0; color: #555;"><strong>Time:</strong> ${timeStr}</p>
                    </div>
                    
                    <p style="color: #444; font-size: 16px; margin: 25px 0; padding: 15px; background: #e0e7ff; border-radius: 8px; text-align: center;">
                        Thank you for registering for this session! Rest of the updates will be shared soon.
                    </p>
                    
                    <p style="color: #666; font-size: 14px;">We're excited to see you there!</p>
                </div>
                
                <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
                    <p>&copy; ${new Date().getFullYear()} Seedite. All rights reserved.</p>
                </div>
            </body>
            </html>
        `,
        text: `
            Hello ${userName}!
            
            Thank you for registering for this session! Your spot is confirmed for:
            
            Topic: ${sessionDetails.title}
            Date: ${dateStr}
            Time: ${timeStr}
            
            Thank you for registering for this session! Rest of the updates will be shared soon.
            
            We're excited to see you there!
            - The Seedite Team
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('[Email] Live session registration email sent:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('[Email] Error sending live session registration email:', error);
        // Don't throw - registration email is not critical to UX
        return { success: false, error: error.message };
    }
};

module.exports = {
    sendPasswordResetEmail,
    sendWelcomeEmail,
    sendPurchaseConfirmationEmail,
    sendLiveSessionRegistrationEmail
};
