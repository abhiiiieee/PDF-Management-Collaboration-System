// Email Configuration Debug File
// Add this code to the top of your authController.js to debug email issues

const debugEmailConfig = () => {
  console.log('Email Configuration:');
  console.log(`HOST: ${process.env.EMAIL_HOST || 'smtp.mailtrap.io'}`);
  console.log(`PORT: ${process.env.EMAIL_PORT || '2525'}`);
  console.log(`USER: ${process.env.EMAIL_USER || 'not set'}`);
  console.log(`PASS: ${process.env.EMAIL_PASS ? 'is set' : 'not set'}`);
  console.log(`FROM: ${process.env.EMAIL_FROM || 'noreply@pdfapp.com'}`);
};

// Update transporter configuration:
// Replace the transporter creation in authController.js with this:
/*
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.mailtrap.io',
  port: parseInt(process.env.EMAIL_PORT || '2525'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASS || ''
  },
  debug: true // Enable debug output
});

// Test the transporter
transporter.verify(function(error, success) {
  if (error) {
    console.error('SMTP verification error:', error);
  } else {
    console.log('SMTP server is ready to take our messages');
  }
});
*/

// Instructions:
// 1. Sign up for a free account at https://mailtrap.io/
// 2. Get your SMTP credentials from the inbox settings
// 3. Add these to your .env file:
/*
EMAIL_HOST=sandbox.smtp.mailtrap.io
EMAIL_PORT=2525
EMAIL_USER=your_mailtrap_username
EMAIL_PASS=your_mailtrap_password
EMAIL_FROM=noreply@pdfapp.com
*/

module.exports = { debugEmailConfig }; 