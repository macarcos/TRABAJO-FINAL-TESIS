import { useState, useEffect } from 'react';
import axios from 'axios';
import { CheckCircle2, XCircle, Calendar } from 'lucide-react';

interface Periodo {
  id: number;
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  semestre: number;
  year: number;
}

interface ModalMatriculaProps {
  personaId: number;
  onClose: () => void;
  onAccept: () => void;
}

export default function ModalMatricula({ personaId, onClose, onAccept }: ModalMatriculaProps) {
  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [selectedPeriodo, setSelectedPeriodo] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    cargarPeriodos();
  }, []);

  const cargarPeriodos = async () => {
    try {
      const res = await axios.get('http://localhost:3000/api/matriculas/periodos');
      setPeriodos(res.data.periodos);
      if (res.data.periodos.length > 0) {
        setSelectedPeriodo(res.data.periodos[0].id);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAceptar = async () => {
    if (!selectedPeriodo) return;

    setProcesando(true);
    try {
      await axios.post('http://localhost:3000/api/matriculas/aceptar', {
        persona_id: personaId,
        periodo_id: selectedPeriodo
      });

      alert('✅ Matrícula aceptada exitosamente');
      onAccept();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error al aceptar matrícula');
    } finally {
      setProcesando(false);
    }
  };

  const handleRechazar = async () => {
    try {
      await axios.post('http://localhost:3000/api/matriculas/rechazar', {
        persona_id: personaId
      });
      onClose();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 text-center">
          <p className="text-gray-600">Cargando períodos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white text-center">
          <Calendar size={48} className="mx-auto mb-2" />
          <h2 className="text-2xl font-bold">Aceptar Matrícula</h2>
          <p className="text-blue-100 mt-1">Selecciona el período académico</p>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          
          {/* Períodos disponibles */}
          <div className="space-y-3">
            {periodos.map(periodo => (
              <label
                key={periodo.id}
                className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition ${
                  selectedPeriodo === periodo.id
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="periodo"
                  value={periodo.id}
                  checked={selectedPeriodo === periodo.id}
                  onChange={() => setSelectedPeriodo(periodo.id)}
                  className="w-5 h-5 text-blue-600 cursor-pointer"
                />
                <div className="ml-4">
                  <p className="font-bold text-gray-800">{periodo.nombre}</p>
                  <p className="text-sm text-gray-600">
                    {periodo.fecha_inicio} a {periodo.fecha_fin}
                  </p>
                </div>
              </label>
            ))}
          </div>

          {/* Información */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              ℹ️ Al aceptar, confirmas tu inscripción en el período académico seleccionado.
            </p>
          </div>

          {/* Botones */}
          <div className="flex gap-3">
            <button
              onClick={handleRechazar}
              className="flex-1 bg-gray-300 text-gray-700 py-3 rounded-lg font-bold hover:bg-gray-400 transition flex items-center justify-center gap-2"
            >
              <XCircle size={18} /> Cerrar
            </button>
            <button
              onClick={handleAceptar}
              disabled={procesando}
              className="flex-1 bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 transition disabled:bg-gray-400 flex items-center justify-center gap-2"
            >
              <CheckCircle2 size={18} /> {procesando ? 'Guardando...' : 'Aceptar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}