import { useEffect, useState } from 'react';
import axios from 'axios';
import { Search, Trash2, Calendar, Eye, X } from 'lucide-react';

export default function ListaAccesos() {
  const [historial, setHistorial] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [fotoModal, setFotoModal] = useState<{ visible: boolean; foto: string | null; metodo: string; persona: string }>({
    visible: false,
    foto: null,
    metodo: '',
    persona: ''
  });

  useEffect(() => { cargarHistorial(); }, []);

  const cargarHistorial = async () => {
    try {
      console.log('🔄 Cargando historial completo...');
      const res = await axios.get('http://localhost:3000/api/acceso/historial');
      console.log('📥 Respuesta del backend:', res.data);
      
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
    if(!confirm("⚠️ ¿BORRAR TODO EL HISTORIAL?\nEsta acción no se puede deshacer.\n\n⚠️ Se eliminarán todas las fotos de verificación.")) return;
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

  // ✅ ABRIR MODAL CON FOTO
  const abrirFoto = (foto: string | null, metodo: string, persona: string) => {
    setFotoModal({
      visible: true,
      foto,
      metodo,
      persona
    });
  };

  // ✅ CERRAR MODAL
  const cerrarFoto = () => {
    setFotoModal({
      visible: false,
      foto: null,
      metodo: '',
      persona: ''
    });
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
          <h2 className="text-2xl font-bold text-gray-800">Historial de Accesos</h2>
          <p className="text-sm text-gray-500">
            Registro completo de ingresos - <span className="font-bold text-blue-600">{historial.length}</span> registros
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
          className="w-full pl-10 p-2 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500/50" 
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
                <th className="p-4">Foto Verificación</th>
                <th className="p-4">Confianza</th>
                <th className="p-4">Fecha y Hora</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtrados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400">
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
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
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
                        {h.metodo === 'RFID Virtual' && '📱 NFC'}
                        {!['Reconocimiento Facial', 'RFID Físico', 'RFID Virtual'].includes(h.metodo) && h.metodo}
                      </span>
                    </td>
                    <td className="p-4">
                      {h.foto_verificacion_base64 ? (
                        <button
                          onClick={() => abrirFoto(h.foto_verificacion_base64, h.metodo, `${h.primer_nombre} ${h.primer_apellido}`)}
                          className="flex items-center gap-2 bg-blue-100 hover:bg-blue-200 text-blue-600 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border border-blue-300"
                        >
                          <Eye size={14}/> Ver
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">Sin foto</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      {h.confianza_facial ? (
                        <span className={`px-2 py-1 rounded text-xs font-bold border ${
                          h.confianza_facial >= 80 ? 'bg-green-50 text-green-700 border-green-200' :
                          h.confianza_facial >= 60 ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                          'bg-red-50 text-red-700 border-red-200'
                        }`}>
                          {h.confianza_facial}%
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">---</span>
                      )}
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

      {/* ✅ MODAL DE FOTO */}
      {fotoModal.visible && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 flex justify-between items-center sticky top-0">
              <div>
                <h3 className="font-bold text-lg">Foto de Verificación</h3>
                <p className="text-sm text-blue-100">{fotoModal.persona}</p>
              </div>
              <button
                onClick={cerrarFoto}
                className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Contenido */}
            <div className="p-6 space-y-4">
              <div className="flex justify-center">
                <span className="bg-gray-100 text-gray-700 px-4 py-2 rounded-full text-sm font-bold border border-gray-300">
                  {fotoModal.metodo === 'Reconocimiento Facial' && '📸 Foto Facial'}
                  {fotoModal.metodo === 'RFID Físico' && '💳 Tarjeta RFID'}
                  {fotoModal.metodo === 'RFID Virtual' && '📱 NFC Virtual'}
                </span>
              </div>

              {fotoModal.foto ? (
                <img
                  src={fotoModal.foto}
                  alt="Foto de verificación"
                  className="w-full rounded-xl border-2 border-gray-300 shadow-lg max-h-96 object-contain"
                />
              ) : (
                <div className="bg-gray-100 h-64 flex items-center justify-center rounded-xl border-2 border-gray-300">
                  <p className="text-gray-500 font-semibold">No hay foto disponible</p>
                </div>
              )}

              <p className="text-xs text-gray-500 text-center italic">
                💡 Esta foto se elimina automáticamente al limpiar el historial
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}