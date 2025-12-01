import { useState, useEffect, useRef } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';
import * as faceapi from '@vladmandic/face-api';
import { Camera, ScanLine, Clock, UserCheck, PlayCircle, StopCircle, Loader, AlertCircle, CreditCard, Smartphone, Wifi, Zap } from 'lucide-react';

export default function ControlAcceso() {
  // ========== ESTADO FACIAL ==========
  const [camaraActiva, setCamaraActiva] = useState(false);
  const [modelosListos, setModelosListos] = useState(false);
  const [mensajeEstado, setMensajeEstado] = useState("Iniciando sistema...");
  const [personaDetectada, setPersonaDetectada] = useState<string | null>(null);
  const [confianza, setConfianza] = useState<number>(0);
  const [errorCamara, setErrorCamara] = useState<string | null>(null);
  
  // ========== ESTADO RFID DUAL (Físico + Virtual) ==========
  const [rfidActivo, setRfidActivo] = useState(true); // Siempre escuchando
  const [codigoRFID, setCodigoRFID] = useState('');
  const [estadoRFID, setEstadoRFID] = useState<'esperando' | 'procesando' | 'exito' | 'error'>('esperando');
  const [mensajeRFID, setMensajeRFID] = useState('Esperando tarjeta o código virtual...');
  const [personaRFID, setPersonaRFID] = useState<any>(null);
  const [tipoLectura, setTipoLectura] = useState<'fisica' | 'virtual' | null>(null);
  
  // ========== ESTADO COMPARTIDO ==========
  const [accesos, setAccesos] = useState<any[]>([]);
  
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labeledDescriptors = useRef<any[]>([]);
  const ultimoRegistro = useRef<{ [key: string]: number }>({});
  const deteccionActiva = useRef(false);
  const intervalId = useRef<any>(null);
  const inputRFIDRef = useRef<HTMLInputElement>(null);
  const timeoutRFID = useRef<any>(null);

  // ====================================
  // FUNCIONES DE FORMATEO DE FECHA
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
    if (fechaStr.includes(' ')) {
      const partes = fechaStr.split(' ');
      const horaCompleta = partes[1];
      const [hora, min, seg] = horaCompleta.split(':');
      let horaNum = parseInt(hora);
      const ampm = horaNum >= 12 ? 'p. m.' : 'a. m.';
      if (horaNum > 12) horaNum -= 12;
      if (horaNum === 0) horaNum = 12;
      return `${String(horaNum).padStart(2, '0')}:${min}:${seg} ${ampm}`;
    }
    return new Date(fechaISO).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  };

  const fechaEcuador = (fechaISO: string) => {
    if (!fechaISO) return "--/--/----";
    let fechaStr = fechaISO;
    if (fechaStr.includes('T')) fechaStr = fechaStr.split('T')[0];
    if (fechaStr.includes(' ')) fechaStr = fechaStr.split(' ')[0];
    const [año, mes, dia] = fechaStr.split('-');
    return `${dia}/${mes}/${año}`;
  };

  // ====================================
  // 1. CARGAR MODELOS Y PERSONAS
  // ====================================
  useEffect(() => {
    const cargarTodo = async () => {
      try {
        setMensajeEstado("⏳ Cargando modelos de IA...");
        const MODEL_URL = '/models';
        await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
        console.log("✅ Modelos de IA cargados");

        setMensajeEstado("🔄 Cargando personas de la base de datos...");
        const res = await axios.get('http://localhost:3000/api/personas');
        const personasNoAdmin = res.data.filter((p: any) => p.vector_facial && p.estado === 'Activo' && p.tipo_persona !== 'Admin');

        const descriptores = personasNoAdmin
          .map((p: any) => {
            try {
              const vector = new Float32Array(JSON.parse(p.vector_facial));
              if (vector.length !== 128) return null;
              const label = `${p.id}|${p.primer_nombre} ${p.primer_apellido}`;
              return new faceapi.LabeledFaceDescriptors(label, [vector]);
            } catch (e) { return null; }
          })
          .filter((d: any) => d !== null);
        
        labeledDescriptors.current = descriptores;
        setModelosListos(true);
        setMensajeEstado(descriptores.length === 0 
          ? "⚠️ Sistema listo pero no hay personas con reconocimiento facial"
          : `✅ Sistema listo - ${descriptores.length} personas registradas`
        );
        
        cargarAccesos();
      } catch (error: any) {
        console.error("❌ Error cargando sistema:", error);
        setMensajeEstado("❌ Error al inicializar el sistema");
      }
    };
    
    cargarTodo();
    const intervaloLista = setInterval(cargarAccesos, 3000);
    return () => clearInterval(intervaloLista);
  }, []);

  // ====================================
  // 2. CARGAR ÚLTIMOS ACCESOS
  // ====================================
  const cargarAccesos = async () => {
    try {
      const res = await axios.get('http://localhost:3000/api/acceso/ultimos');
      if (res.data.accesos && res.data.accesos.length > 0) {
        setAccesos(res.data.accesos);
      }
    } catch (e) { console.error('❌ Error cargando accesos:', e); }
  };

  // ====================================
  // 3. DETECCIÓN FACIAL
  // ====================================
  // ====================================
