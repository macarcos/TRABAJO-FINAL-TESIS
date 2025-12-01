import { useState, useEffect } from 'react';
import axios from 'axios';
import { useForm } from 'react-hook-form';
import { ShieldAlert, Trash2, Mail, User, Save, ShieldCheck } from 'lucide-react';

export default function GestionAdmins() {
  const [admins, setAdmins] = useState<any[]>([]);
  const { register, handleSubmit, reset } = useForm();
  const [cargando, setCargando] = useState(false);

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
        // ✅ Los nuevos admins DEBEN cambiar contraseña (needs_password_reset = 1 por defecto en backend)
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

  return (
    <div className="space-y-8">
      
      {/* Encabezado */}
      <div>
        <h2 className="text-2xl font-bold text-unemi-text flex items-center gap-2">
          <ShieldAlert className="text-orange-500"/> Gestión de Administradores
        </h2>
        <p className="text-gray-500 text-sm">Creación de operadores del sistema (Sin credencial física).</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLUMNA IZQUIERDA: FORMULARIO DE CREACIÓN */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-orange-500">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <User size={18}/> Nuevo Operador
            </h3>
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <input {...register("primer_nombre", {required: true})} placeholder="1er Nombre" className="w-full p-2 border rounded bg-gray-50" />
                <input {...register("segundo_nombre")} placeholder="2do Nombre" className="w-full p-2 border rounded bg-gray-50" />
                <input {...register("primer_apellido", {required: true})} placeholder="1er Apellido" className="w-full p-2 border rounded bg-gray-50" />
                <input {...register("segundo_apellido")} placeholder="2do Apellido" className="w-full p-2 border rounded bg-gray-50" />
              </div>

              <div className="relative">
                <Mail className="absolute left-3 top-2.5 text-gray-400" size={16}/>
                <input 
                  {...register("correo", { required: true, pattern: /@unemi\.edu\.ec$/ })} 
                  placeholder="Correo @unemi.edu.ec" 
                  className="w-full pl-9 p-2 border rounded bg-gray-50 text-sm" 
                />
              </div>

              <button 
                disabled={cargando}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 rounded flex items-center justify-center gap-2 transition-all"
              >
                {cargando ? 'Creando...' : <><Save size={18}/> Crear Admin</>}
              </button>
            </form>
          </div>
        </div>

        {/* COLUMNA DERECHA: LISTA DE ADMINS */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gray-50 p-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-gray-700">Administradores Activos</h3>
              <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs font-bold">{admins.length} Usuarios</span>
            </div>
            
            <table className="w-full text-sm text-left">
              <thead className="text-gray-500 font-medium border-b">
                <tr>
                  <th className="p-4">Nombre</th>
                  <th className="p-4">Usuario</th>
                  <th className="p-4">Correo</th>
                  <th className="p-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-gray-50 border-b last:border-0">
                    <td className="p-4 font-bold text-gray-700">
                      {admin.primer_nombre} {admin.primer_apellido}
                    </td>
                    <td className="p-4 font-mono text-orange-600 bg-orange-50 rounded w-max px-2">
                      {admin.usuario}
                    </td>
                    <td className="p-4 text-gray-500">{admin.correo}</td>
                    <td className="p-4 text-right">
                      {admin.usuario !== 'admin' && ( // Protegemos al Súper Admin para que no lo borren
                        <button 
                          onClick={() => eliminarAdmin(admin.id)}
                          className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded transition-colors"
                          title="Eliminar acceso"
                        >
                          <Trash2 size={18} />
                        </button>
                        )}
                        {admin.usuario === 'admin' && (
                            <span title="Súper Admin Protegido" className="inline-flex items-center ml-2 cursor-help">
                            <ShieldCheck size={18} className="text-green-500" />
                            </span>
                        )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}