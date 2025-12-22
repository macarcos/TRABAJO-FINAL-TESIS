import { useEffect, useState } from 'react';
import axios from 'axios';
import { Search, Edit, Trash2, X, Save, ScanLine, AlertTriangle, CheckCircle2, AlertCircle, User } from 'lucide-react';

interface Persona {
  id: number;
  primer_nombre: string;
  segundo_nombre?: string;
  primer_apellido: string;
  segundo_apellido?: string;
  cedula: string;
  correo: string;
  telefono?: string;
  tipo_persona: string;
  estado: string;
  usuario: string;
  rfid_code: string | null;
  foto_url: string | null;
}

export default function ListaPersonas() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [editando, setEditando] = useState<Persona | null>(null);

  // ESTADOS PARA MODALES Y NOTIFICACIONES
  const [personaAEliminar, setPersonaAEliminar] = useState<Persona | null>(null);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [showToast, setShowToast] = useState(false);

  const usuarioActual = JSON.parse(sessionStorage.getItem('usuario_unemi') || '{}');
  const nombreAdmin = usuarioActual.nombre || usuarioActual.usuario || 'Admin';

  useEffect(() => { cargarPersonas(); }, []);

  const lanzarToast = (tipo: string, texto: string) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setShowToast(true), 10);
    setTimeout(() => {
        setShowToast(false);
        setTimeout(() => setMensaje({ tipo: '', texto: '' }), 500);
    }, 3000);
  };

  const cargarPersonas = async () => {
    try {
      const res = await axios.get('http://localhost:3000/api/personas');
      setPersonas(res.data);
    } catch (error) { console.error(error); } 
    finally { setCargando(false); }
  };

  const solicitarEliminacion = (persona: Persona) => {
    setPersonaAEliminar(persona);
  };

  const confirmarEliminacion = async () => {
    if (!personaAEliminar) return;
    try {
      await axios.delete(`http://localhost:3000/api/personas/${personaAEliminar.id}`, {
        params: { adminName: nombreAdmin }
      });
      lanzarToast('success', 'Usuario eliminado correctamente');
      setPersonaAEliminar(null);
      cargarPersonas();
    } catch (error) { 
        lanzarToast('error', 'Error al eliminar usuario');
    }
  };

  const handleGuardarEdicion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editando) return;
    try {
      await axios.put(`http://localhost:3000/api/personas/${editando.id}`, editando);
      lanzarToast('success', 'Datos actualizados correctamente');
      setEditando(null);
      cargarPersonas();
    } catch (error) { lanzarToast('error', 'Error al actualizar'); }
  };

  // LÓGICA DE BÚSQUEDA INTELIGENTE
  const personasFiltradas = personas.filter(p => {
    if (p.tipo_persona === 'Admin') return false; 

    const terminosBusqueda = busqueda.toLowerCase().trim().split(/\s+/);
    const datosUsuario = `${p.primer_nombre} ${p.segundo_nombre || ''} ${p.primer_apellido} ${p.segundo_apellido || ''} ${p.cedula || ''} ${p.usuario || ''}`.toLowerCase();

    return terminosBusqueda.every(termino => datosUsuario.includes(termino));
  });

  return (
    <div className="space-y-4 relative">

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
            <button onClick={() => setShowToast(false)} className="text-gray-400 hover:text-gray-600">
              <X size={14}/>
            </button>
        </div>
      )}

      {/* MODAL DE ELIMINACIÓN */}
      {personaAEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full overflow-hidden transform transition-all scale-100">
                <div className="bg-red-50 p-5 flex flex-col items-center text-center border-b border-red-100">
                    <div className="bg-red-100 p-2 rounded-full mb-2 text-red-600 shadow-sm">
                        <Trash2 size={24} />
                    </div>
                    <h3 className="text-base font-bold text-gray-800">¿Eliminar Usuario?</h3>
                    <p className="text-[11px] text-gray-500 mt-1 mb-3">Estás a punto de eliminar a:</p>
                    <div className="bg-white p-2 rounded-lg border border-gray-200 shadow-sm w-full">
                        <div className="flex items-center gap-3 justify-center">
                            <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold text-xs border border-blue-200">
                                {personaAEliminar.primer_nombre[0]}{personaAEliminar.primer_apellido[0]}
                            </div>
                            <div className="text-left">
                                <h4 className="font-bold text-gray-800 text-xs leading-tight">
                                    {personaAEliminar.primer_nombre} {personaAEliminar.primer_apellido}
                                </h4>
                                <p className="text-[10px] text-gray-500">@{personaAEliminar.usuario}</p>
                            </div>
                        </div>
                    </div>
                    <div className="mt-3 flex gap-2 items-start bg-orange-50 p-2 rounded-lg text-left w-full">
                        <AlertTriangle size={12} className="text-orange-500 shrink-0 mt-0.5"/>
                        <p className="text-[10px] text-orange-700 leading-tight">
                            Esta acción <b>generará una notificación</b> para todos los administradores.
                        </p>
                    </div>
                </div>
                <div className="bg-gray-50 p-3 flex gap-2 justify-center border-t border-gray-100">
                    <button onClick={() => setPersonaAEliminar(null)} className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 font-bold text-xs rounded-lg hover:bg-gray-100 transition-colors shadow-sm">Cancelar</button>
                    <button onClick={confirmarEliminacion} className="px-3 py-1.5 bg-red-600 text-white font-bold text-xs rounded-lg hover:bg-red-700 transition-colors shadow-md flex items-center gap-1.5"><Trash2 size={12} />Sí, Eliminar</button>
                </div>
            </div>
        </div>
      )}

      {/* HEADER DE LA PÁGINA */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-white p-4 rounded-xl shadow-sm border border-gray-100 border-t-4 border-orange-500">
        <div>
          <h2 className="text-lg font-bold text-blue-900 flex items-center gap-2">
            <User className="text-orange-500" size={20}/> Lista de Personas
          </h2>
          <p className="text-gray-500 text-[11px] mt-0.5">Gestión de usuarios institucionales</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2 text-gray-400" size={14} />
          <input 
            type="text" 
            placeholder="Buscar..." 
            className="w-full pl-9 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 transition-all"
            value={busqueda} 
            onChange={(e) => setBusqueda(e.target.value)} 
          />
        </div>
      </div>

      {/* TABLA DE PERSONAS */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gradient-to-r from-blue-900 to-blue-800 text-white uppercase font-bold border-b border-blue-900">
              <tr>
                <th className="px-3 py-3">Usuario</th>
                <th className="px-3 py-3">Cédula</th>
                <th className="px-3 py-3">Rol</th>
                <th className="px-3 py-3 hidden md:table-cell">RFID Físico</th>
                <th className="px-3 py-3 hidden lg:table-cell">Correo</th>
                <th className="px-3 py-3">Estado</th>
                <th className="px-3 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {cargando ? <tr><td colSpan={7} className="p-6 text-center text-gray-400 text-xs">Cargando...</td></tr> : 
               personasFiltradas.length === 0 ? <tr><td colSpan={7} className="p-6 text-center text-gray-400 text-xs">Sin resultados</td></tr> :
               personasFiltradas.map((p) => (
                <tr key={p.id} className="even:bg-slate-50 odd:bg-white hover:bg-orange-50/50 transition-colors border-b border-gray-50 last:border-0">
                  <td className="px-3 py-2 flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-blue-900 text-white flex items-center justify-center font-bold text-[10px] shadow-sm ring-1 ring-orange-200">
                        {p.primer_nombre[0]}{p.primer_apellido[0]}
                    </div>
                    <div>
                        <p className="font-bold text-blue-900 text-xs leading-tight">{p.primer_nombre} {p.primer_apellido}</p>
                        <p className="text-[9px] text-gray-500 font-mono">@{p.usuario}</p>
                    </div>
                  </td>
                  <td className="px-3 py-2 font-mono text-gray-600 font-semibold">{p.cedula}</td>
                  <td className="px-3 py-2">
                    <span className="px-2 py-0.5 rounded bg-white text-blue-700 font-bold text-[9px] border border-blue-200 uppercase shadow-sm">
                        {p.tipo_persona}
                    </span>
                  </td>
                  <td className="px-3 py-2 hidden md:table-cell">
                    {p.rfid_code ? (
                      <span className="font-mono text-[9px] bg-orange-50 border border-orange-200 text-orange-800 px-1.5 py-0.5 rounded flex items-center gap-1 w-max">
                        <ScanLine size={10}/> {p.rfid_code}
                      </span>
                    ) : (
                      <span className="text-gray-300 text-[9px] italic">---</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-gray-500 hidden lg:table-cell">{p.correo}</td>
                  <td className="px-3 py-2">
                      <span className={`text-[9px] font-bold uppercase ${p.estado === 'Activo' ? 'text-green-600 bg-green-50 px-1.5 py-0.5 rounded border border-green-100' : 'text-red-500 bg-red-50 px-1.5 py-0.5 rounded border border-red-100'}`}>
                          {p.estado}
                      </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-1.5">
                        <button onClick={() => setEditando(p)} className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg transition-colors shadow-sm border border-blue-100" title="Editar"><Edit size={14}/></button>
                        <button onClick={() => solicitarEliminacion(p)} className="p-1.5 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-colors shadow-sm border border-red-100" title="Eliminar"><Trash2 size={14}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE EDICIÓN */}
      {editando && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all">
            <div className="bg-gradient-to-r from-blue-900 to-blue-800 px-5 py-3 flex justify-between items-center text-white border-b-4 border-orange-500">
              <h3 className="font-bold text-sm flex items-center gap-2"><Edit size={16}/> Editar Usuario</h3>
              <button onClick={() => setEditando(null)} className="hover:bg-white/20 p-1 rounded-full transition"><X size={16}/></button>
            </div>
            
            <form onSubmit={handleGuardarEdicion} className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-[10px] font-bold text-blue-900 uppercase">Primer Nombre</label>
                <input value={editando.primer_nombre} onChange={e => setEditando({...editando, primer_nombre: e.target.value})} className="w-full px-2 py-1.5 border rounded text-xs outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"/></div>
                <div><label className="text-[10px] font-bold text-blue-900 uppercase">Segundo Nombre</label>
                <input value={editando.segundo_nombre || ''} onChange={e => setEditando({...editando, segundo_nombre: e.target.value})} className="w-full px-2 py-1.5 border rounded text-xs outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"/></div>
                <div><label className="text-[10px] font-bold text-blue-900 uppercase">Primer Apellido</label>
                <input value={editando.primer_apellido} onChange={e => setEditando({...editando, primer_apellido: e.target.value})} className="w-full px-2 py-1.5 border rounded text-xs outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"/></div>
                <div><label className="text-[10px] font-bold text-blue-900 uppercase">Segundo Apellido</label>
                <input value={editando.segundo_apellido || ''} onChange={e => setEditando({...editando, segundo_apellido: e.target.value})} className="w-full px-2 py-1.5 border rounded text-xs outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"/></div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-[10px] font-bold text-blue-900 uppercase">Correo</label>
                <input value={editando.correo} onChange={e => setEditando({...editando, correo: e.target.value})} className="w-full px-2 py-1.5 border rounded text-xs outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"/></div>
                <div><label className="text-[10px] font-bold text-blue-900 uppercase">RFID Físico</label>
                <input value={editando.rfid_code || ''} onChange={e => setEditando({...editando, rfid_code: e.target.value})} className="w-full px-2 py-1.5 border rounded font-mono text-xs outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition" placeholder="Escanee tarjeta..."/></div>
              </div>

              <div><label className="text-[10px] font-bold text-blue-900 uppercase">Estado</label>
              <select value={editando.estado} onChange={e => setEditando({...editando, estado: e.target.value})} className="w-full px-2 py-1.5 border rounded text-xs outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition bg-white">
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo (Bloqueado)</option>
              </select></div>

              <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-gray-100">
                <button type="button" onClick={() => setEditando(null)} className="px-3 py-1.5 text-gray-500 hover:bg-gray-100 rounded text-xs font-bold transition">Cancelar</button>
                <button type="submit" className="px-4 py-1.5 bg-gradient-to-r from-blue-900 to-blue-800 text-white rounded hover:shadow-lg font-bold flex items-center gap-1.5 text-xs transition">
                  <Save size={14}/> Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}