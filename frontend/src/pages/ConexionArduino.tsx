import { useState, useRef, useEffect } from 'react';
import { Usb, RefreshCw, Terminal, AlertCircle, Cpu, Square } from 'lucide-react';

type SerialPort = any;

export default function ConexionArduino() {
  const [puerto, setPuerto] = useState<SerialPort | null>(null);
  const [conectado, setConectado] = useState<boolean>(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [lecturaActual, setLecturaActual] = useState<string>("");
  const readerRef = useRef<ReadableStreamDefaultReader<string> | null>(null);
  const [baudRate, setBaudRate] = useState<number>(9600);
  const bufferRef = useRef<string>("");
  const puertoRef = useRef<SerialPort | null>(null);
  const conectadoRef = useRef<boolean>(false);

  // Sincronizar las referencias con los estados para mantener disponibilidad en background
  useEffect(() => {
    puertoRef.current = puerto;
  }, [puerto]);

  useEffect(() => {
    conectadoRef.current = conectado;
  }, [conectado]);

  // Limpiar conexión al desmontar el componente
  useEffect(() => {
    return () => {
      // No desconectar aquí, dejamos que siga activa en background
      console.log("Componente desmontado pero conexión sigue activa");
    };
  }, []);

  const addLog = (mensaje: string, tipo: 'info' | 'rx' | 'error' = 'info') => {
    const hora = new Date().toLocaleTimeString();
    const prefix = tipo === 'rx' ? '📥 ' : tipo === 'error' ? '❌ ' : 'ℹ️ ';
    setLogs(prev => [`[${hora}] ${prefix}${mensaje}`, ...prev].slice(0, 50));
  };

  const conectarArduino = async () => {
    if (!('serial' in navigator)) {
      alert("Tu navegador no soporta Web Serial API. Usa Chrome o Edge.");
      return;
    }

    try {
      const port = await (navigator as any).serial.requestPort();
      await port.open({ baudRate: baudRate });
      
      setPuerto(port);
      puertoRef.current = port;
      setConectado(true);
      conectadoRef.current = true;
      addLog(`Dispositivo conectado a ${baudRate} baudios`, 'info');

      leerDatos(port);

    } catch (error) {
      console.error(error);
      addLog("Error al conectar: " + error, 'error');
    }
  };

  const desconectar = async () => {
    if (readerRef.current) {
      try {
        await readerRef.current.cancel();
      } catch (e) {
        console.log("Reader ya estaba cancelado");
      }
      readerRef.current = null;
    }
    if (puertoRef.current) {
      try {
        await puertoRef.current.close();
      } catch (e) {
        console.log("Puerto ya estaba cerrado");
      }
      setPuerto(null);
      puertoRef.current = null;
    }
    setConectado(false);
    conectadoRef.current = false;
    addLog("Dispositivo desconectado", 'info');
  };

  const leerDatos = async (port: SerialPort) => {
    const textDecoder = new TextDecoderStream();
    const readableStreamClosed = port.readable?.pipeTo(textDecoder.writable);
    const reader = textDecoder.readable.getReader();
    readerRef.current = reader;

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }
        if (value) {
          procesarEntrada(value);
        }
      }
    } catch (error) {
      if (conectadoRef.current) {
        addLog("Error de lectura: " + error, 'error');
      }
    } finally {
      reader.releaseLock();
    }
  };

  const procesarEntrada = (texto: string) => {
    bufferRef.current += texto;
    
    if (bufferRef.current.includes('\n')) {
      const lineas = bufferRef.current.split('\n');
      for (let i = 0; i < lineas.length - 1; i++) {
        const lineaLimpia = lineas[i].trim();
        if (lineaLimpia) {
          setLecturaActual(lineaLimpia);
          addLog(lineaLimpia, 'rx');
        }
      }
      bufferRef.current = lineas[lineas.length - 1];
    }
  };

  const enviarComando = async (comando: string) => {
    if (!puertoRef.current || !puertoRef.current.writable || !comando.trim()) {
      return;
    }

    try {
      const writer = puertoRef.current.writable.getWriter();
      await writer.write(new TextEncoder().encode(comando + '\n'));
      writer.releaseLock();
      addLog(`Enviado: ${comando}`, 'info');
    } catch (error) {
      addLog(`Error al enviar: ${error}`, 'error');
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Cpu className="text-blue-600" /> Conexión Directa Arduino
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            Conecta tu lector RFID o placa Arduino vía USB Web Serial API.
          </p>
        </div>
        
        <div className="flex items-center gap-3 mt-4 md:mt-0">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm ${conectado ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            <div className={`w-3 h-3 rounded-full ${conectado ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
            {conectado ? 'CONECTADO' : 'DESCONECTADO'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
            <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
              <Usb size={20}/> Configuración
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Velocidad (Baud Rate)</label>
                <select 
                  disabled={conectado}
                  value={baudRate}
                  onChange={(e) => setBaudRate(Number(e.target.value))}
                  className="w-full mt-1 p-2 border rounded-lg bg-gray-50"
                >
                  <option value="9600">9600 (Estándar Arduino)</option>
                  <option value="115200">115200 (Rápido / ESP32)</option>
                  <option value="57600">57600</option>
                </select>
              </div>

              {!conectado ? (
                <button 
                  onClick={conectarArduino}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-blue-200 shadow-lg"
                >
                  <Usb size={20}/> Seleccionar Puerto USB
                </button>
              ) : (
                <button 
                  onClick={desconectar}
                  className="w-full bg-red-100 hover:bg-red-200 text-red-600 font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all"
                >
                  <Square size={20} fill="currentColor"/> Desconectar
                </button>
              )}
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100 text-sm text-blue-800">
              <p className="font-bold flex items-center gap-2 mb-2"><AlertCircle size={16}/> Instrucciones:</p>
              <ul className="list-disc pl-4 space-y-1 text-xs">
                <li>Conecta tu Arduino por USB.</li>
                <li>Asegúrate de que no esté abierto el monitor serie en Arduino IDE.</li>
                <li>Haz clic en "Seleccionar Puerto" y elige tu dispositivo (ej. COM3).</li>
                <li>La conexión se mantendrá activa al navegar a otras secciones.</li>
              </ul>
            </div>
          </div>

          <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-6 rounded-2xl shadow-lg text-white text-center">
            <p className="text-gray-400 text-xs font-mono mb-2 uppercase tracking-widest">Último Dato Recibido</p>
            <div className="text-3xl font-mono font-bold text-green-400 min-h-[40px]">
              {lecturaActual || "---"}
            </div>
            {lecturaActual && (
              <div className="mt-4 flex justify-center">
                <span className="bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded border border-green-500/30">
                  Recibido hace un instante
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-[#1e1e1e] rounded-2xl shadow-xl border border-gray-700 overflow-hidden flex flex-col h-[500px]">
            <div className="bg-[#2d2d2d] p-3 flex items-center justify-between border-b border-gray-700">
              <div className="flex items-center gap-2">
                <Terminal size={16} className="text-gray-400"/>
                <span className="text-gray-300 text-sm font-mono">Monitor Serie Web</span>
              </div>
              <button 
                onClick={() => setLogs([])}
                className="text-xs text-gray-400 hover:text-white flex items-center gap-1 bg-white/5 px-2 py-1 rounded"
              >
                <RefreshCw size={12}/> Limpiar
              </button>
            </div>

            <div className="flex-1 p-4 font-mono text-sm overflow-y-auto space-y-1">
              {logs.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-gray-600 opacity-50">
                  <Usb size={48} className="mb-4"/>
                  <p>Esperando conexión...</p>
                </div>
              )}
              {logs.map((log, i) => (
                <div key={i} className={`break-all ${
                  log.includes('❌') ? 'text-red-400' : 
                  log.includes('📥') ? 'text-green-400' : 
                  'text-blue-300'
                }`}>
                  {log}
                </div>
              ))}
            </div>

            <div className="p-3 bg-[#2d2d2d] border-t border-gray-700 flex gap-2">
              <span className="text-green-500 font-mono">{'>'}</span>
              <input 
                type="text" 
                disabled={!conectado}
                placeholder={conectado ? "Enviar comando al Arduino..." : "Desconectado"}
                className="bg-transparent border-none outline-none text-white font-mono text-sm w-full placeholder-gray-600"
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