const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "farddeenn@gmail.com",
    pass: process.env.MAIL_PASSWORD,
  },
});

module.exports = async function sendMail(to, subject, text) {
  await transporter.sendMail({
    from: '"Pay Circle" <farddeenn@gmail.com>',
    to,
    subject,
    text,
  });
};
