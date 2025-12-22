import { useEffect, useState } from 'react';
import axios from 'axios';
import { Search, Trash2, Calendar, Eye, X, History, AlertTriangle, CheckCircle2, AlertCircle, Fingerprint } from 'lucide-react';

interface Acceso {
  id: number;
  primer_nombre: string;
  primer_apellido: string;
  cedula: string;           // ✅ AGREGADO
  correo: string;
  tipo_persona: string;
  metodo: string;
  foto_url: string | null;
  foto_verificacion_base64: string | null;
  confianza_facial: number;
  fecha: string;
}

export default function ListaAccesos() {
  const [historial, setHistorial] = useState<Acceso[]>([]);
  const [busqueda, setBusqueda] = useState('');
  
  // Modales y Estados UI
  const [fotoModal, setFotoModal] = useState<{ visible: boolean; foto: string | null; metodo: string; persona: string }>({
    visible: false, foto: null, metodo: '', persona: ''
  });
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [showToast, setShowToast] = useState(false);
  const [modalLimpiar, setModalLimpiar] = useState(false);

  const usuarioActual = JSON.parse(sessionStorage.getItem('usuario_unemi') || '{}');

  useEffect(() => { cargarHistorial(); }, []);

  const lanzarToast = (tipo: string, texto: string) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setShowToast(true), 10);
    setTimeout(() => {
        setShowToast(false);
        setTimeout(() => setMensaje({ tipo: '', texto: '' }), 500);
    }, 3000);
  };

  const cargarHistorial = async () => {
    try {
      const res = await axios.get('http://localhost:3000/api/acceso/historial');
      setHistorial(res.data.accesos || []);
      console.log("📊 Historial cargado:", res.data.accesos); // DEBUG
    } catch (error) { 
      setHistorial([]);
    }
  };

  const borrarHistorial = async () => {
    try {
      const res = await axios.delete('http://localhost:3000/api/acceso/historial', {
         params: { adminName: usuarioActual.nombre || usuarioActual.usuario || 'Admin' }
      });
      lanzarToast('success', res.data.message || 'Historial eliminado');
      setModalLimpiar(false);
      cargarHistorial();
    } catch (error) { 
      lanzarToast('error', 'Error al eliminar historial');
    }
  };

  const fechaEcuador = (fechaISO: string) => {
    if (!fechaISO) return "--/--/---- --:--:--";
    try {
      return new Date(fechaISO).toLocaleString('es-EC', {
        timeZone: 'America/Guayaquil',
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
      });
    } catch (error) { return fechaISO; }
  };

  const abrirFoto = (foto: string | null, metodo: string, persona: string) => {
    setFotoModal({ visible: true, foto, metodo, persona });
  };

  const cerrarFoto = () => {
    setFotoModal({ visible: false, foto: null, metodo: '', persona: '' });
  };

  const filtrados = historial.filter(h => {
    const terminos = busqueda.toLowerCase().trim().split(/\s+/);
    const datosFila = `${h.primer_nombre} ${h.primer_apellido} ${h.cedula || ''} ${h.tipo_persona}`.toLowerCase();
    return terminos.every(t => datosFila.includes(t));
  });

  return (
    <div className="space-y-4 p-4 relative">

      {/* TOAST NOTIFICACIÓN */}
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
                <h4 className="font-bold text-xs">{mensaje.tipo === 'success' ? '¡Éxito!' : 'Error'}</h4>
                <p className="text-[11px] text-gray-600 leading-tight">{mensaje.texto}</p>
              </div>
            </div>
            <button onClick={() => setShowToast(false)} className="text-gray-400 hover:text-gray-600"><X size={14}/></button>
        </div>
      )}

      {/* HEADER DE PÁGINA */}
      <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100 border-t-4 border-orange-500 gap-4">
        <div>
          <h2 className="text-lg font-bold text-blue-900 flex items-center gap-2">
            <History className="text-orange-500" size={20}/> Historial de Accesos
          </h2>
          <p className="text-[10px] text-gray-500 mt-0.5">
            Registro completo - <span className="font-bold text-blue-700">{historial.length}</span> eventos
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2 text-gray-400" size={14}/>
                <input 
                    placeholder="Buscar por nombre, cédula o rol..." 
                    className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all" 
                    onChange={e => setBusqueda(e.target.value)} 
                    value={busqueda}
                />
            </div>
            
            <button 
                onClick={() => setModalLimpiar(true)} 
                disabled={historial.length === 0}
                className="bg-red-50 text-red-600 hover:bg-red-500 hover:text-white px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-colors border border-red-100 disabled:opacity-50 disabled:cursor-not-allowed text-xs shadow-sm"
            >
                <Trash2 size={14}/> Limpiar
            </button>
        </div>
      </div>

      {/* TABLA DE HISTORIAL */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gradient-to-r from-blue-900 to-blue-800 text-white uppercase font-bold border-b border-blue-900">
              <tr>
                <th className="p-3 pl-4">Persona</th>
                <th className="p-3">Cédula</th>
                <th className="p-3">Rol</th>
                <th className="p-3">Método</th>
                <th className="p-3">Foto</th>
                <th className="p-3 text-center">Confianza</th>
                <th className="p-3 pr-4">Fecha y Hora</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtrados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-gray-400 text-xs">
                    {busqueda ? '🔍 No se encontraron resultados' : '📭 No hay registros en el historial'}
                  </td>
                </tr>
              ) : (
                filtrados.map(h => (
                  <tr key={h.id} className="group even:bg-slate-50 odd:bg-white hover:bg-blue-50/50 transition-colors border-b border-gray-50 last:border-0">
                    <td className="p-3 pl-4 flex items-center gap-2.5">
                      {h.foto_url ? (
                        <img src={h.foto_url} className="w-8 h-8 rounded-full object-cover border border-gray-200 shadow-sm" alt="Foto"/>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px] border border-blue-200 shadow-sm">
                          {h.primer_nombre?.[0] || '?'}
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-blue-900 text-xs leading-tight">{h.primer_nombre} {h.primer_apellido}</p>
                        <p className="text-[9px] text-gray-400">{h.correo}</p>
                      </div>
                    </td>
                    <td className="p-3 font-mono text-gray-600 text-[10px] font-semibold">
                      <div className="flex items-center gap-1">
                        <Fingerprint size={10} className="text-gray-400"/>
                        {h.cedula && h.cedula !== '---' ? h.cedula : '---'}
                      </div>
                    </td>
                    <td className="p-3">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border uppercase ${
                        h.tipo_persona === 'Estudiante' ? 'bg-blue-50 text-blue-900 border-blue-100' : 
                        h.tipo_persona === 'Docente' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                        h.tipo_persona === 'Administrativo' ? 'bg-green-50 text-green-700 border-green-100' :
                        h.tipo_persona === 'General' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                        'bg-gray-50 text-gray-600 border-gray-200'
                      }`}>
                        {h.tipo_persona === 'General' ? 'Visitante' : h.tipo_persona}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="font-medium text-gray-700 text-[10px] bg-white border border-gray-200 px-2 py-0.5 rounded shadow-sm">
                        {h.metodo === 'Reconocimiento Facial' && '📸 Facial'}
                        {h.metodo === 'RFID Físico' && '💳 Tarjeta'}
                        {h.metodo === 'RFID Virtual' && '📱 NFC'}
                        {!['Reconocimiento Facial', 'RFID Físico', 'RFID Virtual'].includes(h.metodo) && h.metodo}
                      </span>
                    </td>
                    <td className="p-3">
                      {h.foto_verificacion_base64 ? (
                        <button
                          onClick={() => abrirFoto(h.foto_verificacion_base64, h.metodo, `${h.primer_nombre} ${h.primer_apellido}`)}
                          className="flex items-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-600 px-2 py-1 rounded text-[10px] font-bold transition border border-blue-200"
                        >
                          <Eye size={12}/> Ver
                        </button>
                      ) : (
                        <span className="text-[9px] text-gray-400 italic">Sin foto</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {h.confianza_facial ? (
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                          h.confianza_facial >= 80 ? 'bg-green-50 text-green-700 border-green-200' :
                          h.confianza_facial >= 60 ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                          'bg-red-50 text-red-700 border-red-200'
                        }`}>
                          {h.confianza_facial}%
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-400">---</span>
                      )}
                    </td>
                    <td className="p-3 pr-4 text-gray-500 font-mono text-[10px]">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={12} className="text-gray-400"/>
                        {fechaEcuador(h.fecha)}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE CONFIRMACIÓN DE LIMPIEZA */}
      {modalLimpiar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl max-w-xs w-full overflow-hidden">
                <div className="bg-red-50 p-5 text-center border-b border-red-100">
                    <div className="bg-red-100 p-2 rounded-full w-fit mx-auto mb-2 text-red-600"><AlertTriangle size={24}/></div>
                    <h3 className="text-base font-bold text-gray-800">¿Borrar Historial?</h3>
                    <p className="text-[11px] text-gray-600 mt-1">Esta acción eliminará <b>todos</b> los registros y notificará a los administradores.</p>
                </div>
                <div className="bg-gray-50 p-3 flex gap-2 justify-center">
                    <button onClick={() => setModalLimpiar(false)} className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 font-bold text-xs rounded-lg hover:bg-gray-100">Cancelar</button>
                    <button onClick={borrarHistorial} className="px-3 py-1.5 bg-red-600 text-white font-bold text-xs rounded-lg hover:bg-red-700 flex items-center gap-1"><Trash2 size={12}/> Confirmar</button>
                </div>
            </div>
        </div>
      )}

      {/* MODAL DE FOTO */}
      {fotoModal.visible && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden transform transition-all">
            <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white p-3 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-sm">Evidencia de Acceso</h3>
                <p className="text-[10px] text-blue-200 opacity-80">{fotoModal.persona}</p>
              </div>
              <button onClick={cerrarFoto} className="hover:bg-white/20 p-1 rounded-full transition"><X size={16} /></button>
            </div>

            <div className="p-4 bg-gray-100 text-center">
              <div className="mb-3 flex justify-center">
                <span className="bg-white text-gray-700 px-3 py-1 rounded-full text-[10px] font-bold border border-gray-200 shadow-sm uppercase tracking-wide">
                  {fotoModal.metodo}
                </span>
              </div>

              {fotoModal.foto ? (
                <img src={fotoModal.foto} alt="Evidencia" className="w-full rounded-lg border-2 border-gray-300 shadow-md object-contain bg-black max-h-80"/>
              ) : (
                <div className="h-48 flex items-center justify-center text-gray-400 text-xs border-2 border-dashed border-gray-300 rounded-lg">Imagen no disponible</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}