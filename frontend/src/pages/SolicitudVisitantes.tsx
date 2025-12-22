import { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Camera, Send, CheckCircle2, Upload, FileText, X, ScanFace, Mail, Phone, CreditCard, AlertCircle } from 'lucide-react';

export default function SolicitudVisitante() {
  const [step, setStep] = useState(1); // 1: Formulario, 2: Foto, 3: Enviado
  const [loading, setLoading] = useState(false);
  const [fotoCapturada, setFotoCapturada] = useState<string | null>(null);
  
  // ESTADOS DE DOCUMENTO Y ERRORES UI
  const [documento, setDocumento] = useState<{ nombre: string, base64: string } | null>(null);
  const [errorDoc, setErrorDoc] = useState('');
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [showToast, setShowToast] = useState(false);

  const webcamRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraError, setCameraError] = useState('');

  const [formData, setFormData] = useState({
    primer_nombre: '', segundo_nombre: '', primer_apellido: '', segundo_apellido: '',
    cedula: '', correo: '', telefono: '', descripcion: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const lanzarToast = (tipo: string, texto: string) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setShowToast(true), 10);
    setTimeout(() => {
        setShowToast(false);
        setTimeout(() => setMensaje({ tipo: '', texto: '' }), 500);
    }, 4000);
  };

  // FUNCIÓN PARA MANEJAR EL ARCHIVO
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setErrorDoc('');

    if (file) {
      const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!validTypes.includes(file.type)) {
        setErrorDoc('⚠️ Formato no permitido. Solo se acepta PDF, JPG o PNG.');
        e.target.value = '';
        setDocumento(null);
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setErrorDoc('⚠️ El archivo es muy pesado. Máximo 5MB.');
        e.target.value = '';
        setDocumento(null);
        return;
      }

      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        setDocumento({ nombre: file.name, base64: reader.result as string });
      };
      reader.onerror = () => {
        setErrorDoc('Error al leer el archivo');
      };
    }
  };

  const iniciarCamara = async () => {
    if (!formData.primer_nombre || !formData.primer_apellido || !formData.cedula || !formData.correo || !formData.descripcion) {
        lanzarToast("error", "Completa todos los campos obligatorios.");
        return;
    }

    if (!documento) {
        lanzarToast("error", "Es obligatorio adjuntar un documento de identificación o invitación.");
        return;
    }

    setStep(2); 
  };

  // Efecto para iniciar la cámara cuando el componente del paso 2 se monta
  useEffect(() => {
    let stream: MediaStream | null = null;

    const startVideo = async () => {
      if (step === 2 && webcamRef.current) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' 
            } 
          });
          if (webcamRef.current) {
            webcamRef.current.srcObject = stream;
          }
        } catch (error) {
          console.error("Error cámara:", error);
          setCameraError('❌ No se pudo acceder a la cámara. Verifique permisos.');
        }
      }
    };

    startVideo();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [step]);

  const capturarFoto = () => {
    if (webcamRef.current && canvasRef.current) {
      const video = webcamRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const context = canvas.getContext('2d');
      if (context) {
        context.translate(canvas.width, 0);
        context.scale(-1, 1);
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const fotoBase64 = canvas.toDataURL('image/jpeg', 0.9); 
        setFotoCapturada(fotoBase64);
      }
    }
  };

  const repetirFoto = () => {
    setFotoCapturada(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fotoCapturada) {
      lanzarToast('error', 'Debes capturar una foto de tu rostro');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        ...formData,
        foto_base64: fotoCapturada,
        documento_base64: documento?.base64,
        nombre_documento: documento?.nombre
      };

      const response = await axios.post('http://localhost:3000/api/visitantes/solicitar', payload);

      if (response.data.success) {
        setStep(3);
        
        setFormData({
            primer_nombre: '', segundo_nombre: '', primer_apellido: '', segundo_apellido: '',
            cedula: '', correo: '', telefono: '', descripcion: ''
        });
        setFotoCapturada(null);
        setDocumento(null);

        setTimeout(() => {
          window.location.href = '/';
        }, 5000);
      }
    } catch (error: any) {
      // 🚨 Muestra el error específico de la validación del Backend
      const msg = error.response?.data?.error || 'Error al enviar solicitud. Inténtalo de nuevo.';
      lanzarToast('error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    // CAMBIO: Fondo neutro para contrastar, padding reducido
    <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
      
      {/* TOAST NOTIFICACIÓN */}
      {mensaje.texto && (
        <div 
            className={`fixed top-4 right-4 z-50 shadow-xl rounded-lg p-3 w-72 border-l-4 flex items-center justify-between gap-3 bg-white 
            transition-all duration-500 ease-in-out transform 
            ${showToast ? 'translate-x-0 opacity-100' : 'translate-x-[150%] opacity-0'}
            ${mensaje.tipo === 'success' ? 'border-green-500 text-gray-800' : 'border-red-500 text-gray-800'}`}
        >
            <div className="flex items-center gap-3">
              <div className={`p-1.5 rounded-full ${mensaje.tipo === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                {mensaje.tipo === 'success' ? <CheckCircle2 size={18}/> : <AlertCircle size={18}/>}
              </div>
              <div>
                <h4 className="font-bold text-xs">{mensaje.tipo === 'success' ? '¡Éxito!' : 'Error'}</h4>
                <p className="text-[11px] text-gray-600 leading-tight">{mensaje.texto}</p>
              </div>
            </div>
            <button onClick={() => setShowToast(false)} className="text-gray-400 hover:text-gray-600"><X size={14}/></button>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-xl max-w-xl w-full p-6 relative overflow-hidden border-t-4 border-orange-500">
        
        {/* STEP 1: FORMULARIO */}
        {step === 1 && (
          <form onSubmit={(e) => { e.preventDefault(); iniciarCamara(); }} className="space-y-4 relative z-10">
            <div className="border-b border-gray-100 pb-3 mb-3">
                <h2 className="text-2xl font-bold text-blue-900 mb-1 flex items-center gap-2">
                    <FileText size={24} className="text-orange-500"/> Solicitar Acceso
                </h2>
                <p className="text-gray-600 text-xs">Complete sus datos para el registro temporal.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input type="text" name="primer_nombre" placeholder="Primer Nombre *" required 
                value={formData.primer_nombre} onChange={handleInputChange}
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-none"
              />
              <input type="text" name="segundo_nombre" placeholder="Segundo Nombre" 
                value={formData.segundo_nombre} onChange={handleInputChange}
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-none"
              />
              <input type="text" name="primer_apellido" placeholder="Primer Apellido *" required 
                value={formData.primer_apellido} onChange={handleInputChange}
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-none"
              />
              <input type="text" name="segundo_apellido" placeholder="Segundo Apellido" 
                value={formData.segundo_apellido} onChange={handleInputChange}
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-none"
              />
              
              <div className="relative">
                <CreditCard size={14} className="absolute left-3 top-2.5 text-gray-400"/>
                <input type="text" name="cedula" placeholder="Cédula *" required maxLength={10}
                  value={formData.cedula} onChange={handleInputChange}
                  className="pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-none w-full"
                />
              </div>

              <div className="relative">
                <Mail size={14} className="absolute left-3 top-2.5 text-gray-400"/>
                <input type="email" name="correo" placeholder="Correo *" required 
                  value={formData.correo} onChange={handleInputChange}
                  className="pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-none w-full"
                />
              </div>

              <div className="relative">
                <Phone size={14} className="absolute left-3 top-2.5 text-gray-400"/>
                <input type="tel" name="telefono" placeholder="Teléfono *" required maxLength={10}
                  value={formData.telefono} onChange={handleInputChange}
                  className="pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-none w-full"
                />
              </div>
            </div>

            <textarea name="descripcion" placeholder="Motivo de la visita *" required rows={3}
              value={formData.descripcion} onChange={handleInputChange}
              className="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none resize-none"
            />

            {/* SECCIÓN DOCUMENTO */}
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <label className="block text-xs font-bold text-gray-700 mb-2 flex items-center gap-2 uppercase">
                    <Upload size={16} className="text-orange-500"/> 
                    Documento de Respaldo (PDF o Imagen) *
                </label>
                
                {!documento ? (
                    <div className="relative">
                        <input 
                            type="file" 
                            accept=".pdf, .jpg, .jpeg, .png" 
                            onChange={handleFileChange}
                            className="block w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-blue-900 file:text-white hover:file:bg-blue-800 cursor-pointer"
                        />
                        {errorDoc && <p className="text-red-600 text-[10px] font-bold mt-2">{errorDoc}</p>}
                    </div>
                ) : (
                    <div className="flex items-center justify-between bg-white p-2 rounded border border-blue-200">
                        <div className="flex items-center gap-2 overflow-hidden">
                            <FileText size={18} className="text-blue-900 flex-shrink-0"/>
                            <span className="text-sm font-medium text-gray-700 truncate">{documento.nombre}</span>
                        </div>
                        <button type="button" onClick={() => setDocumento(null)} className="text-gray-400 hover:text-red-500">
                            <X size={18}/>
                        </button>
                    </div>
                )}
            </div>

            {/* BOTÓN SUBMIT PRINCIPAL */}
            <button type="submit" className="w-full bg-gradient-to-r from-blue-900 to-blue-800 text-white py-3 rounded-lg font-bold hover:shadow-lg transition shadow-md flex items-center justify-center gap-2 text-base">
              Siguiente: Registro Facial <ScanFace size={20}/>
            </button>
          </form>
        )}

        {/* STEP 2: FOTO BIOMÉTRICA */}
        {step === 2 && (
          <div className="space-y-4 text-center animate-fadeIn">
            <div className="border-b border-gray-100 pb-3 mb-3">
                <h2 className="text-2xl font-bold text-blue-900 mb-1">📸 Registro Biométrico</h2>
                <p className="text-gray-600 text-xs">Mire directamente a la cámara para habilitar su acceso temporal.</p>
            </div>

            {cameraError && (
                <div className="bg-red-50 text-red-700 p-3 rounded-lg flex items-center gap-2 justify-center text-sm font-bold border border-red-200">
                    <X size={18} /> {cameraError}
                </div>
            )}

            {!fotoCapturada ? (
              <div className="space-y-3">
                {/* WEBCAM CONTAINER */}
                <div className="relative mx-auto bg-black rounded-xl overflow-hidden shadow-xl aspect-square h-64 border-4 border-orange-500">
                    <video 
                        ref={webcamRef} 
                        autoPlay 
                        playsInline 
                        muted 
                        className="absolute w-full h-full object-cover transform scale-x-[-1]" 
                    />
                    {/* Guía visual */}
                    <div className="absolute inset-0 border-4 border-white/50 rounded-xl pointer-events-none"></div>
                </div>
                
                <p className="text-xs text-gray-500">Asegúrese de tener buena iluminación</p>
                
                <button onClick={capturarFoto} className="w-full max-w-sm mx-auto bg-orange-500 text-white py-2.5 rounded-lg font-bold hover:bg-orange-600 transition flex items-center justify-center gap-2 shadow-md text-sm">
                  <Camera size={18} /> Capturar Foto
                </button>
                <button onClick={() => setStep(1)} className="text-gray-500 underline text-xs">
                    Volver al formulario
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {/* CAPTURA PREVIEW */}
                <div className="relative mx-auto rounded-xl overflow-hidden shadow-xl aspect-square h-64 border-4 border-green-500">
                    <img src={fotoCapturada} alt="Captura" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                        <CheckCircle2 size={40} className="text-white drop-shadow-lg" />
                    </div>
                </div>
                
                <p className="font-bold text-green-600 text-sm">¡Captura Exitosa!</p>
                
                <div className="flex gap-3 justify-center">
                  <button onClick={repetirFoto} className="px-5 py-2 bg-gray-200 text-gray-700 rounded-lg font-bold hover:bg-gray-300 transition text-sm">
                    Repetir
                  </button>
                  {/* BOTÓN FINALIZAR */}
                  <button onClick={handleSubmit} disabled={loading} className="px-5 py-2 bg-gradient-to-r from-blue-900 to-blue-800 text-white rounded-lg font-bold hover:shadow-lg transition disabled:bg-gray-400 shadow-md flex items-center gap-2 text-sm">
                    {loading ? 'Enviando...' : <>Finalizar Solicitud <Send size={18}/></>}
                  </button>
                </div>
              </div>
            )}

            <canvas ref={canvasRef} className="hidden" />
          </div>
        )}

        {/* STEP 3: CONFIRMACIÓN */}
        {step === 3 && (
          <div className="text-center space-y-4 py-8">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto animate-bounce">
                <CheckCircle2 size={50} className="text-green-600" />
            </div>
            <div>
                <h2 className="text-2xl font-bold text-blue-900 mb-1">¡Solicitud Recibida!</h2>
                <p className="text-gray-600 max-w-sm mx-auto text-sm">
                    Su petición ha sido enviada a administración para su revisión.
                </p>
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-xs font-medium max-w-sm mx-auto">
                    ⚠️ <strong>Importante:</strong> Su acceso será válido únicamente por <strong>24 horas</strong> si es aprobada.
                </div>
            </div>
            <p className="text-sm text-blue-600 font-bold mt-4">Redirigiendo al inicio...</p>
          </div>
        )}
      </div>
    </div>
  );
}