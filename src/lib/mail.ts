import "server-only";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_EMAIL,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export const sendEmail = async ({ to, subject, html }: { to: string; subject: string; html: string }) => {
  const mailOptions = {
    from: '"Centro de Mídias Educacionais" <inscricoes@seduc.to.gov.br>',
    to,
    subject,
    html,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`E-mail enviado com sucesso para: ${to}`);
  } catch (error) {
    console.error('Erro ao enviar e-mail via Nodemailer:', error);
    // Não lançamos erro aqui para não interromper o fluxo da aplicação se o e-mail falhar,
    // mas o log acima ajudará no monitoramento.
  }
};
