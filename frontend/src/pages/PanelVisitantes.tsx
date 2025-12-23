import { useState, useEffect, useRef, memo } from 'react';
import axios from 'axios';
import { CheckCircle2, XCircle, Eye, Loader, History, X, AlertCircle, Download, Camera, FileText, Trash2, Clock, RotateCcw, AlertTriangle } from 'lucide-react';

interface Solicitud {
  id: number;
  primer_nombre: string;
  primer_apellido: string;
  cedula: string;
  correo: string;
  telefono: string;
  estado: 'Pendiente' | 'Aprobado' | 'Rechazado' | 'Expirado';
  descripcion: string;
  foto_base64?: string;
  fecha_solicitud: string;
  fecha_expiracion?: string;
  razon_rechazo?: string;
  documento_base64?: string;
  nombre_documento?: string;
  total_rechazados?: number;
  total_aprobados?: number;
}

// COMPONENTE OPTIMIZADO: IMAGEN CON LAZY LOADING
const ImagenLazy = memo(({ src, alt, className }: { src: string; alt: string; className: string }) => {
  const [cargada, setCargada] = useState(false);
  const [visible, setVisible] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!imgRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '100px' }
    );
    observer.observe(imgRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={imgRef} className={className}>
      {!visible ? (
        <div className="w-full h-full bg-gray-200 animate-pulse rounded-lg" />
      ) : (
        <>
          {!cargada && (
            <div className="w-full h-full bg-blue-50 rounded-lg flex items-center justify-center">
              <Loader size={14} className="text-[#1e3a8a] animate-spin" />
            </div>
          )}
          <img
            src={src}
            alt={alt}
            onLoad={() => setCargada(true)}
            className={`${cargada ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300 ${className}`}
            loading="lazy"
          />
        </>
      )}
    </div>
  );
});

