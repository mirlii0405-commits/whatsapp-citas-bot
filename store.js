// store.js
const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "data");
const APPOINTMENTS_FILE = path.join(DATA_DIR, "appointments.json");
const SESSIONS_FILE = path.join(DATA_DIR, "sessions.json");

function ensureFiles() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(APPOINTMENTS_FILE)) fs.writeFileSync(APPOINTMENTS_FILE, "[]");
  if (!fs.existsSync(SESSIONS_FILE)) fs.writeFileSync(SESSIONS_FILE, "{}");
}

function readJSON(file) {
  ensureFiles();
  return JSON.parse(fs.readFileSync(file, "utf-8"));
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function getAppointments() {
  return readJSON(APPOINTMENTS_FILE);
}

function addAppointment(appointment) {
  const appointments = getAppointments();
  const newAppointment = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    createdAt: new Date().toISOString(),
    status: "confirmada",
    ...appointment,
  };
  appointments.push(newAppointment);
  writeJSON(APPOINTMENTS_FILE, appointments);
  return newAppointment;
}
function isSlotTaken(date, time) {
  const appointments = getAppointments();
  return appointments.some(
    (a) => a.fecha === date && a.hora === time && a.status !== "cancelada"
  );
}



function getSession(phone) {
  const sessions = readJSON(SESSIONS_FILE);
  return (
    sessions[phone] || {
      phone,
      history: [],
      data: { servicio: null, fecha: null, hora: null, nombre: null },
      stage: "inicio",
    }
  );
}

function saveSession(phone, session) {
  const sessions = readJSON(SESSIONS_FILE);
  sessions[phone] = session;
  writeJSON(SESSIONS_FILE, sessions);
}

function resetSession(phone) {
  const sessions = readJSON(SESSIONS_FILE);
  delete sessions[phone];
  writeJSON(SESSIONS_FILE, sessions);
}

module.exports = {
  getAppointments,
  addAppointment,
  isSlotTaken,
  getSession,
  saveSession,
  resetSession,
};
