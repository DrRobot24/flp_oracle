import React, { useState, useMemo, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, TrendingUp, Trophy, Flame, Eye, Calendar, Timer } from 'lucide-react';

const SchedinaTarget = () => {
  const schedina = {
    nome: "🎯 SCHEDINA TARGET - Le Tue Certezze",
    eventi: [
      { 
        nome: "Napoli - Sassuolo", 
        segno: "1", 
        quota: 1.47, 
        data: "17/01/2026", 
        ora: "18:00",
        motivazione: "Napoli in casa, Sassuolo in Serie B - Favorito nettissimo",
        sicurezza: 95
      },
      { 
        nome: "Milan - Lecce", 
        segno: "1", 
        quota: 1.30, 
        data: "18/01/2026", 
        ora: "20:45",
        motivazione: "Milan a San Siro contro squadra di bassa classifica",
        sicurezza: 90
      },
      { 
        nome: "Lens - Auxerre", 
        segno: "1", 
        quota: 1.43, 
        data: "17/01/2026", 
        ora: "17:00",
        motivazione: "Lens forte in casa, presente in tutte le tue schedine",
        sicurezza: 85
      },
      { 
        nome: "Benevento - Casarano", 
        segno: "1", 
        quota: 1.24, 
        data: "17/01/2026", 
        ora: "14:30",
        motivazione: "Benevento tecnicamente superiore in casa",
        sicurezza: 88
      },
      { 
        nome: "Chelsea - Brentford", 
        segno: "MULTIGOL CASA 1-3", 
        quota: 1.35, 
        data: "17/01/2026", 
        ora: "16:00",
        motivazione: "Chelsea attacca sempre in casa, Brentford subisce",
        sicurezza: 82
      },
      { 
        nome: "Atletico Madrid - Alavés", 
        segno: "1", 
        quota: 1.35, 
        data: "18/01/2026", 
        ora: "16:15",
        motivazione: "Atletico in casa contro ultima in classifica",
        sicurezza: 87
      },
      { 
        nome: "Borussia Dortmund - St. Pauli", 
        segno: "1", 
        quota: 1.33, 
        data: "17/01/2026", 
        ora: "15:30",
        motivazione: "Borussia schiacciasassi, St. Pauli neo-promossa",
        sicurezza: 90
      },
      { 
        nome: "Senegal - Marocco", 
        segno: "2", 
        quota: 1.62, 
        data: "18/01/2026", 
        ora: "20:00",
        motivazione: "Marocco favorito in Coppa d'Africa, in tutte le schedine",
        sicurezza: 80
      },
      { 
        nome: "Siracusa - Cerignola", 
        segno: "1", 
        quota: 2.27, 
        data: "18/01/2026", 
        ora: "14:30",
        motivazione: "🔥 VAI ALLO STADIO! Siracusa in casa, quota interessante",
        sicurezza: 75,
        speciale: true
      },
      { 
        nome: "Ajax - Eagles", 
        segno: "1", 
        quota: 1.47, 
        data: "17/01/2026", 
        ora: "16:30",
        motivazione: "Ajax in casa in Eredivisie, sempre dominante",
        sicurezza: 85
      }
    ]
  };

  const [statoEventi, setStatoEventi] = useState({});
  const [puntata, setPuntata] = useState(100);
  const [timeNow, setTimeNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const calcolaCountdown = (dataStr, oraStr) => {
    const [giorno, mese, anno] = dataStr.split('/');
    const [ore, minuti] = oraStr.split(':');
    const dataPartita = new Date(anno, mese - 1, giorno, ore, minuti);
    const diff = dataPartita - timeNow;
    
    if (diff < 0) return { passata: true, ore: 0, minuti: 0, secondi: 0 };
    
    const oreRimanenti = Math.floor(diff / (1000 * 60 * 60));
    const minutiRimanenti = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secondiRimanenti = Math.floor((diff % (1000 * 60)) / 1000);
    
    return { passata: false, ore: oreRimanenti, minuti: minutiRimanenti, secondi: secondiRimanenti };
  };

  const toggleStato = (idx) => {
    setStatoEventi(prev => ({
      ...prev,
      [idx]: prev[idx] === 'vinto' ? 'in_attesa' : prev[idx] === 'perso' ? 'vinto' : prev[idx] === 'in_attesa' ? 'perso' : 'vinto'
    }));
  };

  const calcolaStato = () => {
    let quotaCorrente = 1;
    let quotaRimanente = 1;
    let eventiVinti = 0;
    let eventiPersi = 0;
    let eventiInAttesa = 0;

    schedina.eventi.forEach((evento, idx) => {
      const stato = statoEventi[idx];
      if (stato === 'vinto') {
        quotaCorrente *= evento.quota;
        eventiVinti++;
      } else if (stato === 'perso') {
        eventiPersi++;
      } else {
        quotaRimanente *= evento.quota;
        eventiInAttesa++;
      }
    });

    const quotaTotale = schedina.eventi.reduce((acc, e) => acc * e.quota, 1);
    const vincitaPotenziale = puntata * quotaTotale;
    const vincitaParziale = puntata * quotaCorrente * quotaRimanente;
    const almenoUnoPerso = eventiPersi > 0;
    const tuttiVinti = eventiVinti === schedina.eventi.length;

    return {
      quotaTotale,
      vincitaPotenziale,
      vincitaParziale: almenoUnoPerso ? 0 : vincitaParziale,
      eventiVinti,
      eventiPersi,
      eventiInAttesa,
      stato: almenoUnoPerso ? 'persa' : tuttiVinti ? 'vinta' : 'in_corso'
    };
  };

  const stato = calcolaStato();

  // Raggruppa eventi per data
  const eventiPerData = useMemo(() => {
    const gruppi = {};
    schedina.eventi.forEach((evento, idx) => {
      if (!gruppi[evento.data]) {
        gruppi[evento.data] = [];
      }
      gruppi[evento.data].push({ ...evento, idx });
    });
    return Object.entries(gruppi).sort((a, b) => a[0].localeCompare(b[0]));
  }, []);

  const mediaSicurezza = useMemo(() => {
    return (schedina.eventi.reduce((acc, e) => acc + e.sicurezza, 0) / schedina.eventi.length).toFixed(1);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-6xl mx-auto">
        
        {/* HEADER */}
        <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 backdrop-blur-lg rounded-2xl p-6 mb-6 border-2 border-yellow-500/50">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
                <Trophy className="text-yellow-400" />
                {schedina.nome}
              </h1>
              <p className="text-yellow-200 text-lg">
                10 partite selezionate dalle tue 3 schedine originali
              </p>
              <div className="flex items-center gap-4 mt-3">
                <div className="bg-green-600/30 rounded-lg px-3 py-1">
                  <span className="text-green-200 text-sm">Sicurezza Media: </span>
                  <span className="text-white font-bold text-lg">{mediaSicurezza}%</span>
                </div>
                <div className="bg-blue-600/30 rounded-lg px-3 py-1 flex items-center gap-2">
                  <Eye className="text-blue-300" size={16} />
                  <span className="text-white text-sm font-semibold">Include Siracusa (allo stadio!)</span>
                </div>
              </div>
            </div>
            <Flame className="text-orange-400" size={64} />
          </div>
        </div>

        {/* CONTROLLI PUNTATA */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 mb-6 border border-white/20">
          <h2 className="text-xl font-bold text-white mb-4">💰 Imposta la tua Puntata</h2>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="10"
              max="500"
              step="10"
              value={puntata}
              onChange={(e) => setPuntata(Number(e.target.value))}
              className="flex-1 h-2 bg-blue-600 rounded-lg appearance-none cursor-pointer"
            />
            <div className="bg-blue-600 rounded-lg px-6 py-3 min-w-[120px] text-center">
              <div className="text-blue-200 text-xs">Puntata</div>
              <div className="text-white text-2xl font-bold">€{puntata}</div>
            </div>
          </div>
        </div>

        {/* STATISTICHE LIVE */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className={`rounded-xl p-4 border-2 ${
            stato.stato === 'vinta' ? 'bg-green-600/30 border-green-500' :
            stato.stato === 'persa' ? 'bg-red-600/30 border-red-500' :
            'bg-blue-600/30 border-blue-500'
          }`}>
            <div className="text-white/80 text-sm">Quota Totale</div>
            <div className="text-white text-3xl font-bold">{stato.quotaTotale.toFixed(2)}</div>
          </div>
          
          <div className="bg-green-600/30 rounded-xl p-4 border-2 border-green-500">
            <div className="text-green-200 text-sm">Vincita Potenziale</div>
            <div className="text-white text-3xl font-bold">€{stato.vincitaPotenziale.toFixed(0)}</div>
          </div>
          
          <div className={`rounded-xl p-4 border-2 ${
            stato.stato === 'persa' ? 'bg-red-600/30 border-red-500' : 'bg-purple-600/30 border-purple-500'
          }`}>
            <div className="text-purple-200 text-sm">Vincita Progressiva</div>
            <div className="text-white text-3xl font-bold">€{stato.vincitaParziale.toFixed(0)}</div>
          </div>
          
          <div className="bg-orange-600/30 rounded-xl p-4 border-2 border-orange-500">
            <div className="text-orange-200 text-sm">Eventi</div>
            <div className="text-white text-xl font-bold">
              ✅ {stato.eventiVinti} | ⏳ {stato.eventiInAttesa} | ❌ {stato.eventiPersi}
            </div>
          </div>
        </div>

        {/* STATUS BANNER */}
        {stato.stato === 'vinta' && (
          <div className="bg-green-600 rounded-xl p-6 mb-6 text-center animate-pulse">
            <div className="text-white text-3xl font-bold">
              🎉 HAI VINTO €{stato.vincitaPotenziale.toFixed(2)}! 🎉
            </div>
          </div>
        )}

        {stato.stato === 'persa' && (
          <div className="bg-red-600 rounded-xl p-6 mb-6 text-center">
            <div className="text-white text-2xl font-bold">
              ❌ Schedina Persa - Ritenta!
            </div>
          </div>
        )}

        {/* CRONOLOGIA EVENTI */}
        <div className="space-y-6">
          {eventiPerData.map(([data, eventi]) => (
            <div key={data} className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
              <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <Calendar className="text-blue-400" />
                {data === "17/01/2026" ? "📅 VENERDÌ 17 GENNAIO 2026" : "📅 SABATO 18 GENNAIO 2026"}
              </h3>
              
              <div className="space-y-3">
                {eventi.sort((a, b) => a.ora.localeCompare(b.ora)).map((evento) => {
                  const statoEvento = statoEventi[evento.idx] || 'in_attesa';
                  const countdown = calcolaCountdown(evento.data, evento.ora);
                  
                  return (
                    <div
                      key={evento.idx}
                      onClick={() => toggleStato(evento.idx)}
                      className={`p-4 rounded-lg cursor-pointer transition-all border-2 ${
                        statoEvento === 'vinto' ? 'bg-green-500/30 border-green-500' :
                        statoEvento === 'perso' ? 'bg-red-500/30 border-red-500' :
                        'bg-white/5 border-white/20 hover:border-white/40'
                      } ${evento.speciale ? 'ring-4 ring-orange-500' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-white font-bold text-xl">{evento.nome}</span>
                            {evento.speciale && (
                              <span className="bg-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                                <Eye size={14} />
                                ALLO STADIO!
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-4 mb-2 flex-wrap">
                            <span className="text-blue-300 font-semibold">
                              🕐 {evento.ora}
                            </span>
                            <span className="text-yellow-300 font-bold">
                              {evento.segno} @ {evento.quota.toFixed(2)}
                            </span>
                            <span className="bg-blue-600/50 text-white px-2 py-1 rounded text-xs font-semibold">
                              Sicurezza {evento.sicurezza}%
                            </span>
                            {!countdown.passata && (
                              <span className="bg-red-600 text-white px-3 py-1 rounded font-mono font-bold text-sm flex items-center gap-1">
                                <Timer size={14} />
                                {countdown.ore}h {countdown.minuti}m {countdown.secondi}s
                              </span>
                            )}
                            {countdown.passata && (
                              <span className="bg-gray-600 text-white px-3 py-1 rounded text-xs font-semibold">
                                ⏱️ PASSATA
                              </span>
                            )}
                          </div>
                          
                          <div className="text-gray-300 text-sm italic">
                            💡 {evento.motivazione}
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-center gap-2">
                          {statoEvento === 'vinto' && <CheckCircle className="text-green-400" size={36} />}
                          {statoEvento === 'perso' && <XCircle className="text-red-400" size={36} />}
                          {statoEvento === 'in_attesa' && <Clock className="text-gray-400" size={36} />}
                          <div className={`text-xs font-bold ${
                            statoEvento === 'vinto' ? 'text-green-400' :
                            statoEvento === 'perso' ? 'text-red-400' :
                            'text-gray-400'
                          }`}>
                            {statoEvento === 'vinto' ? 'VINTO' :
                             statoEvento === 'perso' ? 'PERSO' : 'IN ATTESA'}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* FOOTER SIMULAZIONE */}
        <div className="mt-6 bg-gradient-to-r from-blue-600/20 to-purple-600/20 backdrop-blur-lg rounded-xl p-6 border border-blue-400/30">
          <h3 className="text-xl font-bold text-white mb-3">🎲 Simulazione Vincite con Diverse Puntate</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[50, 100, 150, 200].map(importo => (
              <div key={importo} className="bg-white/10 rounded-lg p-3 text-center">
                <div className="text-blue-200 text-sm">Puntata €{importo}</div>
                <div className="text-white text-xl font-bold">
                  €{(importo * stato.quotaTotale).toFixed(0)}
                </div>
              </div>
            ))}
          </div>
          <p className="text-blue-200 text-sm mt-4 text-center">
            💡 Clicca sulle partite per tracciare i risultati in tempo reale
          </p>
        </div>

      </div>
    </div>
  );
};

export default SchedinaTarget;