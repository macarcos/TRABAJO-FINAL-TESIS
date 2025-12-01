import { useEffect, useState } from 'react';
import axios from 'axios';
import { Users, Clock, GraduationCap, Briefcase, Building2, ShieldAlert, TrendingUp, Activity } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, 
  PieChart, Pie, Cell, LineChart, Line, Legend 
} from 'recharts';

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    cargarDatos();
    const interval = setInterval(cargarDatos, 5000);
    return () => clearInterval(interval);
  }, []);

  const cargarDatos = () => {
    axios.get('http://localhost:3000/api/dashboard/stats')
      .then(res => setStats(res.data))
      .catch(console.error);
  };

  if (!stats) return <div className="min-h-screen flex items-center justify-center text-gray-400">Cargando panel...</div>;

  // --- PREPARACIÓN DE DATOS PARA GRÁFICAS ---

  // 1. Datos para Gráfico de Pastel (Distribución del Personal)
  const dataDistribucion = [
    { name: 'Estudiantes', value: stats.estudiantes || 0, color: '#3B82F6' }, 
    { name: 'Docentes', value: stats.docentes || 0, color: '#A855F7' },    
    { name: 'Admin', value: stats.administrativos || 0, color: '#F97316' },
    { name: 'Guardias', value: stats.general || 0, color: '#6B7280' },     
  ].filter(item => item.value > 0); 

  // 2. Datos Simulados para "Actividad por Hora" 
  const dataHoras = [
    { hora: '08:00', accesos: 2 },
    { hora: '10:00', accesos: 5 },
    { hora: '12:00', accesos: 3 },
    { hora: '14:00', accesos: 8 },
    { hora: '16:00', accesos: 4 },
    { hora: '18:00', accesos: 1 },
  ];

  return (
    <div className="space-y-6 pb-10 bg-gray-50/50 min-h-screen p-6">
      
      {/* HEADER */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Panel de Control</h2>
          <p className="text-gray-500 text-sm mt-1">Visión general de seguridad y accesos UniAccess.</p>
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
            En vivo • {new Date().toLocaleTimeString()}
          </p>
        </div>
      </div>

      {/* 1. TARJETAS PRINCIPALES (KPIs) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Tarjeta Destacada Total */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-5 rounded-2xl shadow-lg text-white flex flex-col justify-between relative overflow-hidden col-span-1 md:col-span-2">
            <div className="relative z-10 flex justify-between items-start">
              <div>
                <p className="text-blue-100 font-medium mb-1 flex items-center gap-2">
                  <Users size={16}/> Total Registrados
                </p>
                <h3 className="text-4xl font-bold">{stats.total}</h3>
              </div>
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <TrendingUp size={20} className="text-white"/>
              </div>
            </div>
            <div className="mt-4 relative z-10">
               <div className="h-1 w-full bg-blue-900/30 rounded-full overflow-hidden">
                 <div className="h-full bg-blue-300 w-3/4 rounded-full"></div>
               </div>
               <p className="text-xs text-blue-200 mt-2">Capacidad del sistema operativa</p>
            </div>
            <div className="absolute -right-5 -bottom-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
        </div>

        {/* Tarjeta Accesos Hoy */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-500 font-medium text-xs uppercase">Accesos Hoy</p>
                <h3 className="text-3xl font-bold text-green-600 mt-1">{stats.hoy}</h3>
              </div>
              <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                <Clock size={20}/>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              <span className="text-green-600 font-bold">▲ +2</span> vs ayer
            </p>
        </div>

        {/* Tarjeta Rol Más Activo */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-500 font-medium text-xs uppercase">Rol Más Activo</p>
                <h3 className="text-xl font-bold text-purple-600 mt-1">Docentes</h3>
              </div>
              <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                <Activity size={20}/>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">Basado en últimos ingresos</p>
        </div>
      </div>

      {/* 2. SECCIÓN DE GRÁFICAS DE DISTRIBUCIÓN Y TENDENCIA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* GRÁFICA DE PASTEL: Distribución de Personal */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
          <h3 className="w-full text-left font-bold text-gray-800 mb-2">Distribución de Personal</h3>
          {/* CORRECCIÓN: Usamos style inline para asegurar altura antes del render */}
          <div style={{ width: '100%', height: 300 }} className="relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dataDistribucion}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {dataDistribucion.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
                <span className="text-3xl font-bold text-gray-800">{stats.total}</span>
                <span className="text-xs text-gray-400 uppercase">Usuarios</span>
            </div>
          </div>
        </div>

        {/* GRÁFICA DE LÍNEAS: Tendencia Horaria */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
             <h3 className="font-bold text-gray-800">Actividad por Hora (Estimación)</h3>
          </div>
          {/* CORRECCIÓN: Altura fija con style */}
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dataHoras} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="hora" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} dy={10}/>
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                />
                <Line 
                  type="monotone" 
                  dataKey="accesos" 
                  stroke="#2563EB" 
                  strokeWidth={3} 
                  dot={{r: 4, fill: '#2563EB', strokeWidth: 2, stroke: '#fff'}} 
                  activeDot={{r: 6}} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 3. DESGLOSE DETALLADO Y BARRAS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* BARRAS: Ingresos Semanales */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-6">Ingresos: Últimos 7 Días</h3>
          {/* CORRECCIÓN: Altura fija con style */}
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.grafica} barSize={40}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px', border: 'none'}} />
                <Bar dataKey="accesos" fill="#4F46E5" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* RANKING / LISTA: Top Roles (CORREGIDO) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
           <h3 className="font-bold text-gray-800 mb-4">Resumen por Rol</h3>
           <div className="space-y-4">
              
              {/* Item Docente */}
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-xl border border-purple-100">
                <div className="flex items-center gap-3">
                  <div className="bg-white p-2 rounded-lg text-purple-600"><Briefcase size={18}/></div>
                  <div>
                    <p className="font-bold text-gray-700 text-sm">Docentes</p>
                    <p className="text-xs text-gray-400">{stats.docentes || 0} registrados</p>
                  </div>
                </div>
                <span className="font-bold text-purple-700 text-lg">
                  {stats.total > 0 ? Math.round((stats.docentes / stats.total) * 100) : 0}%
                </span>
              </div>

              {/* Item Estudiante */}
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl border border-blue-100">
                <div className="flex items-center gap-3">
                  <div className="bg-white p-2 rounded-lg text-blue-600"><GraduationCap size={18}/></div>
                  <div>
                    <p className="font-bold text-gray-700 text-sm">Estudiantes</p>
                    <p className="text-xs text-gray-400">{stats.estudiantes || 0} registrados</p>
                  </div>
                </div>
                <span className="font-bold text-blue-700 text-lg">
                  {stats.total > 0 ? Math.round((stats.estudiantes / stats.total) * 100) : 0}%
                </span>
              </div>

              {/* Item Admin */}
              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-xl border border-orange-100">
                <div className="flex items-center gap-3">
                  <div className="bg-white p-2 rounded-lg text-orange-600"><Building2 size={18}/></div>
                  <div>
                    <p className="font-bold text-gray-700 text-sm">Admin</p>
                    <p className="text-xs text-gray-400">{stats.administrativos || 0} registrados</p>
                  </div>
                </div>
                <span className="font-bold text-orange-700 text-lg">
                  {stats.total > 0 ? Math.round((stats.administrativos / stats.total) * 100) : 0}%
                </span>
              </div>

              {/* Item Guardias (General) */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="bg-white p-2 rounded-lg text-gray-600"><ShieldAlert size={18}/></div>
                  <div>
                    <p className="font-bold text-gray-700 text-sm">General (Guardias)</p>
                    <p className="text-xs text-gray-400">{stats.general || 0} registrados</p>
                  </div>
                </div>
                <span className="font-bold text-gray-700 text-lg">
                  {stats.total > 0 ? Math.round((stats.general / stats.total) * 100) : 0}%
                </span>
              </div>

           </div>
        </div>
      </div>

      {/* 4. ÚLTIMOS MOVIMIENTOS (TABLA) */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-800 mb-4">Historial de Accesos Recientes</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-gray-400 text-xs uppercase border-b border-gray-100">
                <th className="pb-3 pl-2 font-medium">Usuario</th>
                <th className="pb-3 font-medium">Rol</th>
                <th className="pb-3 font-medium">Hora</th>
                <th className="pb-3 font-medium text-right pr-2">Método</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {stats.recientes.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-6 text-gray-400">No hay movimientos hoy.</td>
                </tr>
              ) : (
                stats.recientes.map((acc: any, i: number) => (
                  <tr key={i} className="group hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0">
                    <td className="py-3 pl-2 flex items-center gap-3">
                       <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold
                          ${acc.tipo_persona === 'Estudiante' ? 'bg-blue-500' : 
                            acc.tipo_persona === 'Docente' ? 'bg-purple-500' : 
                            acc.tipo_persona === 'Administrativo' ? 'bg-orange-500' : 'bg-gray-500'}`}>
                          {acc.primer_nombre[0]}{acc.primer_apellido[0]}
                       </div>
                       <span className="font-medium text-gray-700 group-hover:text-black">{acc.primer_nombre} {acc.primer_apellido}</span>
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium 
                        ${acc.tipo_persona === 'Estudiante' ? 'bg-blue-100 text-blue-700' : 
                          acc.tipo_persona === 'Docente' ? 'bg-purple-100 text-purple-700' : 
                          acc.tipo_persona === 'Administrativo' ? 'bg-orange-100 text-orange-700' : 
                          'bg-gray-100 text-gray-700'}`}>
                        {acc.tipo_persona}
                      </span>
                    </td>
                    <td className="py-3 text-gray-500">
                      {new Date(acc.fecha).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </td>
                    <td className="py-3 text-right pr-2">
                       <span className="text-xs border border-gray-200 px-2 py-1 rounded text-gray-500">
                         {acc.metodo.includes('Facial') ? '📸 Facial' : '💳 RFID'}
                       </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}