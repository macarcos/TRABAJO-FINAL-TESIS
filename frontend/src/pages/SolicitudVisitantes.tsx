import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Camera, Send, CheckCircle2, Upload, FileText, X, ScanFace, Mail, Phone, CreditCard, AlertCircle, MapPin, Globe, ChevronDown } from 'lucide-react';

// 🇪🇨 LISTA DE PROVINCIAS (Diseño limpio con Iconos Numéricos)
const PROVINCIAS = [
  { codigo: '01', nombre: 'Azuay' }, { codigo: '02', nombre: 'Bolívar' }, { codigo: '03', nombre: 'Cañar' },
  { codigo: '04', nombre: 'Carchi' }, { codigo: '05', nombre: 'Cotopaxi' }, { codigo: '06', nombre: 'Chimborazo' },
  { codigo: '07', nombre: 'El Oro' }, { codigo: '08', nombre: 'Esmeraldas' }, { codigo: '09', nombre: 'Guayas' },
  { codigo: '10', nombre: 'Imbabura' }, { codigo: '11', nombre: 'Loja' }, { codigo: '12', nombre: 'Los Ríos' },
  { codigo: '13', nombre: 'Manabí' }, { codigo: '14', nombre: 'Morona Santiago' }, { codigo: '15', nombre: 'Napo' },
  { codigo: '16', nombre: 'Pastaza' }, { codigo: '17', nombre: 'Pichincha' }, { codigo: '18', nombre: 'Tungurahua' },
  { codigo: '19', nombre: 'Zamora Chinchipe' }, { codigo: '20', nombre: 'Galápagos' }, { codigo: '21', nombre: 'Sucumbíos' },
  { codigo: '22', nombre: 'Orellana' }, { codigo: '23', nombre: 'Santo Domingo' }, { codigo: '24', nombre: 'Santa Elena' },
];

// 🌎 LISTA DE PAÍSES CON CÓDIGO ISO (Para cargar la imagen real de la bandera)
const PAISES = [
    { nombre: "Ecuador", dial: "+593", iso: "ec" },
    { nombre: "EE.UU.", dial: "+1", iso: "us" },
    { nombre: "España", dial: "+34", iso: "es" },
    { nombre: "Alemania", dial: "+49", iso: "de" },
    { nombre: "Argentina", dial: "+54", iso: "ar" },
    { nombre: "Bolivia", dial: "+591", iso: "bo" },
    { nombre: "Brasil", dial: "+55", iso: "br" },
    { nombre: "Canadá", dial: "+1", iso: "ca" },
    { nombre: "Chile", dial: "+56", iso: "cl" },
    { nombre: "China", dial: "+86", iso: "cn" },
    { nombre: "Colombia", dial: "+57", iso: "co" },
    { nombre: "Costa Rica", dial: "+506", iso: "cr" },
    { nombre: "Cuba", dial: "+53", iso: "cu" },
    { nombre: "El Salvador", dial: "+503", iso: "sv" },
    { nombre: "Francia", dial: "+33", iso: "fr" },
    { nombre: "Guatemala", dial: "+502", iso: "gt" },
    { nombre: "Honduras", dial: "+504", iso: "hn" },
    { nombre: "Italia", dial: "+39", iso: "it" },
    { nombre: "Japón", dial: "+81", iso: "jp" },
    { nombre: "México", dial: "+52", iso: "mx" },
    { nombre: "Nicaragua", dial: "+505", iso: "ni" },
    { nombre: "Panamá", dial: "+507", iso: "pa" },
    { nombre: "Paraguay", dial: "+595", iso: "py" },
    { nombre: "Perú", dial: "+51", iso: "pe" },
    { nombre: "Portugal", dial: "+351", iso: "pt" },
    { nombre: "Reino Unido", dial: "+44", iso: "gb" },
    { nombre: "Rep. Dom.", dial: "+1-809", iso: "do" },
    { nombre: "Rusia", dial: "+7", iso: "ru" },
    { nombre: "Uruguay", dial: "+598", iso: "uy" },
    { nombre: "Venezuela", dial: "+58", iso: "ve" },
    { nombre: "Otro", dial: "other", iso: "globe" } 
];

