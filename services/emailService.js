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

  async sendAdminNotification(adminEmail, userName, userEmail, projectTitle, projectId) {
    const templateData = {
      userName: userName,
      userEmail: userEmail,
      projectTitle: projectTitle,
      projectId: projectId,
      submissionDate: new Date().toLocaleString(),
    };

    return await this.sendEmail(
      adminEmail,
      "📬 New Project Submission - Action Required",
      "admin-notification",
      templateData
    );
  }

  async sendStatusUpdate(userEmail, userName, projectTitle, status, adminNotes = "") {
    const statusText = {
      approved: "Approved 🎉",
      rejected: "Not Selected",
      "in-review": "Under Review",
      pending: "Pending"
    }[status] || status;

    const templateData = {
      userName: userName,
      projectTitle: projectTitle,
      status: status,
      statusText: statusText,
      adminNotes: adminNotes,
    };

    return await this.sendEmail(
      userEmail,
      `Project Status Update: ${statusText} - NYBFF`,
      "status-update",
      templateData
    );
  }
}

module.exports = new EmailService();