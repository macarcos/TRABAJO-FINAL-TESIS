import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { Search, Edit, Trash2, X, Save, ScanLine, AlertTriangle, CheckCircle2, AlertCircle, User, UserX, ShieldAlert } from 'lucide-react';

// INTERFACES
interface Persona {
  id: number;
  primer_nombre: string;
  segundo_nombre?: string;
  primer_apellido: string;
  segundo_apellido?: string;
  cedula: string;
  correo: string;
  tipo_persona: string;
  estado: string;
  usuario: string;
  rfid_code: string | null;
}

export default function ListaPersonas() {
  // ESTADOS PRINCIPALES
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [editando, setEditando] = useState<Persona | null>(null);

  // ESTADOS PARA RFID EN EDICIÓN
  const [rfidDetectado, setRfidDetectado] = useState(false);
  const ultimoCodigoRef = useRef('');

  // ESTADOS MODALES / ACCIONES
  const [personaAEliminar, setPersonaAEliminar] = useState<Persona | null>(null);
  const [confirmarTexto, setConfirmarTexto] = useState('');
  const [modalEliminarTodo, setModalEliminarTodo] = useState(false);
  const [textoEliminarTodo, setTextoEliminarTodo] = useState('');

  // TOAST
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [showToast, setShowToast] = useState(false);

  // DATOS DEL ADMIN ACTUAL
  const usuarioActual = JSON.parse(sessionStorage.getItem('usuario_unemi') || '{}');
  const nombreAdmin = usuarioActual.nombre || usuarioActual.usuario || 'Admin';

  // --- EFECTOS ---
  useEffect(() => { 
    cargarPersonas();
  }, []);

  // 🔥 LÓGICA DE DETECCIÓN RFID (SOLO CUANDO SE ESTÁ EDITANDO)
  useEffect(() => {
    // Si no hay nadie editando, no hacemos nada
    if (!editando) return;

    const interval = setInterval(() => {
      // Verificar si la función global existe (inyectada por tu lector)
      if ((window as any).obtenerUltimoDatoRFID) {
        const raw = (window as any).obtenerUltimoDatoRFID();
        if (!raw) return;

        const texto = raw.trim();

        // Ignorar mensajes de estado o espera
        if (texto.includes("Esperando") || texto.includes("tarjeta") || texto.includes("NFC")) {
           if (texto !== ultimoCodigoRef.current) ultimoCodigoRef.current = '';
           return;
        }

        // Validar longitud mínima
        if (texto.length < 4) return;
        
        // Evitar bucles con el mismo código
        if (texto === ultimoCodigoRef.current) return;

        ultimoCodigoRef.current = texto;

        // Limpiar formato "UID: XX XX" -> "XX XX"
        const partes = texto.split(':');
        const codigoLimpio = partes.length === 2 ? partes[1].trim() : texto;

        console.log("📥 RFID Detectado en Edición:", codigoLimpio);

        // Actualizar el estado del usuario que se está editando
        setEditando(prev => prev ? ({ ...prev, rfid_code: codigoLimpio }) : null);
        
        // Efecto visual
        setRfidDetectado(true);
        setTimeout(() => setRfidDetectado(false), 2000);
      }
    }, 300);

    return () => clearInterval(interval);
  }, [editando]); // Se ejecuta mientras el objeto editando exista

  // --- FUNCIONES API ---

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
    setConfirmarTexto('');
  };

  const confirmarEliminacion = async () => {
    if (!personaAEliminar) return;
    if (confirmarTexto.toUpperCase() !== 'ELIMINAR') {
      lanzarToast('error', 'Debes escribir "ELIMINAR" para confirmar');
      return;
    }
    try {
      await axios.delete(`http://localhost:3000/api/personas/${personaAEliminar.id}`, {
        params: { adminName: nombreAdmin } 
      });
      lanzarToast('success', '✅ Usuario eliminado correctamente');
      setPersonaAEliminar(null);
      setConfirmarTexto('');
      cargarPersonas();
    } catch (error) { 
        lanzarToast('error', '❌ Error al eliminar usuario');
    }
  };

  const confirmarEliminarTodo = async () => {
    if (textoEliminarTodo.toUpperCase() !== 'ELIMINAR TODO') {
        lanzarToast('error', 'Confirmación incorrecta');
        return;
    }
    try {
        await axios.delete('http://localhost:3000/api/personas', {
            params: { adminName: nombreAdmin, action: 'deleteAll' }
        });
        lanzarToast('success', '🗑️ Base de datos limpiada correctamente');
        setModalEliminarTodo(false);
        setTextoEliminarTodo('');
        setPersonas([]); 
        cargarPersonas();
    } catch (error) {
        lanzarToast('error', '❌ Error al limpiar base de datos');
    }
  };

  const handleGuardarEdicion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editando) return;
    try {
      await axios.put(`http://localhost:3000/api/personas/${editando.id}`, {
        ...editando,
        adminName: nombreAdmin 
      });
      lanzarToast('success', '✅ Datos actualizados correctamente');
      setEditando(null);
      cargarPersonas();
    } catch (error) { lanzarToast('error', '❌ Error al actualizar'); }
  };

  // Filtro de búsqueda
  const personasFiltradas = personas.filter(p => {
    if (p.tipo_persona === 'Admin') return false; 
    const terminosBusqueda = busqueda.toLowerCase().trim().split(/\s+/);
    const datosUsuario = `${p.primer_nombre} ${p.segundo_nombre || ''} ${p.primer_apellido} ${p.segundo_apellido || ''} ${p.cedula || ''} ${p.usuario || ''}`.toLowerCase();
    return terminosBusqueda.every(termino => datosUsuario.includes(termino));
  });

  return (
    <div className="space-y-4 relative">

      {/* TOAST FLOTANTE */}
      {mensaje.texto && (
        <div 
            className={`fixed top-20 right-4 z-[200] shadow-xl rounded-lg p-3 w-72 border-l-4 flex items-center justify-between gap-3 bg-white 
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

      {/* --- MODAL ELIMINAR TODO --- */}
      {modalEliminarTodo && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
           <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-200 transform transition-all">
              <div className="bg-gradient-to-r from-blue-900 to-blue-800 p-4 border-b-4 border-orange-500 flex items-center gap-3">
                  <div className="bg-white/10 p-2 rounded-full backdrop-blur-sm border border-white/20 shadow-inner">
                    <ShieldAlert size={24} className="text-orange-400 drop-shadow-sm"/>
                  </div>
                  <div>
                    <h3 className="text-white font-bold uppercase tracking-wider text-sm">Zona Administrativa</h3>
                    <p className="text-blue-100 text-[10px]">Acción crítica de base de datos</p>
                  </div>
              </div>
              <div className="p-6 space-y-5">
                  <div className="bg-orange-50 p-4 rounded-lg border border-orange-200 flex gap-3 shadow-sm">
                      <div className="bg-orange-100 p-1.5 rounded-full h-fit text-orange-600"><AlertTriangle size={18}/></div>
                      <div>
                          <h4 className="text-blue-900 font-bold text-xs uppercase mb-1">¿Desea vaciar el sistema?</h4>
                          <p className="text-[11px] text-gray-600 leading-relaxed">Estás a punto de eliminar <b>{personas.length} registros</b>. Acción irreversible.</p>
                      </div>
                  </div>
                  <div>
                      <label className="block text-[10px] font-bold text-blue-900 uppercase mb-2">Para confirmar, escriba: <span className="text-gray-500 font-mono text-[10px] bg-gray-100 px-1 rounded">ELIMINAR TODO</span></label>
                      <input type="text" value={textoEliminarTodo} onChange={(e) => setTextoEliminarTodo(e.target.value)} placeholder="Escriba aquí..." className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm font-bold text-blue-900 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100 transition-all placeholder:text-gray-300 placeholder:font-normal uppercase" autoFocus />
                  </div>
              </div>
              <div className="bg-gray-50 p-4 flex justify-end gap-2 border-t border-gray-200">
                  <button onClick={() => { setModalEliminarTodo(false); setTextoEliminarTodo(''); }} className="px-4 py-2 bg-white text-gray-600 text-xs font-bold border border-gray-300 rounded-lg hover:bg-gray-100 transition shadow-sm">Cancelar</button>
                  <button onClick={confirmarEliminarTodo} disabled={textoEliminarTodo.toUpperCase() !== 'ELIMINAR TODO'} className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white text-xs font-bold rounded-lg hover:from-red-700 hover:to-red-800 disabled:opacity-50 disabled:grayscale transition-all shadow-md flex items-center gap-2"><Trash2 size={14}/> CONFIRMAR VACIADO</button>
              </div>
           </div>
        </div>
      )}

      {/* --- MODAL ELIMINAR INDIVIDUAL --- */}
      {personaAEliminar && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden transform transition-all border border-gray-200">
                <div className="bg-gradient-to-r from-blue-900 to-blue-800 p-4 border-b-4 border-orange-500 flex items-center gap-3">
                   <div className="bg-red-500/20 p-2 rounded-full border border-red-400/30"><UserX size={22} className="text-white"/></div>
                   <div><h3 className="text-white text-sm font-bold uppercase">Confirmación</h3><p className="text-[10px] text-blue-200">Acción permanente</p></div>
                </div>
                <div className="p-5 space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-center">
                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Eliminando usuario:</p>
                        <h4 className="font-bold text-gray-800">{personaAEliminar.primer_nombre} {personaAEliminar.primer_apellido}</h4>
                        <p className="text-[10px] text-gray-500">@{personaAEliminar.usuario}</p>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-700 uppercase mb-2">Escribe <span className="text-red-600 font-mono">ELIMINAR</span>:</label>
                        <input type="text" value={confirmarTexto} onChange={(e) => setConfirmarTexto(e.target.value)} placeholder="ELIMINAR" className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-xs font-mono uppercase outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all" autoFocus />
                    </div>
                </div>
                <div className="bg-gray-50 p-4 flex gap-2 justify-end border-t border-gray-200">
                    <button onClick={() => { setPersonaAEliminar(null); setConfirmarTexto(''); }} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-bold text-xs rounded-lg hover:bg-gray-100 transition-all">Cancelar</button>
                    <button onClick={confirmarEliminacion} disabled={confirmarTexto.toUpperCase() !== 'ELIMINAR'} className="px-4 py-2 bg-red-600 text-white font-bold text-xs rounded-lg hover:bg-red-700 disabled:opacity-50 transition-all flex items-center gap-2"><Trash2 size={14}/> Eliminar</button>
                </div>
            </div>
        </div>
      )}

      {/* HEADER DE LA PÁGINA */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-white p-4 rounded-xl shadow-sm border border-gray-100 border-t-4 border-orange-500 relative z-20">
        <div>
          <h2 className="text-lg font-bold text-blue-900 flex items-center gap-2">
            <User className="text-orange-500" size={20}/> Lista de Personas
          </h2>
          <p className="text-gray-500 text-[11px] mt-0.5">Gestión y monitoreo de usuarios</p>
        </div>
        
        <div className="flex gap-3 w-full sm:w-auto items-center justify-end">
            
            {personas.length > 0 && (
                <button 
                    onClick={() => setModalEliminarTodo(true)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white text-gray-500 hover:text-red-600 hover:bg-red-50 border border-gray-200 hover:border-red-200 rounded-lg transition-all shadow-sm group"
                    title="Vaciar base de datos"
                >
                    <Trash2 size={14} className="group-hover:scale-110 transition-transform"/>
                    <span className="text-xs font-bold">Borrar Todo</span>
                </button>
            )}

            <div className="relative w-full sm:w-56">
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
      </div>

      {/* TABLA DE PERSONAS */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden relative z-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gradient-to-r from-blue-900 to-blue-800 text-white uppercase font-bold border-b border-blue-900">
              <tr>
                <th className="px-3 py-3">Usuario</th>
                <th className="px-3 py-3">Cédula</th>
                <th className="px-3 py-3">Rol</th>
                <th className="px-3 py-3 hidden md:table-cell">RFID</th>
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
                  <td className="px-3 py-2"><span className="px-2 py-0.5 rounded bg-white text-blue-700 font-bold text-[9px] border border-blue-200 uppercase shadow-sm">{p.tipo_persona}</span></td>
                  <td className="px-3 py-2 hidden md:table-cell">{p.rfid_code ? <span className="font-mono text-[9px] bg-orange-50 border border-orange-200 text-orange-800 px-1.5 py-0.5 rounded flex items-center gap-1 w-max"><ScanLine size={10}/> {p.rfid_code}</span> : <span className="text-gray-300 text-[9px] italic">---</span>}</td>
                  <td className="px-3 py-2 text-gray-500 hidden lg:table-cell">{p.correo}</td>
                  <td className="px-3 py-2"><span className={`text-[9px] font-bold uppercase ${p.estado === 'Activo' ? 'text-green-600 bg-green-50 px-1.5 py-0.5 rounded border border-green-100' : 'text-red-500 bg-red-50 px-1.5 py-0.5 rounded border border-red-100'}`}>{p.estado}</span></td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-1.5">
                        <button onClick={() => setEditando(p)} className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg transition-colors shadow-sm border border-blue-100"><Edit size={14}/></button>
                        <button onClick={() => solicitarEliminacion(p)} className="p-1.5 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-colors shadow-sm border border-red-100"><Trash2 size={14}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL EDICIÓN CON RFID AUTOMÁTICO */}
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
                
                {/* 🔥 CAMPO RFID MEJORADO CON DETECCIÓN AUTOMÁTICA */}
                <div>
                    <label className="block text-[10px] font-bold text-blue-900 uppercase mb-1 flex justify-between">
                        <span>RFID (Automático)</span>
                        {rfidDetectado && <span className="text-[9px] text-green-600 flex items-center gap-1 animate-pulse"><CheckCircle2 size={10}/> ¡Leído!</span>}
                    </label>
                    <div className="relative">
                        <div className="absolute left-2 top-2 text-gray-400">
                            {rfidDetectado ? <CheckCircle2 size={14} className="text-green-500"/> : <ScanLine size={14}/>}
                        </div>
                        <input 
                            value={editando.rfid_code || ''} 
                            onChange={e => setEditando({...editando, rfid_code: e.target.value})} 
                            className={`w-full pl-7 px-2 py-1.5 border rounded font-mono text-xs outline-none transition-all
                                ${rfidDetectado 
                                    ? 'border-green-500 bg-green-50 text-green-700 ring-1 ring-green-200' 
                                    : 'focus:border-orange-500 focus:ring-1 focus:ring-orange-500'}`}
                            placeholder="Escanea tarjeta..."
                        />
                    </div>
                </div>
              </div>
              <div><label className="text-[10px] font-bold text-blue-900 uppercase">Estado</label>
              <select value={editando.estado} onChange={e => setEditando({...editando, estado: e.target.value})} className="w-full px-2 py-1.5 border rounded text-xs outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition bg-white"><option value="Activo">Activo</option><option value="Inactivo">Inactivo</option></select></div>
              <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-gray-100">
                <button type="button" onClick={() => setEditando(null)} className="px-3 py-1.5 text-gray-500 hover:bg-gray-100 rounded text-xs font-bold transition">Cancelar</button>
                <button type="submit" className="px-4 py-1.5 bg-gradient-to-r from-blue-900 to-blue-800 text-white rounded hover:shadow-lg font-bold flex items-center gap-1.5 text-xs transition"><Save size={14}/> Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}