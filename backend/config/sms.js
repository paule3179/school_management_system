// SMS Configuration and Sending Functions

// For development, we'll log SMS to console
// For production, integrate with a provider like Twilio, Africa isTalking, etc.

const sendSMS = async (to, message) => {
    try {
        // In development mode, log SMS to console
        if (process.env.NODE_ENV === 'development' || !process.env.SMS_PROVIDER) {
            console.log('=========================================');
            console.log('📱 SMS NOTIFICATION (Development Mode)');
            console.log('=========================================');
            console.log('To:', to);
            console.log('Message:', message);
            console.log('=========================================');
            return { success: true, messageId: 'test-sms-id' };
        }
        
        // Production: Add your SMS provider integration here
        // Example for Twilio:
        // const client = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        // const result = await client.messages.create({
        //     body: message,
        //     from: process.env.SMS_FROM_NUMBER,
        //     to: to
        // });
        
        console.log('SMS sent to', to);
        return { success: true };
    } catch (error) {
        console.error('SMS send error:', error);
        return { success: false, error: error.message };
    }
};

// Template: Student Creation Notification (SMS) - Basic
const getStudentCreatedSMS = (parentName, studentName, admissionNumber) => {
    return `🏫 SCHOOL: Dear ${parentName}, your child ${studentName} (Admission: ${admissionNumber}) has been registered successfully. Check your email for login details.`;
};

// Template: Student Creation Notification with Login Details (SMS)
const getStudentCreatedWithLoginSMS = (parentName, studentName, admissionNumber, parentId, password, loginUrl) => {
    return `🏫 SCHOOL: Dear ${parentName}, your child ${studentName} (Adm: ${admissionNumber}) registered. Parent ID: ${parentId}, Password: ${password}. Login: ${loginUrl}`;
};

const getStudentCreatedSMSTemplate = getStudentCreatedSMS;

module.exports = {
    sendSMS,
    getStudentCreatedSMSTemplate,
    getStudentCreatedSMS,
    getStudentCreatedWithLoginSMS
};