export default function SolicitudVisitante() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [fotoCapturada, setFotoCapturada] = useState<string | null>(null);
  
  // ESTADOS LÓGICOS
  const [esExtranjero, setEsExtranjero] = useState(false);
  
  // MENÚS DESPLEGABLES PERSONALIZADOS
  const [mostrarMenuPaises, setMostrarMenuPaises] = useState(false);
  const [mostrarMenuProvincias, setMostrarMenuProvincias] = useState(false);
  
  // ESTADO PARA PREFIJO MANUAL
  const [prefijoManual, setPrefijoManual] = useState('');

  const [documento, setDocumento] = useState<{ nombre: string, base64: string } | null>(null);
  const [errorDoc, setErrorDoc] = useState('');
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [showToast, setShowToast] = useState(false);

  const webcamRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraError, setCameraError] = useState('');

  // INICIALIZACIÓN: Por defecto Ecuador (+593)
  const [formData, setFormData] = useState({
    primer_nombre: '', segundo_nombre: '', primer_apellido: '', segundo_apellido: '',
    cedula: '', correo: '', telefono: '', descripcion: '', 
    provincia: '', codigo_pais: '+593', pais_iso: 'ec'
  });

  const placeholderCedula = esExtranjero 
      ? "Pasaporte (Ej: A1234567)" 
      : formData.provincia 
          ? `${formData.provincia}12345678` 
          : "0912345678";

  // Objeto de provincia seleccionada para mostrar nombre
  const provinciaObj = PROVINCIAS.find(p => p.codigo === formData.provincia);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (!esExtranjero && (name === 'cedula' || name === 'telefono')) {
        const soloNumeros = value.replace(/\D/g, '').slice(0, 10);
        setFormData(prev => ({ ...prev, [name]: soloNumeros }));
        return;
    }
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const seleccionarPais = (pais: any) => {
      setFormData(prev => ({ ...prev, codigo_pais: pais.dial, pais_iso: pais.iso }));
      setMostrarMenuPaises(false);
  };

  const seleccionarProvincia = (prov: any) => {
      setFormData(prev => ({ ...prev, provincia: prov.codigo }));
      setMostrarMenuProvincias(false);
  };

  const lanzarToast = (tipo: string, texto: string) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setShowToast(true), 10);
    setTimeout(() => {
        setShowToast(false);
        setTimeout(() => setMensaje({ tipo: '', texto: '' }), 500);
    }, 4000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setErrorDoc('');
    if (file) {
      const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!validTypes.includes(file.type)) {
        setErrorDoc('⚠️ Solo PDF, JPG o PNG.'); e.target.value = ''; setDocumento(null); return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setErrorDoc('⚠️ Máximo 5MB.'); e.target.value = ''; setDocumento(null); return;
      }
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => setDocumento({ nombre: file.name, base64: reader.result as string });
    }
  };

  const iniciarCamara = async () => {
    if (!formData.primer_nombre || !formData.primer_apellido || !formData.cedula || !formData.correo || !formData.descripcion) {
        lanzarToast("error", "Completa todos los campos obligatorios.");
        return;
    }
    if (!formData.telefono) {
        lanzarToast("error", "El teléfono es obligatorio.");
        return;
    }
    if (!documento) {
        lanzarToast("error", "Es obligatorio adjuntar un documento.");
        return;
    }

    if (esExtranjero) {
        if (formData.cedula.length < 5 || formData.cedula.length > 20) {
            lanzarToast("error", "El pasaporte debe tener entre 5 y 20 caracteres.");
            return;
        }
        if (formData.codigo_pais === 'other') {
            if (!prefijoManual || !prefijoManual.startsWith('+') || prefijoManual.length < 2) {
                lanzarToast("error", "El prefijo manual debe iniciar con + (Ej: +99).");
                return;
            }
        }
    } else {
        if (!formData.provincia) {
            lanzarToast("error", "Debe seleccionar su provincia.");
            return;
        }
        if (formData.cedula.length !== 10) {
            lanzarToast("error", "La cédula debe tener 10 dígitos.");
            return;
        }
        if (formData.cedula.substring(0, 2) !== formData.provincia) {
            const nombreProvincia = PROVINCIAS.find(p => p.codigo === formData.provincia)?.nombre;
            lanzarToast("error", `La cédula de ${nombreProvincia} debe comenzar con ${formData.provincia}.`);
            return;
        }
        if (!formData.telefono.startsWith('09') || formData.telefono.length !== 10) {
             lanzarToast("error", "El celular debe empezar con 09 y tener 10 dígitos.");
             return;
        }
    }
    setStep(2); 
  };

  useEffect(() => {
    let stream: MediaStream | null = null;
    const startVideo = async () => {
      if (step === 2 && webcamRef.current) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } });
          if (webcamRef.current) webcamRef.current.srcObject = stream;
        } catch (error) { setCameraError('❌ No se pudo acceder a la cámara.'); }
      }
    };
    startVideo();
    return () => { if (stream) stream.getTracks().forEach(track => track.stop()); };
  }, [step]);

  const capturarFoto = () => {
    if (webcamRef.current && canvasRef.current) {
      const video = webcamRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth; canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.translate(canvas.width, 0); context.scale(-1, 1);
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        setFotoCapturada(canvas.toDataURL('image/jpeg', 0.9));
      }
    }
  };

  const toggleNacionalidad = (valor: boolean) => {
      setEsExtranjero(valor);
      setFormData(prev => ({ 
          ...prev, cedula: '', provincia: '', telefono: '', 
          codigo_pais: valor ? '+1' : '+593', pais_iso: valor ? 'us' : 'ec' 
      }));
      setPrefijoManual('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fotoCapturada) { lanzarToast('error', 'Falta la foto.'); return; }
    setLoading(true);
    try {
      let telefonoFinal = formData.telefono;
      if (esExtranjero) {
          const prefijo = formData.codigo_pais === 'other' ? prefijoManual : formData.codigo_pais;
          telefonoFinal = `${prefijo} ${formData.telefono}`;
      }

      const payload = { 
          ...formData, 
          telefono: telefonoFinal,
          foto_base64: fotoCapturada, 
          documento_base64: documento?.base64, 
          nombre_documento: documento?.nombre,
          provincia: esExtranjero ? null : formData.provincia
      };

      const response = await axios.post('http://localhost:3000/api/visitantes/solicitar', payload);
      
      if (response.data.success) {
        setStep(3);
        setFormData({ primer_nombre: '', segundo_nombre: '', primer_apellido: '', segundo_apellido: '', cedula: '', correo: '', telefono: '', descripcion: '', provincia: '', codigo_pais: '+593', pais_iso: 'ec' });
        setFotoCapturada(null); setDocumento(null); setEsExtranjero(false); setPrefijoManual('');
        setTimeout(() => { window.location.href = '/'; }, 5000);
      }
    } catch (error: any) { 
        lanzarToast('error', error.response?.data?.error || 'Error al enviar.'); 
    } finally { 
        setLoading(false); 
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
      {/* TOAST */}
      {mensaje.texto && (
        <div className={`fixed top-4 right-4 z-50 shadow-xl rounded-lg p-3 w-72 border-l-4 flex items-center justify-between gap-3 bg-white transition-all duration-500 ease-in-out transform ${showToast ? 'translate-x-0 opacity-100' : 'translate-x-[150%] opacity-0'} ${mensaje.tipo === 'success' ? 'border-green-500 text-gray-800' : 'border-red-500 text-gray-800'}`}>
            <div className="flex items-center gap-3">
              <div className={`p-1.5 rounded-full ${mensaje.tipo === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>{mensaje.tipo === 'success' ? <CheckCircle2 size={18}/> : <AlertCircle size={18}/>}</div>
              <div><h4 className="font-bold text-xs">{mensaje.tipo === 'success' ? '¡Éxito!' : 'Error'}</h4><p className="text-[11px] text-gray-600 leading-tight">{mensaje.texto}</p></div>
            </div>
            <button onClick={() => setShowToast(false)} className="text-gray-400 hover:text-gray-600"><X size={14}/></button>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-xl max-w-xl w-full p-6 relative overflow-hidden border-t-4 border-orange-500">
        {step === 1 && (
          <form onSubmit={(e) => { e.preventDefault(); iniciarCamara(); }} className="space-y-4 relative z-10">
            <div className="border-b border-gray-100 pb-3 mb-3">
                <h2 className="text-2xl font-bold text-blue-900 mb-1 flex items-center gap-2"><FileText size={24} className="text-orange-500"/> Solicitar Acceso</h2>
                <p className="text-gray-600 text-xs">Complete sus datos para el registro temporal.</p>
            </div>

            <div className="flex items-center justify-center bg-gray-100 p-1 rounded-lg mb-4">
                <button type="button" onClick={() => toggleNacionalidad(false)} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-2 ${!esExtranjero ? 'bg-white text-blue-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>🇪🇨 Nacional (Cédula)</button>
                <button type="button" onClick={() => toggleNacionalidad(true)} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-2 ${esExtranjero ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><Globe size={14}/> Extranjero (Pasaporte)</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input type="text" name="primer_nombre" placeholder="Primer Nombre *" required value={formData.primer_nombre} onChange={handleInputChange} className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-orange-500 outline-none"/>
              <input type="text" name="segundo_nombre" placeholder="Segundo Nombre" value={formData.segundo_nombre} onChange={handleInputChange} className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-orange-500 outline-none"/>
              <input type="text" name="primer_apellido" placeholder="Primer Apellido *" required value={formData.primer_apellido} onChange={handleInputChange} className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-orange-500 outline-none"/>
              <input type="text" name="segundo_apellido" placeholder="Segundo Apellido" value={formData.segundo_apellido} onChange={handleInputChange} className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-orange-500 outline-none"/>
              
              {/* 🔥 SELECTOR DE PROVINCIA (DISEÑO MEJORADO CON BADGES NUMÉRICOS) */}
              {!esExtranjero && (
                  <div className="relative md:col-span-2 animate-fadeIn">
                    <div 
                        className="w-full py-2 px-3 border border-gray-200 rounded-lg flex items-center cursor-pointer bg-white hover:border-orange-500 focus-within:ring-1 focus-within:ring-orange-500"
                        onClick={() => setMostrarMenuProvincias(!mostrarMenuProvincias)}
                    >
                        {provinciaObj ? (
                            <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-700 mr-2 border border-blue-200">
                                {provinciaObj.codigo}
                            </div>
                        ) : (
                            <MapPin size={16} className="text-gray-400 mr-2"/>
                        )}
                        
                        <span className={`text-sm ${provinciaObj ? 'text-gray-800' : 'text-gray-400'}`}>
                            {provinciaObj ? `${provinciaObj.nombre}` : 'Seleccione su Provincia *'}
                        </span>
                        <ChevronDown size={14} className="ml-auto text-gray-400"/>
                    </div>

                    {mostrarMenuProvincias && (
                        <div className="absolute top-full left-0 w-full z-50 bg-white border border-gray-200 rounded-lg shadow-xl mt-1 max-h-60 overflow-y-auto">
                            {PROVINCIAS.map(prov => (
                                <div 
                                    key={prov.codigo} 
                                    className="flex items-center gap-3 p-2 hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-0"
                                    onClick={() => seleccionarProvincia(prov)}
                                >
                                    <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500 border border-gray-200">
                                        {prov.codigo}
                                    </div>
                                    <span className="text-sm font-medium text-gray-700">{prov.nombre}</span>
                                </div>
                            ))}
                        </div>
                    )}
                  </div>
              )}

              <div className="relative">
                <CreditCard size={14} className="absolute left-3 top-2.5 text-gray-400"/>
                <input type="text" name="cedula" placeholder={placeholderCedula} required maxLength={esExtranjero ? 20 : 10} value={formData.cedula} onChange={handleInputChange} className="pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-orange-500 outline-none w-full"/>
              </div>

              <div className="relative">
                <Mail size={14} className="absolute left-3 top-2.5 text-gray-400"/>
                <input type="email" name="correo" placeholder="Correo *" required value={formData.correo} onChange={handleInputChange} className="pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-orange-500 outline-none w-full"/>
              </div>

              {/* 🔥 DROPDOWN DE PAÍSES (CON BANDERAS IMAGEN) */}
              {esExtranjero ? (
                  <div className={`relative md:col-span-2 grid gap-2 ${formData.codigo_pais === 'other' ? 'grid-cols-4' : 'grid-cols-3'}`}>
                      <div className="col-span-1 relative">
                        {/* Botón */}
                        <div 
                            className="w-full h-[38px] border border-gray-200 rounded-lg flex items-center px-2 cursor-pointer bg-white hover:border-orange-500"
                            onClick={() => setMostrarMenuPaises(!mostrarMenuPaises)}
                        >
                            {formData.codigo_pais === 'other' ? (
                                <Globe size={16} className="text-gray-600"/>
                            ) : (
                                <img 
                                    src={`https://flagcdn.com/w40/${formData.pais_iso}.png`} 
                                    alt="flag" 
                                    className="w-5 h-auto rounded-sm object-cover border border-gray-200"
                                />
                            )}
                            <span className="text-xs ml-2 text-gray-700 truncate">{formData.codigo_pais}</span>
                            <ChevronDown size={14} className="ml-auto text-gray-400"/>
                        </div>

                        {/* Menú */}
                        {mostrarMenuPaises && (
                            <div className="absolute top-full left-0 w-64 z-50 bg-white border border-gray-200 rounded-lg shadow-xl mt-1 max-h-60 overflow-y-auto">
                                {PAISES.map(p => (
                                    <div 
                                        key={p.dial} 
                                        className="flex items-center gap-2 p-2 hover:bg-orange-50 cursor-pointer border-b border-gray-50 last:border-0"
                                        onClick={() => seleccionarPais(p)}
                                    >
                                        {p.iso !== 'globe' ? (
                                            <img src={`https://flagcdn.com/w40/${p.iso}.png`} alt={p.nombre} className="w-5 h-auto rounded-sm shadow-sm"/>
                                        ) : <Globe size={16} className="text-gray-500"/>}
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-gray-700">{p.nombre}</span>
                                            <span className="text-[10px] text-gray-500">{p.dial}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                      </div>
                      
                      {formData.codigo_pais === 'other' && (
                          <div className="col-span-1 relative animate-fadeIn">
                              <input type="text" placeholder="+XX" value={prefijoManual} onChange={(e) => setPrefijoManual(e.target.value)} className="w-full px-2 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-orange-500 outline-none text-center"/>
                          </div>
                      )}

                      <div className={`${formData.codigo_pais === 'other' ? 'col-span-2' : 'col-span-2'} relative`}>
                        <Phone size={14} className="absolute left-3 top-2.5 text-gray-400"/>
                        <input type="tel" name="telefono" placeholder="Celular" required maxLength={15} value={formData.telefono} onChange={handleInputChange} className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-orange-500 outline-none"/>
                      </div>
                  </div>
              ) : (
                  <div className="relative md:col-span-2">
                    <Phone size={14} className="absolute left-3 top-2.5 text-gray-400"/>
                    <input type="tel" name="telefono" placeholder="Celular (09...)" required maxLength={10} value={formData.telefono} onChange={handleInputChange} className="pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-orange-500 outline-none w-full"/>
                  </div>
              )}
            </div>

            <textarea name="descripcion" placeholder="Motivo de la visita *" required rows={3} value={formData.descripcion} onChange={handleInputChange} className="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none resize-none"/>

            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <label className="block text-xs font-bold text-gray-700 mb-2 flex items-center gap-2 uppercase"><Upload size={16} className="text-orange-500"/> Documento de Respaldo *</label>
                {!documento ? (
                    <input type="file" accept=".pdf, .jpg, .jpeg, .png" onChange={handleFileChange} className="block w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-blue-900 file:text-white hover:file:bg-blue-800 cursor-pointer"/>
                ) : (
                    <div className="flex items-center justify-between bg-white p-2 rounded border border-blue-200">
                        <div className="flex items-center gap-2 overflow-hidden"><FileText size={18} className="text-blue-900 flex-shrink-0"/><span className="text-sm font-medium text-gray-700 truncate">{documento.nombre}</span></div>
                        <button type="button" onClick={() => setDocumento(null)} className="text-gray-400 hover:text-red-500"><X size={18}/></button>
                    </div>
                )}
                {errorDoc && <p className="text-red-600 text-[10px] font-bold mt-2">{errorDoc}</p>}
            </div>

            <button type="submit" className="w-full bg-gradient-to-r from-blue-900 to-blue-800 text-white py-3 rounded-lg font-bold hover:shadow-lg transition shadow-md flex items-center justify-center gap-2 text-base">Siguiente: Registro Facial <ScanFace size={20}/></button>
          </form>
        )}

        {step === 2 && (
          <div className="space-y-4 text-center animate-fadeIn">
            <div className="border-b border-gray-100 pb-3 mb-3">
                <h2 className="text-2xl font-bold text-blue-900 mb-1">📸 Registro Biométrico</h2>
                <p className="text-gray-600 text-xs">Mire directamente a la cámara.</p>
            </div>
            {cameraError && <div className="bg-red-50 text-red-700 p-3 rounded-lg flex items-center gap-2 justify-center text-sm font-bold border border-red-200"><X size={18} /> {cameraError}</div>}
            {!fotoCapturada ? (
              <div className="space-y-3">
                <div className="relative mx-auto bg-black rounded-xl overflow-hidden shadow-xl aspect-square h-64 border-4 border-orange-500">
                    <video ref={webcamRef} autoPlay playsInline muted className="absolute w-full h-full object-cover transform scale-x-[-1]" />
                    <div className="absolute inset-0 border-4 border-white/50 rounded-xl pointer-events-none"></div>
                </div>
                <button onClick={capturarFoto} className="w-full max-w-sm mx-auto bg-orange-500 text-white py-2.5 rounded-lg font-bold hover:bg-orange-600 transition flex items-center justify-center gap-2 shadow-md text-sm"><Camera size={18} /> Capturar Foto</button>
                <button onClick={() => setStep(1)} className="text-gray-500 underline text-xs">Volver al formulario</button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative mx-auto rounded-xl overflow-hidden shadow-xl aspect-square h-64 border-4 border-green-500">
                    <img src={fotoCapturada} alt="Captura" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center"><CheckCircle2 size={40} className="text-white drop-shadow-lg" /></div>
                </div>
                <div className="flex gap-3 justify-center">
                  <button onClick={() => setFotoCapturada(null)} className="px-5 py-2 bg-gray-200 text-gray-700 rounded-lg font-bold hover:bg-gray-300 transition text-sm">Repetir</button>
                  <button onClick={handleSubmit} disabled={loading} className="px-5 py-2 bg-gradient-to-r from-blue-900 to-blue-800 text-white rounded-lg font-bold hover:shadow-lg transition disabled:bg-gray-400 shadow-md flex items-center gap-2 text-sm">{loading ? 'Enviando...' : <>Finalizar Solicitud <Send size={18}/></>}</button>
                </div>
              </div>
            )}
            <canvas ref={canvasRef} className="hidden" />
          </div>
        )}

        {step === 3 && (
          <div className="text-center space-y-4 py-8">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto animate-bounce"><CheckCircle2 size={50} className="text-green-600" /></div>
            <div><h2 className="text-2xl font-bold text-blue-900 mb-1">¡Solicitud Recibida!</h2><p className="text-gray-600 max-w-sm mx-auto text-sm">Su petición ha sido enviada.</p></div>
            <p className="text-sm text-blue-600 font-bold mt-4">Redirigiendo al inicio...</p>
          </div>
        )}
      </div>
    </div>
  );
}