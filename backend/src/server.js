const express = require('express');
const { google } = require('googleapis');
const path = require('path');
const cors = require('cors');
// const fs = require('fs'); // Não vamos mais gravar arquivo em disco
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// --- LÓGICA ESPECIAL PARA VERCEL (Credenciais via Variável) ---
// Em vez de ler arquivo, lemos a variável de ambiente e passamos o objeto direto
let authConfig = {};

if (process.env.GOOGLE_CREDENTIALS) {
  // Se estiver na Vercel ou tiver a variável, usa o JSON direto
  const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
  authConfig = {
    credentials,
    scopes: ['https://www.googleapis.com/auth/calendar'],
  };
} else {
  // Fallback para local (se ainda quiser usar arquivo no PC)
  authConfig = {
    keyFile: path.join(__dirname, '../credentials.json'),
    scopes: ['https://www.googleapis.com/auth/calendar'],
  };
}

const auth = new google.auth.GoogleAuth(authConfig);
const calendar = google.calendar({ version: 'v3', auth });

// Pega o ID da variável ou usa um fallback (Cuidado com dados sensíveis no código)
const CALENDAR_ID = process.env.CALENDAR_ID || 'agenda-clinica@agenda-clinica-484517.iam.gserviceaccount.com';

// Rota 1: Listar
app.get('/api/eventos', async (req, res) => {
  try {
    const response = await calendar.events.list({
      calendarId: CALENDAR_ID,
      timeMin: new Date().toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });
    res.json(response.data.items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Rota 2: Agendar
app.post('/api/agendar', async (req, res) => {
  const { resumo, terapeuta, inicio, fim } = req.body;
  try {
    const event = {
      summary: `${terapeuta} - ${resumo}`, 
      start: { dateTime: inicio },
      end: { dateTime: fim },
    };
    const response = await calendar.events.insert({
      calendarId: CALENDAR_ID,
      resource: event,
    });
    res.status(201).json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Rota 3: Cancelar
app.delete('/api/agendar/:id', async (req, res) => {
  try {
    await calendar.events.delete({
      calendarId: CALENDAR_ID,
      eventId: req.params.id,
    });
    res.status(200).json({ message: "Cancelado." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- EXPORTAÇÃO PARA VERCEL ---
const PORT = process.env.PORT || 3001;

// Só roda o app.listen se NÃO estiver na Vercel (ambiente local)
if (require.main === module) {
    app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));
}

// Exporta o app para a Vercel transformar em Serverless Function
module.exports = app;