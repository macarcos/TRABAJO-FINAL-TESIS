import { useState, useEffect, useRef } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';
import * as faceapi from '@vladmandic/face-api';
import { Camera, Clock, UserCheck, PlayCircle, StopCircle, Loader, CreditCard, CheckCircle, XCircle, Zap, Activity } from 'lucide-react';

const API_URL = 'http://localhost:3000/api';

export default function ControlAcceso() {
  // ========== ESTADO FACIAL ==========
  const [camaraActiva, setCamaraActiva] = useState(false);
  const [modelosListos, setModelosListos] = useState(false);
  const [mensajeEstado, setMensajeEstado] = useState("Iniciando sistema...");
  const [personaDetectada, setPersonaDetectada] = useState<string | null>(null);
  const [confianza, setConfianza] = useState<number>(0);
  
  // ========== ESTADO RFID ==========
  const [codigoRFID, setCodigoRFID] = useState('');
  const [estadoRFID, setEstadoRFID] = useState<'esperando' | 'procesando' | 'exito' | 'error'>('esperando');
  const [mensajeRFID, setMensajeRFID] = useState('🔄 Conectando a Arduino...');
  const [personaRFID, setPersonaRFID] = useState<any>(null);
  const [arduinoConectado, setArduinoConectado] = useState(false);
  
  // ========== ESTADO COMPARTIDO ==========
  const [accesos, setAccesos] = useState<any[]>([]);
  const [totalPersonas, setTotalPersonas] = useState(0);
  const [totalVisitantes, setTotalVisitantes] = useState(0);
  
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labeledDescriptors = useRef<faceapi.LabeledFaceDescriptors[]>([]);
  const ultimoRegistro = useRef<{ [key: string]: number }>({});
  const intervaloDeteccion = useRef<any>(null);
  const timeoutRFID = useRef<any>(null);
  const inputRFIDRef = useRef<HTMLInputElement>(null);
  const intervaloRevision = useRef<any>(null);
  const ultimoCodigoRFIDRef = useRef<string>('');

  // ====================================
  // FORMATEO DE FECHA
  // ====================================
  const horaEcuador = (fechaISO: string) => {
    if (!fechaISO) return "--:--";
    let fechaStr = fechaISO;
    if (fechaStr.includes('T') && fechaStr.includes('Z')) fechaStr = fechaStr.replace('Z', '');
    if (fechaStr.includes('T')) {
      const partes = fechaStr.split('T');
      const horaCompleta = partes[1].split('.')[0];
      const [hora, min, seg] = horaCompleta.split(':');
      let horaNum = parseInt(hora);
      const ampm = horaNum >= 12 ? 'p. m.' : 'a. m.';
      if (horaNum > 12) horaNum -= 12;
      if (horaNum === 0) horaNum = 12;
      return `${String(horaNum).padStart(2, '0')}:${min}:${seg} ${ampm}`;
    }
    return new Date(fechaISO).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  };

  useEffect(() => {
    if (inputRFIDRef.current) inputRFIDRef.current.focus();
  }, []);

  // ====================================
  // 🔥 CARGAR TODO (Modelos y Datos) - CORREGIDO PARA VISITANTES
  // ====================================
  useEffect(() => {
    const cargarTodo = async () => {
      try {
        setMensajeEstado("⏳ Cargando modelos de IA...");
        const MODEL_URL = '/models';
        await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
        
        setMensajeEstado("🔄 Obteniendo datos de Personas...");
        
        // 1. OBTENER TODOS LOS USUARIOS ACTIVOS (INCLUYE VISITANTES APROBADOS)
        const resPersonas = await axios.get(`${API_URL}/personas`).catch(() => ({ data: [] }));

        const descriptoresFinales: faceapi.LabeledFaceDescriptors[] = [];
        let totalVisitantesCont = 0;
        
        const personasActivas = resPersonas.data.filter((p: any) => p.estado === 'Activo' && p.tipo_persona !== 'Admin');
        setTotalPersonas(personasActivas.length);
        
        setMensajeEstado("🔄 Procesando rostros activos...");

        // 2. PROCESAR PERSONAS Y VISITANTES
        for (const p of personasActivas) {
          const nombreMostrar = `${p.primer_nombre} ${p.primer_apellido}`;
          const label = `${p.tipo_persona}|${p.id}|${nombreMostrar}`;
          
          if (p.tipo_persona === 'General') { // Contar visitantes (General = Visitante)
              totalVisitantesCont++;
          }
          
          // A. USUARIO CON VECTOR PRE-CALCULADO (Estudiantes/Docentes)
          if (p.vector_facial && p.vector_facial.length > 100) { 
            try {
              const vector = new Float32Array(JSON.parse(p.vector_facial));
              if (vector.length === 128) {
                descriptoresFinales.push(new faceapi.LabeledFaceDescriptors(label, [vector]));
              }
            } catch (e) { } 
          }
          
          // B. 🔥 VISITANTE APROBADO SIN VECTOR (Lo calculamos al vuelo para la sesión)
          else if (p.foto_url && p.foto_url.startsWith('data:image')) {
            try {
              setMensajeEstado(`🔄 Procesando rostro visitante: ${p.primer_nombre}...`);
              const img = await faceapi.fetchImage(p.foto_url);
              const detection = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
              
              if (detection) {
                descriptoresFinales.push(new faceapi.LabeledFaceDescriptors(label, [detection.descriptor]));
              }
            } catch (e) { console.error(`Error procesando rostro de ${p.primer_nombre}`, e); }
          }
        }
        
        setTotalVisitantes(totalVisitantesCont);
        labeledDescriptors.current = descriptoresFinales;
        setModelosListos(true);
        setMensajeEstado(`✅ Sistema listo - ${descriptoresFinales.length} rostros cargados`);
        cargarAccesos();

      } catch (error: any) {
        setMensajeEstado("❌ Error al inicializar");
      }
    };
    
    // Ejecutar carga inicial y mantener el monitoreo de accesos reciente
    cargarTodo();
    const intervaloLista = setInterval(cargarAccesos, 2000);
    return () => clearInterval(intervaloLista);
  }, []); 

  // ====================================
  // MONITOREAR DATOS DEL ARDUINO (LÓGICA MEJORADA)
  // ====================================
  useEffect(() => {
    const monitorearArduino = () => {
      // Si estamos mostrando un mensaje (Verde/Rojo), no procesamos nada nuevo
      if (estadoRFID !== 'esperando') return;

      if (typeof window !== 'undefined' && (window as any).obtenerUltimoDatoRFID) {
        const codigoRecibido = (window as any).obtenerUltimoDatoRFID();
        if (!codigoRecibido) return;

        const codigoLimpio = codigoRecibido.trim();

        // 1. DETECTAR "Esperando..." O RUIDO
        const esRuido = codigoLimpio.includes("Esperando") || 
                        codigoLimpio.includes("tarjeta") || 
                        codigoLimpio.includes("NFC") || 
                        codigoLimpio.length < 4;

        if (esRuido) {
            ultimoCodigoRFIDRef.current = ''; 
            return; 
        }

        // 2. EVITAR REPETICIÓN INFINITA
        if (codigoLimpio === ultimoCodigoRFIDRef.current) {
            return;
        }
        
        // 3. PROCESAR CÓDIGO NUEVO
        setArduinoConectado(true);
        console.log('📥 Código Nuevo:', codigoLimpio);
        
        const partes = codigoRecibido.split(':');
        const codigoFinal = partes.length === 2 ? partes[1].trim() : codigoLimpio;
        
        // Guardamos en memoria que YA procesamos este código
        ultimoCodigoRFIDRef.current = codigoRecibido; 
        
        setCodigoRFID(codigoFinal); 
        procesarRFIDDirecto(codigoFinal);
      }
    };

    intervaloRevision.current = setInterval(monitorearArduino, 500);
    return () => {
      if (intervaloRevision.current) clearInterval(intervaloRevision.current);
    };
  }, [estadoRFID]); 

  const cargarAccesos = async () => {
    try {
      const res = await axios.get(`${API_URL}/acceso/ultimos`);
      if (res.data.accesos) setAccesos(res.data.accesos);
    } catch (e) {}
  };

  // ====================================
  // PROCESAR RFID (PETICIÓN AL SERVIDOR)
  // ====================================
  const procesarRFIDDirecto = async (codigo: string) => {
    if (!codigo.trim()) return;

    setEstadoRFID('procesando');
    setMensajeRFID('🔍 Verificando...');

    try {
      const response = await fetch(`${API_URL}/acceso/validar-rfid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo: codigo.trim() })
      });

      const data = await response.json();

      if (data.success && data.persona) {
        // ✅ ACCESO PERMITIDO
        setEstadoRFID('exito');
        setPersonaRFID(data.persona);
        setMensajeRFID('✅ Acceso Permitido');
        
        if (timeoutRFID.current) clearTimeout(timeoutRFID.current);
        timeoutRFID.current = setTimeout(() => {
          setEstadoRFID('esperando');
          setPersonaRFID(null);
          setMensajeRFID('🔄 Conectando a Arduino...');
          setCodigoRFID('');
        }, 3000);

        await cargarAccesos();
        return;
      }
    } catch (error: any) {}

    // ❌ ACCESO DENEGADO
    setEstadoRFID('error');
    setMensajeRFID('❌ Acceso Denegado');
    setPersonaRFID(null);
    
    if (timeoutRFID.current) clearTimeout(timeoutRFID.current);
    timeoutRFID.current = setTimeout(() => {
      setEstadoRFID('esperando');
      setPersonaRFID(null);
      setMensajeRFID('🔄 Conectando a Arduino...');
      setCodigoRFID('');
    }, 3000);
  };

  // Detección Facial
  useEffect(() => {
    const detectarRostro = async () => {
      if (!webcamRef.current?.video || !canvasRef.current) return;
      const video = webcamRef.current.video;
      const canvas = canvasRef.current;
      if (video.readyState !== 4) return;

      try {
        const displaySize = { width: video.videoWidth, height: video.videoHeight };
        canvas.width = displaySize.width;
        canvas.height = displaySize.height;
        faceapi.matchDimensions(canvas, displaySize);
        const detection = await faceapi.detectSingleFace(video, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 })).withFaceLandmarks().withFaceDescriptor();
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (detection && labeledDescriptors.current.length > 0) {
          const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors.current, 0.6);
          const match = faceMatcher.findBestMatch(detection.descriptor);
          const box = faceapi.resizeResults(detection, displaySize).detection.box;

          if (match.label !== 'unknown') {
            const partes = match.label.split('|');
            const tipoUsuario = partes.length >= 3 ? partes[0] : 'PERSONA';
            const idUsuario = partes.length >= 3 ? partes[1] : partes[0];
            const nombreMostrar = partes.length >= 3 ? partes[2] : partes[1];
            const conf = Math.round((1 - match.distance) * 100);
            
            setPersonaDetectada(nombreMostrar);
            setConfianza(conf);
            ctx.strokeStyle = '#10b981'; ctx.lineWidth = 4; ctx.strokeRect(box.x, box.y, box.width, box.height);
            ctx.fillStyle = '#10b981'; ctx.fillText(`${nombreMostrar} (${conf}%)`, box.x, box.y - 10);
            verificarYRegistrar(idUsuario, nombreMostrar, conf, tipoUsuario);
          } else {
            setPersonaDetectada(null);
            ctx.strokeStyle = '#ef4444'; ctx.strokeRect(box.x, box.y, box.width, box.height);
          }
        }
      } catch (err) {}
    };

    if (camaraActiva && modelosListos) {
      if (intervaloDeteccion.current) clearInterval(intervaloDeteccion.current);
      intervaloDeteccion.current = setInterval(detectarRostro, 1500);
    } else {
      if (intervaloDeteccion.current) clearInterval(intervaloDeteccion.current);
    }
    return () => { if (intervaloDeteccion.current) clearInterval(intervaloDeteccion.current); };
  }, [camaraActiva, modelosListos]);

  const verificarYRegistrar = async (idUsuario: string, nombreCompleto: string, confianzaActual: number, tipoUsuario: string) => {
    const claveRegistro = `${tipoUsuario}-${idUsuario}`;
    const now = Date.now();
    if (now - (ultimoRegistro.current[claveRegistro] || 0) > 5000) {
      try {
        await axios.post(`${API_URL}/acceso`, {
          usuario_id: parseInt(idUsuario), tipo_usuario: tipoUsuario, metodo: 'Reconocimiento Facial',
          fecha: new Date().toISOString(), foto_verificacion_base64: webcamRef.current?.getScreenshot(), confianza_facial: confianzaActual
        });
        ultimoRegistro.current[claveRegistro] = now;
        await cargarAccesos();
      } catch (e) {}
    }
  };

  return (
    // CAMBIO: padding más pequeño y fondo gris suave
    <div className="space-y-4 p-4 bg-gray-50/50 min-h-screen">
      
      {/* TÍTULO PRINCIPAL (Opcional, para dar contexto) */}
      <div className="flex items-center gap-2 mb-2">
          <h2 className="text-lg font-bold text-blue-900 flex items-center gap-2">
           <Activity className="text-orange-500" size={20}/> Monitor de Acceso
          </h2>
          <span className="text-[10px] text-gray-400 bg-white px-2 py-0.5 rounded-full border border-gray-200">Tiempo Real</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* RECONOCIMIENTO FACIAL */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* HEADER AZUL + NARANJA */}
          <div className="bg-gradient-to-r from-blue-900 to-blue-800 p-3 flex justify-between items-center text-white">
            <h3 className="font-bold text-sm flex items-center gap-2"><Camera size={16} className="text-orange-400"/> Reconocimiento Facial</h3>
            <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full">{mensajeEstado}</span>
          </div>
          
          <div className="p-3">
            <div className="bg-black rounded-lg overflow-hidden relative aspect-video flex items-center justify-center border-2 border-gray-800 shadow-inner">
              {camaraActiva ? (
                <div className="relative w-full h-full">
                  <Webcam audio={false} ref={webcamRef} screenshotFormat="image/jpeg" className="absolute w-full h-full object-cover" videoConstraints={{ width: 1280, height: 720 }} />
                  <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full pointer-events-none" />
                  {personaDetectada && <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-green-500 text-white px-3 py-1 rounded-full font-bold text-xs shadow-lg z-20 flex gap-1 items-center animate-bounce-in"><UserCheck size={14}/> {personaDetectada}</div>}
                </div>
              ) : (
                <div className="text-center text-gray-500 p-4">
                    <Camera size={32} className="mx-auto mb-2 opacity-30"/>
                    <p className="text-xs font-bold text-gray-400">{mensajeEstado}</p>
                    {!modelosListos && <Loader className="animate-spin mx-auto mt-2 text-blue-500" size={20}/>}
                </div>
              )}
            </div>
            
            <div className="mt-3 flex gap-2">
              <button onClick={() => setCamaraActiva(!camaraActiva)} disabled={!modelosListos} className={`flex-1 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm ${camaraActiva ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200' : 'bg-green-50 text-green-600 hover:bg-green-100 border border-green-200 disabled:opacity-50'}`}>
                {camaraActiva ? <><StopCircle size={14}/> Detener Cámara</> : <><PlayCircle size={14}/> Iniciar Cámara</>}
              </button>
            </div>
          </div>
        </div>

        {/* RFID */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
          <div className={`bg-gradient-to-r p-3 text-white flex justify-between items-center ${arduinoConectado ? 'from-green-600 to-green-700' : 'from-gray-600 to-gray-700'}`}>
            <h3 className="font-bold text-sm flex items-center gap-2"><CreditCard size={16}/> Acceso RFID</h3>
            <p className="text-[10px] bg-black/20 px-2 py-0.5 rounded-full flex items-center gap-1"><Zap size={10}/> {arduinoConectado ? 'Conectado' : 'Desconectado'}</p>
          </div>
          
          <div className="p-4 flex-1 flex flex-col gap-3">
            <div className={`flex-1 rounded-lg p-4 text-center transition-all border flex flex-col items-center justify-center min-h-[140px]
                ${estadoRFID === 'esperando' ? 'bg-gray-50 border-gray-200 border-dashed' : 
                  estadoRFID === 'procesando' ? 'bg-blue-50 border-blue-200 animate-pulse' : 
                  estadoRFID === 'exito' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              
              {estadoRFID === 'esperando' && <><CreditCard size={32} className="text-gray-300 mb-2"/><p className="text-gray-500 text-xs font-medium">{mensajeRFID}</p></>}
              {estadoRFID === 'procesando' && <><Loader size={28} className="text-blue-500 animate-spin mb-2"/><p className="text-blue-600 text-xs font-bold">{mensajeRFID}</p></>}
              
              {estadoRFID === 'exito' && personaRFID && (
                <div className="animate-bounce-in">
                    <CheckCircle size={32} className="text-green-500 mx-auto mb-1"/>
                    <p className="text-sm font-bold text-green-800">{personaRFID.primer_nombre} {personaRFID.primer_apellido}</p>
                    <p className="text-[10px] text-green-600 font-bold uppercase mt-1">{mensajeRFID}</p>
                </div>
              )}
              
              {estadoRFID === 'error' && (
                <div className="animate-shake">
                    <XCircle size={32} className="text-red-500 mx-auto mb-1"/>
                    <p className="text-red-600 text-xs font-bold">{mensajeRFID}</p>
                </div>
              )}
            </div>
            
            {/* Input RFID con borde naranja al enfocar */}
            <input 
                ref={inputRFIDRef} 
                type="text" 
                value={codigoRFID} 
                onChange={(e) => setCodigoRFID(e.target.value)} 
                className="w-full p-2 border border-gray-300 rounded-lg text-center font-mono text-xs bg-white focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none transition-all" 
                placeholder="Escanee tarjeta aquí..." 
                autoFocus 
            />
          </div>
        </div>
      </div>

      {/* MONITOR VIVO */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden border-t-4 border-orange-500">
        <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center">
          <h3 className="font-bold text-blue-900 text-sm flex items-center gap-2"><Clock size={16} className="text-orange-500"/> Monitor en Vivo</h3>
          <span className="text-[10px] bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-bold border border-green-100 flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> LIVE
          </span>
        </div>
        
        <div className="p-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-56 overflow-y-auto custom-scrollbar">
          {accesos.length === 0 ? (
            <div className="col-span-full text-center py-6 text-gray-300 flex flex-col items-center">
                <UserCheck size={32} className="mb-1 opacity-50"/>
                <p className="text-xs">Esperando accesos...</p>
            </div>
          ) : (
            accesos.map((acc) => (
              <div key={acc.id} className="flex items-center gap-2 p-2 hover:bg-blue-50 rounded-lg border border-gray-100 transition-colors group">
                <div className="w-9 h-9 rounded-full bg-blue-900 text-white flex items-center justify-center font-bold text-xs shadow-sm ring-1 ring-orange-200">
                    {acc.primer_nombre?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-700 truncate text-xs group-hover:text-blue-900">{acc.primer_nombre} {acc.primer_apellido}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-mono text-gray-500">{horaEcuador(acc.fecha)}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded border bg-white border-gray-200 text-gray-600">
                            {acc.metodo.includes('Facial') ? '📸 Facial' : '💳 RFID'}
                        </span>
                    </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* DEBUG / INFO */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-[10px] text-gray-500 space-y-1">
        <div className="font-bold text-blue-900 uppercase tracking-wider flex items-center gap-2">
            <Activity size={12}/> Estado del Sistema
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <div>
            <p>✅ Modelos IA: <span className={modelosListos ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>{modelosListos ? 'CARGADOS' : 'CARGANDO...'}</span></p>
            <p>👥 Personas: {totalPersonas}</p>
            <p>🚶 Visitantes: {totalVisitantes}</p>
          </div>
          <div>
            <p>📊 Rostros: {labeledDescriptors.current.length}</p>
            <p>🤖 Arduino: <span className={`font-bold ${arduinoConectado ? 'text-green-600' : 'text-red-600'}`}>{arduinoConectado ? 'ONLINE' : 'OFFLINE'}</span></p>
            <p>🔤 Buffer: <span className='font-mono bg-white border px-1 rounded text-gray-700'>{codigoRFID || '---'}</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}