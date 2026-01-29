const express = require('express');
const { google } = require('googleapis');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// --- DEBUG DA CHAVE DE SEGURANÇA ---
const keyPath = path.join(__dirname, '../credentials.json');
if (!fs.existsSync(keyPath)) {
    console.error("❌ ERRO: O arquivo credentials.json não foi encontrado!");
} else {
    console.log("✅ Arquivo de chave encontrado com sucesso.");
}
// -----------------------------------

const auth = new google.auth.GoogleAuth({
  keyFile: keyPath,
  scopes: ['https://www.googleapis.com/auth/calendar'],
});

const calendar = google.calendar({ version: 'v3', auth });
const CALENDAR_ID = 'agenda-clinica@agenda-clinica-484517.iam.gserviceaccount.com'; // Mantenha seu e-mail correto aqui

// 1. Rota para Listar Eventos
app.get('/api/eventos', async (req, res) => {
  try {
    const response = await calendar.events.list({
      calendarId: CALENDAR_ID,
      timeMin: new Date().toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });
    console.log(`🔎 Busca realizada: ${response.data.items.length} eventos encontrados.`);
    res.json(response.data.items);
  } catch (error) {
    console.error('❌ Erro ao buscar eventos:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// 2. Rota para Agendar
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
    console.log(`✅ Novo agendamento criado: ${terapeuta} - ${resumo}`);
    res.status(201).json(response.data);
  } catch (error) {
    console.error('❌ Erro ao agendar:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// 3. Rota para Cancelar
app.delete('/api/agendar/:id', async (req, res) => {
  const eventId = req.params.id;
  try {
    await calendar.events.delete({
      calendarId: CALENDAR_ID,
      eventId: eventId,
    });
    console.log(`🗑️ Agendamento cancelado (ID: ${eventId})`);
    res.status(200).json({ message: "Cancelado com sucesso." });
  } catch (error) {
    console.error('❌ Erro ao cancelar:', error.message);
    res.status(500).json({ error: error.message });
  }
});
// 2. Rota para Agendar (Incluindo Telefone na descrição)
app.post('/api/agendar', async (req, res) => {
  const { resumo, terapeuta, telefone, inicio, fim } = req.body; // Recebe telefone

  try {
    const event = {
      summary: `${terapeuta} - ${resumo}`, 
      description: `Telefone/Obs: ${telefone || 'Não informado'}`, // Salva aqui!
      start: { dateTime: inicio },
      end: { dateTime: fim },
    };

    const response = await calendar.events.insert({
      calendarId: CALENDAR_ID,
      resource: event,
    });
    console.log(`✅ Agendado: ${terapeuta} - ${resumo}`);
    res.status(201).json(response.data);
  } catch (error) {
    console.error('❌ Erro ao agendar:', error.message);
    res.status(500).json({ error: error.message });
  }
});
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`🚀 Servidor da clínica rodando na porta ${PORT}`));