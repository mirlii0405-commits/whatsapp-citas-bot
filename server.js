// server.js
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const twilio = require("twilio");

const { procesarMensaje } = require("./claude");
const {
  addAppointment,
  isSlotTaken,
  getSession,
  saveSession,
  resetSession,
  getAppointments,
} = require("./store");

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;
const { MessagingResponse } = twilio.twiml;

app.post("/webhook", async (req, res) => {
  const mensajeUsuario = (req.body.Body || "").trim();
  const numeroCliente = req.body.From;

  const twiml = new MessagingResponse();

  try {
    const session = getSession(numeroCliente);
    const resultado = await procesarMensaje({ session, mensajeUsuario });

    session.data = { ...session.data, ...limpiarNulos(resultado.datos) };
    session.history.push({ role: "user", content: mensajeUsuario });
    session.history.push({ role: "assistant", content: resultado.respuesta });

    let respuestaFinal = resultado.respuesta;

    if (resultado.cancelar) {
      resetSession(numeroCliente);
      respuestaFinal = "De acuerdo, he cancelado la reserva. Si quieres, podemos empezar de nuevo cuando quieras 🙂";
      twiml.message(respuestaFinal);
      res.type("text/xml").send(twiml.toString());
      return;
    }

    if (resultado.confirmar) {
      const { servicio, fecha, hora, nombre } = session.data;

      if (servicio && fecha && hora && nombre) {
        if (isSlotTaken(fecha, hora)) {
          respuestaFinal = "Vaya, ese horario se acaba de ocupar. ¿Me dices otra hora que te venga bien?";
          session.data.hora = null;
        } else {
          const cita = addAppointment({
            telefono: numeroCliente,
            servicio,
            fecha,
            hora,
            nombre,
          });
          respuestaFinal = `✅ ¡Listo, ${nombre}! Tu cita para "${servicio}" ha quedado confirmada el ${fecha} a las ${hora}. Te esperamos.`;
          resetSession(numeroCliente);
        }
      }
    }

    if (!resultado.confirmar && !resultado.cancelar) {
      saveSession(numeroCliente, session);
    }

    twiml.message(respuestaFinal);
    res.type("text/xml").send(twiml.toString());
  } catch (error) {
    console.error("Error procesando mensaje:", error?.response?.data || error);
    twiml.message("Estamos teniendo un problema tecnico ahora mismo. Por favor, intentalo de nuevo en unos minutos o llamanos directamente.");
    res.type("text/xml").send(twiml.toString());
  }
});

app.get("/citas", (req, res) => {
  res.json(getAppointments());
});

function limpiarNulos(obj) {
  const out = {};
  for (const k in obj) {
    if (obj[k] !== null && obj[k] !== undefined && obj[k] !== "") {
      out[k] = obj[k];
    }
  }
  return out;
}

app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
  console.log(`Webhook de Twilio: http://localhost:${PORT}/webhook`);
});
