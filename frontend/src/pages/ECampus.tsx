import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Webcam from 'react-webcam';
import axios from 'axios';
import * as faceapi from '@vladmandic/face-api';
import { Camera, Save, Lock, AlertCircle, CheckCircle2, LogOut, Edit, User, FileText, CreditCard, BookOpen, Bell, ChevronLeft, Grid, X, Info } from 'lucide-react';

const API_URL = 'http://localhost:3000/api';

export default function eCampus() {
  const navigate = useNavigate();
  const usuarioData = sessionStorage.getItem('usuario_unemi');
  const usuario = usuarioData ? JSON.parse(usuarioData) : {};
  const rol = usuario.tipo_persona;

  const [tab, setTab] = useState(0); 
  const [loading, setLoading] = useState(false);
  const [datosCargados, setDatosCargados] = useState(false);
  const [errorCarga, setErrorCarga] = useState('');
  const [modelosListos, setModelosListos] = useState(false);
  
  // ESTADOS TOAST ANIMADO
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [showToast, setShowToast] = useState(false);

  const [notificaciones, setNotificaciones] = useState<any[]>([]);
  const [mostrarNotificaciones, setMostrarNotificaciones] = useState(false);
  const [sinLeer, setSinLeer] = useState(0);
  const [datosPersona, setDatosPersona] = useState<any>(null);
  const [editando, setEditando] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [camaraActiva, setCamaraActiva] = useState(false);
  const [fotoCapturada, setFotoCapturada] = useState<string | null>(null);
  const [rostroDetectado, setRostroDetectado] = useState(false);
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intervalRef = useRef<any>(null);
  const [credenciales, setCredenciales] = useState({
    rostroRegistrado: false,
    rfidVirtual: '',
    rfidFisico: false,
    rostroHabilitado: true,
    rfidVirtualHabilitado: true,
    rfidFisicoHabilitado: true
  });
  const [periodos, setPeriodos] = useState<any[]>([]);
  const [selectedPeriodo, setSelectedPeriodo] = useState<number | null>(null);
  const [matriculaAceptada, setMatriculaAceptada] = useState(false);

  useEffect(() => {
    if (!usuario || !usuario.id) navigate('/');
    if (rol === 'Admin') navigate('/dashboard');
    const iniciarCarga = async () => {
      try {
        await Promise.all([cargarDatos(), cargarModelos(), cargarNotificacionesReales()]);
        setDatosCargados(true);
      } catch (error) {
        console.error("Error:", error);
        setErrorCarga("No se pudieron cargar los datos.");
      }
    };
    iniciarCarga();
    const intervalo = setInterval(cargarNotificacionesReales, 5000);
    return () => clearInterval(intervalo);
  }, []);

  const lanzarToast = (tipo: string, texto: string) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setShowToast(true), 10);
    setTimeout(() => {
        setShowToast(false);
        setTimeout(() => setMensaje({ tipo: '', texto: '' }), 500);
    }, 3000);
  };

  const cargarModelos = async () => {
    try {
      const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model';
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
      ]);
      setModelosListos(true);
    } catch (error) { console.warn("Modelos tardaron", error); }
  };

  const cargarNotificacionesReales = async () => {
    if (!usuario.id) return;
    try {
      const res = await axios.get(`${API_URL}/notificaciones/${usuario.id}`);
      if (res.data) {
        setNotificaciones(res.data);
        setSinLeer(res.data.filter((n: any) => n.leida === 0 || n.leida === false).length);
      }
    } catch (e) {}
  };

  const marcarComoLeidas = async () => {
    setMostrarNotificaciones(!mostrarNotificaciones);
    if (!mostrarNotificaciones && sinLeer > 0) {
      try {
        await axios.put(`${API_URL}/notificaciones/leer/${usuario.id}`);
        setSinLeer(0);
        setNotificaciones(prev => prev.map(n => ({ ...n, leida: 1 })));
      } catch(e) {}
    }
  };

  const cargarDatos = async () => {
    try {
      const personas = await axios.get(`${API_URL}/personas`);
      const miPersona = personas.data.find((p: any) => p.id === usuario.id);
      if (!miPersona) throw new Error("Usuario no encontrado");
      setDatosPersona(miPersona);
      setFormData({
        primer_nombre: miPersona.primer_nombre,
        segundo_nombre: miPersona.segundo_nombre || '',
        primer_apellido: miPersona.primer_apellido,
        segundo_apellido: miPersona.segundo_apellido || '',
        cedula: miPersona.cedula,
        correo: miPersona.correo,
        telefono: miPersona.telefono || ''
      });
      setCredenciales({
        rostroRegistrado: miPersona.vector_facial !== null,
        rfidVirtual: miPersona.seeb_billetera || 'NO GENERADO',
        rfidFisico: !!miPersona.rfid_code,
        rostroHabilitado: miPersona.rostro_habilitado === 1,
        rfidVirtualHabilitado: miPersona.rfid_virtual_habilitado === 1,
        rfidFisicoHabilitado: miPersona.rfid_fisico_habilitado === 1
      });
      if (rol === 'Estudiante') {
        const res = await axios.get(`${API_URL}/matriculas/periodos`);
        setPeriodos(res.data.periodos);
        const matricula = await axios.get(`${API_URL}/matriculas/estudiante/${usuario.id}`);
        setMatriculaAceptada(matricula.data.matriculas && matricula.data.matriculas.length > 0);
      }
    } catch (error) { console.error("Error:", error); throw error; }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const guardarDatosPersonales = async () => {
    try {
      setLoading(true);
      if(!formData.primer_nombre || !formData.primer_apellido || !formData.cedula || !formData.correo) {
        lanzarToast('error', 'Campos obligatorios vacíos');
        setLoading(false); 
        return;
      }
      await axios.put(`${API_URL}/personas/${usuario.id}`, formData);
      lanzarToast('success', 'Datos Actualizados');
      setEditando(false);
      await cargarDatos();
    } catch (error: any) {
      lanzarToast('error', 'Error al actualizar');
    } finally {
      setLoading(false);
    }
  };

  const toggleCredencial = async (tipo: string) => {
    try {
      const updates: any = {};
      if (tipo === 'rostro') updates.rostro_habilitado = credenciales.rostroHabilitado ? 0 : 1;
      else if (tipo === 'rfidVirtual') updates.rfid_virtual_habilitado = credenciales.rfidVirtualHabilitado ? 0 : 1;
      else if (tipo === 'rfidFisico') updates.rfid_fisico_habilitado = credenciales.rfidFisicoHabilitado ? 0 : 1;
      await axios.put(`${API_URL}/personas/${usuario.id}`, updates);
      setCredenciales(prev => ({ ...prev, [tipo === 'rostro' ? 'rostroHabilitado' : tipo === 'rfidVirtual' ? 'rfidVirtualHabilitado' : 'rfidFisicoHabilitado']: !prev[tipo === 'rostro' ? 'rostroHabilitado' : tipo === 'rfidVirtual' ? 'rfidVirtualHabilitado' : 'rfidFisicoHabilitado'] }));
      lanzarToast('success', 'Credencial Actualizada');
    } catch (error) { lanzarToast('error', 'Error actualizando'); }
  };

  const regenerarNFC = async () => {
    try {
      setLoading(true);
      const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let nuevoSeed = '';
      for (let i = 0; i < 8; i++) nuevoSeed += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
      await axios.put(`${API_URL}/personas/${usuario.id}`, { seeb_billetera: nuevoSeed });
      setCredenciales(prev => ({ ...prev, rfidVirtual: nuevoSeed }));
      lanzarToast('success', 'Código Regenerado');
    } catch (error) { lanzarToast('error', 'Error generando código'); } 
    finally { setLoading(false); }
  };

  const capturarRostro = async () => {
    if (!webcamRef.current) return;
    const imageSrc = webcamRef.current.getScreenshot();
    setFotoCapturada(imageSrc);
    try {
      const img = document.createElement('img'); 
      img.src = imageSrc || '';
      await new Promise((resolve) => { img.onload = resolve; });
      const detection = await faceapi.detectSingleFace(img, new faceapi.SsdMobilenetv1Options()).withFaceLandmarks().withFaceDescriptor();
      if (!detection) { lanzarToast('error', 'No se detectó rostro'); return; }
      const vectorFacial = Array.from(detection.descriptor);
      setLoading(true);
      await axios.put(`${API_URL}/personas/${usuario.id}`, {
        vector_facial: JSON.stringify(vectorFacial),
        foto_url: imageSrc
      });
      lanzarToast('success', 'Rostro Registrado Exitosamente');
      setCredenciales(prev => ({ ...prev, rostroRegistrado: true, rostroHabilitado: true }));
      setCamaraActiva(false);
      setTimeout(() => cargarDatos(), 500);
    } catch (error) { lanzarToast('error', 'Error registrando rostro'); } 
    finally { setLoading(false); }
  };

  const aceptarMatricula = async () => {
    if (!selectedPeriodo) return;
    try {
      setLoading(true);
      await axios.post(`${API_URL}/matriculas/aceptar`, { persona_id: usuario.id, periodo_id: selectedPeriodo });
      setMatriculaAceptada(true);
      setTab(0);
      lanzarToast('success', 'Matrícula Aceptada');
    } catch (error) { lanzarToast('error', 'Error al aceptar matrícula'); } 
    finally { setLoading(false); }
  };

  const handleVideoOnPlay = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(async () => {
      if (!webcamRef.current?.video || !canvasRef.current || !modelosListos) return;
      const video = webcamRef.current.video;
      if (video.readyState !== 4) return;
      try {
        const displaySize = { width: video.videoWidth, height: video.videoHeight };
        faceapi.matchDimensions(canvasRef.current, displaySize);
        const detection = await faceapi.detectSingleFace(video, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 })).withFaceLandmarks();
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, displaySize.width, displaySize.height);
        if (detection) {
          setRostroDetectado(true);
          const resized = faceapi.resizeResults(detection, displaySize);
          const box = resized.detection.box;
          ctx.strokeStyle = '#10b981'; 
          ctx.lineWidth = 3; 
          ctx.strokeRect(box.x, box.y, box.width, box.height);
        } else {
          setRostroDetectado(false);
        }
      } catch (err) {}
    }, 500);
  }, [modelosListos]);

  const cerrarSesion = () => { sessionStorage.removeItem('usuario_unemi'); navigate('/'); };

  if (errorCarga) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-red-50 to-red-100 p-4 text-center">
        <AlertCircle size={48} className="text-red-600 mb-4"/>
        <h2 className="text-xl font-bold text-gray-800">Error de conexión</h2>
        <p className="text-sm text-gray-600 mt-2 mb-4">{errorCarga}</p>
        <button onClick={cerrarSesion} className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-2 rounded-lg font-bold text-sm hover:shadow-lg transition">Volver al Inicio</button>
      </div>
    );
  }

  if (!datosCargados) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-blue-900 to-blue-800">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-400 border-t-transparent mb-4"></div>
        <p className="text-white text-xs font-bold animate-pulse">Cargando eCampus...</p>
      </div>
    );
  }

  if (rol === 'Estudiante' && !matriculaAceptada) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm border-t-4 border-orange-500 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-900 to-blue-800 p-5 text-center">
             <h2 className="text-white text-xl font-bold">Proceso de Matrícula</h2>
             <p className="text-blue-100 text-xs mt-1">Selecciona tu período académico</p>
          </div>
          <div className="p-6">
             <div className="space-y-3 mb-6">
                {periodos.map((periodo) => (
                  <label key={periodo.id} className={`flex items-center p-3 border rounded-xl cursor-pointer transition duration-200 ${selectedPeriodo === periodo.id ? 'border-orange-500 bg-orange-50 shadow-sm' : 'border-gray-200 hover:border-gray-300'}`}>
                    <input type="radio" name="periodo" value={periodo.id} checked={selectedPeriodo === periodo.id} onChange={() => setSelectedPeriodo(periodo.id)} className="w-4 h-4 text-orange-600" />
                    <div className="ml-3">
                      <p className="font-bold text-gray-900 text-sm">{periodo.nombre}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">{periodo.fecha_inicio} - {periodo.fecha_fin}</p>
                    </div>
                  </label>
                ))}
             </div>
             <button onClick={aceptarMatricula} disabled={!selectedPeriodo || loading} className="w-full bg-gradient-to-r from-blue-900 to-blue-800 text-white py-2.5 rounded-lg font-bold hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed text-sm">
               {loading ? 'Procesando...' : 'Aceptar y Continuar'}
             </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 relative overflow-hidden">
      
      {/* 🔥 TOAST COMPACTO ANIMADO (SLIDE IN/OUT DERECHA) */}
      {mensaje.texto && (
        <div 
            className={`fixed top-20 right-4 z-50 shadow-xl rounded-lg p-3 w-72 border-l-4 flex items-center justify-between gap-3 bg-white 
            transition-all duration-500 ease-in-out transform 
            ${showToast ? 'translate-x-0 opacity-100' : 'translate-x-[150%] opacity-0'}
            ${mensaje.tipo === 'success' ? 'border-green-500 text-gray-800' : 'border-red-500 text-gray-800'}`}
        >
            <div className="flex items-center gap-3">
              <div className={`p-1.5 rounded-full ${mensaje.tipo === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                {mensaje.tipo === 'success' ? <CheckCircle2 size={18}/> : <AlertCircle size={18}/>}
              </div>
              <div>
                <h4 className="font-bold text-xs">{mensaje.tipo === 'success' ? '¡Éxito!' : 'Atención'}</h4>
                <p className="text-[11px] text-gray-600 leading-tight">{mensaje.texto}</p>
              </div>
            </div>
            <button onClick={() => setShowToast(false)} className="text-gray-400 hover:text-gray-600">
              <X size={14}/>
            </button>
        </div>
      )}

      {/* HEADER COMPACTO (h-14) */}
      <header className="bg-white shadow-lg sticky top-0 z-50">
        <div className="h-1.5 w-full bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600"></div>
        <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white">
            <div className="max-w-6xl mx-auto px-4 lg:px-6">
                <div className="flex justify-between items-center h-14">
                    <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition" onClick={() => setTab(0)}>
                        <div className="bg-white/10 backdrop-blur p-1.5 rounded-md border border-white/20">
                          <BookOpen size={20} className="text-orange-400" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold tracking-tight">eCampus</h1>
                            <span className="text-[9px] text-gray-300 font-bold tracking-widest uppercase">UNEMI</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex items-center gap-2 bg-white/10 backdrop-blur px-3 py-1 rounded-full border border-white/20 text-[10px] font-medium text-gray-200">
                          <span>AGOSTO - DICIEMBRE 2025</span>
                        </div>
                        <div className="relative">
                            <button onClick={marcarComoLeidas} className="relative p-1.5 hover:bg-white/10 rounded-lg transition duration-200">
                                <Bell size={18} className="text-orange-400" />
                                {sinLeer > 0 && <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-red-500 text-white text-[9px] flex items-center justify-center rounded-full font-bold border border-blue-900 shadow-sm">{sinLeer}</span>}
                            </button>
                            {mostrarNotificaciones && (
                                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl text-gray-800 z-50 border border-gray-100 overflow-hidden animate-in fade-in">
                                    <div className="bg-gradient-to-r from-blue-50 to-orange-50 p-3 border-b border-gray-100">
                                        <div className="flex justify-between items-center">
                                          <span className="text-xs font-bold uppercase text-gray-600">📬 Notificaciones</span>
                                          <button onClick={() => setNotificaciones([])} className="text-[10px] text-blue-600 hover:text-blue-800 font-bold">Limpiar</button>
                                        </div>
                                    </div>
                                    <div className="max-h-64 overflow-y-auto">
                                        {notificaciones.length === 0 ? <div className="p-4 text-center text-xs text-gray-400">Sin novedades.</div> :
                                            notificaciones.map((n, i) => (
                                                <div key={i} className={`p-3 border-b last:border-b-0 hover:bg-gray-50 transition ${!n.leida ? 'bg-blue-50/50' : ''}`}>
                                                    <p className="text-xs font-bold text-blue-900">{n.titulo}</p>
                                                    <p className="text-[11px] text-gray-600 mt-1">{n.mensaje}</p>
                                                    <p className="text-[9px] text-gray-400 mt-1.5">{n.fecha}</p>
                                                </div>
                                            ))
                                        }
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-2 pl-4 border-l border-white/20">
                            <div className="relative">
                              <img src={datosPersona?.foto_url || `https://ui-avatars.com/api/?name=${datosPersona?.primer_nombre}`} alt="Perfil" className="h-8 w-8 rounded-full border border-orange-400 object-cover shadow-sm" />
                              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border border-blue-900"></div>
                            </div>
                            <button onClick={cerrarSesion} title="Salir" className="text-white/70 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition">
                              <LogOut size={16}/>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 lg:px-6 py-6">
        
        {tab === 0 && (
            <div>
                {/* BIENVENIDA COMPACTA */}
                <div className="mb-8">
                    <h2 className="text-3xl font-bold text-gray-900">¡Hola, <span className="bg-gradient-to-r from-blue-900 to-orange-500 bg-clip-text text-transparent">{datosPersona?.primer_nombre}</span>!</h2>
                    <p className="text-gray-500 mt-1 text-sm">Bienvenido al Sistema de Gestión Académica</p>
                </div>

                {/* INFO BANNER COMPACTO */}
                <div className="bg-gradient-to-r from-blue-50 to-orange-50 border border-blue-200 text-blue-900 px-4 py-3 rounded-lg mb-6 text-xs font-medium shadow-sm flex items-center gap-2">
                    <Info size={16} className="text-blue-600 shrink-0"/>
                    <span>Para un ingreso más ágil y seguro, recuerda registrar tu reconocimiento facial en el módulo "Mis Datos Personales".</span>

                </div>
                {/* INFO BANNER COMPACTO */}
                <div className="bg-gradient-to-r from-blue-50 to-orange-50 border border-blue-200 text-blue-900 px-4 py-3 rounded-lg mb-6 text-xs font-medium shadow-sm flex items-center gap-2">
                    <Info size={16} className="text-blue-600 shrink-0"/>
                    <span>Recuerde habilitar el ingreso del reconocimiento facial una vez registrado en "Mis Credenciales".</span>
                </div>

                <div>
                    <div className="flex items-center gap-2 mb-4 text-blue-900 font-bold text-base">
                        <Grid size={20} className="text-orange-500"/>
                        <h3>Mis Módulos</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div onClick={() => setTab(1)} className="group bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-lg hover:border-blue-300 cursor-pointer transition duration-300 transform hover:-translate-y-1">
                            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-3 rounded-lg w-fit mb-3 group-hover:scale-105 transition duration-300">
                                <FileText size={24} className="text-blue-600" strokeWidth={1.5} />
                            </div>
                            <h4 className="text-blue-900 font-bold text-sm mb-1">Mis Datos Personales</h4>
                            <p className="text-[11px] text-gray-500 leading-relaxed">Actualización de información personal, contacto y foto de perfil.</p>
                        </div>

                        <div onClick={() => setTab(2)} className="group bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-lg hover:border-orange-300 cursor-pointer transition duration-300 transform hover:-translate-y-1">
                            <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-3 rounded-lg w-fit mb-3 group-hover:scale-105 transition duration-300">
                                <CreditCard size={24} className="text-orange-600" strokeWidth={1.5} />
                            </div>
                            <h4 className="text-blue-900 font-bold text-sm mb-1">Mis Credenciales</h4>
                            <p className="text-[11px] text-gray-500 leading-relaxed">Gestión de acceso facial, tarjeta RFID y billetera virtual.</p>
                        </div>

                        {rol === 'Estudiante' && (
                            <div onClick={() => setTab(3)} className="group bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-lg hover:border-purple-300 cursor-pointer transition duration-300 transform hover:-translate-y-1">
                                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-3 rounded-lg w-fit mb-3 group-hover:scale-105 transition duration-300">
                                    <BookOpen size={24} className="text-purple-600" strokeWidth={1.5} />
                                </div>
                                <h4 className="text-blue-900 font-bold text-sm mb-1">Mi Matrícula</h4>
                                <p className="text-[11px] text-gray-500 leading-relaxed">Consulta de estado de matrícula y período académico.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}

        {tab > 0 && (
            <button onClick={() => setTab(0)} className="mb-4 text-xs font-bold text-gray-600 hover:text-blue-900 flex items-center gap-2 transition duration-200 group">
                <ChevronLeft size={16} className="group-hover:-translate-x-1 transition"/> VOLVER A MÓDULOS
            </button>
        )}

        {/* 🔥 SECCIÓN DE DATOS PERSONALES OPTIMIZADA Y COMPACTA */}
        {tab === 1 && (
            <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
                {/* Header más delgado */}
                <div className="bg-gradient-to-r from-blue-900 to-blue-800 px-5 py-3">
                    <div className="flex justify-between items-center">
                        <h3 className="font-bold text-base text-white">Mis Datos Personales</h3>
                        {!editando ? (
                          <button onClick={()=>setEditando(true)} className="bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded-md text-[10px] font-bold flex items-center gap-1 transition duration-200">
                            <Edit size={12}/> Editar
                          </button>
                        ) : (
                          <button onClick={()=>{setEditando(false); cargarDatos();}} className="bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded-md text-[10px] font-bold transition duration-200">Cancelar</button>
                        )}
                    </div>
                </div>
                
                {/* Contenido compactado */}
                <div className="p-4">
                    {!editando ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                            {/* CAJAS DE DATOS MÁS PEQUEÑAS */}
                            <div className="bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-0.5">Nombres Completos</span>
                                <p className="text-xs font-bold text-gray-800">{datosPersona?.primer_nombre} {datosPersona?.segundo_nombre} {datosPersona?.primer_apellido} {datosPersona?.segundo_apellido}</p>
                            </div>
                            <div className="bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-0.5">Cédula</span>
                                <p className="text-xs font-bold text-gray-800">{datosPersona?.cedula}</p>
                            </div>
                            <div className="bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-0.5">Correo Institucional</span>
                                <p className="text-xs font-bold text-gray-800">{datosPersona?.correo}</p>
                            </div>
                            <div className="bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-0.5">Teléfono</span>
                                <p className="text-xs font-bold text-gray-800">{datosPersona?.telefono || 'Sin registrar'}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-700 mb-0.5">Primer Nombre</label>
                                <input name="primer_nombre" value={formData.primer_nombre} onChange={handleInputChange} className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none transition"/>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-700 mb-0.5">Segundo Nombre</label>
                                <input name="segundo_nombre" value={formData.segundo_nombre} onChange={handleInputChange} className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none transition"/>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-700 mb-0.5">Primer Apellido</label>
                                <input name="primer_apellido" value={formData.primer_apellido} onChange={handleInputChange} className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none transition"/>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-700 mb-0.5">Segundo Apellido</label>
                                <input name="segundo_apellido" value={formData.segundo_apellido} onChange={handleInputChange} className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none transition"/>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-bold text-gray-700 mb-0.5">Teléfono</label>
                                <input name="telefono" value={formData.telefono} onChange={handleInputChange} className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none transition"/>
                            </div>
                            <div className="md:col-span-2 flex gap-2 justify-end pt-1">
                                <button onClick={() => setEditando(false)} className="px-3 py-1.5 border border-gray-300 rounded text-gray-700 text-[10px] font-bold hover:bg-gray-50 transition">Cancelar</button>
                                <button onClick={guardarDatosPersonales} disabled={loading} className="px-3 py-1.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded text-[10px] font-bold hover:shadow-sm transition disabled:opacity-50 flex items-center gap-1">
                                  <Save size={12}/> Guardar
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="mt-4 pt-4 border-t border-gray-200">
                        <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-1.5 text-xs">
                          <Camera size={14} className="text-orange-500"/> Foto de Perfil
                        </h4>
                        <div className="bg-gray-50 p-3 rounded-lg border-2 border-dashed border-gray-300">
                          {!camaraActiva ? (
                            <button onClick={() => setCamaraActiva(true)} className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-3 py-2 rounded-md font-bold text-[10px] flex gap-1.5 items-center hover:shadow transition duration-200">
                              <Camera size={14}/> {credenciales.rostroRegistrado ? 'Actualizar Foto' : 'Registrar Foto'}
                            </button>
                          ) : (
                            <div className="max-w-[250px] mx-auto space-y-2">
                              {!fotoCapturada ? (
                                <>
                                  <div className="rounded overflow-hidden bg-black aspect-square flex items-center justify-center">
                                    <Webcam ref={webcamRef} screenshotFormat="image/jpeg" className="w-full scale-x-[-1]" onUserMedia={handleVideoOnPlay}/>
                                    <canvas ref={canvasRef} className="hidden"/>
                                  </div>
                                  <button onClick={capturarRostro} disabled={!rostroDetectado} className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-1.5 rounded text-[10px] font-bold hover:shadow transition disabled:opacity-50">
                                    Capturar
                                  </button>
                                </>
                              ) : (
                                <>
                                  <img src={fotoCapturada} className="w-full rounded"/>
                                  <button onClick={() => setFotoCapturada(null)} className="w-full bg-gray-500 text-white py-1.5 rounded text-[10px] font-bold hover:bg-gray-600 transition">Repetir</button>
                                </>
                              )}
                              <button onClick={() => setCamaraActiva(false)} className="text-[9px] text-gray-500 hover:text-gray-700 underline w-full text-center py-0.5">Cancelar</button>
                            </div>
                          )}
                        </div>
                    </div>
                </div>
            </div>
        )}

        {tab === 2 && (
            <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-900 to-blue-800 px-6 py-4">
                    <h3 className="font-bold text-lg text-white">Mis Credenciales</h3>
                    <p className="text-blue-100 text-xs mt-0.5">Gestiona tus métodos de acceso</p>
                </div>
                <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="border border-gray-200 p-4 rounded-xl hover:shadow-md transition duration-300 hover:border-blue-300">
                            <div className="flex justify-between items-start mb-3">
                                <div className="bg-blue-50 p-2 rounded-lg"><User className="text-blue-600" size={20}/></div>
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${credenciales.rostroHabilitado ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                  {credenciales.rostroHabilitado ? '✓ ACTIVO' : '✕ INACTIVO'}
                                </span>
                            </div>
                            <h4 className="font-bold text-gray-900 mb-0.5 text-sm">Acceso Facial</h4>
                            <p className="text-[10px] text-gray-500 mb-3">Autenticación biométrica</p>
                            <button onClick={() => toggleCredencial('rostro')} disabled={!credenciales.rostroRegistrado} className="w-full border border-blue-300 text-blue-700 py-1.5 rounded-lg text-[11px] font-bold hover:bg-blue-50 transition disabled:opacity-50 disabled:cursor-not-allowed">
                              {credenciales.rostroHabilitado ? 'Deshabilitar' : 'Habilitar'}
                            </button>
                        </div>

                        <div className="border border-gray-200 p-4 rounded-xl hover:shadow-md transition duration-300 hover:border-purple-300">
                            <div className="flex justify-between items-start mb-3">
                                <div className="bg-purple-50 p-2 rounded-lg"><CreditCard className="text-purple-600" size={20}/></div>
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${credenciales.rfidVirtualHabilitado ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                  {credenciales.rfidVirtualHabilitado ? '✓ ACTIVO' : '✕ INACTIVO'}
                                </span>
                            </div>
                            <h4 className="font-bold text-gray-900 mb-0.5 text-sm">Billetera Virtual</h4>
                            <p className="text-[10px] text-gray-600 font-mono bg-gray-50 px-2 py-1 rounded mb-3 break-all">{credenciales.rfidVirtual}</p>
                            <div className="flex gap-2">
                                <button onClick={regenerarNFC} className="flex-1 bg-gray-100 text-gray-700 py-1.5 rounded-lg text-[11px] font-bold hover:bg-gray-200 transition">
                                  Regenerar
                                </button>
                                <button onClick={() => toggleCredencial('rfidVirtual')} className="flex-1 border border-purple-300 text-purple-700 py-1.5 rounded-lg text-[11px] font-bold hover:bg-purple-50 transition">
                                  {credenciales.rfidVirtualHabilitado ? 'Bloquear' : 'Activar'}
                                </button>
                            </div>
                        </div>

                        <div className="border border-gray-200 p-4 rounded-xl hover:shadow-md transition duration-300 hover:border-green-300">
                            <div className="flex justify-between items-start mb-3">
                                <div className="bg-green-50 p-2 rounded-lg"><Lock className="text-green-600" size={20}/></div>
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${credenciales.rfidFisicoHabilitado ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                  {credenciales.rfidFisicoHabilitado ? '✓ ACTIVO' : '✕ INACTIVO'}
                                </span>
                            </div>
                            <h4 className="font-bold text-gray-900 mb-0.5 text-sm">Tarjeta RFID</h4>
                            <p className="text-[10px] text-gray-500 mb-3">{credenciales.rfidFisico ? '✓ Asignada' : '✕ No asignada'}</p>
                            <button onClick={() => toggleCredencial('rfidFisico')} disabled={!credenciales.rfidFisico} className="w-full border border-green-300 text-green-700 py-1.5 rounded-lg text-[11px] font-bold hover:bg-green-50 transition disabled:opacity-50 disabled:cursor-not-allowed">
                              {credenciales.rfidFisicoHabilitado ? 'Deshabilitar' : 'Habilitar'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {tab === 3 && rol === 'Estudiante' && (
            <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-900 to-blue-800 p-4 text-center">
                    <h3 className="font-bold text-lg text-white">Mi Matrícula</h3>
                </div>
                <div className="p-8 text-center">
                    <div className="inline-block p-3 bg-green-50 rounded-full mb-4">
                        <CheckCircle2 className="text-green-600" size={40}/>
                    </div>
                    <h4 className="font-bold text-xl text-gray-900 mb-1">Matrícula Confirmada</h4>
                    <p className="text-xs text-gray-600">Estás legalmente matriculado en el período</p>
                    <p className="text-base font-bold text-blue-900 mt-2">AGOSTO - DICIEMBRE 2025</p>
                </div>
            </div>
        )}
      </main>
    </div>
  );
}