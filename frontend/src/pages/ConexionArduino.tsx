import { useState, useRef, useEffect, useCallback } from 'react';
import { Usb, RefreshCw, Terminal, AlertCircle, Cpu, Square } from 'lucide-react';

type SerialPort = any;

// Crear un contexto global para mantener la conexión
let puertoGlobal: SerialPort | null = null;
let readerGlobal: ReadableStreamDefaultReader<string> | null = null;
let lecturaActualGlobal: string = "";

export default function ConexionArduino() {
  const [puerto, setPuerto] = useState<SerialPort | null>(null);
  const [conectado, setConectado] = useState<boolean>(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [lecturaActual, setLecturaActual] = useState<string>("");
  const [baudRate, setBaudRate] = useState<number>(9600);
  const bufferRef = useRef<string>("");
  const logRef = useRef<string[]>([]);

  // Al montar, verificar si ya hay una conexión activa
  useEffect(() => {
    if (puertoGlobal && readerGlobal) {
      setPuerto(puertoGlobal);
      setConectado(true);
      setLecturaActual(lecturaActualGlobal);
      console.log("✅ Reactivando conexión existente");
    }

    const handleDisconnect = () => {
      console.log("❌ Dispositivo desconectado físicamente");
      puertoGlobal = null;
      readerGlobal = null;
      setPuerto(null);
      setConectado(false);
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ❌ Dispositivo desconectado físicamente`]);
    };

    if (puertoGlobal) {
      puertoGlobal.addEventListener('disconnect', handleDisconnect);
      return () => {
        if (puertoGlobal) {
          puertoGlobal.removeEventListener('disconnect', handleDisconnect);
        }
      };
    }
  }, []);

  const addLog = useCallback((mensaje: string, tipo: 'info' | 'rx' | 'error' = 'info') => {
    const hora = new Date().toLocaleTimeString();
    const prefix = tipo === 'rx' ? '📥 ' : tipo === 'error' ? '❌ ' : 'ℹ️ ';
    const logMsg = `[${hora}] ${prefix}${mensaje}`;
    
    setLogs(prev => [logMsg, ...prev].slice(0, 50));
    logRef.current = [logMsg, ...logRef.current].slice(0, 50);
  }, []);

  const conectarArduino = async () => {
    if (!('serial' in navigator)) {
      alert("Tu navegador no soporta Web Serial API. Usa Chrome o Edge.");
      return;
    }

    try {
      const port = await (navigator as any).serial.requestPort();
      await port.open({ baudRate: baudRate });
      
      puertoGlobal = port;
      setPuerto(port);
      setConectado(true);
      addLog(`✅ Conectado a ${baudRate} baudios`, 'info');

      leerDatos(port);

    } catch (error: any) {
      console.error(error);
      addLog("Error al conectar: " + error.message, 'error');
    }
  };

  const desconectar = async () => {
    if (readerGlobal) {
      try {
        await readerGlobal.cancel();
      } catch (e) {
        console.log("Reader ya estaba cancelado");
      }
      readerGlobal = null;
    }
    if (puertoGlobal) {
      try {
        await puertoGlobal.close();
      } catch (e) {
        console.log("Puerto ya estaba cerrado");
      }
      puertoGlobal = null;
    }
    setPuerto(null);
    setConectado(false);
    addLog("Dispositivo desconectado", 'info');
  };

  const leerDatos = async (port: SerialPort) => {
    const textDecoder = new TextDecoderStream();
    const readableStreamClosed = port.readable?.pipeTo(textDecoder.writable);
    const reader = textDecoder.readable.getReader();
    readerGlobal = reader;

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          console.log("Lectura completada");
          break;
        }
        if (value) {
          procesarEntrada(value);
        }
      }
    } catch (error: any) {
      if (puertoGlobal) {
        console.error("Error de lectura:", error);
        addLog("Error de lectura: " + error.message, 'error');
      }
    } finally {
      reader.releaseLock();
      readerGlobal = null;
    }
  };

  const procesarEntrada = (texto: string) => {
    bufferRef.current += texto;
    
    if (bufferRef.current.includes('\n')) {
      const lineas = bufferRef.current.split('\n');
      for (let i = 0; i < lineas.length - 1; i++) {
        const lineaLimpia = lineas[i].trim();
        if (lineaLimpia) {
          let codigoExtraido = '';
          
          if (lineaLimpia.includes('Código:')) {
            const match = lineaLimpia.match(/Código:\s*([A-F0-9]+)/i);
            if (match && match[1]) {
              codigoExtraido = match[1].trim();
            }
          } 
          else if (lineaLimpia.includes(':')) {
            const partes = lineaLimpia.split(':');
            if (partes.length > 1) {
              codigoExtraido = partes[partes.length - 1].trim();
            }
          }
          else {
            codigoExtraido = lineaLimpia;
          }
          
          if (codigoExtraido && codigoExtraido.length >= 4) {
            lecturaActualGlobal = codigoExtraido;
            setLecturaActual(codigoExtraido);
            addLog(codigoExtraido, 'rx');
            console.log("📥", codigoExtraido);
          }
        }
      }
      bufferRef.current = lineas[lineas.length - 1];
    }
  };

  const enviarComando = async (comando: string) => {
    if (!puertoGlobal || !puertoGlobal.writable || !comando.trim()) {
      return;
    }

    try {
      const writer = puertoGlobal.writable.getWriter();
      await writer.write(new TextEncoder().encode(comando + '\n'));
      writer.releaseLock();
      addLog(`Enviado: ${comando}`, 'info');
    } catch (error: any) {
      addLog(`Error al enviar: ${error.message}`, 'error');
    }
  };

  useEffect(() => {
    (window as any).obtenerUltimoDatoRFID = () => lecturaActualGlobal;
  }, []);

  return (
    <div className="p-4 space-y-4 max-w-6xl mx-auto">
      
      {/* HEADER DE PÁGINA */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-white p-4 rounded-xl shadow-sm border border-gray-100 border-t-4 border-orange-500">
        <div>
          <h2 className="text-lg font-bold text-blue-900 flex items-center gap-2">
            <Cpu className="text-orange-500" size={20}/> Conexión Arduino
          </h2>
          <p className="text-gray-500 text-[11px] mt-0.5">Gestión de conexión física para lectura RFID.</p>
        </div>
        
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full font-bold text-[10px] border ${conectado ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
           <div className={`w-2 h-2 rounded-full ${conectado ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
           {conectado ? 'CONECTADO' : 'DESCONECTADO'}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* PANEL IZQUIERDO: CONFIGURACIÓN */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-900 to-blue-800 p-3 flex items-center gap-2 text-white">
                <Usb size={16} className="text-orange-400"/>
                <h3 className="font-bold text-sm">Configuración</h3>
            </div>
            
            <div className="p-4 space-y-3">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Velocidad (Baud Rate)</label>
                <select 
                  disabled={conectado}
                  value={baudRate}
                  onChange={(e) => setBaudRate(Number(e.target.value))}
                  className="w-full p-2 text-xs border border-gray-200 rounded-lg bg-gray-50 focus:ring-1 focus:ring-blue-500 outline-none disabled:opacity-50"
                >
                  <option value="9600">9600 (Estándar Arduino)</option>
                  <option value="115200">115200 (Rápido / ESP32)</option>
                  <option value="57600">57600</option>
                </select>
              </div>

              {!conectado ? (
                <button 
                  onClick={conectarArduino}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all shadow-md text-xs"
                >
                  <Usb size={16}/> Seleccionar Puerto USB
                </button>
              ) : (
                <button 
                  onClick={desconectar}
                  className="w-full bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all text-xs"
                >
                  <Square size={16} fill="currentColor"/> Desconectar
                </button>
              )}
            </div>

            {/* INFO BOX */}
            <div className="px-4 pb-4">
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 text-blue-900">
                    <p className="text-[10px] font-bold mb-1 flex items-center gap-1"><AlertCircle size={12}/> Nota:</p>
                    <p className="text-[10px] leading-relaxed opacity-80">
                        La conexión se mantiene activa en segundo plano mientras navegas por otras pestañas del sistema.
                    </p>
                </div>
            </div>
          </div>

          {/* TARJETA ÚLTIMO DATO */}
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-5 rounded-xl shadow-lg text-white text-center border border-gray-700">
            <p className="text-gray-400 text-[10px] font-mono mb-1 uppercase tracking-widest">Último Dato Recibido</p>
            <div className="text-2xl font-mono font-bold text-green-400 min-h-[32px] break-all">
              {lecturaActual || "---"}
            </div>
            {lecturaActual && (
              <div className="mt-3 flex justify-center">
                <span className="bg-green-500/10 text-green-400 text-[10px] px-2 py-0.5 rounded border border-green-500/20 animate-pulse">
                  ● En vivo
                </span>
              </div>
            )}
          </div>
        </div>

        {/* PANEL DERECHO: TERMINAL */}
        <div className="lg:col-span-2">
          <div className="bg-[#1e1e1e] rounded-xl shadow-lg border border-gray-700 overflow-hidden flex flex-col h-[400px]">
            <div className="bg-[#2d2d2d] px-3 py-2 flex items-center justify-between border-b border-gray-700">
              <div className="flex items-center gap-2">
                <Terminal size={14} className="text-orange-500"/>
                <span className="text-gray-300 text-xs font-mono font-bold">Monitor Serie</span>
              </div>
              <button 
                onClick={() => setLogs([])}
                className="text-[10px] text-gray-400 hover:text-white flex items-center gap-1 bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded transition-colors"
              >
                <RefreshCw size={10}/> Limpiar
              </button>
            </div>

            <div className="flex-1 p-3 font-mono text-xs overflow-y-auto space-y-1 custom-scrollbar bg-[#1e1e1e]">
              {logs.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-gray-600 opacity-40">
                  <Usb size={32} className="mb-2"/>
                  <p>Esperando conexión...</p>
                </div>
              )}
              {logs.map((log, i) => (
                <div key={i} className={`break-all leading-tight ${
                  log.includes('❌') ? 'text-red-400' : 
                  log.includes('📥') ? 'text-green-400 font-bold' : 
                  'text-blue-300'
                }`}>
                  {log}
                </div>
              ))}
            </div>

            <div className="p-2 bg-[#2d2d2d] border-t border-gray-700 flex gap-2 items-center">
              <span className="text-green-500 font-mono text-xs">{'>'}</span>
              <input 
                type="text" 
                disabled={!conectado}
                placeholder={conectado ? "Escribir comando..." : "Desconectado"}
                className="bg-transparent border-none outline-none text-white font-mono text-xs w-full placeholder-gray-600 disabled:opacity-30"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const comando = e.currentTarget.value;
                    enviarComando(comando);
                    e.currentTarget.value = '';
                  }
                }}
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}