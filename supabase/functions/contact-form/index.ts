// Importa la función 'serve' para crear el servidor de la función.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// --- CONFIGURACIÓN ---
// Cambia esto al correo donde quieres recibir las cotizaciones.
const TO_EMAIL = "ventas@transportesgm.mx"; 
// El nombre que aparecerá como remitente.
const FROM_NAME = "Transportes GM - Sitio Web";

serve(async (req: Request) => { // Añadido el tipo 'Request' para mayor claridad
  // Las Edge Functions necesitan manejar una solicitud 'OPTIONS' para CORS.
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*", // Permite llamadas desde cualquier dominio
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    // Extrae los datos del formulario que envió la aplicación.
    const formData = await req.json();
    const { name, email, phone, company, message } = formData;

    // Validación básica anti-abuso (el endpoint es público y sin auth).
    const corsJson = {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    };
    const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
    const nameV = str(name, 120);
    const emailV = str(email, 200);
    const messageV = str(message, 5000);
    const phoneV = str(phone, 40);
    const companyV = str(company, 200);
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailV);
    if (!nameV || !emailOk || !messageV) {
      return new Response(
        JSON.stringify({ error: "Datos inválidos: nombre, email y mensaje son obligatorios." }),
        { headers: corsJson, status: 400 },
      );
    }

    // Construye el cuerpo del correo de forma legible.
    const emailBody = `
      Nueva Solicitud de Cotización
      --------------------------------
      Nombre: ${nameV}
      Email: ${emailV}
      Teléfono: ${phoneV || 'No especificado'}
      Empresa: ${companyV || 'No especificada'}
      --------------------------------
      Mensaje:
      ${messageV}
    `;

    // Obtiene la clave secreta de Resend que guardaremos en Supabase.
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("La clave de API de Resend no está configurada.");
    }

    // Llama a la API de Resend para enviar el correo.
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `${FROM_NAME} <onboarding@resend.dev>`, // Resend usa este 'from' por defecto en el plan gratuito.
        to: TO_EMAIL,
        subject: `Nueva Cotización de: ${nameV}`,
        text: emailBody,
        reply_to: emailV, // Permite que al darle "Responder", se responda al cliente.
      }),
    });

    const resendData = await resendResponse.json();

    // Si Resend devuelve un error, lo capturamos.
    if (resendData.error) {
      throw new Error(resendData.error.message);
    }

    // Si todo sale bien, enviamos una respuesta de éxito a la aplicación.
    return new Response(JSON.stringify({ message: "Correo enviado" }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      status: 200,
    });

  } catch (error) {
    // Si algo falla, enviamos una respuesta de error.
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      status: 500,
    });
  }
});

