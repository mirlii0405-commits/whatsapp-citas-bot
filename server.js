
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
const BUSINESS_ID = process.env.BUSINESS_ID || "demo";
const { MessagingResponse } = twilio.twiml;

app.post("/webhook", async (req, res) => {
  const mensajeUsuario = (req.body.Body || "").trim();
  const numeroCliente = req.body.From;

  const twiml = new MessagingResponse();

  try {
    if (!numeroCliente || !mensajeUsuario) {
      twiml.message("No he podido leer tu mensaje. ¿Puedes enviarlo de nuevo?");
      return res.type("text/xml").send(twiml.toString());
    }

    const session = getSession(numeroCliente, BUSINESS_ID);

    const resultado = await procesarMensaje({
      session,
      mensajeUsuario,
    });

    session.data = {
      ...session.data,
      ...limpiarNulos(resultado.datos || {}),
    };

    session.history.push({
      role: "user",
      content: mensajeUsuario,
    });

    session.history.push({
      role: "assistant",
      content: resultado.respuesta,
    });

    // Limitar el historial para evitar que crezca indefinidamente.
    session.history = session.history.slice(-12);

    let respuestaFinal = resultado.respuesta;

    if (resultado.cancelar) {
      // Todavía no cancelamos citas automáticamente:
      // primero debemos identificar qué cita quiere cancelar el cliente.
      respuestaFinal =
        "¿Qué cita quieres cancelar? Dime la fecha y la hora para ayudarte.";
      saveSession(numeroCliente, session, BUSINESS_ID);

      twiml.message(respuestaFinal);
      return res.type("text/xml").send(twiml.toString());
    }

    if (resultado.confirmar) {
      const { servicio, fecha, hora, nombre } = session.data;

      if (servicio && fecha && hora && nombre) {
        if (isSlotTaken(fecha, hora, BUSINESS_ID)) {
          respuestaFinal =
            "Ese horario ya está ocupado. Dime otra hora que te venga bien.";
          session.data.hora = null;

          saveSession(numeroCliente, session, BUSINESS_ID);
        } else {
          addAppointment({
            telefono: numeroCliente,
            servicio,
            fecha,
            hora,
            nombre,
            businessId: BUSINESS_ID,
          });

          respuestaFinal =
            `✅ ¡Listo, ${nombre}! Tu cita para "${servicio}" ` +
            `ha quedado confirmada el ${fecha} a las ${hora}.`;

          resetSession(numeroCliente, BUSINESS_ID);
        }
      } else {
        respuestaFinal =
          "Todavía me falta algún dato para confirmar la cita. ¿Me ayudas a completarlo?";
        saveSession(numeroCliente, session, BUSINESS_ID);
      }
    } else if (!resultado.cancelar) {
      saveSession(numeroCliente, session, BUSINESS_ID);
    }

    twiml.message(respuestaFinal);
    return res.type("text/xml").send(twiml.toString());
  } catch (error) {
    console.error(
      "Error procesando mensaje:",
      error?.response?.data || error
    );

    twiml.message(
      "Tenemos un problema técnico. Inténtalo de nuevo dentro de unos minutos."
    );

    return res.type("text/xml").send(twiml.toString());
  }
});

// Endpoint de prueba. No lo dejaremos público en producción.
app.get("/citas", (req, res) => {
  const token = process.env.ADMIN_TOKEN;

  if (!token || req.get("authorization") !== `Bearer ${token}`) {
    return res.status(401).json({ error: "No autorizado" });
  }

  res.json(getAppointments(BUSINESS_ID));
});

function limpiarNulos(obj) {
  const salida = {};

  for (const clave in obj) {
    if (
      obj[clave] !== null &&
      obj[clave] !== undefined &&
      obj[clave] !== ""
    ) {
      salida[clave] = obj[clave];
    }
  }

  return salida;
}

app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
