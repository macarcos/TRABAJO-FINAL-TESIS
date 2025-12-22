import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS },
});

// ==========================================
// 1. ENVIAR CREDENCIALES (REGISTRO)
// ==========================================
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
    console.log(`📩 Correo de credenciales enviado a ${email}`);
  } catch (error) {
    console.error("❌ Error enviando correo:", error);
  }
};

// ==========================================
// 2. NOTIFICAR ACTUALIZACIÓN DE DATOS
// ==========================================
export const notificarActualizacion = async (email: string, nombre: string) => {
  const color = '#28a745'; // Verde para éxito
  
  const html = `
    <div style="font-family: Arial; border-top: 4px solid ${color}; padding: 20px; max-width: 600px; background-color: #f9f9f9;">
      <h2 style="color: #333;">🔔 Actualización de Datos</h2>
      <p>Estimado/a <b>${nombre}</b>,</p>
      <p>Le informamos que sus datos personales en la plataforma <b>UNIACCESS / eCampus</b> han sido modificados recientemente.</p>
      
      <div style="background: #fff; padding: 15px; border: 1px solid #ddd; border-radius: 5px; margin: 15px 0;">
        <p style="margin: 0;">✅ <b>Estado:</b> Actualización Exitosa</p>
        <p style="margin: 0;">📅 <b>Fecha:</b> ${new Date().toLocaleString()}</p>
      </div>

      <p style="font-size: 13px; color: #666;">Si usted no realizó este cambio, por favor contacte al administrador inmediatamente.</p>
      <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="font-size: 11px; color: #999; text-align: center;">UNEMI Seguridad - Notificación Automática</p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: '"UNEMI Seguridad" <no-reply@unemi.edu.ec>',
      to: email,
      subject: `🔔 Alerta de Seguridad - Datos Actualizados`,
      html: html
    });
    console.log(`📩 Notificación de actualización enviada a ${email}`);
  } catch (error) {
    console.error("❌ Error enviando notificación:", error);
  }
};
// ---------------------------------------------------
// 🔥 AGREGA ESTA FUNCIÓN AL FINAL DE TU ARCHIVO mailer.ts
// ---------------------------------------------------

export const enviarRechazoVisitante = async (email: string, nombreCompleto: string, razon: string) => {
    // ⚠️ Asegúrate que el objeto 'transporter' y las configuraciones de NodeMailer estén disponibles en este archivo.
    
    if (process.env.NODE_ENV === 'development') {
        console.log(`✉️ SIMULACIÓN EMAIL RECHAZO a ${email}. Razón: ${razon}`);
        return; 
    }
    
    // Asumiendo que 'transporter' es el objeto NodeMailer configurado
    const info = await transporter.sendMail({
        from: '"UniAccess - Acceso Campus" <' + process.env.MAIL_USER + '>',
        to: email,
        subject: "❌ Solicitud de Acceso RECHAZADA - UNEMI",
        html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <h2 style="color: #003366;">Estimado/a ${nombreCompleto},</h2>
                <p>Lamentamos informarle que su solicitud de acceso temporal al campus ha sido <strong>RECHAZADA</strong> por el equipo administrativo.</p>
                
                <h3 style="color: #CC0000; border-bottom: 1px solid #eee; padding-bottom: 5px;">Motivo del Rechazo:</h3>
                <div style="background: #fef8f8; border-left: 5px solid #CC0000; padding: 10px 15px; margin-bottom: 20px;">
                    <p style="white-space: pre-wrap; margin: 0; font-size: 14px;">${razon}</p>
                </div>
                
                <p>Por favor, revise la razón y, si aplica, puede enviar una nueva solicitud con la información corregida.</p>
                <p>Atentamente,<br>Control de Acceso UniAccess UNEMI.</p>
            </div>
        `
    });

    console.log("Email de rechazo enviado: %s", info.messageId);
};
