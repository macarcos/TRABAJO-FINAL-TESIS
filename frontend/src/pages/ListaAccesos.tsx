import { useEffect, useState } from 'react';
import axios from 'axios';
import { Search, Trash2, Calendar } from 'lucide-react';

export default function ListaAccesos() {
  const [historial, setHistorial] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => { cargarHistorial(); }, []);

  const cargarHistorial = async () => {
    try {
      console.log('🔄 Cargando historial completo...');
      const res = await axios.get('http://localhost:3000/api/acceso/historial');
      console.log('📥 Respuesta del backend:', res.data);
      
      // ✅ El backend devuelve { success: true, total: X, accesos: [...] }
      if (res.data.accesos) {
        setHistorial(res.data.accesos);
        console.log(`✅ ${res.data.accesos.length} registros cargados`);
      } else {
        setHistorial([]);
        console.log('⚠️ No hay registros en el historial');
      }
    } catch (error) { 
      console.error("❌ Error cargando historial:", error); 
      setHistorial([]);
    }
  };

  const borrarHistorial = async () => {
    if(!confirm("⚠️ ¿BORRAR TODO EL HISTORIAL?\nEsta acción no se puede deshacer.")) return;
    try {
      const res = await axios.delete('http://localhost:3000/api/acceso/historial');
      console.log('🗑️ Respuesta del servidor:', res.data);
      alert(`✅ ${res.data.message || 'Historial eliminado correctamente'}`);
      cargarHistorial();
    } catch (error) { 
      console.error("❌ Error al eliminar:", error);
      alert("❌ Error al eliminar historial"); 
    }
  };

  // FUNCIÓN FECHA ECUADOR
  const fechaEcuador = (fechaISO: string) => {
    if (!fechaISO) return "--/--/---- --:--:--";
    
    try {
      return new Date(fechaISO).toLocaleString('es-EC', {
        timeZone: 'America/Guayaquil',
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit', 
        hour12: true
      });
    } catch (error) {
      console.error('Error formateando fecha:', error);
      return fechaISO;
    }
  };

  const filtrados = historial.filter(h => 
    h.primer_nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
    h.primer_apellido?.toLowerCase().includes(busqueda.toLowerCase()) ||
    (h.cedula && h.cedula.includes(busqueda))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-unemi-text">Historial de Accesos</h2>
          <p className="text-sm text-gray-500">
            Registro completo de ingresos - <span className="font-bold text-unemi-primary">{historial.length}</span> registros
          </p>
        </div>
        <button 
          onClick={borrarHistorial} 
          disabled={historial.length === 0}
          className="bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors border border-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Trash2 size={18}/> Limpiar Todo
        </button>
      </div>

      {/* Búsqueda */}
      <div className="relative w-full sm:w-96">
        <Search className="absolute left-3 top-3 text-gray-400" size={18}/>
        <input 
          placeholder="Buscar por nombre o cédula..." 
          className="w-full pl-10 p-2 border rounded-xl outline-none focus:ring-2 focus:ring-unemi-primary/50" 
          onChange={e => setBusqueda(e.target.value)} 
          value={busqueda}
        />
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 font-semibold text-gray-600 border-b">
              <tr>
                <th className="p-4">Persona</th>
                <th className="p-4">Cédula</th>
                <th className="p-4">Rol</th>
                <th className="p-4">Método</th>
                <th className="p-4">Fecha y Hora</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtrados.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-400">
                    {busqueda ? '🔍 No se encontraron resultados' : '📭 No hay registros en el historial'}
                  </td>
                </tr>
              ) : (
                filtrados.map(h => (
                  <tr key={h.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 flex items-center gap-3">
                      {h.foto_url ? (
                        <img 
                          src={h.foto_url} 
                          className="w-10 h-10 rounded-full object-cover border border-gray-200 shadow-sm" 
                          alt="Foto"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-unemi-primary/10 text-unemi-primary flex items-center justify-center font-bold text-xs">
                          {h.primer_nombre?.[0] || '?'}
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-gray-800">
                          {h.primer_nombre} {h.primer_apellido}
                        </p>
                        <p className="text-xs text-gray-400">{h.correo}</p>
                      </div>
                    </td>
                    <td className="p-4 font-mono text-gray-600">{h.cedula || '---'}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-md text-xs font-bold border ${
                        h.tipo_persona === 'Estudiante' ? 'bg-blue-50 text-blue-700 border-blue-100' : 
                        h.tipo_persona === 'Docente' ? 'bg-green-50 text-green-700 border-green-100' :
                        h.tipo_persona === 'Administrativo' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                        'bg-gray-50 text-gray-700 border-gray-200'
                      }`}>
                        {h.tipo_persona}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded text-xs border border-gray-200 w-max">
                        {h.metodo === 'Reconocimiento Facial' && '📸 Facial'}
                        {h.metodo === 'RFID Físico' && '💳 Tarjeta'}
                        {h.metodo === 'Simulación Web' && '🧪 Test'}
                        {h.metodo === 'RFID Física' && '💳 RFID'}
                        {!['Reconocimiento Facial', 'RFID Físico', 'Simulación Web', 'RFID Física'].includes(h.metodo) && h.metodo}
                      </span>
                    </td>
                    <td className="p-4 text-gray-600 font-medium">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-gray-400"/>
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
    </div>
  );
}