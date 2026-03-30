let nodemailer = require('nodemailer')
const transporter = nodemailer.createTransport({
    host: "sandbox.smtp.mailtrap.io",
    port: 25,
    secure: false, // Use true for port 465, false for port 587
    auth: {
        user: "4073b85206d2bf",
        pass: "9a55cded398313",
    },
});
module.exports = {
    sendMail: async function (to, url) {
        await transporter.sendMail({
            from: '"admin@" <admin@nnptud.com>',
            to: to,
            subject: "mail reset passwrod",
            text: "lick vo day de doi passs", // Plain-text version of the message
            html: "lick vo <a href=" + url + ">day</a> de doi passs", // HTML version of the message
        });
    },
    sendImportedPasswordMail: async function (to, username, password) {
        await transporter.sendMail({
            from: '"admin@" <admin@nnptud.com>',
            to: to,
            subject: "tai khoan moi cua ban",
            text: "Tai khoan cua ban da duoc tao. Username: " + username + ", password: " + password,
            html: "<p>Tai khoan cua ban da duoc tao.</p><p>Username: <b>" + username + "</b></p><p>Password: <b>" + password + "</b></p>",
        });
    }
}
