
const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "data");
const APPOINTMENTS_FILE = path.join(DATA_DIR, "appointments.json");
const SESSIONS_FILE = path.join(DATA_DIR, "sessions.json");

function ensureFiles() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(APPOINTMENTS_FILE)) {
    fs.writeFileSync(APPOINTMENTS_FILE, "[]");
  }

  if (!fs.existsSync(SESSIONS_FILE)) {
    fs.writeFileSync(SESSIONS_FILE, "{}");
  }
}

function readJSON(file) {
  ensureFiles();
  return JSON.parse(fs.readFileSync(file, "utf-8"));
}

function writeJSON(file, data) {
  ensureFiles();
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

const DEFAULT_BUSINESS_ID = process.env.BUSINESS_ID || "demo";

function getAppointments(businessId = DEFAULT_BUSINESS_ID) {
  return readJSON(APPOINTMENTS_FILE).filter(
    (appointment) =>
      (appointment.businessId || DEFAULT_BUSINESS_ID) === businessId
  );
}

function addAppointment(appointment) {
  const appointments = readJSON(APPOINTMENTS_FILE);

  const newAppointment = {
    id:
      Date.now().toString(36) +
      Math.random().toString(36).slice(2, 9),
    createdAt: new Date().toISOString(),
    status: "confirmada",
    ...appointment,
    businessId: appointment.businessId || DEFAULT_BUSINESS_ID,
  };

  appointments.push(newAppointment);
  writeJSON(APPOINTMENTS_FILE, appointments);

  return newAppointment;
}

function isSlotTaken(date, time, businessId = DEFAULT_BUSINESS_ID) {
  return getAppointments(businessId).some(
    (appointment) =>
      appointment.fecha === date &&
      appointment.hora === time &&
      appointment.status !== "cancelada"
  );
}

function cancelAppointment(id, businessId = DEFAULT_BUSINESS_ID) {
  const appointments = readJSON(APPOINTMENTS_FILE);

  const appointment = appointments.find(
    (item) =>
      item.id === id &&
      (item.businessId || DEFAULT_BUSINESS_ID) === businessId &&
      item.status !== "cancelada"
  );

  if (!appointment) return null;

  appointment.status = "cancelada";
  appointment.cancelledAt = new Date().toISOString();

  writeJSON(APPOINTMENTS_FILE, appointments);

  return appointment;
}

function getSession(phone, businessId = DEFAULT_BUSINESS_ID) {
  const sessions = readJSON(SESSIONS_FILE);
  const key = `${businessId}:${phone}`;

  return (
    sessions[key] || {
      phone,
      businessId,
      history: [],
      data: {
        servicio: null,
        fecha: null,
        hora: null,
        nombre: null,
      },
      stage: "inicio",
    }
  );
}

function saveSession(phone, session, businessId = DEFAULT_BUSINESS_ID) {
  const sessions = readJSON(SESSIONS_FILE);
  const key = `${businessId}:${phone}`;

  sessions[key] = { ...session, businessId };
  writeJSON(SESSIONS_FILE, sessions);
}

function resetSession(phone, businessId = DEFAULT_BUSINESS_ID) {
  const sessions = readJSON(SESSIONS_FILE);
  delete sessions[`${businessId}:${phone}`];
  writeJSON(SESSIONS_FILE, sessions);
}

module.exports = {
  getAppointments,
  addAppointment,
  isSlotTaken,
  cancelAppointment,
  getSession,
  saveSession,
  resetSession,
};
