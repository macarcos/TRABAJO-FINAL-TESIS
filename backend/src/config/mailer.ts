import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS },
});

export const enviarCredenciales = async (email: string, nombre: string, tipo: string, usuario: string, pass: string) => {
  const esAdmin = tipo === 'Admin';
  const color = esAdmin ? '#FF5722' : '#004aad'; // Naranja o Azul
  const titulo = esAdmin ? 'ACCESO ADMINISTRATIVO' : 'BIENVENIDO A UNIACCESS';
  
  const html = `
    <div style="font-family: Arial; border: 2px solid ${color}; padding: 20px; max-width: 600px;">
      <h2 style="color: ${color}; text-align: center;">${titulo}</h2>
      <p>Hola <b>${nombre}</b>,</p>
      <p>Sus credenciales generadas son:</p>
      <div style="background: #f4f4f4; padding: 15px; border-radius: 5px;">
        <p>👤 <b>Usuario:</b> ${usuario}</p>
        <p>🔑 <b>Contraseña:</b> ${pass}</p>
      </div>
      <p style="font-size: 12px; color: grey;">UNEMI Seguridad</p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: '"UNEMI Seguridad" <no-reply@unemi.edu.ec>',
      to: email,
      subject: `Credenciales - ${tipo}`,
      html: html
    });
    console.log(`📩 Correo enviado a ${email}`);
  } catch (error) {
    console.error("❌ Error enviando correo:", error);
  }
};