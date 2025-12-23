import { useState, useEffect, useRef } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';
import * as faceapi from '@vladmandic/face-api';
import { Camera, Clock, UserCheck, PlayCircle, StopCircle, Loader, CreditCard, CheckCircle, XCircle, Zap, Activity, Lock, ShieldBan, Users } from 'lucide-react';

const API_URL = 'http://localhost:3000/api';

export default function ControlAcceso() {
  // ========== ESTADOS ==========
  const [camaraActiva, setCamaraActiva] = useState(false);
  const [modelosListos, setModelosListos] = useState(false);
  const [mensajeEstado, setMensajeEstado] = useState("Iniciando sistema...");
  const [personaDetectada, setPersonaDetectada] = useState<string | null>(null);
  const [confianza, setConfianza] = useState<number>(0);
  
  // RFID
  const [codigoRFID, setCodigoRFID] = useState('');
  const [estadoRFID, setEstadoRFID] = useState<'esperando' | 'procesando' | 'exito' | 'error' | 'inactivo' | 'deshabilitado'>('esperando');
  const [mensajeRFID, setMensajeRFID] = useState('🔄 Conectando a Arduino...');
  const [personaRFID, setPersonaRFID] = useState<any>(null);
  const [arduinoConectado, setArduinoConectado] = useState(false);
  
  // DATOS
  const [accesos, setAccesos] = useState<any[]>([]);
  const [totalPersonas, setTotalPersonas] = useState(0);
  const [totalVisitantes, setTotalVisitantes] = useState(0);
  
  // REFS
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labeledDescriptors = useRef<faceapi.LabeledFaceDescriptors[]>([]);
  const ultimoRegistro = useRef<{ [key: string]: number }>({});
  const inputRFIDRef = useRef<HTMLInputElement>(null);
  const intervaloRevision = useRef<any>(null);
  const ultimoCodigoRFIDRef = useRef<string>('');
  const intervaloDeteccion = useRef<any>(null);

  // Función hora
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
  // 🔥 CARGA DE MODELOS CON LÓGICA DE CONTEO CORREGIDA
  // ====================================
  useEffect(() => {
    const cargarTodo = async () => {
      try {
        setMensajeEstado("⏳ Cargando IA...");
        const MODEL_URL = '/models';
        await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
        
        setMensajeEstado("🔄 Verificando permisos...");
        
        const resVectores = await axios.get(`${API_URL}/vectores-faciales`).catch(() => ({ data: { personas: [] } }));
        const todosLosRegistros = resVectores.data.personas || [];
        
        const descriptoresFinales: faceapi.LabeledFaceDescriptors[] = [];
        let contPersonas = 0;
        let contVisitantes = 0;

        for (const p of todosLosRegistros) {
          const tipo = p.tipo_persona || 'Usuario';
          const esVisitante = tipo === 'Visitante';
          const nombre = `${p.primer_nombre} ${p.primer_apellido}`;
          
          // =======================================================
          // 🛡️ REGLAS DE CONTEO Y ACCESO
          // =======================================================
          let accesoPermitido = false;

          if (esVisitante) {
              // 🟢 VISITANTE: Debe estar Aprobado
              if (p.estado === 'Aprobado') {
                  accesoPermitido = true;
                  contVisitantes++;
              }
          } else {
              // 🔵 PERSONA (Estudiante, Docente, Admin):
              // 1. Estado debe ser 'Activo'
              // 2. Rostro Habilitado debe ser 1
              if (p.estado === 'Activo' && p.rostro_habilitado === 1) {
                  accesoPermitido = true;
                  contPersonas++; // Contamos a TODOS los que cumplen (incluido admin si quieres)
              }
          }

          if (!accesoPermitido) continue; // Si no cumple, no cargamos su cara

          // =======================================================
          // CARGA DEL VECTOR (Solo si tiene permiso)
          // =======================================================
          const label = `${tipo}|${p.id}|${nombre}`;

          if (p.vector_facial && p.vector_facial.length > 100) { 
            try {
              const vector = new Float32Array(JSON.parse(p.vector_facial));
              if (vector.length === 128) descriptoresFinales.push(new faceapi.LabeledFaceDescriptors(label, [vector]));
            } catch (e) {} 
          }
          else if (p.foto_url && p.foto_url.startsWith('data:image')) {
            try {
              const img = await faceapi.fetchImage(p.foto_url);
              const detection = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
              if (detection) descriptoresFinales.push(new faceapi.LabeledFaceDescriptors(label, [detection.descriptor]));
            } catch (e) {}
          }
        }
        
        setTotalPersonas(contPersonas);
        setTotalVisitantes(contVisitantes);
        labeledDescriptors.current = descriptoresFinales;
        setModelosListos(true);
        setMensajeEstado(`✅ Sistema Activo`);
        cargarAccesos();

      } catch (error) {
        setMensajeEstado("❌ Error de Sistema");
      }
    };
    
    cargarTodo();
    const interval = setInterval(cargarAccesos, 2000);
    return () => clearInterval(interval);
  }, []); 

  // ====================================
  // 🔥 LÓGICA RFID 
  // ====================================
  useEffect(() => {
    const monitorear = () => {
      if (estadoRFID !== 'esperando') return;
      if (typeof window !== 'undefined' && (window as any).obtenerUltimoDatoRFID) {
        const raw = (window as any).obtenerUltimoDatoRFID();
        if (!raw) return;
        const clean = raw.trim();
        if (clean.includes("Esperando") || clean.length < 4 || clean === ultimoCodigoRFIDRef.current) return;
        
        setArduinoConectado(true);
        const finalCode = clean.split(':').length === 2 ? clean.split(':')[1].trim() : clean;
        ultimoCodigoRFIDRef.current = raw; 
        setCodigoRFID(finalCode); 
        validarAccesoRFID(finalCode);
      }
    };
    intervaloRevision.current = setInterval(monitorear, 500);
    return () => clearInterval(intervaloRevision.current);
  }, [estadoRFID]); 

  const validarAccesoRFID = async (codigo: string) => {
    setEstadoRFID('procesando');
    setMensajeRFID('🔐 Verificando permisos...');

    try {
      const response = await fetch(`${API_URL}/acceso/validar-rfid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo })
      });
      const data = await response.json();

      // 🔥 CORRECCIÓN: Si el backend dice success, confiamos ciegamente.
      // El backend ya validó si está activo o si el RFID está habilitado.
      if (data.success && data.persona) {
        
        setEstadoRFID('exito');
        setPersonaRFID(data.persona);
        setMensajeRFID(`✅ ${data.mensaje || 'ACCESO CONCEDIDO'}`); // Usamos el mensaje del backend
        
        await cargarAccesos();
        setTimeout(resetRFID, 3000);

      } else {
        // Si el backend dice que no (success: false)
        throw new Error(data.error || "No autorizado");
      }
    } catch (e: any) {
      setEstadoRFID('inactivo'); // O 'error' según prefieras el color (rojo)
      // Mostramos el error que envió el backend (ej: "Credencial Deshabilitada")
      setMensajeRFID(`⛔ ${e.message || 'ACCESO DENEGADO'}`);
      setTimeout(resetRFID, 3500);
    }
  };

  const resetRFID = () => {
    setEstadoRFID('esperando');
    setPersonaRFID(null);
    setMensajeRFID('🔄 Esperando tarjeta...');
    setCodigoRFID('');
  };

  const cargarAccesos = async () => {
    try {
      const res = await axios.get(`${API_URL}/acceso/ultimos`);
      if (res.data.accesos) setAccesos(res.data.accesos);
    } catch (e) {}
  };

  // ====================================
  // 🔥 REGISTRO FACIAL
  // ====================================
  useEffect(() => {
    const detectar = async () => {
      if (!webcamRef.current?.video || !canvasRef.current) return;
      const video = webcamRef.current.video;
      if (video.readyState !== 4) return;

      try {
        const displaySize = { width: video.videoWidth, height: video.videoHeight };
        faceapi.matchDimensions(canvasRef.current, displaySize);
        const detection = await faceapi.detectSingleFace(video, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 })).withFaceLandmarks().withFaceDescriptor();
        
        const ctx = canvasRef.current.getContext('2d');
        if(ctx) ctx.clearRect(0, 0, displaySize.width, displaySize.height);

        if (detection && labeledDescriptors.current.length > 0) {
          const matcher = new faceapi.FaceMatcher(labeledDescriptors.current, 0.6);
          const match = matcher.findBestMatch(detection.descriptor);
          const box = faceapi.resizeResults(detection, displaySize).detection.box;

          if (match.label !== 'unknown') {
            const [tipo, id, nombre] = match.label.split('|');
            const conf = Math.round((1 - match.distance) * 100);
            
            setPersonaDetectada(nombre);
            setConfianza(conf);
            
            if(ctx) {
                ctx.strokeStyle = '#10b981'; ctx.lineWidth = 4; ctx.strokeRect(box.x, box.y, box.width, box.height);
                ctx.fillStyle = '#10b981'; ctx.fillText(`${nombre} (${conf}%)`, box.x, box.y - 10);
            }

            const key = `${tipo}-${id}`;
            const now = Date.now();
            if (now - (ultimoRegistro.current[key] || 0) > 5000) {
                registrarAccesoFacial(id, tipo, conf, nombre);
                ultimoRegistro.current[key] = now;
            }

          } else {
            setPersonaDetectada(null);
            if(ctx) { ctx.strokeStyle = '#ef4444'; ctx.strokeRect(box.x, box.y, box.width, box.height); }
          }
        }
      } catch (err) {}
    };

    if (camaraActiva && modelosListos) {
      clearInterval(intervaloDeteccion.current);
      intervaloDeteccion.current = setInterval(detectar, 1000);
    } else {
      clearInterval(intervaloDeteccion.current);
    }
    return () => clearInterval(intervaloDeteccion.current);
  }, [camaraActiva, modelosListos]);

  const registrarAccesoFacial = async (id: string, tipo: string, conf: number, nombre: string) => {
    try {
        const usuarioIdNum = parseInt(id);
        const payload = {
            usuario_id: usuarioIdNum, 
            tipo_usuario: tipo,
            metodo: 'Reconocimiento Facial',
            fecha: new Date().toISOString(),
            foto_verificacion_base64: webcamRef.current?.getScreenshot(),
            confianza_facial: conf
        };
        await axios.post(`${API_URL}/acceso`, payload);
        await cargarAccesos();
    } catch (error) { console.error(error); }
  };

  return (
    <div className="space-y-4 p-4 bg-gray-50/50 min-h-screen">
      <div className="flex items-center gap-2 mb-2">
          <h2 className="text-lg font-bold text-blue-900 flex items-center gap-2"><Activity className="text-orange-500" size={20}/> Monitor de Seguridad</h2>
          <span className="text-[10px] text-gray-400 bg-white px-2 py-0.5 rounded-full border border-gray-200">En Vivo</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* CÁMARA */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-900 to-blue-800 p-3 flex justify-between items-center text-white">
            <h3 className="font-bold text-sm flex items-center gap-2"><Camera size={16} className="text-orange-400"/> Biometría Facial</h3>
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
                {camaraActiva ? <><StopCircle size={14}/> Detener Sistema</> : <><PlayCircle size={14}/> Iniciar Sistema</>}
              </button>
            </div>
          </div>
        </div>

        {/* RFID */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
          <div className={`bg-gradient-to-r p-3 text-white flex justify-between items-center ${arduinoConectado ? 'from-green-600 to-green-700' : 'from-gray-600 to-gray-700'}`}>
            <h3 className="font-bold text-sm flex items-center gap-2"><CreditCard size={16}/> Lector RFID</h3>
            <p className="text-[10px] bg-black/20 px-2 py-0.5 rounded-full flex items-center gap-1"><Zap size={10}/> {arduinoConectado ? 'Online' : 'Offline'}</p>
          </div>
          
          <div className="p-4 flex-1 flex flex-col gap-3 justify-center">
            <div className={`rounded-lg p-6 text-center transition-all border flex flex-col items-center justify-center min-h-[160px]
                ${estadoRFID === 'esperando' ? 'bg-gray-50 border-gray-200 border-dashed' : 
                  estadoRFID === 'procesando' ? 'bg-blue-50 border-blue-200 animate-pulse' : 
                  estadoRFID === 'exito' ? 'bg-green-50 border-green-200' : 
                  estadoRFID === 'inactivo' ? 'bg-red-50 border-red-200' : 
                  'bg-gray-50 border-gray-200'}`}>
              
              {estadoRFID === 'esperando' && <><CreditCard size={40} className="text-gray-300 mb-2"/><p className="text-gray-500 text-xs font-medium">{mensajeRFID}</p></>}
              {estadoRFID === 'procesando' && <><Loader size={40} className="text-blue-500 animate-spin mb-2"/><p className="text-blue-600 text-xs font-bold">{mensajeRFID}</p></>}
              
              {estadoRFID === 'exito' && personaRFID && (
                <div className="animate-bounce-in">
                    <CheckCircle size={40} className="text-green-500 mx-auto mb-2"/>
                    <p className="text-base font-bold text-green-800">{personaRFID.primer_nombre} {personaRFID.primer_apellido}</p>
                    <p className="text-[10px] text-green-600 font-bold uppercase mt-1">{mensajeRFID}</p>
                </div>
              )}
              
              {estadoRFID === 'inactivo' && (
                <div className="animate-shake">
                    <ShieldBan size={40} className="text-red-500 mx-auto mb-2"/>
                    <p className="text-red-700 text-sm font-bold uppercase">ACCESO DENEGADO</p>
                    <p className="text-[10px] text-red-500 mt-1">{mensajeRFID}</p>
                </div>
              )}

              {estadoRFID === 'error' && (
                <div className="animate-shake">
                    <XCircle size={40} className="text-red-500 mx-auto mb-2"/>
                    <p className="text-red-700 text-sm font-bold uppercase">ERROR</p>
                    <p className="text-[10px] text-red-500 mt-1">{mensajeRFID}</p>
                </div>
              )}
            </div>
            
            <input ref={inputRFIDRef} type="text" value={codigoRFID} onChange={(e) => setCodigoRFID(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg text-center font-mono text-xs opacity-50 focus:opacity-100 transition-all" placeholder="Input de lectura..." autoFocus />
          </div>
        </div>
      </div>

      {/* LISTA ACCESOS */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden border-t-4 border-orange-500 mt-4">
        <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center">
          <h3 className="font-bold text-blue-900 text-sm flex items-center gap-2"><Clock size={16} className="text-orange-500"/> Últimos Accesos</h3>
          <span className="text-[10px] bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-bold border border-green-100 flex items-center gap-1"><span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> LIVE</span>
        </div>
        <div className="p-3 grid grid-cols-1 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto custom-scrollbar">
          {accesos.length === 0 ? <p className="col-span-3 text-center text-xs text-gray-400 py-4">Esperando registros...</p> : 
            accesos.map((acc) => (
              <div key={acc.id} className="flex items-center gap-2 p-2 hover:bg-blue-50 rounded-lg border border-gray-100 transition-colors">
                <div className="w-8 h-8 rounded-full bg-blue-900 text-white flex items-center justify-center font-bold text-xs">{acc.primer_nombre?.[0]}</div>
                <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-700 truncate text-xs">{acc.primer_nombre} {acc.primer_apellido}</p>
                    <span className="text-[9px] text-gray-500">{horaEcuador(acc.fecha)} • {acc.metodo.includes('Facial') ? '📸 Facial' : '💳 RFID'}</span>
                </div>
              </div>
            ))
          }
        </div>
      </div>

      {/* ESTADO DEL SISTEMA (FOOTER) */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm mt-4">
        <h4 className="text-blue-900 font-bold text-xs uppercase tracking-wider flex items-center gap-2 mb-3">
            <Activity size={16}/> ESTADO DEL SISTEMA
        </h4>
        <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
                <p className="text-[11px] text-gray-600 flex items-center gap-2">
                    <span className={`w-3 h-3 rounded flex items-center justify-center ${modelosListos ? 'bg-green-500' : 'bg-gray-300'}`}>
                        {modelosListos && <CheckCircle size={8} className="text-white"/>}
                    </span>
                    Modelos IA: <span className={modelosListos ? 'text-green-600 font-bold' : 'text-gray-400'}>{modelosListos ? 'CARGADOS' : 'CARGANDO...'}</span>
                </p>
                <p className="text-[11px] text-gray-600 flex items-center gap-2">
                    <Users size={12} className="text-blue-900"/> Rostros Habilitados: {totalPersonas}
                </p>
                <p className="text-[11px] text-gray-600 flex items-center gap-2">
                    <UserCheck size={12} className="text-orange-500"/> Visitantes: {totalVisitantes}
                </p>
            </div>
            <div className="space-y-1 border-l border-gray-100 pl-4">
                <p className="text-[11px] text-gray-600 flex items-center gap-2">
                    <span className="w-1 h-3 bg-blue-400 rounded-full"></span> Rostros Activos: {labeledDescriptors.current.length}
                </p>
                <p className="text-[11px] text-gray-600 flex items-center gap-2">
                    🤖 Arduino: <span className={`font-bold ${arduinoConectado ? 'text-green-600' : 'text-red-600'}`}>{arduinoConectado ? 'ONLINE' : 'OFFLINE'}</span>
                </p>
            </div>
        </div>
      </div>
    </div>
  );
}