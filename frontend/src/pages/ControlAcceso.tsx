import { useState, useEffect, useRef } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';
import * as faceapi from '@vladmandic/face-api';
import { Camera, Clock, UserCheck, PlayCircle, StopCircle, Loader, AlertCircle, CreditCard, Smartphone, Zap } from 'lucide-react';

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
  const intervalId = useRef<any>(null);
  const inputRFIDRef = useRef<HTMLInputElement>(null);
  const timeoutRFID = useRef<any>(null);

  // ====================================
  // FUNCIONES DE FORMATEO DE FECHA
  // ====================================
  const horaEcuador = (fechaISO: string) => {
    if (!fechaISO) return "--:--";
    const fecha = new Date(fechaISO);
    return fecha.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  };

  // ====================================
  // 1. CARGAR MODELOS Y PERSONAS
  // ====================================
  useEffect(() => {
    const cargarTodo = async () => {
      try {
        setMensajeEstado("⏳ Cargando modelos de IA...");
        const MODEL_URL = '/models';
        await Promise.all([
            faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
            faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        ]);
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
  // 3. REGISTRAR ACCESO FACIAL (CORREGIDO CON FOTO)
  // ====================================
  const verificarYRegistrar = async (idPersona: string, nombreCompleto: string, confianzaDetectada: number) => {
    const ahora = Date.now();
    const ultimoRegistroPersona = ultimoRegistro.current[idPersona] || 0;
    const tiempoTranscurrido = ahora - ultimoRegistroPersona;
    
    // ✅ TIEMPO ESPERA: 15 segundos para evitar spam
    if (tiempoTranscurrido >= 6000) {
      try {
        const fechaHoraActual = new Date();
        const año = fechaHoraActual.getFullYear();
        const mes = String(fechaHoraActual.getMonth() + 1).padStart(2, '0');
        const dia = String(fechaHoraActual.getDate()).padStart(2, '0');
        const hora = String(fechaHoraActual.getHours()).padStart(2, '0');
        const minutos = String(fechaHoraActual.getMinutes()).padStart(2, '0');
        const segundos = String(fechaHoraActual.getSeconds()).padStart(2, '0');
        const fechaFormateada = `${año}-${mes}-${dia} ${hora}:${minutos}:${segundos}`;
        
        // ✅ CAPTURAR FOTO (Requiere screenshotFormat en el componente)
        let fotoCapturada = null;
        if (webcamRef.current) {
          fotoCapturada = webcamRef.current.getScreenshot();
        }

        console.log(`📸 Foto facial capturada:`, fotoCapturada ? "SÍ" : "NO");

        // ✅ ENVIAR AL BACKEND
        await axios.post('http://localhost:3000/api/acceso', {
          persona_id: parseInt(idPersona),
          metodo: 'Reconocimiento Facial',
          fecha: fechaFormateada,
          foto_verificacion_base64: fotoCapturada, 
          confianza_facial: confianzaDetectada,
          dispositivo: 'Cámara Frontal'
        });
        
        ultimoRegistro.current[idPersona] = ahora;
        await cargarAccesos();
      } catch (error) {
        console.error("❌ Error registrando acceso:", error);
      }
    }
  };

  // ====================================
  // 4. DETECCIÓN FACIAL
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

            // Llamada a registrar con foto
            verificarYRegistrar(idPersona, nombreCompleto, confidenciaCalc);
          } else {
            setPersonaDetectada(null);
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 4;
            ctx.strokeRect(box.x, box.y, box.width, box.height);
          }
        }
      } catch (err) {
        console.error("Error en detección:", err);
      }
    };

    if (camaraActiva && modelosListos) {
      if (intervalId.current) clearInterval(intervalId.current);
      intervalId.current = setInterval(detectarRostro, 1000); // 1 segundo para no sobrecargar
    } else {
      if (intervalId.current) clearInterval(intervalId.current);
    }

    return () => {
      if (intervalId.current) clearInterval(intervalId.current);
    };
  }, [camaraActiva, modelosListos]);

  // ====================================
  // 5. SISTEMA RFID DUAL (AUTOMÁTICO + FOTO)
  // ====================================
  
  // ✅ AUTO-ENVÍO: Si el input tiene texto y dejas de escribir por 500ms, se envía solo.
  useEffect(() => {
    // Si hay código y no estamos procesando ni acabamos de tener éxito
    if (codigoRFID.trim() && estadoRFID === 'esperando') {
        const timeout = setTimeout(() => {
            console.log("⚡ Auto-enviando código detectado:", codigoRFID);
            procesarRFID(); // Llamada automática sin evento
        }, 500); // 500ms de "silencio" activa el envío

        return () => clearTimeout(timeout);
    }
  }, [codigoRFID, estadoRFID]);

  // ✅ MANTENER EL FOCO (Para que el Arduino siempre escriba)
  useEffect(() => {
    const mantenerFoco = () => {
        if (inputRFIDRef.current && document.activeElement !== inputRFIDRef.current) {
            inputRFIDRef.current.focus();
        }
    };
    // Revisa el foco cada 2 segundos
    const intervaloFoco = setInterval(mantenerFoco, 2000); 
    return () => clearInterval(intervaloFoco);
  }, []);

  // ✅ FUNCIÓN MEJORADA PARA RFID CON FOTO
  const procesarRFID = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!codigoRFID.trim() || estadoRFID === 'procesando') return;

    setEstadoRFID('procesando');
    setMensajeRFID('Verificando código...');

    try {
      // ✅ CAPTURAR FOTO SI LA CÁMARA ESTÁ PRENDIDA
      let fotoCapturada = null;
      if (webcamRef.current && camaraActiva) {
        fotoCapturada = webcamRef.current.getScreenshot();
      }
      
      console.log("📸 Foto RFID:", fotoCapturada ? "Capturada" : "No disponible");

      const response = await axios.post('http://localhost:3000/api/acceso/rfid', {
        rfid_code: codigoRFID.trim(),
        foto_verificacion_base64: fotoCapturada, // ✅ FOTO
        dispositivo: 'Terminal Acceso'
      });

      if (response.data.success) {
        setEstadoRFID('exito');
        setPersonaRFID(response.data.persona);
        setMensajeRFID(`✅ ${response.data.mensaje}`);
        
        // Determinar tipo visual para UI local
        setTipoLectura(codigoRFID.length > 10 ? 'fisica' : 'virtual'); 

        await cargarAccesos();
      }
    } catch (error: any) {
      setEstadoRFID('error');
      setMensajeRFID(`❌ ${error.response?.data?.error || 'Código no registrado'}`);
    } finally {
        setCodigoRFID(''); // Limpiar input para siguiente lectura
        
        if (timeoutRFID.current) clearTimeout(timeoutRFID.current);
        timeoutRFID.current = setTimeout(() => {
            setEstadoRFID('esperando');
            setPersonaRFID(null);
            setTipoLectura(null);
            setMensajeRFID('Esperando tarjeta o código virtual...');
        }, 3000);
    }
  };

  const simularLecturaVirtual = () => {
    // Ya no es necesario, pero lo dejo por si quieres probar manual
    if (codigoRFID.trim()) procesarRFID();
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
                    screenshotFormat="image/jpeg" /* 👈 OBLIGATORIO PARA FOTO */
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

        {/* ========== MÓDULO 2: RFID DUAL (AUTOMÁTICO) ========== */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 p-4 text-white">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <CreditCard size={20}/> Acceso RFID Dual
            </h3>
            <p className="text-xs text-purple-100 mt-1">Tarjeta física o App (Escucha Activa)</p>
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
                </>
              )}

              {estadoRFID === 'error' && (
                <>
                  <AlertCircle size={64} className="mx-auto mb-4 text-red-500"/>
                  <p className="text-red-600 font-bold">{mensajeRFID}</p>
                </>
              )}
            </div>

            {/* INPUT VISIBLE - MODO ESCUCHA */}
            <div className="relative w-full">
                <input 
                  ref={inputRFIDRef}
                  type="text"
                  value={codigoRFID}
                  onChange={(e) => setCodigoRFID(e.target.value)}
                  className="w-full p-4 border-2 border-purple-300 rounded-lg text-center font-mono text-xl focus:outline-none focus:border-purple-500 bg-gray-50"
                  placeholder="ESPERANDO CÓDIGO..."
                  autoFocus
                  onBlur={(e) => {
                      // Truco: Reenfocar inmediatamente si se pierde el foco (para Arduino)
                      setTimeout(() => e.target.focus(), 10);
                  }}
                />
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                    <Zap className="text-yellow-500 animate-pulse" />
                </div>
            </div>

            <p className="text-center text-xs text-gray-400">
                * Sistema detecta automáticamente el código. No requiere pulsar Enter.
            </p>
            
            <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 border border-gray-200 mt-2">
              <p className="font-bold mb-1 flex items-center gap-1">
                <Zap size={12} className="text-yellow-500"/> Nota sobre Fotos RFID:
              </p>
              <p>Para que se guarde la foto al usar tarjeta, la <strong>Cámara debe estar Iniciada</strong> en la sección izquierda.</p>
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
                {acc.foto_verificacion_base64 ? (
                  <img 
                    src={acc.foto_verificacion_base64} 
                    className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm" 
                    alt="Foto"
                  />
                ) : acc.foto_url ? (
                  <img 
                    src={acc.foto_url} 
                    className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm" 
                    alt="Foto Perfil"
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
                      {acc.metodo}
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