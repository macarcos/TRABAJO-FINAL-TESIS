import axios from 'axios';
import { FileDown, FileSpreadsheet, Users } from 'lucide-react';

export default function Reportes() {

  // Función genérica para convertir datos a CSV y descargar
  const descargarCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) {
        alert("No hay datos para exportar en este reporte.");
        return;
    }
    
    // Obtener encabezados
    const headers = Object.keys(data[0]).join(",");
    
    // Crear filas (Manejando comillas y comas en los datos)
    const rows = data.map(obj => 
        Object.values(obj).map(val => `"${val}"`).join(",")
    ).join("\n");
    
    // Unir todo
    const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + rows;
    
    // Crear enlace temporal y descargar
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 1. Exportar Lista de Usuarios (Personas)
  const exportarUsuarios = async () => {
    try {
      const res = await axios.get('http://localhost:3000/api/personas');
      
      // Verificamos si la respuesta es directa o tiene propiedad 'personas'
      const data = Array.isArray(res.data) ? res.data : (res.data.personas || []);

      if(data.length === 0) {
        alert("No se encontraron usuarios registrados.");
        return;
      }

      const limpio = data.map((p: any) => ({
        ID: p.id,
        Nombre_Completo: `${p.primer_nombre} ${p.primer_apellido}`,
        Cedula: p.cedula || 'Sin Cédula',
        Rol: p.tipo_persona,
        Correo: p.correo || 'N/A',
        Estado: p.estado === true ? 'Activo' : 'Inactivo',
        Codigo_RFID: p.rfid_code || 'No Asignado'
      }));

      descargarCSV(limpio, "Reporte_Personal_UNEMI");
    } catch (e) {
      console.error(e);
      alert("Error al conectar con el servidor.");
    }
  };

  // 2. Exportar Historial de Accesos (CORREGIDO PARA TU BACKEND)
  const exportarAccesos = async () => {
    try {
      console.log("Solicitando historial...");
      const res = await axios.get('http://localhost:3000/api/acceso/historial');
      
      console.log("Respuesta Backend:", res.data); // Para depurar

      // ✅ AQUÍ ESTÁ EL CAMBIO CLAVE:
      // Tu backend devuelve { success: true, accesos: [...] }, así que leemos .accesos
      const listaAccesos = res.data.accesos; 

      if (!listaAccesos || !Array.isArray(listaAccesos) || listaAccesos.length === 0) {
        alert("Aún no hay registros de acceso en el sistema.");
        return;
      }

      // Mapeamos los datos
      const limpio = listaAccesos.map((a: any) => ({
        Fecha: new Date(a.fecha).toLocaleDateString(),
        Hora: new Date(a.fecha).toLocaleTimeString(),
        Nombre_Persona: `${a.primer_nombre} ${a.primer_apellido}`,
        Rol: a.tipo_persona,
        Cedula: a.cedula || 'N/A',
        Metodo_Entrada: a.metodo && a.metodo.includes('Facial') ? 'Reconocimiento Facial' : 'Tarjeta RFID'
      }));

      descargarCSV(limpio, "Reporte_Accesos_UNEMI");
    } catch (e) {
      console.error("Error descargando historial:", e);
      alert("Error al descargar. Revisa la consola (F12) para ver el detalle.");
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Centro de Reportes</h2>
        <p className="text-gray-500 text-sm">Generación de archivos CSV para auditoría y control.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Tarjeta Usuarios */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center hover:shadow-md transition-all group">
          <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
            <Users size={40} />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">Base de Datos de Personal</h3>
          <p className="text-gray-500 text-sm mb-8 px-4">
            Descarga la lista completa de Estudiantes, Docentes y Administrativos, incluyendo sus estados y códigos de tarjeta.
          </p>
          <button onClick={exportarUsuarios} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold flex items-center justify-center gap-2 mx-auto hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 cursor-pointer">
            <FileDown size={20}/> Descargar CSV
          </button>
        </div>

        {/* Tarjeta Accesos */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center hover:shadow-md transition-all group">
          <div className="w-20 h-20 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
            <FileSpreadsheet size={40} />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">Historial de Asistencia</h3>
          <p className="text-gray-500 text-sm mb-8 px-4">
            Reporte detallado de todos los ingresos al campus. Incluye fecha exacta, hora, nombre de la persona y método utilizado.
          </p>
          <button onClick={exportarAccesos} className="bg-green-600 text-white px-8 py-3 rounded-xl font-bold flex items-center justify-center gap-2 mx-auto hover:bg-green-700 transition-colors shadow-lg shadow-green-200 cursor-pointer">
            <FileDown size={20}/> Descargar CSV
          </button>
        </div>

      </div>
    </div>
  );
}