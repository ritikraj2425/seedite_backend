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
    const frontendUrl = process.env.FRONTEND_URL || 'https://seedite.in';

    const mailOptions = {
        from: `"Seedite" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: email,
        subject: 'Welcome to Seedite! 🎉',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Welcome to Seedite</title>
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                    <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to Seedite! 🎉</h1>
                </div>
                
                <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
                    <h2 style="color: #333; margin-top: 0;">Hello ${userName}!</h2>
                    
                    <p>Thank you for joining Seedite! We're excited to have you on board.</p>
                    
                    <p>With Seedite, you can:</p>
                    <ul style="color: #555;">
                        <li>📚 Access high-quality courses</li>
                        <li>📝 Practice with mock tests</li>
                        <li>🏆 Achieve your learning goals</li>
                    </ul>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${frontendUrl}/courses" 
                           style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                                  color: white; 
                                  padding: 14px 30px; 
                                  text-decoration: none; 
                                  border-radius: 5px; 
                                  font-weight: bold;
                                  display: inline-block;">
                            Explore Courses
                        </a>
                    </div>
                    
                    <p style="color: #666; font-size: 14px;">If you have any questions, feel free to reach out to us!</p>
                </div>
                
                <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
                    <p>&copy; ${new Date().getFullYear()} Seedite. All rights reserved.</p>
                </div>
            </body>
            </html>
        `,
        text: `
            Hello ${userName}!
            
            Welcome to Seedite! We're excited to have you on board.
            
            With Seedite, you can:
            - Access high-quality courses
            - Practice with mock tests
            - Achieve your learning goals
            
            Start exploring: ${frontendUrl}/courses
            
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
                <title>Purchase Confirmation</title>
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                    <h1 style="color: white; margin: 0; font-size: 28px;">Purchase Confirmed! 🎉</h1>
                </div>
                
                <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
                    <h2 style="color: #333; margin-top: 0;">Hello ${userName}!</h2>
                    
                    <p>Thank you for your purchase! You're now enrolled in:</p>
                    
                    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
                        <h3 style="margin: 0 0 10px 0; color: #333;">${courseDetails.title}</h3>
                        <p style="margin: 0; color: #666;">Your learning journey starts now!</p>
                    </div>
                    
                    <h3 style="color: #333;">Payment Details</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 10px 0; color: #666;">Original Price</td>
                            <td style="padding: 10px 0; text-align: right;">₹${courseDetails.price}</td>
                        </tr>
                        ${paymentDetails.discount > 0 ? `
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 10px 0; color: #666;">Discount ${paymentDetails.couponCode ? `(${paymentDetails.couponCode})` : ''}</td>
                            <td style="padding: 10px 0; text-align: right; color: #22c55e;">-₹${paymentDetails.discount}</td>
                        </tr>
                        ` : ''}
                        <tr>
                            <td style="padding: 10px 0; font-weight: bold;">Amount Paid</td>
                            <td style="padding: 10px 0; text-align: right; font-weight: bold; color: #667eea;">₹${paymentDetails.amount}</td>
                        </tr>
                    </table>
                    
                    <p style="color: #999; font-size: 12px; margin-top: 10px;">Payment ID: ${paymentDetails.paymentId || 'N/A'}</p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${frontendUrl}/dashboard" 
                           style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                                  color: white; 
                                  padding: 14px 30px; 
                                  text-decoration: none; 
                                  border-radius: 5px; 
                                  font-weight: bold;
                                  display: inline-block;">
                            Start Learning
                        </a>
                    </div>
                    
                    <p style="color: #666; font-size: 14px;">Happy Learning! 📚</p>
                </div>
                
                <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
                    <p>&copy; ${new Date().getFullYear()} Seedite. All rights reserved.</p>
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

module.exports = {
    sendPasswordResetEmail,
    sendWelcomeEmail,
    sendPurchaseConfirmationEmail
};

