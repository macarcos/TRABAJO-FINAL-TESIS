import { useState, useEffect } from 'react';
import axios from 'axios';
import { useForm } from 'react-hook-form';
import { ShieldAlert, Trash2, Mail, User, Save, ShieldCheck, Search, XCircle } from 'lucide-react';

export default function GestionAdmins() {
  const [admins, setAdmins] = useState<any[]>([]);
  const { register, handleSubmit, reset } = useForm();
  const [cargando, setCargando] = useState(false);
  
  // ✅ NUEVO ESTADO PARA EL BUSCADOR
  const [busqueda, setBusqueda] = useState('');

  // Cargar solo los Admins al iniciar
  useEffect(() => {
    cargarAdmins();
  }, []);

  const cargarAdmins = async () => {
    try {
      const res = await axios.get('http://localhost:3000/api/personas');
      // Filtramos en el frontend para mostrar solo Admins
      const soloAdmins = res.data.filter((p: any) => p.tipo_persona === 'Admin');
      setAdmins(soloAdmins);
    } catch (error) { console.error(error); }
  };

  const eliminarAdmin = async (id: number) => {
    if(!confirm("¿Estás seguro de ELIMINAR a este Administrador? Perderá el acceso al sistema.")) return;
    try {
      await axios.delete(`http://localhost:3000/api/personas/${id}`);
      cargarAdmins(); // Recargar lista
      alert("Administrador eliminado.");
    } catch (error) { alert("Error al eliminar"); }
  };

  const onSubmit = async (data: any) => {
    setCargando(true);
    try {
        const payload = { 
        ...data, 
        tipo_persona: 'Admin', 
        cedula: null, 
        vector_facial: null 
        };
        
        const res = await axios.post('http://localhost:3000/api/registrar', payload);
        
        alert(`✅ Admin Creado!\nUsuario: ${res.data.usuario}\nDebe cambiar contraseña al primer ingreso.`);
        reset();
        cargarAdmins();
    } catch (error: any) {
        alert("Error: " + (error.response?.data?.error || "Error desconocido"));
    } finally {
        setCargando(false);
    }
  };

  // ✅ LÓGICA DE FILTRADO (Buscador)
  // Filtramos la lista original 'admins' basándonos en lo que escribas
  const adminsFiltrados = admins.filter((admin) => {
    const termino = busqueda.toLowerCase();
    const nombreCompleto = `${admin.primer_nombre} ${admin.primer_apellido}`.toLowerCase();
    const usuario = admin.usuario ? admin.usuario.toLowerCase() : '';

    return nombreCompleto.includes(termino) || usuario.includes(termino);
  });

  return (
    <div className="space-y-8 p-6">
      
      {/* Encabezado */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <ShieldAlert className="text-orange-500"/> Gestión de Administradores
        </h2>
        <p className="text-gray-500 text-sm">Creación de operadores del sistema (Sin credencial física).</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLUMNA IZQUIERDA: FORMULARIO DE CREACIÓN */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-orange-500 sticky top-4">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <User size={18}/> Nuevo Operador
            </h3>
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <input {...register("primer_nombre", {required: true})} placeholder="1er Nombre" className="w-full p-2 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-orange-500 outline-none transition-all" />
                <input {...register("segundo_nombre")} placeholder="2do Nombre" className="w-full p-2 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-orange-500 outline-none transition-all" />
                <input {...register("primer_apellido", {required: true})} placeholder="1er Apellido" className="w-full p-2 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-orange-500 outline-none transition-all" />
                <input {...register("segundo_apellido")} placeholder="2do Apellido" className="w-full p-2 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-orange-500 outline-none transition-all" />
              </div>

              <div className="relative">
                <Mail className="absolute left-3 top-2.5 text-gray-400" size={16}/>
                <input 
                  {...register("correo", { required: true, pattern: /@unemi\.edu\.ec$/ })} 
                  placeholder="Correo @unemi.edu.ec" 
                  className="w-full pl-9 p-2 border rounded-lg bg-gray-50 text-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all" 
                />
              </div>

              <button 
                disabled={cargando}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 rounded-lg flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg"
              >
                {cargando ? 'Creando...' : <><Save size={18}/> Crear Admin</>}
              </button>
            </form>
          </div>
        </div>

        {/* COLUMNA DERECHA: LISTA DE ADMINS */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* ✅ BARRA DE BÚSQUEDA */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
            <h3 className="font-bold text-gray-700 whitespace-nowrap">Administradores Activos</h3>
            
            <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 text-gray-400" size={18}/>
                <input 
                    type="text"
                    placeholder="Buscar nombre o usuario..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="w-full pl-10 pr-10 py-2 border border-gray-200 rounded-full text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
                />
                {busqueda && (
                    <button 
                        onClick={() => setBusqueda('')}
                        className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                    >
                        <XCircle size={16} />
                    </button>
                )}
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-orange-50 p-3 border-b border-orange-100 flex justify-between items-center">
              <span className="text-orange-800 text-xs font-bold uppercase tracking-wide">Listado Oficial</span>
              <span className="bg-white text-orange-600 px-2 py-0.5 rounded-full text-xs font-bold border border-orange-200 shadow-sm">
                {adminsFiltrados.length} encontrados
              </span>
            </div>
            
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                <thead className="text-gray-500 font-medium border-b bg-gray-50">
                    <tr>
                    <th className="p-4">Nombre</th>
                    <th className="p-4">Usuario</th>
                    <th className="p-4 hidden sm:table-cell">Correo</th>
                    <th className="p-4 text-right">Acción</th>
                    </tr>
                </thead>
                <tbody>
                    {adminsFiltrados.length === 0 ? (
                        <tr>
                            <td colSpan={4} className="p-8 text-center text-gray-400">
                                No se encontraron administradores con ese nombre.
                            </td>
                        </tr>
                    ) : (
                        adminsFiltrados.map((admin) => (
                        <tr key={admin.id} className="hover:bg-orange-50/30 border-b last:border-0 transition-colors">
                            <td className="p-4">
                                <p className="font-bold text-gray-700">{admin.primer_nombre} {admin.primer_apellido}</p>
                                <p className="text-xs text-gray-400 sm:hidden">{admin.correo}</p>
                            </td>
                            <td className="p-4">
                                <span className="font-mono text-orange-600 bg-orange-50 border border-orange-100 rounded px-2 py-1 text-xs font-bold">
                                    {admin.usuario}
                                </span>
                            </td>
                            <td className="p-4 text-gray-500 hidden sm:table-cell">{admin.correo}</td>
                            <td className="p-4 text-right">
                            {admin.usuario !== 'admin' && ( 
                                <button 
                                onClick={() => eliminarAdmin(admin.id)}
                                className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-all"
                                title="Eliminar acceso"
                                >
                                <Trash2 size={18} />
                                </button>
                                )}
                                {admin.usuario === 'admin' && (
                                    <span title="Súper Admin Protegido" className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-50 ml-auto">
                                        <ShieldCheck size={18} className="text-green-500" />
                                    </span>
                                )}
                            </td>
                        </tr>
                        ))
                    )}
                </tbody>
                </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}