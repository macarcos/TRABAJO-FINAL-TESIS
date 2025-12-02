import { useState, useRef, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';
import { useForm } from 'react-hook-form';
import * as faceapi from '@vladmandic/face-api';
import { Camera, Save, RefreshCw, User, CreditCard, Mail, Phone, ScanLine, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function RegistroPersonas() {
  const { register, handleSubmit, reset, formState: { errors } } = useForm();
  
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intervalRef = useRef<any>(null);
  
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [modelosListos, setModelosListos] = useState(false);
  const [rostroDetectado, setRostroDetectado] = useState(false);
  const [errorModelos, setErrorModelos] = useState('');

  const videoConstraints = { 
    width: 1280, 
    height: 720, 
    facingMode: "user" 
  };

  // ========================================
  // 1. CARGAR MODELOS DESDE CDN
  // ========================================
  useEffect(() => {
    const cargarModelos = async () => {
      const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model';
      
      try {
        console.log("🔄 Cargando modelos de IA desde CDN...");
        
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        ]);
        
        setModelosListos(true);
        console.log("✅ Modelos cargados correctamente");
        
      } catch (error) {
        console.error("❌ Error cargando modelos:", error);
        setErrorModelos("No se pudieron cargar los modelos de IA. Verifica tu conexión a internet.");
      }
    };
    
    cargarModelos();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // ========================================
  // 2. DETECCIÓN FACIAL EN TIEMPO REAL
  // ========================================
  const handleVideoOnPlay = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(async () => {
      if (!webcamRef.current?.video || !canvasRef.current || !modelosListos) {
        return;
      }

      const video = webcamRef.current.video;

      if (video.readyState !== 4 || video.videoWidth < 10 || video.videoHeight < 10) {
        return;
      }

      try {
        const displaySize = { 
          width: video.videoWidth, 
          height: video.videoHeight 
        };

        faceapi.matchDimensions(canvasRef.current, displaySize);

        const detection = await faceapi
          .detectSingleFace(video, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
          .withFaceLandmarks();

        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, displaySize.width, displaySize.height);

        if (detection) {
          setRostroDetectado(true);
          
          try {
            const resizedDetections = faceapi.resizeResults(detection, displaySize);
            const box = resizedDetections.detection.box;
            
            // ✅ VALIDACIÓN CRÍTICA: Verificar que box tiene valores válidos
            if (
              box && 
              Number.isFinite(box.x) && 
              Number.isFinite(box.y) &&
              Number.isFinite(box.width) && 
              Number.isFinite(box.height) &&
              box.width > 0 && 
              box.height > 0
            ) {
              // Dibujar rectángulo verde
              ctx.strokeStyle = '#10b981';
              ctx.lineWidth = 3;
              ctx.strokeRect(box.x, box.y, box.width, box.height);
              
              // Dibujar puntos de referencia faciales
              const landmarks = resizedDetections.landmarks.positions;
              if (landmarks && Array.isArray(landmarks)) {
                ctx.fillStyle = '#10b981';
                landmarks.forEach((point: any) => {
                  if (Number.isFinite(point.x) && Number.isFinite(point.y)) {
                    ctx.beginPath();
                    ctx.arc(point.x, point.y, 2, 0, 2 * Math.PI);
                    ctx.fill();
                  }
                });
              }
            } else {
              // Si el box no es válido, limpiar estado
              setRostroDetectado(false);
            }
          } catch (drawError) {
            console.warn("⚠️ Error dibujando detección:", drawError);
            ctx.clearRect(0, 0, displaySize.width, displaySize.height);
            setRostroDetectado(false);
          }

        } else {
          setRostroDetectado(false);
        }
        
      } catch (err) {
        // Ignorar errores durante estabilización
      }
      
    }, 500); // ✅ 500ms para mayor estabilidad
    
  }, [modelosListos]);

  // ========================================
  // 3. CAPTURAR FOTO
  // ========================================
  const capturar = useCallback(() => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      setImgSrc(imageSrc);
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
  }, []);

  // ========================================
  // 4. REINICIAR CÁMARA
  // ========================================
  const reiniciarCamara = () => {
    setImgSrc(null);
    setRostroDetectado(false);
    
    setTimeout(() => {
      handleVideoOnPlay();
    }, 500);
  };

  // ========================================
  // 5. ENVIAR FORMULARIO
  // ========================================
  const onSubmit = async (data: any) => {
    if (!imgSrc) {
      alert("⚠️ Debe capturar una foto válida.");
      return;
    }
    
    setCargando(true);
    
    try {
      const img = document.createElement('img');
      img.src = imgSrc;
      
      await new Promise((resolve) => { 
        img.onload = resolve; 
      });

      const detection = await faceapi
        .detectSingleFace(img, new faceapi.SsdMobilenetv1Options())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        throw new Error("No se detectó un rostro claro. La foto no es válida. Intente nuevamente.");
      }

      const vectorFacial = Array.from(detection.descriptor);

      const payload = {
        primer_nombre: data.primer_nombre,
        segundo_nombre: data.segundo_nombre || null,
        primer_apellido: data.primer_apellido,
        segundo_apellido: data.segundo_apellido || null,
        cedula: data.cedula,
        correo: data.correo,
        telefono: data.telefono || null,
        tipo_persona: data.tipo_persona,
        rfid_code: data.rfid_code || null,
        foto_base64: imgSrc,
        vector_facial: vectorFacial
      };

      const res = await axios.post('http://localhost:3000/api/registrar', payload);
      
      alert(`✅ Registro Exitoso!\n\nNombre: ${data.primer_nombre} ${data.primer_apellido}\nUsuario: ${res.data.usuario || res.data.id}`);
      
      reset();
      reiniciarCamara();

    } catch (error: any) {
      console.error("❌ Error en registro:", error);
      const msg = error.response?.data?.error || error.message || "Error al registrar";
      alert(`❌ Error: ${msg}`);
    } finally {
      setCargando(false);
    }
  };

  // ========================================
  // 6. MANEJAR ERROR DE CÁMARA
  // ========================================
  const handleUserMediaError = (error: any) => {
    console.error("❌ Error de cámara:", error);
    alert("No se pudo acceder a la cámara. Verifica los permisos del navegador.");
  };

  // ========================================
  // RENDERIZADO
  // ========================================
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 rounded-xl shadow-lg text-white">
          <h2 className="text-3xl font-bold">📋 Registro de Personas</h2>
          <p className="text-purple-100 mt-2">Sistema de Identificación Facial con Inteligencia Artificial</p>
        </div>

        {errorModelos && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
            <div className="flex items-center gap-3">
              <AlertCircle className="text-red-500 flex-shrink-0" size={24} />
              <div>
                <p className="text-red-800 font-semibold">{errorModelos}</p>
                <p className="text-red-600 text-sm mt-1">Verifica tu conexión a internet y recarga la página.</p>
              </div>
            </div>
          </div>
        )}

        {!modelosListos && !errorModelos && (
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg animate-pulse">
            <p className="text-blue-800 font-semibold">🔄 Cargando modelos de Inteligencia Artificial...</p>
            <p className="text-blue-600 text-sm mt-1">Esto puede tardar unos segundos la primera vez.</p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-8 rounded-xl shadow-lg border border-gray-200">
          
          <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2 border-b pb-3">
            <User className="text-purple-600" size={24}/>
            Datos Personales
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div>
              <input 
                {...register("primer_nombre", { required: "Campo requerido" })} 
                placeholder="Primer Nombre *" 
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
              />
              {errors.primer_nombre && <p className="text-red-500 text-xs mt-1">{errors.primer_nombre.message as string}</p>}
            </div>
            
            <input 
              {...register("segundo_nombre")} 
              placeholder="Segundo Nombre" 
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
            />
            
            <div>
              <input 
                {...register("primer_apellido", { required: "Campo requerido" })} 
                placeholder="Primer Apellido *" 
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
              />
              {errors.primer_apellido && <p className="text-red-500 text-xs mt-1">{errors.primer_apellido.message as string}</p>}
            </div>
            
            <input 
              {...register("segundo_apellido")} 
              placeholder="Segundo Apellido" 
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div>
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20}/>
                <input 
                  {...register("cedula", { 
                    required: "Cédula requerida",
                    pattern: {
                      value: /^09\d{8}$/,
                      message: "Debe comenzar con 09 y tener 10 dígitos exactos"
                    }
                  })} 
                  placeholder="Ej: 0912345678 *" 
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
                  maxLength={10}
                  inputMode="numeric"
                  onInput={(e) => {
                    const valor = e.currentTarget.value.replace(/\D/g, '').slice(0, 10);
                    e.currentTarget.value = valor;
                  }}
                />
              </div>
              {errors.cedula && <p className="text-red-500 text-xs mt-1">{errors.cedula.message as string}</p>}
            </div>
            
            <div>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20}/>
                <input 
                  {...register("correo", { 
                    required: "Correo requerido",
                    pattern: {
                      value: /@unemi\.edu\.ec$/,
                      message: "Debe ser correo @unemi.edu.ec"
                    }
                  })} 
                  placeholder="correo@unemi.edu.ec *" 
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
                />
              </div>
              {errors.correo && <p className="text-red-500 text-xs mt-1">{errors.correo.message as string}</p>}
            </div>
            
            <div>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20}/>
                <input 
                  {...register("telefono", {
                    pattern: {
                      value: /^09\d{8}$/,
                      message: "Debe comenzar con 09 y tener 10 dígitos exactos"
                    }
                  })} 
                  placeholder="Ej: 0987654321 (Opcional)" 
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
                  maxLength={10}
                  inputMode="numeric"
                  onInput={(e) => {
                    const valor = e.currentTarget.value.replace(/\D/g, '').slice(0, 10);
                    e.currentTarget.value = valor;
                  }}
                />
              </div>
              {errors.telefono && <p className="text-red-500 text-xs mt-1">{errors.telefono.message as string}</p>}
            </div>
          </div>

          <div className="mb-8">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Tipo de Persona *</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
              <select 
                {...register("tipo_persona", { required: "Seleccione un tipo" })} 
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition cursor-pointer bg-white"
              >
                <option value="">-- Seleccione un Rol --</option>
                <option value="Estudiante">🎓 Estudiante</option>
                <option value="Docente">👨‍🏫 Docente</option>
                <option value="Administrativo">💼 Administrativo</option>
                <option value="General">🛡️ Personal General</option>
              </select>
            </div>
            {errors.tipo_persona && <p className="text-red-500 text-xs mt-1">{errors.tipo_persona.message as string}</p>}
          </div>

          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2 border-b pb-3">
            <ScanLine className="text-blue-600" size={24}/>
            Tarjeta RFID (Opcional)
          </h3>
          
          <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 mb-8">
            <div className="relative">
              <input 
                {...register("rfid_code")} 
                placeholder="Código RFID (deja vacío si no tiene tarjeta)" 
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition font-mono text-center bg-white"
              />
            </div>
          </div>

          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2 border-b pb-3">
            <Camera className="text-green-600" size={24}/>
            Registro Facial con IA
          </h3>

          <div className="flex flex-col xl:flex-row gap-8 items-start">
            
            <div className="w-full xl:w-2/3 aspect-video bg-black rounded-xl overflow-hidden relative border-4 border-gray-200 shadow-xl">
              {!imgSrc ? (
                <>
                  <Webcam
                    audio={false}
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    videoConstraints={videoConstraints}
                    className="absolute w-full h-full object-cover transform scale-x-[-1]"
                    onUserMedia={handleVideoOnPlay}
                    onUserMediaError={handleUserMediaError}
                  />
                  <canvas 
                    ref={canvasRef} 
                    className="absolute w-full h-full transform scale-x-[-1] pointer-events-none" 
                  />
                </>
              ) : (
                <img 
                  src={imgSrc} 
                  alt="Captura" 
                  className="absolute w-full h-full object-cover transform scale-x-[-1]" 
                />
              )}
              
              <div className="absolute top-4 left-4 z-20">
                {!imgSrc && (
                  rostroDetectado ? (
                    <span className="bg-green-500 text-white px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 shadow-lg animate-pulse">
                      <CheckCircle2 size={16}/> Rostro Detectado
                    </span>
                  ) : (
                    <span className="bg-red-500 text-white px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 shadow-lg">
                      <AlertCircle size={16}/> Buscando rostro...
                    </span>
                  )
                )}
              </div>

              <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-10 flex gap-3">
                {!imgSrc ? (
                  <button 
                    type="button" 
                    onClick={capturar} 
                    disabled={!rostroDetectado || !modelosListos} 
                    className={`px-8 py-4 rounded-full shadow-2xl flex items-center gap-3 transition font-bold text-lg border-2 border-white/30
                      ${rostroDetectado && modelosListos ? 'bg-green-500 hover:bg-green-600 text-white cursor-pointer' : 'bg-gray-500 text-gray-300 cursor-not-allowed'}`}
                  >
                    <Camera size={24}/> 
                    {!modelosListos ? "Cargando IA..." : (rostroDetectado ? "Capturar Rostro" : "Mire a la cámara")}
                  </button>
                ) : (
                  <button 
                    type="button" 
                    onClick={reiniciarCamara} 
                    className="bg-white text-gray-800 px-8 py-4 rounded-full shadow-2xl flex items-center gap-3 hover:bg-gray-100 transition font-bold text-lg"
                  >
                    <RefreshCw size={22}/> Repetir Foto
                  </button>
                )}
              </div>
            </div>
            
            <div className="w-full xl:w-1/3 bg-gradient-to-br from-blue-50 to-purple-50 p-6 rounded-xl border-2 border-blue-200 shadow-lg">
              <h4 className="font-bold text-blue-900 mb-4 text-lg flex items-center gap-2">
                <AlertCircle size={20}/> Instrucciones Importantes
              </h4>
              <ul className="space-y-3 text-blue-900 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-green-500 font-bold">✓</span>
                  <span>Mire directamente a la cámara</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 font-bold">✓</span>
                  <span>Asegúrese de tener buena iluminación</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 font-bold">✓</span>
                  <span>Espere a que aparezca el cuadro verde</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 font-bold">✗</span>
                  <span>No use lentes oscuros o gorras</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 font-bold">✗</span>
                  <span>Evite movimientos bruscos</span>
                </li>
              </ul>
              
              {imgSrc && (
                <div className="mt-4 p-3 bg-green-100 border border-green-300 rounded-lg">
                  <p className="text-green-800 font-semibold text-sm text-center">
                    ✅ Foto capturada exitosamente
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-gray-200 flex justify-end">
            <button 
              type="submit" 
              disabled={cargando || !imgSrc} 
              className={`flex items-center gap-3 px-10 py-4 rounded-xl font-bold shadow-lg text-lg transition-all
                ${cargando || !imgSrc ? 'bg-gray-400 text-gray-200 cursor-not-allowed' : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 shadow-purple-500/50'}`}
            >
              {cargando ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Guardando...
                </>
              ) : (
                <>
                  <Save size={24}/> Registrar Persona
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}