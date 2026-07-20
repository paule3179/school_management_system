// backend/test-email.js
require('dotenv').config();
const { sendEmail, getStudentCreatedTemplate } = require('./config/email');

async function testEmail() {
    console.log('📧 Testing email functionality...\n');
    
    const result = await sendEmail(
        'test@example.com',  // Recipient email
        'Test Email - School Management System',
        getStudentCreatedTemplate(
            'Test Parent',           // parentName
            'Test Student',          // studentName
            '2024-001',              // studentAdmission
            'parent@example.com',    // parentEmail (NEW)
            'http://localhost:5173/login'  // loginUrl
        )
    );
    
    if (result.success) {
        console.log('\n✅ Email sent successfully!');
        if (result.previewUrl) {
            console.log('📧 Click this URL to view the email:', result.previewUrl);
        }
    } else {
        console.log('❌ Email failed:', result.error);
    }
}

testEmail();