// 3. DETECCIÓN FACIAL (OPTIMIZADA - SIN MEMORY LEAK)
// ====================================
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

      const detection = await faceapi
        .detectSingleFace(video, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (detection && labeledDescriptors.current.length > 0) {
        const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors.current, 0.6);
        const match = faceMatcher.findBestMatch(detection.descriptor);
        const resizedDetection = faceapi.resizeResults(detection, displaySize);
        const box = resizedDetection.detection.box;

        if (match.label !== 'unknown') {
          const [idPersona, nombreCompleto] = match.label.split('|');
          const confidenciaCalc = Math.round((1 - match.distance) * 100);
          setPersonaDetectada(nombreCompleto);
          setConfianza(confidenciaCalc);

          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 4;
          ctx.strokeRect(box.x, box.y, box.width, box.height);
          ctx.fillStyle = '#10b981';
          ctx.fillRect(box.x, box.y - 40, box.width, 40);
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 16px Arial';
          ctx.fillText(nombreCompleto, box.x + 5, box.y - 20);
          ctx.font = '12px Arial';
          ctx.fillText(`${confidenciaCalc}% confianza`, box.x + 5, box.y - 5);

          const landmarks = resizedDetection.landmarks.positions;
          ctx.fillStyle = '#10b981';
          landmarks.forEach((point: any) => {
            ctx.beginPath();
            ctx.arc(point.x, point.y, 2, 0, 2 * Math.PI);
            ctx.fill();
          });

          verificarYRegistrar(idPersona, nombreCompleto);
        } else {
          setPersonaDetectada(null);
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 4;
          ctx.strokeRect(box.x, box.y, box.width, box.height);
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(box.x, box.y - 35, box.width, 35);
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 14px Arial';
          ctx.fillText('Desconocido', box.x + 5, box.y - 12);
        }
      } else if (detection) {
        const resizedDetection = faceapi.resizeResults(detection, displaySize);
        const box = resizedDetection.detection.box;
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 4;
        ctx.strokeRect(box.x, box.y, box.width, box.height);
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(box.x, box.y - 35, box.width, 35);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px Arial';
        ctx.fillText('Sin registro', box.x + 5, box.y - 12);
      } else {
        setPersonaDetectada(null);
      }
    } catch (err) {
      console.error("Error en detección:", err);
    }
  };

  // ✅ LIMPIEZA CORRECTA DEL INTERVALO
  if (camaraActiva && modelosListos) {
    console.log("🎥 Iniciando detección facial cada 3 segundos");
    
    // ✅ Limpiar intervalo anterior si existe
    if (intervalId.current) {
      clearInterval(intervalId.current);
      intervalId.current = null;
    }
    
    // ✅ Crear nuevo intervalo
    intervalId.current = setInterval(detectarRostro, 3000);
    
  } else {
    // ✅ Detener cuando la cámara está inactiva
    console.log("🛑 Deteniendo detección facial");
    if (intervalId.current) {
      clearInterval(intervalId.current);
      intervalId.current = null;
    }
  }

  // ✅ CLEANUP FUNCTION - SE EJECUTA AL DESMONTAR O CAMBIAR DEPENDENCIAS
  return () => {
    console.log("🧹 Limpiando intervalo de detección facial");
    if (intervalId.current) {
      clearInterval(intervalId.current);
      intervalId.current = null;
    }
  };
}, [camaraActiva, modelosListos]); // ✅ Solo depende de estos estados

  // ====================================
  // 4. REGISTRAR ACCESO FACIAL
  // ====================================
  const verificarYRegistrar = async (idPersona: string, nombreCompleto: string) => {
    const ahora = Date.now();
    const ultimoRegistroPersona = ultimoRegistro.current[idPersona] || 0;
    const tiempoTranscurrido = ahora - ultimoRegistroPersona;
    
    if (tiempoTranscurrido >= 3000) {
      try {
        const fechaHoraActual = new Date();
        const año = fechaHoraActual.getFullYear();
        const mes = String(fechaHoraActual.getMonth() + 1).padStart(2, '0');
        const dia = String(fechaHoraActual.getDate()).padStart(2, '0');
        const hora = String(fechaHoraActual.getHours()).padStart(2, '0');
        const minutos = String(fechaHoraActual.getMinutes()).padStart(2, '0');
        const segundos = String(fechaHoraActual.getSeconds()).padStart(2, '0');
        const fechaFormateada = `${año}-${mes}-${dia} ${hora}:${minutos}:${segundos}`;
        
        await axios.post('http://localhost:3000/api/acceso', {
          persona_id: parseInt(idPersona),
          metodo: 'Reconocimiento Facial',
          fecha: fechaFormateada
        });
        
        ultimoRegistro.current[idPersona] = ahora;
        console.log(`✅ ACCESO REGISTRADO: ${nombreCompleto}`);
        await cargarAccesos();
      } catch (error) {
        console.error("❌ Error registrando acceso:", error);
      }
    }
  };

  // ====================================
  // 5. SISTEMA RFID DUAL
  // ====================================
  
  // Detectar tecla Enter o escaneo rápido (Arduino)
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!rfidActivo) return;
      
      // Si presiona Enter, procesar el código
      if (e.key === 'Enter' && codigoRFID.trim()) {
        e.preventDefault();
        procesarRFID(codigoRFID.trim(), 'fisica');
      }
    };

    window.addEventListener('keypress', handleKeyPress);
    return () => window.removeEventListener('keypress', handleKeyPress);
  }, [codigoRFID, rfidActivo]);

  // Autocompletar desde input oculto (Arduino enviará caracteres automáticamente)
  useEffect(() => {
    if (inputRFIDRef.current && rfidActivo) {
      inputRFIDRef.current.focus();
    }
  }, [rfidActivo]);

  const procesarRFID = async (codigo: string, tipo: 'fisica' | 'virtual') => {
    setEstadoRFID('procesando');
    setTipoLectura(tipo);
    setMensajeRFID(`${tipo === 'fisica' ? '💳' : '📱'} Verificando...`);

    try {
      const response = await axios.post('http://localhost:3000/api/acceso/rfid', {
        rfid_code: codigo
      });

      if (response.data.success) {
        setEstadoRFID('exito');
        setPersonaRFID(response.data.persona);
        setMensajeRFID(`✅ ${response.data.mensaje}`);
        
        // Resetear después de 3 segundos
        if (timeoutRFID.current) clearTimeout(timeoutRFID.current);
        timeoutRFID.current = setTimeout(() => {
          setEstadoRFID('esperando');
          setPersonaRFID(null);
          setTipoLectura(null);
          setMensajeRFID('Esperando tarjeta o código virtual...');
          setCodigoRFID('');
        }, 3000);

        await cargarAccesos();
      }
    } catch (error: any) {
      setEstadoRFID('error');
      setMensajeRFID(`❌ ${error.response?.data?.error || 'Tarjeta no registrada'}`);
      
      if (timeoutRFID.current) clearTimeout(timeoutRFID.current);
      timeoutRFID.current = setTimeout(() => {
        setEstadoRFID('esperando');
        setPersonaRFID(null);
        setTipoLectura(null);
        setMensajeRFID('Esperando tarjeta o código virtual...');
        setCodigoRFID('');
      }, 3000);
    }
  };

  const simularLecturaVirtual = () => {
    if (codigoRFID.trim()) {
      procesarRFID(codigoRFID.trim(), 'virtual');
    }
  };

  // ====================================
  // 6. MANEJO DE CÁMARA
  // ====================================
  const iniciarCamara = () => {
    setErrorCamara(null);
    setCamaraActiva(true);
  };

  const detenerCamara = () => {
    setCamaraActiva(false);
    setPersonaDetectada(null);
    setErrorCamara(null);
  };

  // ====================================
  // RENDERIZADO
  // ====================================
  return (
    <div className="space-y-6">
      
      {/* MÓDULOS PRINCIPALES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* ========== MÓDULO 1: RECONOCIMIENTO FACIAL ========== */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 text-white">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <Camera size={20}/> Reconocimiento Facial
            </h3>
            <p className="text-xs text-blue-100 mt-1">{mensajeEstado}</p>
          </div>

          <div className="p-4">
            <div className="bg-black rounded-xl overflow-hidden relative aspect-video flex items-center justify-center border-4 border-gray-800">
              {camaraActiva ? (
                <div className="relative w-full h-full">
                  <Webcam 
                    audio={false} 
                    ref={webcamRef} 
                    className="absolute w-full h-full object-cover"
                    videoConstraints={{ width: 1280, height: 720, facingMode: "user" }}
                    onUserMediaError={(error) => {
                      setErrorCamara("No se pudo acceder a la cámara");
                      setCamaraActiva(false);
                    }}
                  />
                  <canvas 
                    ref={canvasRef}
                    className="absolute top-0 left-0 w-full h-full pointer-events-none"
                    style={{ zIndex: 10 }}
                  />
                  {personaDetectada && (
                    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-4 py-2 rounded-full font-bold shadow-lg z-20 flex items-center gap-2 animate-pulse">
                      <UserCheck size={18}/>
                      <span className="text-sm">{personaDetectada}</span>
                      <span className="text-xs bg-white/20 px-2 py-0.5 rounded">{confianza}%</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-gray-500 p-8">
                  {errorCamara ? (
                    <>
                      <AlertCircle size={48} className="mx-auto mb-3 text-red-500"/>
                      <p className="text-sm font-bold text-red-500">{errorCamara}</p>
                    </>
                  ) : (
                    <>
                      <Camera size={48} className="mx-auto mb-3 opacity-50"/>
                      <p className="text-sm font-bold">{mensajeEstado}</p>
                      {!modelosListos && <Loader className="animate-spin mx-auto mt-3 text-blue-500" size={32} />}
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="mt-4 flex gap-2">
              <button 
                onClick={() => camaraActiva ? detenerCamara() : iniciarCamara()}
                disabled={!modelosListos}
                className={`flex-1 px-4 py-2 rounded-lg font-bold flex items-center justify-center gap-2 transition-all
                  ${camaraActiva 
                    ? 'bg-red-600 hover:bg-red-700 text-white' 
                    : 'bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-400'
                  }`}
              >
                {camaraActiva ? <><StopCircle size={18}/> Detener</> : <><PlayCircle size={18}/> Iniciar</>}
              </button>
            </div>
          </div>
        </div>

        {/* ========== MÓDULO 2: RFID DUAL (Físico + Virtual) ========== */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 p-4 text-white">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <CreditCard size={20}/> Acceso RFID Dual
            </h3>
            <p className="text-xs text-purple-100 mt-1">Tarjeta física o celular NFC</p>
          </div>

          <div className="p-6 space-y-4">
            
            {/* Estado Visual */}
            <div className={`rounded-xl p-8 text-center transition-all border-4 ${
              estadoRFID === 'esperando' ? 'bg-gray-50 border-gray-200' :
              estadoRFID === 'procesando' ? 'bg-blue-50 border-blue-300 animate-pulse' :
              estadoRFID === 'exito' ? 'bg-green-50 border-green-400' :
              'bg-red-50 border-red-400'
            }`}>
              {estadoRFID === 'esperando' && (
                <>
                  <div className="flex justify-center gap-8 mb-4">
                    <CreditCard size={48} className="text-purple-400 animate-bounce"/>
                    <Smartphone size={48} className="text-purple-400 animate-bounce" style={{ animationDelay: '0.2s' }}/>
                  </div>
                  <p className="text-gray-600 font-medium">{mensajeRFID}</p>
                </>
              )}

              {estadoRFID === 'procesando' && (
                <>
                  <Loader size={48} className="mx-auto mb-4 text-blue-500 animate-spin"/>
                  <p className="text-blue-700 font-bold">{mensajeRFID}</p>
                </>
              )}

              {estadoRFID === 'exito' && personaRFID && (
                <>
                  <UserCheck size={64} className="mx-auto mb-4 text-green-500"/>
                  <p className="text-2xl font-bold text-gray-800 mb-2">
                    {personaRFID.nombre}
                  </p>
                  <p className="text-green-600 font-bold mb-3">{mensajeRFID}</p>
                  <div className="flex items-center justify-center gap-2">
                    {tipoLectura === 'fisica' ? (
                      <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
                        <CreditCard size={14}/> Tarjeta Física
                      </span>
                    ) : (
                      <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
                        <Smartphone size={14}/> NFC Virtual
                      </span>
                    )}
                  </div>
                </>
              )}

              {estadoRFID === 'error' && (
                <>
                  <AlertCircle size={64} className="mx-auto mb-4 text-red-500"/>
                  <p className="text-red-600 font-bold">{mensajeRFID}</p>
                </>
              )}
            </div>

            {/* Input Oculto para Arduino */}
            <input 
              ref={inputRFIDRef}
              type="text"
              value={codigoRFID}
              onChange={(e) => setCodigoRFID(e.target.value)}
              className="w-full p-3 border-2 border-purple-300 rounded-lg text-center font-mono text-lg focus:outline-none focus:border-purple-500"
              placeholder="Esperando escaneo..."
              autoFocus
            />

            {/* Botón Manual para Simulación Virtual */}
            <button
              onClick={simularLecturaVirtual}
              disabled={!codigoRFID.trim() || estadoRFID === 'procesando'}
              className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Smartphone size={18}/>
              Simular NFC Virtual
            </button>

            {/* Info */}
            <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 border border-gray-200">
              <p className="font-bold mb-1 flex items-center gap-1">
                <Zap size={12} className="text-yellow-500"/> Modos de Acceso:
              </p>
              <ul className="space-y-1">
                <li>• <strong>Arduino:</strong> Acerca la tarjeta RFID al lector</li>
                <li>• <strong>Celular:</strong> Ingresa el código y presiona el botón</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* MONITOR DE ACCESOS */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <Clock size={18}/> Monitor en Vivo
          </h3>
          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold animate-pulse">
            LIVE • {accesos.length} registros
          </span>
        </div>
        
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto">
          {accesos.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-8 text-gray-400">
              <UserCheck size={48} className="mb-2"/>
              <p className="text-sm">Esperando accesos...</p>
            </div>
          ) : (
            accesos.map((acc) => (
              <div 
                key={acc.id} 
                className="flex items-center gap-3 p-3 hover:bg-blue-50 rounded-lg transition-all border border-gray-100"
              >
                {acc.foto_url ? (
                  <img 
                    src={acc.foto_url} 
                    className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm" 
                    alt="Foto"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-500">
                    {acc.primer_nombre?.[0]}
                  </div>
                )}
                
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-800 truncate text-sm">
                    {acc.primer_nombre} {acc.primer_apellido}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{acc.tipo_persona}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-bold text-purple-600">
                      {horaEcuador(acc.fecha)}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded border bg-blue-50 text-blue-600 border-blue-100">
                      {acc.metodo === 'Reconocimiento Facial' ? '📸' : '💳'} {acc.metodo}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}