import { useEffect, useState } from 'react';
import { Users, Clock, GraduationCap, Briefcase, Building2, Shield, TrendingUp, Activity, Filter, X, RotateCcw, AlertCircle, LayoutDashboard } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, 
  PieChart, Pie, Cell, LineChart, Line, Legend 
} from 'recharts';

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [error, setError] = useState<string>('');
  
  // ESTADO PARA EL ROL MÁS ACTIVO
  const [rolMasActivo, setRolMasActivo] = useState<string>('---');

  const [filtrosTemp, setFiltrosTemp] = useState({
    fechaInicio: '',
    fechaFin: '',
    horaInicio: '',
    horaFin: '',
    tipoPersona: ''
  });
  const [filtrosActivos, setFiltrosActivos] = useState({
    fechaInicio: '',
    fechaFin: '',
    horaInicio: '',
    horaFin: '',
    tipoPersona: ''
  });

  useEffect(() => {
    cargarDatos();
    const interval = setInterval(cargarDatos, 5000);
    return () => clearInterval(interval);
  }, [filtrosActivos]);

  // CALCULAR ROL MÁS ACTIVO
  useEffect(() => {
    if (stats) {
        const conteos = [
            { nombre: 'Estudiantes', valor: stats.estudiantes || 0 },
            { nombre: 'Docentes', valor: stats.docentes || 0 },
            { nombre: 'Administrativos', valor: stats.administrativos || 0 },
            { nombre: 'Visitantes', valor: stats.general || 0 }
        ];
        conteos.sort((a, b) => b.valor - a.valor);
        setRolMasActivo(conteos[0].valor === 0 ? 'Ninguno' : conteos[0].nombre);
    }
  }, [stats]);

  const cargarDatos = async () => {
    try {
      const params = new URLSearchParams();
      if (filtrosActivos.fechaInicio) params.append('fechaInicio', filtrosActivos.fechaInicio);
      if (filtrosActivos.fechaFin) params.append('fechaFin', filtrosActivos.fechaFin);
      if (filtrosActivos.horaInicio) params.append('horaInicio', filtrosActivos.horaInicio);
      if (filtrosActivos.horaFin) params.append('horaFin', filtrosActivos.horaFin);
      if (filtrosActivos.tipoPersona) params.append('tipoPersona', filtrosActivos.tipoPersona === 'Visitante' ? 'General' : filtrosActivos.tipoPersona);

      const response = await fetch(`http://localhost:3000/api/dashboard/stats?${params.toString()}`);
      
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("El servidor no devolvió datos válidos (JSON).");
      }
      if (!response.ok) throw new Error(`Error del servidor: ${response.status}`);

      const data = await response.json();
      setStats(data);
      setError(''); 
    } catch (error: any) {
      console.error('Error cargando datos:', error);
      setError(error.message.includes('Failed to fetch') ? 'No se puede conectar al Backend.' : error.message);
    }
  };

  const aplicarFiltros = () => setFiltrosActivos({...filtrosTemp});
  
  const limpiarFiltros = () => {
    const vacios = { fechaInicio: '', fechaFin: '', horaInicio: '', horaFin: '', tipoPersona: '' };
    setFiltrosTemp(vacios);
    setFiltrosActivos(vacios);
  };

  const cancelarCambios = () => setFiltrosTemp({...filtrosActivos});

  if (error && !stats) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-red-600 gap-4 bg-gray-50 p-4">
        <AlertCircle size={40} className="bg-red-100 p-2 rounded-full box-content"/>
        <div className="text-center">
            <h3 className="text-lg font-bold mb-1">Error de Conexión</h3>
            <p className="text-xs text-gray-500">{error}</p>
        </div>
        <button onClick={cargarDatos} className="px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-xs font-bold shadow-md">Reintentar</button>
      </div>
    );
  }

  if (!stats) return (
      <div className="min-h-screen flex flex-col items-center justify-center text-gray-400 gap-2">
        <div className="w-6 h-6 border-2 border-blue-900 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-bold text-blue-900">Cargando...</p>
      </div>
  );

  const dataDistribucion = [
    { name: 'Estudiantes', value: stats.estudiantes || 0, color: '#1E3A8A' },
    { name: 'Docentes', value: stats.docentes || 0, color: '#F97316' },
    { name: 'Admin', value: stats.administrativos || 0, color: '#10B981' },
    { name: 'Visitantes', value: stats.general || 0, color: '#6B7280' },
  ].filter(item => item.value > 0); 

  return (
    <div className="space-y-4 pb-8 bg-gray-50/50 min-h-screen p-4">
      
      {/* HEADER TIPO BANNER (ESTILO ECAMPUS) */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-800 rounded-xl p-5 shadow-lg text-white flex justify-between items-center relative overflow-hidden">
        <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1">
                <div className="bg-white/20 p-1.5 rounded-lg backdrop-blur-sm">
                    <LayoutDashboard size={18} className="text-orange-400"/>
                </div>
                <h2 className="text-lg font-bold">Panel de Control</h2>
            </div>
            <p className="text-blue-200 text-xs font-medium">Visión general de seguridad y accesos UniAccess.</p>
        </div>
        
        <div className="relative z-10 hidden sm:block text-right">
             <div className="inline-flex items-center gap-2 bg-black/20 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <p className="text-[10px] font-bold text-white">
                    En vivo • {new Date().toLocaleTimeString()}
                </p>
             </div>
        </div>

        {/* Decoración de fondo */}
        <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-orange-500/10 to-transparent"></div>
        <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>
      </div>

      {/* FILTROS DE BÚSQUEDA */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 border-t-4 border-orange-500">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="text-blue-900" size={16}/>
          <h3 className="font-bold text-gray-800 text-sm">Filtros de Búsqueda</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 mb-1"><span className="text-green-600">📅</span> Fecha Desde</label>
            <input type="date" value={filtrosTemp.fechaInicio} onChange={(e) => setFiltrosTemp({...filtrosTemp, fechaInicio: e.target.value})} className="w-full px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"/>
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 mb-1"><span className="text-blue-600">📅</span> Fecha Hasta</label>
            <input type="date" value={filtrosTemp.fechaFin} onChange={(e) => setFiltrosTemp({...filtrosTemp, fechaFin: e.target.value})} className="w-full px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"/>
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 mb-1"><Clock size={12} className="text-green-600"/> Hora Desde</label>
            <input type="time" value={filtrosTemp.horaInicio} onChange={(e) => setFiltrosTemp({...filtrosTemp, horaInicio: e.target.value})} className="w-full px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"/>
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 mb-1"><Clock size={12} className="text-blue-600"/> Hora Hasta</label>
            <input type="time" value={filtrosTemp.horaFin} onChange={(e) => setFiltrosTemp({...filtrosTemp, horaFin: e.target.value})} className="w-full px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"/>
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 mb-1"><Users size={12} className="text-orange-600"/> Tipo de Persona</label>
            <select value={filtrosTemp.tipoPersona} onChange={(e) => setFiltrosTemp({...filtrosTemp, tipoPersona: e.target.value})} className="w-full px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs bg-white">
              <option value="">Todos</option>
              <option value="Estudiante">Estudiante</option>
              <option value="Docente">Docente</option>
              <option value="Administrativo">Administrativo</option>
              <option value="Visitante">Visitante</option>
            </select>
          </div>
        </div>

        <div className="flex gap-2 mt-3">
          <button onClick={aplicarFiltros} className="flex items-center gap-1.5 bg-blue-900 hover:bg-blue-800 text-white px-3 py-1.5 rounded-lg font-bold text-xs transition-colors shadow-sm"><Filter size={12}/> Filtrar</button>
          <button onClick={limpiarFiltros} className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1.5 rounded-lg font-bold text-xs transition-colors"><RotateCcw size={12}/> Limpiar</button>
          <button onClick={cancelarCambios} className="flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-lg font-bold text-xs transition-colors"><X size={12}/> Cancelar</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* TARJETA TOTAL */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-blue-900 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-400 font-bold text-[10px] uppercase tracking-wide">Total Registrados</p>
                <h3 className="text-2xl font-bold text-blue-900 mt-0.5">{stats.total}</h3>
              </div>
              <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg"><Users size={18}/></div>
            </div>
            <div className="mt-2">
               <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                 <div className="h-full bg-blue-900 w-3/4 rounded-full"></div>
               </div>
               <p className="text-[9px] text-gray-400 mt-1">Capacidad operativa</p>
            </div>
        </div>

        {/* ACCESOS HOY */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-green-500 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-400 font-bold text-[10px] uppercase tracking-wide">Accesos Hoy</p>
                <h3 className="text-2xl font-bold text-gray-800 mt-0.5">{stats.hoy}</h3>
              </div>
              <div className="p-1.5 bg-green-50 text-green-600 rounded-lg"><Clock size={18}/></div>
            </div>
            <p className="text-[10px] text-gray-400 mt-2 font-medium"><span className="text-green-600 font-bold">▲ +2</span> vs ayer</p>
        </div>

        {/* ROL ACTIVO */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-orange-500 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-400 font-bold text-[10px] uppercase tracking-wide">Rol Más Activo</p>
                <h3 className="text-xl font-bold text-orange-600 mt-0.5">{rolMasActivo}</h3>
              </div>
              <div className="p-1.5 bg-orange-50 text-orange-500 rounded-lg"><Activity size={18}/></div>
            </div>
            <p className="text-[10px] text-gray-400 mt-2">Tendencia actual</p>
        </div>

        {/* VISITANTES */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-gray-500 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-400 font-bold text-[10px] uppercase tracking-wide">Visitantes Activos</p>
                <h3 className="text-2xl font-bold text-gray-700 mt-0.5">{stats.general || 0}</h3>
              </div>
              <div className="p-1.5 bg-gray-100 text-gray-600 rounded-lg"><Shield size={18}/></div>
            </div>
            <p className="text-[10px] text-gray-400 mt-2">En el campus</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* GRÁFICO DONA */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 min-w-0">
          <h3 className="font-bold text-gray-800 text-xs mb-2 border-b border-gray-100 pb-2">Distribución de Personal</h3>
          <div className="w-full h-[200px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={dataDistribucion} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={5} dataKey="value">
                  {dataDistribucion.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />)}
                </Pie>
                <Tooltip contentStyle={{borderRadius: '8px', fontSize: '11px', padding: '5px'}}/>
                <Legend verticalAlign="bottom" height={36} iconSize={8} wrapperStyle={{fontSize: '10px'}}/>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
                <span className="text-xl font-bold text-blue-900">{stats.total}</span>
                <span className="text-[8px] text-gray-400 uppercase font-bold">Total</span>
            </div>
          </div>
        </div>

        {/* GRÁFICO LÍNEA */}
        <div className="lg:col-span-2 bg-white p-4 rounded-xl shadow-sm border border-gray-100 min-w-0">
          <h3 className="font-bold text-gray-800 text-xs mb-2 border-b border-gray-100 pb-2">Actividad por Hora</h3>
          <div className="w-full h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.graficaPorHora || []} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="hora" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 9}} dy={5}/>
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 9}} />
                <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '11px'}}/>
                <Line type="monotone" dataKey="cantidad" stroke="#F97316" strokeWidth={2} dot={{r: 2, fill: '#F97316', stroke: '#fff'}} activeDot={{r: 4}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* GRÁFICO BARRAS */}
        <div className="lg:col-span-2 bg-white p-4 rounded-xl shadow-sm border border-gray-100 min-w-0">
          <h3 className="font-bold text-gray-800 text-xs mb-2 border-b border-gray-100 pb-2">Ingresos (7 Días)</h3>
          <div className="w-full h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.grafica || []} barSize={25}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 9}} dy={5} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 9}} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px', border: 'none', fontSize: '11px'}} />
                <Bar dataKey="accesos" fill="#1E3A8A" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* RESUMEN POR ROL */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
           <h3 className="font-bold text-gray-800 text-xs mb-3 border-b border-gray-100 pb-2">Resumen</h3>
           <div className="space-y-2">
              {[
                { label: 'Docentes', val: stats.docentes, color: 'text-orange-600', bg: 'bg-orange-50', icon: Briefcase },
                { label: 'Estudiantes', val: stats.estudiantes, color: 'text-blue-900', bg: 'bg-blue-50', icon: GraduationCap },
                { label: 'Admin', val: stats.administrativos, color: 'text-green-600', bg: 'bg-green-50', icon: Building2 },
                { label: 'Visitantes', val: stats.general, color: 'text-gray-600', bg: 'bg-gray-50', icon: Shield }
              ].map((item, i) => (
                <div key={i} className={`flex items-center justify-between p-2 rounded-lg border border-transparent hover:border-gray-200 transition ${item.bg}`}>
                    <div className="flex items-center gap-2">
                        <item.icon size={14} className={item.color}/>
                        <p className="font-bold text-gray-700 text-[10px]">{item.label}</p>
                    </div>
                    <span className={`font-bold text-[10px] ${item.color}`}>
                        {stats.total > 0 ? Math.round((item.val / stats.total) * 100) : 0}%
                    </span>
                </div>
              ))}
           </div>
        </div>
      </div>

      {/* HISTORIAL DE ACCESOS */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* CABECERA AZUL ESTILO UNEMI */}
        <div className="bg-gradient-to-r from-blue-900 to-blue-800 px-4 py-3 flex justify-between items-center">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Clock size={16} className="text-orange-400"/> Historial Reciente
            </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 text-[9px] uppercase text-gray-500 font-semibold border-b border-gray-200">
              <tr>
                <th className="p-3 pl-4">Usuario</th>
                <th className="p-3">Rol</th>
                <th className="p-3">Hora</th>
                <th className="p-3 text-right pr-4">Método</th>
              </tr>
            </thead>
            <tbody className="text-[11px]">
              {stats.recientes.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-4 text-gray-400">Sin movimientos</td></tr>
              ) : (
                stats.recientes.map((acc: any, i: number) => (
                  <tr key={i} className="group even:bg-slate-50 odd:bg-white hover:bg-blue-50/50 transition-colors border-b border-gray-50 last:border-0">
                    <td className="py-2 pl-4 flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold shadow-sm
                          ${acc.tipo_persona === 'Estudiante' ? 'bg-blue-900' : 
                            acc.tipo_persona === 'Docente' ? 'bg-orange-500' : 
                            acc.tipo_persona === 'Administrativo' ? 'bg-green-600' : 'bg-gray-500'}`}>
                          {acc.primer_nombre?.[0] || '?'}{acc.primer_apellido?.[0] || ''}
                        </div>
                        <span className="font-bold text-gray-700 group-hover:text-blue-900">
                          {acc.primer_nombre || 'Sin nombre'} {acc.primer_apellido || ''}
                        </span>
                    </td>
                    <td className="py-2">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border
                        ${acc.tipo_persona === 'Estudiante' ? 'bg-blue-50 text-blue-900 border-blue-100' : 
                          acc.tipo_persona === 'Docente' ? 'bg-orange-50 text-orange-600 border-orange-100' : 
                          acc.tipo_persona === 'Administrativo' ? 'bg-green-50 text-green-700 border-green-100' : 
                          'bg-gray-50 text-gray-600 border-gray-200'}`}>
                        {acc.tipo_persona.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-2 text-gray-500 font-mono">
                      {new Date(acc.fecha).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </td>
                    <td className="py-2 text-right pr-4">
                        <span className="text-[9px] border border-gray-200 px-2 py-0.5 rounded text-gray-500 bg-white shadow-sm font-medium">
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