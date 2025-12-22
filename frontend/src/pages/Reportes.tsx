import axios from 'axios';
import { FileDown, FileSpreadsheet, Users, Download, HardHat } from 'lucide-react';

export default function Reportes() {

  // Función genérica para convertir datos a CSV y descargar (LÓGICA INTACTA)
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

  // 2. Exportar Historial de Accesos
  const exportarAccesos = async () => {
    try {
      const res = await axios.get('http://localhost:3000/api/acceso/historial');
      
      const listaAccesos = res.data.accesos; 

      if (!listaAccesos || !Array.isArray(listaAccesos) || listaAccesos.length === 0) {
        alert("Aún no hay registros de acceso en el sistema.");
        return;
      }

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
    <div className="p-4 space-y-4">
      
      {/* HEADER DE PÁGINA */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-white p-4 rounded-xl shadow-sm border border-gray-100 border-t-4 border-orange-500">
        <div>
          <h2 className="text-xl font-bold text-blue-900 flex items-center gap-2">
            <Download className="text-orange-500" size={20}/> Centro de Reportes
          </h2>
          <p className="text-gray-500 text-xs mt-0.5">Generación de archivos CSV para auditoría y control.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Tarjeta Usuarios - Tema Azul */}
        <div className="bg-white p-5 rounded-xl shadow-md border border-gray-100 text-center hover:shadow-lg transition-all group border-l-4 border-l-blue-900">
          <div className="w-16 h-16 bg-blue-100 text-blue-900 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-105 transition-transform">
            <Users size={32} />
          </div>
          <h3 className="text-lg font-bold text-blue-900 mb-2">Base de Datos de Personal</h3>
          <p className="text-gray-500 text-sm mb-6 px-2">
            Lista completa de Estudiantes, Docentes y Admins, incluyendo estados y códigos RFID.
          </p>
          <button onClick={exportarUsuarios} className="bg-gradient-to-r from-blue-900 to-blue-800 text-white px-6 py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 mx-auto hover:shadow-lg transition-colors shadow-blue-400/50 text-sm">
            <FileDown size={18}/> Descargar CSV
          </button>
        </div>

        {/* Tarjeta Accesos - Tema Verde Éxito */}
        <div className="bg-white p-5 rounded-xl shadow-md border border-gray-100 text-center hover:shadow-lg transition-all group border-l-4 border-l-green-600">
          <div className="w-16 h-16 bg-green-100 text-green-700 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-105 transition-transform">
            <FileSpreadsheet size={32} />
          </div>
          <h3 className="text-lg font-bold text-gray-800 mb-2">Historial de Asistencia</h3>
          <p className="text-gray-500 text-sm mb-6 px-2">
            Reporte detallado de todos los ingresos al campus. Incluye fecha, hora, persona y método.
          </p>
          <button onClick={exportarAccesos} className="bg-gradient-to-r from-emerald-600 to-green-600 text-white px-6 py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 mx-auto hover:shadow-lg transition-colors shadow-green-400/50 text-sm">
            <FileDown size={18}/> Descargar CSV
          </button>
        </div>
      </div>
    </div>
  );
}