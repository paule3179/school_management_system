const nodemailer = require('nodemailer');

let transporter = null;
let retryCount = 0;
const MAX_RETRIES = 3;

const getTransporter = async () => {
    if (transporter) return transporter;
    
    // Check if using Mailtrap or custom SMTP
    const useMailtrap = process.env.MAIL_HOST && process.env.MAIL_USERNAME && process.env.MAIL_PASSWORD;
    const isProduction = process.env.NODE_ENV === 'production';
    
    // Use Mailtrap or custom SMTP (Production or Development)
    if (useMailtrap) {
        console.log('📧 Using Mailtrap SMTP for email testing');
        
        transporter = nodemailer.createTransport({
            host: process.env.MAIL_HOST,
            port: parseInt(process.env.MAIL_PORT) || 2525,
            secure: false,
            auth: {
                user: process.env.MAIL_USERNAME,
                pass: process.env.MAIL_PASSWORD,
            },
            connectionTimeout: 10000,
            greetingTimeout: 10000,
            socketTimeout: 20000,
        });
        
        try {
            await transporter.verify();
            console.log('✅ Mailtrap SMTP connected successfully');
            retryCount = 0;
            return transporter;
        } catch (error) {
            console.error('❌ Mailtrap SMTP connection failed:', error.message);
            transporter = null;
            
            // Fallback to Ethereal if Mailtrap fails
            console.log('📧 Falling back to Ethereal for test emails');
            return createEtherealTransporter();
        }
    }
    
    // Use Ethereal for development/testing (no credentials needed)
    console.log('📧 Using Ethereal for test emails (Development mode)');
    return createEtherealTransporter();
};

const createEtherealTransporter = async () => {
    const testAccount = await nodemailer.createTestAccount();
    
    console.log('📧 Ethereal Test Account Created:');
    console.log(`   User: ${testAccount.user}`);
    console.log(`   Pass: ${testAccount.pass}`);
    console.log(`   Preview URL will be shown after sending`);
    
    transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
            user: testAccount.user,
            pass: testAccount.pass,
        },
    });
    
    console.log('✅ Ethereal transporter ready');
    return transporter;
};

