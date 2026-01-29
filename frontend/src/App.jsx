import React, { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import axios from 'axios';
import './App.css';

function App() {
  const [events, setEvents] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Dados do formulário
  const [sessionName, setSessionName] = useState('');
  const [therapistName, setTherapistName] = useState('');
  const [patientPhone, setPatientPhone] = useState(''); 
  const [startTime, setStartTime] = useState(''); 
  const [endTime, setEndTime] = useState('');     
  
  // Controle de seleção
  const [selectedSlot, setSelectedSlot] = useState(null); 
  const [selectedEvent, setSelectedEvent] = useState(null); 

  // Busca eventos no Backend
  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get('http://localhost:3001/api/eventos');
      const formattedEvents = response.data.map(event => ({
        id: event.id, 
        title: event.summary,
        start: event.start.dateTime || event.start.date,
        end: event.end.dateTime || event.end.date,
        extendedProps: {
          description: event.description || '' // O telefone fica salvo aqui
        }
      }));
      setEvents(formattedEvents);
    } catch (error) {
      console.error("Erro ao buscar eventos:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  // 1. Lógica ao clicar num espaço vazio (CRIAR)
  const handleDateSelect = (selectInfo) => {
    setSelectedSlot(selectInfo);
    setSelectedEvent(null);
    setSessionName('');
    setTherapistName('');
    setPatientPhone('');
    
    // Preenche automaticamente o horário clicado
    const toTime = (date) => date.toTimeString().slice(0, 5);
    setStartTime(toTime(selectInfo.start));
    setEndTime(toTime(selectInfo.end));

    setIsModalOpen(true);
  };

  // 2. Lógica ao clicar num evento existente (VISUALIZAR / DELETAR)
  const handleEventClick = (clickInfo) => {
    const event = clickInfo.event;
    setSelectedEvent(event);
    setSelectedSlot(null);
    
    // Tenta separar "Terapeuta - Paciente" pelo traço
    const titleParts = event.title.split(' - ');
    setTherapistName(titleParts[0] || '');
    setSessionName(titleParts[1] || event.title);
    setPatientPhone(event.extendedProps.description || 'Não informado');
    
    setIsModalOpen(true);
  };

  // Salvar novo agendamento
  const handleSaveEvent = async () => {
    if (sessionName && therapistName && selectedSlot && startTime && endTime) {
      setIsLoading(true);
      try {
        const dateBase = selectedSlot.startStr.split('T')[0];
        const startIso = new Date(`${dateBase}T${startTime}`).toISOString();
        const endIso = new Date(`${dateBase}T${endTime}`).toISOString();

        await axios.post('http://localhost:3001/api/agendar', {
          resumo: sessionName,
          terapeuta: therapistName,
          telefone: patientPhone,
          inicio: startIso,
          fim: endIso,
        });
        closeModal();
        fetchEvents();
      } catch (error) {
        alert("Erro ao salvar: " + error.message);
        setIsLoading(false);
      }
    } else {
      alert("Por favor, preencha os campos obrigatórios (*).");
    }
  };

  // Deletar agendamento
  const handleDeleteEvent = async () => {
    if (window.confirm(`Tem certeza que deseja cancelar a sessão de ${selectedEvent.title}?`)) {
      setIsLoading(true);
      try {
        await axios.delete(`http://localhost:3001/api/agendar/${selectedEvent.id}`);
        closeModal();
        fetchEvents();
      } catch (error) {
        alert("Erro ao cancelar: " + error.message);
        setIsLoading(false);
      }
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedSlot(null);
    setSelectedEvent(null);
  };

  return (
    <div className="main-layout">
      {/* TELA DE CARREGAMENTO */}
      {isLoading && (
        <div className="loading-overlay-global">
          <div className="spinner"></div>
          <p>Processando...</p>
        </div>
      )}

      <header className="header">
        <h1>Agenda da Clínica</h1>
        <p>Toque no horário para marcar ou no evento para cancelar</p>
      </header>

      <div className="calendar-container">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView={window.innerWidth < 768 ? "timeGridDay" : "timeGridWeek"}
          locale="pt-br"
          
          // Tradução dos botões
          buttonText={{
            today: 'Hoje',
            month: 'Mês',
            week: 'Semana',
            day: 'Dia',
            list: 'Lista'
          }}
          
          // Formatação Brasileira (24h)
          slotLabelFormat={{ hour: '2-digit', minute: '2-digit', omitZeroMinute: false, meridiem: false }}
          eventTimeFormat={{ hour: '2-digit', minute: '2-digit', meridiem: false }}

          // Responsividade da Barra de Ferramentas
          headerToolbar={{
            left: window.innerWidth < 768 ? 'prev,next' : 'prev,next today',
            center: 'title',
            right: window.innerWidth < 768 ? 'dayGridMonth,timeGridDay' : 'dayGridMonth,timeGridWeek'
          }}
          
          selectable={true}
          select={handleDateSelect}
          eventClick={handleEventClick}
          events={events}
          allDaySlot={false}
          slotMinTime="07:00:00"
          slotMaxTime="20:00:00"
          height="auto" // Ajuste automático de altura
          handleWindowResize={true}
        />
      </div>

      {/* MODAL (GAVETA NO MOBILE) */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>{selectedEvent ? 'Detalhes do Agendamento' : 'Novo Agendamento'}</h3>
            
            <p className="modal-time">
              {selectedEvent 
                ? '📅 Sessão Agendada' 
                : `📅 ${new Date(selectedSlot?.startStr).toLocaleDateString('pt-BR')}`
              }
            </p>

            {selectedEvent ? (
              // MODO VISUALIZAÇÃO
              <div className="event-details-view">
                <p><strong>Terapeuta:</strong> {therapistName}</p>
                <p><strong>Paciente:</strong> {sessionName}</p>
                <p><strong>Telefone:</strong> {patientPhone}</p>
                <p><strong>Horário:</strong> {selectedEvent.start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {selectedEvent.end.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
              </div>
            ) : (
              // MODO EDIÇÃO
              <>
                <div className="time-inputs-row">
                  <div className="input-group small">
                    <label>Início</label>
                    <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="modal-input" />
                  </div>
                  <div className="input-group small">
                    <label>Fim</label>
                    <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="modal-input" />
                  </div>
                </div>

                <div className="input-group">
                  <label>Nome da Sessão / Paciente *</label>
                  <input type="text" placeholder="Ex: Consulta João" value={sessionName} onChange={(e) => setSessionName(e.target.value)} className="modal-input" autoFocus />
                </div>
                
                <div className="input-group">
                  <label>Telefone / WhatsApp</label>
                  <input type="tel" placeholder="Ex: (61) 99999-9999" value={patientPhone} onChange={(e) => setPatientPhone(e.target.value)} className="modal-input" />
                </div>

                <div className="input-group">
                  <label>Nome do Terapeuta *</label>
                  <input type="text" placeholder="Ex: Dra. Maria" value={therapistName} onChange={(e) => setTherapistName(e.target.value)} className="modal-input" />
                </div>
              </>
            )}

            <div className="modal-actions">
              <button onClick={closeModal} className="btn-cancel">Fechar</button>
              {selectedEvent ? (
                <button onClick={handleDeleteEvent} className="btn-delete">Cancelar Sessão</button>
              ) : (
                <button onClick={handleSaveEvent} className="btn-save">Confirmar</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;