export default function PanelVisitantes() {
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSolicitud, setSelectedSolicitud] = useState<Solicitud | null>(null);
  const [razon, setRazon] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [filter, setFilter] = useState<'Todos' | 'Pendiente' | 'Aprobado' | 'Rechazado'>('Pendiente');
  
  // ESTADOS PARA ELIMINACIÓN MASIVA
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteType, setDeleteType] = useState<'Rechazado' | 'Aprobado' | 'Expirado' | 'Todo' | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  
  // ESTADOS PARA ELIMINACIÓN INDIVIDUAL
  const [showSingleDeleteModal, setShowSingleDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);

  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    cargarSolicitudes();
    const intervalo = setInterval(cargarSolicitudes, 60 * 1000); 
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

  const cargarSolicitudes = async () => {
    try {
      const res = await axios.get('http://localhost:3000/api/visitantes');
      setSolicitudes(res.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  // 1. CONFIRMAR (ABRIR MODAL BONITO)
  const confirmarEliminarUno = (id: number) => {
    setItemToDelete(id);
    setShowSingleDeleteModal(true);
  };

  // 2. PROCEDER (LLAMADA A LA API)
  const procederEliminarUno = async () => {
    if (!itemToDelete) return;
    
    setProcesando(true);
    try {
      await axios.delete(`http://localhost:3000/api/visitantes/${itemToDelete}`);
      lanzarToast('success', '🗑️ Registro eliminado correctamente');
      cargarSolicitudes();
    } catch (error) {
      lanzarToast('error', 'Error 404: Verifica tu Backend');
    } finally {
      setProcesando(false);
      setShowSingleDeleteModal(false);
      setItemToDelete(null);
    }
  };

  const aprobar = async (id: number) => {
    setProcesando(true);
    try {
      await axios.put(`http://localhost:3000/api/visitantes/${id}/aprobar`);
      lanzarToast('success', '✅ Acceso habilitado por 24 horas');
      setSelectedSolicitud(null);
      cargarSolicitudes();
    } catch (error) {
      lanzarToast('error', 'Error al aprobar solicitud');
    } finally {
      setProcesando(false);
    }
  };

  const rechazar = async (id: number) => {
    if (!razon.trim()) {
      lanzarToast('error', 'Debes escribir una razón de rechazo');
      return;
    }
    setProcesando(true);
    try {
      await axios.put(`http://localhost:3000/api/visitantes/${id}/rechazar`, { razon_rechazo: razon });
      lanzarToast('success', '✅ Solicitud rechazada correctamente');
      setSelectedSolicitud(null);
      setRazon('');
      cargarSolicitudes();
    } catch (error) {
      lanzarToast('error', 'Error al rechazar solicitud');
    } finally {
      setProcesando(false);
    }
  };

  const corregirDecision = async (id: number) => {
    setProcesando(true);
    try {
        await axios.put(`http://localhost:3000/api/visitantes/${id}/corregir`);
        lanzarToast('success', '🔄 Solicitud abierta para nueva decisión');
        setSelectedSolicitud(null);
        cargarSolicitudes();
    } catch (error) {
        lanzarToast('error', 'No se pudo corregir');
    } finally {
        setProcesando(false);
    }
  };

  const ejecutarEliminacionMasiva = async () => {
    if (!deleteType) return;
    setProcesando(true);
    try {
      const usuarioData = sessionStorage.getItem('usuario_unemi');
      const admin = usuarioData ? JSON.parse(usuarioData) : { id: 1 };
      const res = await axios.post('http://localhost:3000/api/visitantes/eliminar', { tipo: deleteType, admin_id: admin.id });
      if (res.data.success === false) {
          lanzarToast('error', res.data.message);
      } else {
          lanzarToast('success', res.data.message);
      }
      setShowDeleteModal(false);
      setShowConfirmDelete(false);
      cargarSolicitudes();
    } catch (error) {
      lanzarToast('error', 'Error al eliminar historial');
    } finally {
      setProcesando(false);
    }
  };

  const solicitudesFiltradas = solicitudes.filter(s => filter === 'Todos' ? true : s.estado === filter);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader className="animate-spin text-blue-900" size={28} /></div>;

  return (
    <div className="space-y-2.5 relative">
      
      {/* TOAST NOTIFICACIÓN */}
      {mensaje.texto && (
        <div className={`fixed top-14 right-3 z-50 shadow-lg rounded-md p-2 w-56 border-l-4 flex items-center justify-between gap-2 bg-white transition-all duration-500 transform ${showToast ? 'translate-x-0 opacity-100' : 'translate-x-[150%] opacity-0'} ${mensaje.tipo === 'success' ? 'border-green-500 text-gray-800' : 'border-red-500 text-gray-800'}`}>
            <div className="flex items-center gap-1.5">
              <div className={`p-0.5 rounded-full ${mensaje.tipo === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                {mensaje.tipo === 'success' ? <CheckCircle2 size={14}/> : <AlertCircle size={14}/>}
              </div>
              <div>
                <h4 className="font-bold text-[9px]">{mensaje.tipo === 'success' ? '¡Éxito!' : 'Error'}</h4>
                <p className="text-[9px] text-gray-600 leading-tight">{mensaje.texto}</p>
              </div>
            </div>
            <button onClick={() => setShowToast(false)} className="text-gray-400 hover:text-gray-600"><X size={11}/></button>
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 bg-white p-2.5 rounded-md shadow-sm border border-gray-100 border-t-4 border-orange-500">
        <div className="w-full sm:w-auto">
          <h2 className="text-sm font-bold text-blue-900 flex items-center gap-1.5">
            <History className="text-orange-500" size={16}/> Panel de Visitantes
          </h2>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {(['Todos', 'Pendiente', 'Aprobado', 'Rechazado'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)} className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase transition-all ${filter === f ? 'bg-blue-900 text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                {f} ({solicitudes.filter(s => f === 'Todos' ? true : s.estado === f).length})
              </button>
            ))}
          </div>
        </div>
        <button onClick={() => setShowDeleteModal(true)} className="px-2 py-1 bg-red-50 text-red-600 font-bold text-[9px] rounded hover:bg-red-600 hover:text-white transition-all border border-red-100 flex items-center gap-1 whitespace-nowrap">
          <Trash2 size={11} /> Eliminar Historial
        </button>
      </div>

      {/* TABLA */}
      <div className="bg-white rounded-md shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[9px]">
            <thead className="bg-gradient-to-r from-blue-900 to-blue-800 text-white uppercase font-bold border-b border-blue-900">
              <tr>
                <th className="px-2.5 py-1.5">Visitante</th>
                <th className="px-2.5 py-1.5">Cédula</th>
                <th className="px-2.5 py-1.5">Estado Real</th>
                <th className="px-2.5 py-1.5 text-center">Historial</th>
                <th className="px-2.5 py-1.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {solicitudesFiltradas.map((s) => {
                const ahora = new Date();
                const expiracion = s.fecha_expiracion ? new Date(s.fecha_expiracion) : null;
                const esAprobadoActivo = s.estado === 'Aprobado' && expiracion && expiracion > ahora;
                const esFinalizado = s.estado === 'Aprobado' && expiracion && expiracion <= ahora;

                return (
                  <tr key={s.id} className="even:bg-slate-50 odd:bg-white hover:bg-orange-50/50 transition-colors">
                    <td className="px-2.5 py-1.5 flex flex-col">
                      <span className="font-bold text-blue-900 text-[9px] uppercase">{s.primer_nombre} {s.primer_apellido}</span>
                      <span className="text-[8px] text-gray-500 font-medium lowercase">{s.correo}</span>
                    </td>
                    <td className="px-2.5 py-1.5 font-mono text-gray-600 font-semibold text-[9px]">{s.cedula}</td>
                    <td className="px-2.5 py-1.5">
                      {esAprobadoActivo ? (
                          <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-[7px] font-bold border border-green-200 whitespace-nowrap">VIGENTE (24H)</span>
                      ) : esFinalizado ? (
                          <span className="bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded text-[7px] font-bold border border-gray-200 whitespace-nowrap">EXPIRADO</span>
                      ) : (
                          <span className={`px-1.5 py-0.5 rounded text-[7px] font-bold border whitespace-nowrap ${s.estado === 'Pendiente' ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-red-100 text-red-700 border-red-200'}`}>{s.estado.toUpperCase()}</span>
                      )}
                    </td>
                    <td className="px-2.5 py-1.5 text-center">
                        <div className="flex justify-center gap-0.5">
                            {(Number(s.total_aprobados) || 0) > 0 && <span className="bg-green-50 text-green-600 px-1 py-0.5 rounded border border-green-100 text-[7px] font-bold">✓ {s.total_aprobados}</span>}
                            {(Number(s.total_rechazados) || 0) > 0 && <span className="bg-red-50 text-red-600 px-1 py-0.5 rounded border border-red-100 text-[7px] font-bold">✗ {s.total_rechazados}</span>}
                        </div>
                    </td>
                    
                    <td className="px-2.5 py-1.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* BOTÓN ELIMINAR INDIVIDUAL - Abre el modal */}
                        <button 
                            onClick={(e) => { e.stopPropagation(); confirmarEliminarUno(s.id); }} 
                            className="p-1 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded transition-colors border border-red-100 shadow-sm"
                            title="Eliminar este registro"
                        >
                           <Trash2 size={11} />
                        </button>
                        
                        <button onClick={() => setSelectedSolicitud(s)} className="p-1 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded transition-colors border border-blue-100 shadow-sm flex items-center gap-0.5">
                          <Eye size={11}/> <span className="text-[8px] font-bold uppercase">Revisar</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- NUEVO MODAL PARA ELIMINACIÓN INDIVIDUAL --- */}
      {showSingleDeleteModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 animate-fade-in">
             <div className="bg-white rounded-md shadow-2xl max-w-xs w-full overflow-hidden border border-gray-100">
                {/* CABECERA AZUL (IGUAL QUE EL RESTO) */}
                <div className="bg-blue-900 px-3 py-2 flex justify-between items-center text-white border-b-4 border-orange-500">
                    <h3 className="font-bold text-[9px] uppercase tracking-wider flex items-center gap-1"><Trash2 size={13}/> Eliminar Registro</h3>
                    <button onClick={() => setShowSingleDeleteModal(false)}><X size={15}/></button>
                </div>
                
                <div className="p-4 text-center space-y-3">
                    <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
                        <Trash2 size={24}/>
                    </div>
                    <div>
                        <h4 className="text-[10px] font-bold text-gray-800 uppercase mb-1">¿Estás seguro?</h4>
                        <p className="text-[8px] text-gray-500 px-2 leading-relaxed">
                           Esta acción eliminará este registro permanentemente. No se puede deshacer.
                        </p>
                    </div>
                    <div className="flex gap-2 pt-2">
                        <button onClick={() => setShowSingleDeleteModal(false)} className="flex-1 py-1.5 bg-gray-100 text-gray-600 font-bold text-[8px] rounded uppercase hover:bg-gray-200 transition-colors">Cancelar</button>
                        <button onClick={procederEliminarUno} disabled={procesando} className="flex-1 py-1.5 bg-blue-900 text-white font-bold text-[8px] rounded uppercase shadow-md hover:bg-blue-800 transition-colors">
                           {procesando ? '...' : 'Sí, Eliminar'}
                        </button>
                    </div>
                </div>
             </div>
        </div>
      )}

      {/* MODAL ELIMINACIÓN MASIVA */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 animate-fade-in">
          <div className="bg-white rounded-md shadow-2xl max-w-sm w-full overflow-hidden border border-gray-100">
            <div className="bg-blue-900 px-3 py-2 flex justify-between items-center text-white border-b-4 border-orange-500">
              <h3 className="font-bold text-[9px] uppercase tracking-wider flex items-center gap-1"><Trash2 size={13}/> Limpieza Masiva</h3>
              <button onClick={() => setShowDeleteModal(false)}><X size={15}/></button>
            </div>
            <div className="p-3">
                {!showConfirmDelete ? (
                    <div className="space-y-1.5">
                        <p className="text-[8px] font-bold text-gray-400 uppercase text-center mb-1.5">Selecciona qué registros borrar:</p>
                        <button onClick={() => { setDeleteType('Aprobado'); setShowConfirmDelete(true); }} className="w-full flex items-center justify-between p-2 rounded bg-gray-50 border border-gray-100 hover:border-green-400 group transition-all text-[9px] font-bold text-gray-700 uppercase">Limpiar Aprobados <CheckCircle2 size={13} className="text-gray-300"/></button>
                        <button onClick={() => { setDeleteType('Rechazado'); setShowConfirmDelete(true); }} className="w-full flex items-center justify-between p-2 rounded bg-gray-50 border border-gray-100 hover:border-red-400 group transition-all text-[9px] font-bold text-gray-700 uppercase">Limpiar Rechazados <XCircle size={13} className="text-gray-300"/></button>
                        <button onClick={() => { setDeleteType('Expirado'); setShowConfirmDelete(true); }} className="w-full flex items-center justify-between p-2 rounded bg-gray-50 border border-gray-100 hover:border-orange-400 group transition-all text-[9px] font-bold text-gray-700 uppercase">Limpiar Expirados <Clock size={13} className="text-gray-300"/></button>
                        <button onClick={() => { setDeleteType('Todo'); setShowConfirmDelete(true); }} className="w-full mt-2 p-1.5 bg-red-600 text-white font-bold text-[8px] uppercase rounded hover:bg-red-700 shadow-md">Borrar Todo</button>
                    </div>
                ) : (
                    <div className="text-center space-y-2.5">
                        <div className="w-11 h-11 bg-orange-50 text-orange-500 rounded-full flex items-center justify-center mx-auto"><AlertCircle size={24}/></div>
                        <h4 className="text-[10px] font-bold text-gray-800 uppercase">¿Confirmar?</h4>
                        <p className="text-[8px] text-gray-500 px-2">Se eliminarán permanentemente los registros de tipo {deleteType}.</p>
                        <div className="flex gap-1.5 pt-1">
                            <button onClick={() => setShowConfirmDelete(false)} className="flex-1 py-1.5 bg-gray-100 text-gray-700 font-bold text-[8px] rounded uppercase">No</button>
                            <button onClick={ejecutarEliminacionMasiva} className="flex-1 py-1.5 bg-blue-900 text-white font-bold text-[8px] rounded uppercase shadow-md">Sí, eliminar</button>
                        </div>
                    </div>
                )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETALLES */}
      {selectedSolicitud && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 animate-fade-in">
          <div className="bg-white rounded-md shadow-2xl w-full max-w-3xl overflow-hidden transform transition-all border border-gray-100 max-h-[92vh] flex flex-col">
            <div className="bg-blue-900 px-3 py-2 flex justify-between items-center text-white border-b-4 border-orange-500">
              <div className="flex items-center gap-1.5">
                <div className="bg-white/10 p-1 rounded"><Eye size={14} className="text-orange-400"/></div>
                <div>
                  <h3 className="font-bold text-[10px] uppercase tracking-widest">Revisión de Perfil</h3>
                  <p className="text-[7px] text-blue-200 font-mono tracking-widest uppercase">{selectedSolicitud.cedula}</p>
                </div>
              </div>
              <button onClick={() => setSelectedSolicitud(null)} className="hover:bg-white/20 p-0.5 rounded-full transition-colors"><X size={16}/></button>
            </div>
            
            <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-3 overflow-y-auto flex-1">
              <div className="space-y-2.5">
                <section>
                    <h4 className="text-[7px] font-bold text-blue-900 uppercase mb-1 tracking-wider flex items-center gap-0.5"><div className="w-1 h-1 bg-orange-500 rounded-full"/> Datos Personales</h4>
                    <div className="bg-slate-50 p-2 rounded space-y-1 border border-slate-100 text-[8px]">
                        <div className="flex justify-between border-b border-slate-200 pb-0.5"><span className="font-bold text-gray-400">Nombre</span><span className="font-bold text-blue-900 uppercase">{selectedSolicitud.primer_nombre} {selectedSolicitud.primer_apellido}</span></div>
                        <div className="flex justify-between border-b border-slate-200 pb-0.5"><span className="font-bold text-gray-400">Contacto</span><span className="font-bold">{selectedSolicitud.telefono}</span></div>
                        <div className="flex justify-between pt-0.5"><span className="font-bold text-gray-400">Historial</span>
                          <div className="flex gap-1">
                             {(Number(selectedSolicitud.total_aprobados) || 0) > 0 && <span className="text-[7px] font-black text-green-600 uppercase">✓ OK: {selectedSolicitud.total_aprobados}</span>}
                             {(Number(selectedSolicitud.total_rechazados) || 0) > 0 && <span className="text-[7px] font-black text-red-600 uppercase">✗ NO: {selectedSolicitud.total_rechazados}</span>}
                          </div>
                        </div>
                    </div>
                </section>
                <section>
                    <h4 className="text-[7px] font-bold text-blue-900 uppercase mb-1 tracking-wider flex items-center gap-0.5"><div className="w-1 h-1 bg-orange-500 rounded-full"/> Motivo</h4>
                    <div className="bg-blue-50/50 p-2 rounded border border-blue-100 text-[8px] font-medium text-slate-600 italic">"{selectedSolicitud.descripcion}"</div>
                </section>

                <div className="pt-0.5">
                  {selectedSolicitud.estado === 'Pendiente' ? (
                    <div className="space-y-1.5">
                        <textarea value={razon} onChange={e => setRazon(e.target.value)} placeholder="Motivo u observaciones del rechazo..." className="w-full p-2 text-[8px] font-medium border border-gray-200 rounded h-14 outline-none focus:ring-1 focus:ring-blue-500 transition-all resize-none shadow-inner"/>
                        <div className="flex gap-1.5">
                            <button onClick={() => aprobar(selectedSolicitud.id)} disabled={procesando} className="flex-1 bg-green-600 text-white py-1.5 rounded font-bold text-[9px] uppercase tracking-widest hover:bg-green-700 shadow-md">Aprobar</button>
                            <button onClick={() => rechazar(selectedSolicitud.id)} disabled={procesando || !razon.trim()} className="flex-1 bg-red-600 text-white py-1.5 rounded font-bold text-[9px] uppercase tracking-widest hover:bg-red-700 shadow-md">Rechazar</button>
                        </div>
                    </div>
                  ) : (
                    <div className="bg-orange-50 p-2 rounded border border-orange-100 text-center">
                        <p className="text-orange-800 text-[8px] font-bold uppercase mb-1">Procesado como {selectedSolicitud.estado}</p>
                        <button onClick={() => corregirDecision(selectedSolicitud.id)} className="w-full bg-white text-orange-600 border border-orange-200 py-1 rounded font-bold text-[8px] uppercase tracking-widest hover:bg-orange-600 hover:text-white transition-all shadow-sm flex items-center justify-center gap-1"><RotateCcw size={10}/> Cambiar decisión</button>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2.5">
                <section>
                    <h4 className="text-[7px] font-bold text-blue-900 uppercase mb-1 tracking-wider flex items-center gap-0.5"><div className="w-1 h-1 bg-orange-500 rounded-full"/> Biometría Facial</h4>
                    {selectedSolicitud.foto_base64 ? (
                        <div className="relative rounded overflow-hidden border-2 border-slate-100 shadow-lg bg-black aspect-video flex items-center justify-center">
                            <ImagenLazy src={selectedSolicitud.foto_base64} alt="Biometría" className="w-full h-full object-contain"/>
                        </div>
                    ) : <div className="h-24 bg-slate-50 rounded border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-300 gap-0.5 font-bold uppercase text-[7px] tracking-widest"><Camera size={18}/>Sin foto</div>}
                </section>
                <section>
                    <h4 className="text-[7px] font-bold text-blue-900 uppercase mb-1 tracking-wider flex items-center gap-0.5"><div className="w-1 h-1 bg-orange-500 rounded-full"/> Documentación</h4>
                    {selectedSolicitud.documento_base64 ? (
                        <div className="bg-blue-900 p-0.5 rounded shadow-md">
                            <div className="bg-white p-2 rounded-sm flex justify-between items-center">
                                <div className="flex items-center gap-1 overflow-hidden">
                                    <div className="bg-blue-50 p-0.5 rounded text-blue-900"><FileText size={14}/></div>
                                    <span className="truncate text-[8px] font-bold text-blue-900 uppercase">{selectedSolicitud.nombre_documento}</span>
                                </div>
                                <a href={selectedSolicitud.documento_base64} download={selectedSolicitud.nombre_documento} className="bg-orange-500 text-white p-1 rounded hover:bg-orange-600 transition-all shadow-sm active:scale-90"><Download size={12}/></a>
                            </div>
                        </div>
                    ) : <div className="p-2.5 bg-slate-50 rounded border border-dashed border-slate-200 text-center text-slate-300 font-bold uppercase text-[7px] tracking-widest">Sin archivo</div>}
                </section>
              </div>
            </div>
            <div className="bg-gray-50 p-2 flex justify-center border-t border-gray-100 shadow-inner">
              <button onClick={() => setSelectedSolicitud(null)} className="text-[8px] font-bold text-gray-400 uppercase tracking-[0.3em] hover:text-blue-900 transition-colors">Volver al Panel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}