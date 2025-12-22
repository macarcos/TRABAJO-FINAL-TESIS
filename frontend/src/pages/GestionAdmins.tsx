import { useState, useEffect } from 'react';
import axios from 'axios';
import { useForm } from 'react-hook-form';
import { ShieldAlert, Trash2, Mail, User, Save, ShieldCheck, Search, XCircle, UserCheck, CheckCircle, X, AlertTriangle, Fingerprint } from 'lucide-react';

export default function GestionAdmins() {
  const [admins, setAdmins] = useState<any[]>([]);
  const { register, handleSubmit, reset } = useForm();
  const [cargando, setCargando] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  // ESTADOS PARA MODALES Y NOTIFICACIONES
  const [notificacion, setNotificacion] = useState<{show: boolean, usuario: string} | null>(null);
  const [adminAEliminar, setAdminAEliminar] = useState<any | null>(null);
  const [showToast, setShowToast] = useState(false);

  // USUARIO ACTUAL
  const usuarioData = sessionStorage.getItem('usuario_unemi');
  const usuarioActual = usuarioData ? JSON.parse(usuarioData) : { id: 0 };

  useEffect(() => {
    cargarAdmins();
  }, []);

  // FUNCIÓN PARA LANZAR NOTIFICACIÓN ANIMADA
  const lanzarNotificacion = (usuario: string) => {
    setNotificacion({ show: true, usuario });
    setTimeout(() => setShowToast(true), 10);
    setTimeout(() => {
        setShowToast(false);
        setTimeout(() => setNotificacion(null), 500);
    }, 5000);
  };

  const cargarAdmins = async () => {
    try {
      const res = await axios.get('http://localhost:3000/api/personas');
      const soloAdmins = res.data.filter((p: any) => p.tipo_persona === 'Admin');
      setAdmins(soloAdmins);
    } catch (error) { console.error(error); }
  };

  const confirmarEliminacion = (admin: any) => {
    if (admin.id === usuarioActual.id) return;
    setAdminAEliminar(admin);
  };

  const eliminarDefinitivamente = async () => {
    if (!adminAEliminar) return;
    try {
      await axios.delete(`http://localhost:3000/api/personas/${adminAEliminar.id}`);
      cargarAdmins();
      setAdminAEliminar(null);
    } catch (error) { 
        alert("Error al eliminar"); 
    }
  };

  const onSubmit = async (data: any) => {
    setCargando(true);
    try {
        const payload = { ...data, tipo_persona: 'Admin', cedula: null, vector_facial: null };
        const res = await axios.post('http://localhost:3000/api/registrar', payload);
        
        lanzarNotificacion(res.data.usuario);
        reset();
        cargarAdmins();
    } catch (error: any) {
        alert("Error: " + (error.response?.data?.error || "Error desconocido"));
    } finally {
        setCargando(false);
    }
  };

  // 🔥 LÓGICA DE BÚSQUEDA (NOMBRE O USUARIO)
  const adminsFiltrados = admins.filter((admin) => {
    const termino = busqueda.toLowerCase().trim();
    if(!termino) return true;

    const nombreCompleto = `${admin.primer_nombre} ${admin.primer_apellido}`.toLowerCase();
    const usuario = admin.usuario ? admin.usuario.toLowerCase() : '';
    
    return nombreCompleto.includes(termino) || usuario.includes(termino);
  });

  return (
    <div className="space-y-4 p-4 relative">
      
      {/* ====================================================== */}
      {/* MODAL DE CONFIRMACIÓN (ROJO) */}
      {/* ====================================================== */}
      {adminAEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full overflow-hidden transform transition-all scale-100">
                <div className="bg-red-50 p-5 flex flex-col items-center text-center border-b border-red-100 relative">
                    <div className="bg-red-100 p-2 rounded-full mb-2 text-red-600 shadow-sm">
                        <Trash2 size={24} />
                    </div>
                    <h3 className="text-base font-bold text-gray-800">¿Eliminar Administrador?</h3>
                    <p className="text-[11px] text-gray-500 mt-1 mb-3">Estás a punto de borrar a:</p>

                    <div className="bg-white p-2 rounded-lg border border-gray-200 shadow-sm w-full flex flex-col items-center">
                        <div className="w-8 h-8 bg-blue-900 text-white rounded-full flex items-center justify-center font-bold text-xs mb-1 shadow-md">
                            {adminAEliminar.primer_nombre[0]}{adminAEliminar.primer_apellido[0]}
                        </div>
                        <h4 className="font-bold text-gray-800 text-sm leading-tight">
                            {adminAEliminar.primer_nombre} {adminAEliminar.primer_apellido}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-[9px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-100 uppercase tracking-wide flex items-center gap-1">
                                <ShieldCheck size={10} /> {adminAEliminar.tipo_persona || 'ADMIN'}
                            </span>
                            <span className="text-[9px] font-mono font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded border border-gray-200 flex items-center gap-1">
                                <Fingerprint size={10} /> {adminAEliminar.usuario}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="bg-gray-50 p-3 flex gap-2 justify-center border-t border-gray-100">
                    <button onClick={() => setAdminAEliminar(null)} className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 font-bold text-xs rounded-lg hover:bg-gray-100 transition-colors shadow-sm">Cancelar</button>
                    <button onClick={eliminarDefinitivamente} className="px-3 py-1.5 bg-red-600 text-white font-bold text-xs rounded-lg hover:bg-red-700 transition-colors shadow-md flex items-center gap-1.5"><AlertTriangle size={12} /> Sí, Eliminar</button>
                </div>
            </div>
        </div>
      )}

      {/* TOAST DE CREACIÓN EXITOSA (ANIMADO) */}
      {notificacion && (
        <div 
            className={`fixed top-20 right-5 z-50 shadow-xl rounded-lg p-3 w-72 border-l-4 border-green-500 flex items-start gap-3 bg-white 
            transition-all duration-500 ease-in-out transform 
            ${showToast ? 'translate-x-0 opacity-100' : 'translate-x-[150%] opacity-0'}`}
        >
            <div className="bg-green-100 p-1.5 rounded-full text-green-600"><CheckCircle size={18} /></div>
            <div className="flex-1">
                <h4 className="font-bold text-gray-800 text-xs">¡Admin Creado!</h4>
                <div className="mt-1 bg-gray-50 p-1 rounded border border-gray-200 text-center">
                    <span className="font-mono font-bold text-orange-600 text-xs">{notificacion.usuario}</span>
                </div>
                <p className="text-[9px] text-gray-400 mt-1 italic">*Cambiar clave al entrar.</p>
            </div>
            <button onClick={() => setShowToast(false)} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
        </div>
      )}

      {/* TITULO DE PAGINA */}
      <div className="flex items-center gap-2 mb-2">
         {/* CAMBIO: Texto Azul Navy */}
         <h2 className="text-lg font-bold text-blue-900 flex items-center gap-2">
          <ShieldAlert className="text-orange-500" size={20}/> Gestión de Administradores
         </h2>
         <span className="text-[10px] text-gray-400 bg-white px-2 py-0.5 rounded-full border border-gray-200">Acceso Sistema</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* COLUMNA IZQUIERDA: FORMULARIO */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden sticky top-4">
            {/* Header del Formulario en AZUL (No Morado) */}
            <div className="bg-gradient-to-r from-blue-900 to-blue-800 p-3 flex items-center gap-2 text-white">
                <User size={16} className="text-orange-400"/>
                <h3 className="font-bold text-sm">Nuevo Operador</h3>
            </div>
            
            <div className="p-4">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
                <div className="space-y-2">
                    <input {...register("primer_nombre", {required: true})} placeholder="1er Nombre" className="w-full px-3 py-1.5 text-xs border rounded-lg bg-gray-50 focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all" />
                    <input {...register("segundo_nombre")} placeholder="2do Nombre" className="w-full px-3 py-1.5 text-xs border rounded-lg bg-gray-50 focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all" />
                    <input {...register("primer_apellido", {required: true})} placeholder="1er Apellido" className="w-full px-3 py-1.5 text-xs border rounded-lg bg-gray-50 focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all" />
                    <input {...register("segundo_apellido")} placeholder="2do Apellido" className="w-full px-3 py-1.5 text-xs border rounded-lg bg-gray-50 focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all" />
                </div>

                <div className="relative">
                    <Mail className="absolute left-3 top-2 text-gray-400" size={12}/>
                    <input 
                    {...register("correo", { required: true, pattern: /@unemi\.edu\.ec$/ })} 
                    placeholder="Correo @unemi.edu.ec" 
                    className="w-full pl-8 px-3 py-1.5 border rounded-lg bg-gray-50 text-xs focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all" 
                    />
                </div>

                <button 
                    disabled={cargando}
                    className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-2 rounded-lg flex items-center justify-center gap-2 transition-all shadow-md text-xs mt-2"
                >
                    {cargando ? 'Creando...' : <><Save size={14}/> Crear Admin</>}
                </button>
                </form>
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: LISTA DE ADMINS */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* BARRA DE BÚSQUEDA */}
          <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 border-t-4 border-orange-500 flex flex-col sm:flex-row justify-between items-center gap-3">
            <h3 className="font-bold text-blue-900 whitespace-nowrap text-sm flex items-center gap-2">
                <ShieldCheck size={16}/> Administradores Activos
            </h3>
            
            <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2 text-gray-400" size={14}/>
                {/* Borde Naranja al escribir */}
                <input 
                    type="text" 
                    placeholder="Buscar por nombre o usuario..." 
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="w-full pl-8 pr-7 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                />
                {busqueda && (
                    <button onClick={() => setBusqueda('')} className="absolute right-2 top-2 text-gray-400 hover:text-gray-600">
                        <XCircle size={12} />
                    </button>
                )}
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                {/* Cabecera Azul (Estilo eCampus) */}
                <thead className="bg-gradient-to-r from-blue-900 to-blue-800 text-white uppercase font-bold border-b border-blue-900">
                    <tr>
                    <th className="p-3 pl-4">Nombre</th>
                    <th className="p-3">Usuario</th>
                    <th className="p-3 hidden sm:table-cell">Correo</th>
                    <th className="p-3 text-right pr-4">Acción</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {adminsFiltrados.length === 0 ? (
                        <tr>
                            <td colSpan={4} className="p-6 text-center text-gray-400 text-xs">
                                No se encontraron administradores.
                            </td>
                        </tr>
                    ) : (
                        adminsFiltrados.map((admin) => (
                        // Filas Cebra
                        <tr key={admin.id} className={`even:bg-slate-50 odd:bg-white hover:bg-blue-50/50 transition-colors ${admin.id === usuarioActual.id ? 'bg-orange-50/30' : ''}`}>
                            <td className="p-3 pl-4">
                                <p className="font-bold text-blue-900 flex items-center gap-2">
                                    {admin.primer_nombre} {admin.primer_apellido}
                                    {admin.id === usuarioActual.id && (
                                        <span className="text-[8px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded border border-green-200 uppercase font-bold">TÚ</span>
                                    )}
                                </p>
                            </td>
                            <td className="p-3">
                                <span className="font-mono text-orange-600 bg-orange-50 border border-orange-100 rounded px-1.5 py-0.5 text-[10px] font-bold">
                                    {admin.usuario}
                                </span>
                            </td>
                            <td className="p-3 text-gray-500 hidden sm:table-cell text-[10px]">{admin.correo}</td>
                            <td className="p-3 text-right pr-4">
                                {admin.usuario === 'admin' ? (
                                    <span title="Súper Admin Protegido" className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-green-50 ml-auto border border-green-100">
                                        <ShieldCheck size={14} className="text-green-600" />
                                    </span>
                                ) : admin.id === usuarioActual.id ? (
                                    <span title="No puedes eliminar tu propia cuenta" className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-gray-100 ml-auto text-gray-400 cursor-not-allowed border border-gray-200">
                                        <UserCheck size={14} />
                                    </span>
                                ) : (
                                    <button 
                                        onClick={() => confirmarEliminacion(admin)}
                                        className="text-red-500 hover:text-white hover:bg-red-500 p-1.5 rounded-lg transition-all ml-auto block border border-red-100 hover:border-red-500 shadow-sm"
                                        title="Eliminar acceso"
                                    >
                                        <Trash2 size={14} />
                                    </button>
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