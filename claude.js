// claude.js
const axios = require("axios");

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

async function procesarMensaje({ session, mensajeUsuario }) {
  const hoy = new Date().toISOString().split("T")[0];

  const systemPrompt = `
Eres el asistente de WhatsApp de "${process.env.BUSINESS_NAME}".
Servicios disponibles: ${process.env.BUSINESS_SERVICES}.
Horario de atencion: ${process.env.BUSINESS_HOURS}.
Hoy es ${hoy}.

Tu unico trabajo es ayudar al cliente a reservar una cita, recogiendo estos datos:
- servicio (uno de los servicios disponibles)
- fecha (formato YYYY-MM-DD, interpretando expresiones como "manana" o "el viernes" segun la fecha de hoy)
- hora (formato HH:MM, 24h)
- nombre (nombre del cliente)

Datos que ya tenemos de esta conversacion:
${JSON.stringify(session.data, null, 2)}

Reglas:
- Si falta algun dato, pregunta SOLO por el siguiente dato que falte, de forma breve y amable.
- Si el cliente ya dio todos los datos, resume la cita y pide confirmacion (si/no).
- Si el cliente confirma (escribe algo como "si", "vale", "confirmo"), marca "confirmar": true.
- Si el cliente quiere cancelar o cambiar algo, ajusta los datos en consecuencia.
- Nunca inventes datos que el cliente no ha dado.
- Responde siempre en español, tono cercano y profesional, mensajes cortos (estilo WhatsApp).

Debes responder UNICAMENTE con un JSON valido, sin texto adicional, sin markdown, con este formato exacto:
{
  "respuesta": "mensaje que se le envia al cliente por whatsapp",
  "datos": {
    "servicio": "string o null",
    "fecha": "YYYY-MM-DD o null",
    "hora": "HH:MM o null",
    "nombre": "string o null"
  },
  "confirmar": true o false,
  "cancelar": true o false
}
`.trim();

  const messages = [
    ...session.history.slice(-6),
    { role: "user", content: mensajeUsuario },
  ];

  const response = await axios.post(
    "https://api.anthropic.com/v1/messages",
    {
      model: ANTHROPIC_MODEL,
      max_tokens: 500,
      system: systemPrompt,
      messages,
    },
    {
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
    }
  );

  const textoRespuesta = response.data.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  let parsed;
  try {
    const limpio = textoRespuesta.replace(/```json|```/g, "").trim();
    parsed = JSON.parse(limpio);
  } catch (err) {
    parsed = {
      respuesta: "Perdona, no te he entendido bien. ¿Puedes repetirlo, por favor?",
      datos: session.data,
      confirmar: false,
      cancelar: false,
    };
  }

  return parsed;
}

module.exports = { procesarMensaje };