const sendEmail = async (to, subject, htmlContent, attempt = 1) => {
    try {
        const transporter = await getTransporter();
        const isMailtrap = !!process.env.MAIL_HOST;
        
        const info = await transporter.sendMail({
            from: process.env.MAIL_FROM_EMAIL || '"School Management System" <noreply@school.com>',
            to: to,
            subject: subject,
            html: htmlContent,
        });
        
        console.log(`📧 Email sent to: ${to}`);
        
        // Show preview URL for testing emails
        let previewUrl = null;
        if (!isMailtrap && nodemailer.getTestMessageUrl) {
            previewUrl = nodemailer.getTestMessageUrl(info);
            if (previewUrl) {
                console.log('📧 Preview URL (Ethereal):', previewUrl);
            }
        } else if (isMailtrap) {
            console.log('📧 Email captured in Mailtrap - Check your Mailtrap inbox');
        } else {
            console.log('✅ Email sent successfully');
        }
        
        return { success: true, messageId: info.messageId, previewUrl };
    } catch (error) {
        console.error(`❌ Email send error (attempt ${attempt}):`, error.message);
        
        // Retry logic
        if (attempt < MAX_RETRIES) {
            console.log(`🔄 Retrying... (${attempt + 1}/${MAX_RETRIES})`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            transporter = null; // Reset transporter to force new connection
            return sendEmail(to, subject, htmlContent, attempt + 1);
        }
        
        return { success: false, error: error.message };
    }
};

// Template for student creation notification
const getStudentCreatedTemplate = (parentName, studentName, studentAdmission, parentId, tempPassword, loginUrl) => {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; }
                .header { background: #4caf50; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { padding: 20px; }
                .credentials { background: #f0f8ff; padding: 15px; border-radius: 8px; margin: 20px 0; }
                .btn { display: inline-block; background: #4caf50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; }
                .password-box { background: #fff3cd; padding: 10px; border-radius: 5px; font-family: monospace; font-size: 16px; text-align: center; margin: 10px 0; }
                .footer { text-align: center; font-size: 12px; color: #999; margin-top: 20px; }
                .warning { color: #856404; font-size: 12px; margin-top: 10px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>🏫 Student Registration Confirmation</h2>
                </div>
                <div class="content">
                    <p>Dear <strong>${parentName}</strong>,</p>
                    <p>Your child has been successfully registered in the School Management System.</p>
                    
                    <div style="background: #f0f8ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p><strong>📋 Student Details:</strong></p>
                        <p>👨‍🎓 <strong>Name:</strong> ${studentName}</p>
                        <p>🆔 <strong>Admission Number:</strong> ${studentAdmission}</p>
                    </div>
                    
                    <div class="credentials">
                        <p><strong>🔑 Login Credentials:</strong></p>
                        <p>👪 <strong>Parent ID:</strong> ${parentId}</p>
                        <p><strong>🔒 Password:</strong></p>
                        <div class="password-box">
                            <strong>${tempPassword}</strong>
                        </div>
                        <p class="warning">⚠️ <strong>Important:</strong> Please change your password after first login.</p>
                    </div>
                    
                    <p style="text-align: center;">
                        <a href="${loginUrl}" class="btn">📱 Login to Parent Portal</a>
                    </p>
                    
                    <p>Best regards,<br><strong>School Administration</strong></p>
                </div>
                <div class="footer">
                    <p>This is an automated message from School Management System</p>
                </div>
            </div>
        </body>
        </html>
    `;
};

// Template for parent account creation
const getParentWelcomeTemplate = (parentName, childName, childAdmission, parentId, password, loginUrl) => {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; }
                .header { background: #ff9800; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { padding: 20px; }
                .credentials { background: #f0f8ff; padding: 15px; border-radius: 8px; margin: 20px 0; }
                .btn { display: inline-block; background: #ff9800; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; }
                .password-box { background: #fff3cd; padding: 10px; border-radius: 5px; font-family: monospace; font-size: 16px; text-align: center; margin: 10px 0; }
                .footer { text-align: center; font-size: 12px; color: #999; margin-top: 20px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>👪 Welcome to Parent Portal</h2>
                </div>
                <div class="content">
                    <p>Dear <strong>${parentName}</strong>,</p>
                    <p>Your parent account has been created. You can now monitor your child's progress.</p>
                    
                    <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p><strong>📋 Child Information:</strong></p>
                        <p>👨‍🎓 <strong>Name:</strong> ${childName}</p>
                        <p>🆔 <strong>Admission:</strong> ${childAdmission}</p>
                    </div>
                    
                    <div class="credentials">
                        <p><strong>🔑 Login Credentials:</strong></p>
                        <p>👪 <strong>Parent ID:</strong> ${parentId}</p>
                        <p><strong>🔒 Password:</strong></p>
                        <div class="password-box">
                            <strong>${password}</strong>
                        </div>
                        <p>⚠️ <strong>Important:</strong> Please change your password after first login.</p>
                    </div>
                    
                    <p style="text-align: center;">
                        <a href="${loginUrl}" class="btn">📱 Login to Parent Portal</a>
                    </p>
                    
                    <p>Best regards,<br><strong>School Administration</strong></p>
                </div>
                <div class="footer">
                    <p>This is an automated message from School Management System</p>
                </div>
            </div>
        </body>
        </html>
    `;
};

// Template for teacher account creation
const getTeacherWelcomeTemplate = (name, teacherId, password, loginUrl) => {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; }
                .header { background: #2196F3; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { padding: 20px; }
                .btn { display: inline-block; background: #2196F3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; }
                .credentials { background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0; }
                .footer { text-align: center; font-size: 12px; color: #999; margin-top: 20px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>👨‍🏫 Welcome to School Management System</h2>
                </div>
                <div class="content">
                    <p>Dear <strong>${name}</strong>,</p>
                    <p>Your teacher account has been created successfully.</p>
                    
                    <div class="credentials">
                        <p><strong>🔑 Login Credentials:</strong></p>
                        <p>📚 <strong>Teacher ID:</strong> ${teacherId}</p>
                        <p>🔒 <strong>Password:</strong> ${password}</p>
                    </div>
                    
                    <p style="text-align: center;">
                        <a href="${loginUrl}" class="btn">📱 Login to Dashboard</a>
                    </p>
                    
                    <p><strong>⚠️ Security Tip:</strong> Please change your password after first login.</p>
                    
                    <p>Best regards,<br><strong>School Administration</strong></p>
                </div>
                <div class="footer">
                    <p>This is an automated message from School Management System</p>
                </div>
            </div>
        </body>
        </html>
    `;
};

module.exports = { 
    sendEmail, 
    getStudentCreatedTemplate,
    getTeacherWelcomeTemplate,
    getParentWelcomeTemplate
};