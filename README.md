# Bot de WhatsApp para citas (Twilio + Claude)

Bot que contesta automáticamente por WhatsApp y coge citas para negocios como
peluquerías, dentistas, etc. Funciona así:

1. El cliente escribe por WhatsApp.
2. Twilio reenvía el mensaje a tu servidor (/webhook).
3. Claude interpreta el mensaje y decide qué falta por preguntar (servicio,
   fecha, hora, nombre).
4. Cuando están todos los datos, pide confirmación y guarda la cita.

## 1. Instalación

npm install
cp .env.example .env

Rellena .env con:
- Tus credenciales de Twilio (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
- Tu API key de Anthropic (ANTHROPIC_API_KEY)
- Los datos de tu negocio (nombre, servicios, horario)

## 2. Arrancar el servidor

npm start

Por defecto corre en http://localhost:3000. El webhook está en /webhook.

## 3. Exponer tu servidor a internet (para pruebas)

Twilio necesita una URL pública para enviarte los mensajes. Mientras
desarrollas, puedes usar ngrok (ngrok.com):

ngrok http 3000

Esto te da una URL tipo https://xxxx.ngrok-free.app

## 4. Configurar Twilio (Sandbox de WhatsApp)

1. Entra en la consola de Twilio (console.twilio.com) → Messaging → Try it out → Send a WhatsApp message (Sandbox).
2. Sigue las instrucciones para vincular tu WhatsApp personal al sandbox.
3. En "Sandbox settings", en el campo "WHEN A MESSAGE COMES IN", pon:
   https://xxxx.ngrok-free.app/webhook
   Método: HTTP POST.
4. Guarda. Ya puedes escribirle al número del sandbox y el bot te responderá.

## 5. Pasar a un número real de WhatsApp Business

Cuando quieras lanzarlo en producción:

1. Solicita acceso a la WhatsApp Business API con un número propio.
2. Configura ese número con la URL del webhook en producción (no ngrok).
3. Despliega server.js en un hosting (Render, Railway, un VPS, etc.).

## 6. Ver las citas guardadas

Las citas se guardan en data/appointments.json. También puedes verlas en:

GET /citas

## Estructura del proyecto

server.js   -> Servidor Express + webhook de Twilio
claude.js   -> Llamada a la API de Claude
store.js    -> Guardado de citas y sesiones (JSON)
package.json
.env.example
data/       -> se crea sola al arrancar el servidor
