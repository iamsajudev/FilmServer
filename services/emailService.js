// services/emailService.js

const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");

class EmailService {
  constructor() {
    this.transporter = null;
    this.templateCache = {};
    this.initTransporter();
  }

  initTransporter() {
    if (!process.env.GMAIL_EMAIL || !process.env.GMAIL_APP_PASSWORD) {
      console.log("⚠️ Gmail credentials not set. Email will be disabled.");
      return;
    }

    this.transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_EMAIL,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
      pool: true,
      maxConnections: 5,
      rateLimit: 5,
    });

    // Verify connection
    this.transporter.verify((error, success) => {
      if (error) {
        console.error("❌ Gmail verification failed:", error);
      } else {
        console.log("✅ Gmail email service ready");
      }
    });
  }

  // Generate a readable temporary password
  generateTemporaryPassword() {
    const upperChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowerChars = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const specialChars = '!@#$%';
    
    let password = '';
    
    // Ensure at least one of each type
    password += upperChars.charAt(Math.floor(Math.random() * upperChars.length));
    password += lowerChars.charAt(Math.floor(Math.random() * lowerChars.length));
    password += numbers.charAt(Math.floor(Math.random() * numbers.length));
    password += specialChars.charAt(Math.floor(Math.random() * specialChars.length));
    
    // Fill the rest with random characters
    const allChars = upperChars + lowerChars + numbers + specialChars;
    for (let i = password.length; i < 12; i++) {
      password += allChars.charAt(Math.floor(Math.random() * allChars.length));
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  loadTemplate(templateName) {
    if (this.templateCache[templateName]) {
      return this.templateCache[templateName];
    }

    try {
      const templatePath = path.join(
        __dirname,
        "../templates/emails",
        `${templateName}.html`
      );
      const template = fs.readFileSync(templatePath, "utf-8");
      this.templateCache[templateName] = template;
      return template;
    } catch (error) {
      console.error(`❌ Failed to load template ${templateName}:`, error);
      return null;
    }
  }

  compileTemplate(template, data) {
    let compiled = template;
    
    // Replace {{variable}} placeholders
    for (const [key, value] of Object.entries(data)) {
      const regex = new RegExp(`{{${key}}}`, "g");
      compiled = compiled.replace(regex, value || "");
    }
    
    // Handle conditional blocks {{#if condition}}...{{/if}}
    compiled = compiled.replace(/\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, condition, content) => {
      return data[condition] ? content : "";
    });
    
    return compiled;
  }

  async sendEmail(to, subject, templateName, templateData) {
    if (!this.transporter) {
      console.log("⚠️ Email service not configured");
      return false;
    }

    try {
      const template = this.loadTemplate(templateName);
      if (!template) {
        throw new Error(`Template ${templateName} not found`);
      }

      const html = this.compileTemplate(template, templateData);

      const mailOptions = {
        from: `"NYBFF" <${process.env.GMAIL_EMAIL}>`,
        to: to,
        subject: subject,
        html: html,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Email sent to ${to}: ${info.messageId}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to send email to ${to}:`, error.message);
      return false;
    }
  }

  // Send Welcome Email with temporary password
  async sendWelcomeEmail(userEmail, userName, tempPassword, token) {
    const loginLink = `${process.env.CLIENT_URL || 'http://localhost:3000'}/login`;
    const resetLink = `${process.env.CLIENT_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
    
    const templateData = {
      userName: userName,
      userEmail: userEmail,
      tempPassword: tempPassword,
      loginLink: loginLink,
      resetLink: resetLink,
      accountCreated: new Date().toLocaleString(),
      year: new Date().getFullYear(),
    };

    return await this.sendEmail(
      userEmail,
      "🎬 Welcome to NYBFF - Your Account Details",
      "welcome-email",
      templateData
    );
  }

  // Send Submission Confirmation Email
  async sendSubmissionConfirmation(userEmail, userName, projectTitle, projectId) {
    const templateData = {
      userName: userName,
      projectTitle: projectTitle,
      projectId: projectId,
      submissionDate: new Date().toLocaleString(),
      year: new Date().getFullYear(),
    };

    return await this.sendEmail(
      userEmail,
      "🎉 Project Submission Confirmed - NYBFF",
      "submission-confirmation",
      templateData
    );
  }

  // Send Admin Notification Email
  async sendAdminNotification(adminEmail, userName, userEmail, projectTitle, projectId) {
    const templateData = {
      userName: userName,
      userEmail: userEmail,
      projectTitle: projectTitle,
      projectId: projectId,
      submissionDate: new Date().toLocaleString(),
      adminDashboardLink: `${process.env.CLIENT_URL || 'http://localhost:3000'}/admin/submissions`,
    };

    return await this.sendEmail(
      adminEmail,
      "📬 New Project Submission - Action Required",
      "admin-notification",
      templateData
    );
  }

  // Send Status Update Email
  async sendStatusUpdate(userEmail, userName, projectTitle, status, adminNotes = "") {
    const statusText = {
      approved: "Approved 🎉",
      rejected: "Not Selected",
      "in-review": "Under Review",
      pending: "Pending"
    }[status] || status;

    const statusColor = {
      approved: "#28a745",
      rejected: "#dc3545",
      "in-review": "#ffc107",
      pending: "#17a2b8"
    }[status] || "#6c757d";

    const templateData = {
      userName: userName,
      projectTitle: projectTitle,
      status: status,
      statusText: statusText,
      statusColor: statusColor,
      adminNotes: adminNotes || "No additional notes provided.",
      viewProjectLink: `${process.env.CLIENT_URL || 'http://localhost:3000'}/projects/${projectTitle.toLowerCase().replace(/ /g, '-')}`,
    };

    return await this.sendEmail(
      userEmail,
      `Project Status Update: ${statusText} - NYBFF`,
      "status-update",
      templateData
    );
  }

  // Send Password Reset Email
  async sendPasswordResetEmail(userEmail, userName, resetToken) {
    const resetLink = `${process.env.CLIENT_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    
    const templateData = {
      userName: userName,
      resetLink: resetLink,
      year: new Date().getFullYear(),
    };

    return await this.sendEmail(
      userEmail,
      "🔐 Reset Your NYBFF Password",
      "password-reset",
      templateData
    );
  }

  // Send Email Verification Email
  async sendVerificationEmail(userEmail, userName, verificationToken) {
    const verifyLink = `${process.env.CLIENT_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;
    
    const templateData = {
      userName: userName,
      verifyLink: verifyLink,
      year: new Date().getFullYear(),
    };

    return await this.sendEmail(
      userEmail,
      "✅ Verify Your NYBFF Email Address",
      "email-verification",
      templateData
    );
  }

  // Send Bulk Notification Email (for admins to send to multiple users)
  async sendBulkNotification(recipients, subject, message) {
    if (!Array.isArray(recipients) || recipients.length === 0) {
      console.log("No recipients provided for bulk notification");
      return false;
    }

    const templateData = {
      message: message,
      year: new Date().getFullYear(),
    };

    let successCount = 0;
    for (const recipient of recipients) {
      const result = await this.sendEmail(
        recipient,
        subject,
        "bulk-notification",
        templateData
      );
      if (result) successCount++;
      
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`Bulk notification sent to ${successCount}/${recipients.length} recipients`);
    return successCount > 0;
  }

  // Test email configuration
  async testEmailConfiguration(testEmail) {
    const templateData = {
      testEmail: testEmail,
      testTime: new Date().toLocaleString(),
      year: new Date().getFullYear(),
    };

    return await this.sendEmail(
      testEmail,
      "✅ NYBFF Email Service Test",
      "test-email",
      templateData
    );
  }
}

module.exports = new EmailService();