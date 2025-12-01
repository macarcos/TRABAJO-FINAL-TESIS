import { useEffect, useState } from 'react';
import axios from 'axios';
import { Search, Edit, Trash2, UserCheck, UserX, Filter, X, Save, ScanLine } from 'lucide-react';

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

  useEffect(() => { cargarPersonas(); }, []);

  const cargarPersonas = async () => {
    try {
      const res = await axios.get('http://localhost:3000/api/personas');
      setPersonas(res.data);
    } catch (error) { console.error(error); } 
    finally { setCargando(false); }
  };

  const handleEliminar = async (id: number, nombre: string) => {
    if (!confirm(`¿Eliminar a ${nombre}?`)) return;
    try {
      await axios.delete(`http://localhost:3000/api/personas/${id}`);
      cargarPersonas();
    } catch (error) { alert("Error al eliminar"); }
  };

  const handleGuardarEdicion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editando) return;
    try {
      await axios.put(`http://localhost:3000/api/personas/${editando.id}`, editando);
      alert("✅ Usuario actualizado");
      setEditando(null);
      cargarPersonas();
    } catch (error) { alert("❌ Error al actualizar"); }
  };

  const personasFiltradas = personas.filter(p => {
    if (p.tipo_persona === 'Admin') return false;
    const txt = busqueda.toLowerCase();
    return (
      p.primer_nombre.toLowerCase().includes(txt) ||
      p.primer_apellido.toLowerCase().includes(txt) ||
      (p.cedula && p.cedula.includes(txt)) || 
      p.correo.toLowerCase().includes(txt)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-2xl font-bold text-unemi-text">Lista de Personas</h2>
          <p className="text-gray-500 text-sm">Gestión de usuarios institucionales</p>
        </div>
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-3 text-gray-400" size={18} />
          <input type="text" placeholder="Buscar..." className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-unemi-primary/50"
            value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase font-semibold border-b">
              <tr>
                <th className="p-4">Usuario</th>
                <th className="p-4">Cédula</th>
                <th className="p-4">Rol</th>
                <th className="p-4">RFID Físico</th>
                <th className="p-4">Correo</th>
                <th className="p-4">Estado</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {cargando ? <tr><td colSpan={7} className="p-8 text-center">Cargando...</td></tr> : 
               personasFiltradas.length === 0 ? <tr><td colSpan={7} className="p-8 text-center">Sin resultados</td></tr> :
               personasFiltradas.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="p-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-unemi-primary/10 text-unemi-primary flex items-center justify-center font-bold text-xs">{p.primer_nombre[0]}{p.primer_apellido[0]}</div>
                    <div><p className="font-bold">{p.primer_nombre} {p.primer_apellido}</p><p className="text-xs text-gray-400">@{p.usuario}</p></div>
                  </td>
                  <td className="p-4 font-mono text-gray-600">{p.cedula}</td>
                  <td className="p-4"><span className="px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-xs border border-blue-100">{p.tipo_persona}</span></td>
                  <td className="p-4">
                    {p.rfid_code ? (
                      <span className="font-mono text-xs bg-gray-100 border border-gray-300 px-2 py-1 rounded flex items-center gap-1 w-max">
                        <ScanLine size={12}/> {p.rfid_code}
                      </span>
                    ) : (
                      <span className="text-gray-300 text-xs italic">---</span>
                    )}
                  </td>
                  <td className="p-4 text-gray-500">{p.correo}</td>
                  <td className="p-4"><span className={`text-xs font-bold ${p.estado === 'Activo' ? 'text-green-600' : 'text-red-500'}`}>{p.estado}</span></td>
                  <td className="p-4 text-right flex justify-end gap-2">
                    <button onClick={() => setEditando(p)} className="p-2 hover:bg-blue-50 text-gray-400 hover:text-blue-600 rounded-lg"><Edit size={18}/></button>
                    <button onClick={() => handleEliminar(p.id, p.primer_nombre)} className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-lg"><Trash2 size={18}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editando && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fade-in">
            <div className="bg-unemi-primary p-4 flex justify-between items-center text-white">
              <h3 className="font-bold text-lg flex items-center gap-2"><Edit size={20}/> Editar Usuario</h3>
              <button onClick={() => setEditando(null)} className="hover:bg-white/20 p-1 rounded-full"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleGuardarEdicion} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs font-bold text-gray-500">Primer Nombre</label>
                <input value={editando.primer_nombre} onChange={e => setEditando({...editando, primer_nombre: e.target.value})} className="w-full p-2 border rounded-lg"/></div>
                <div><label className="text-xs font-bold text-gray-500">Segundo Nombre</label>
                <input value={editando.segundo_nombre || ''} onChange={e => setEditando({...editando, segundo_nombre: e.target.value})} className="w-full p-2 border rounded-lg"/></div>
                <div><label className="text-xs font-bold text-gray-500">Primer Apellido</label>
                <input value={editando.primer_apellido} onChange={e => setEditando({...editando, primer_apellido: e.target.value})} className="w-full p-2 border rounded-lg"/></div>
                <div><label className="text-xs font-bold text-gray-500">Segundo Apellido</label>
                <input value={editando.segundo_apellido || ''} onChange={e => setEditando({...editando, segundo_apellido: e.target.value})} className="w-full p-2 border rounded-lg"/></div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs font-bold text-gray-500">Correo</label>
                <input value={editando.correo} onChange={e => setEditando({...editando, correo: e.target.value})} className="w-full p-2 border rounded-lg"/></div>
                <div><label className="text-xs font-bold text-gray-500">RFID Físico</label>
                <input value={editando.rfid_code || ''} onChange={e => setEditando({...editando, rfid_code: e.target.value})} className="w-full p-2 border rounded-lg font-mono" placeholder="Escanee tarjeta..."/></div>
              </div>

              <div><label className="text-xs font-bold text-gray-500">Estado</label>
              <select value={editando.estado} onChange={e => setEditando({...editando, estado: e.target.value})} className="w-full p-2 border rounded-lg">
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo (Bloqueado)</option>
              </select></div>

              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setEditando(null)} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg">Cancelar</button>
                <button type="submit" className="px-6 py-2 bg-unemi-primary text-white rounded-lg hover:bg-unemi-secondary font-bold flex items-center gap-2">
                  <Save size={18}/> Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}