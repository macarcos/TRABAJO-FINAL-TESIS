import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Lock, Save, ShieldAlert, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ForzarCambioPassword() {
  const navigate = useNavigate();
  const [pass1, setPass1] = useState('');
  const [pass2, setPass2] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const [exito, setExito] = useState(false);
  
  // ✅ USAR SESSIONSTORAGE (NO localStorage)
  const usuarioData = sessionStorage.getItem('usuario_unemi');
  const usuario = usuarioData ? JSON.parse(usuarioData) : null;

  useEffect(() => {
    if (!usuario) {
      console.log("❌ No hay usuario en sesión");
      navigate('/');
      return;
    }

    console.log("✅ Usuario en cambio de contraseña:", usuario.usuario);

  }, [usuario, navigate]);

  if (!usuario) return null;

  const handleChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCargando(true);

    try {
      // Validaciones locales
      if (!pass1 || !pass2) {
        setError("Completa ambos campos");
        setCargando(false);
        return;
      }

      if (pass1.length < 6) {
        setError("La contraseña debe tener al menos 6 caracteres");
        setCargando(false);
        return;
      }

      if (pass1 !== pass2) {
        setError("Las contraseñas no coinciden");
        setCargando(false);
        return;
      }

      console.log("🔄 Enviando cambio de contraseña para usuario ID:", usuario.id);

      // ✅ ENVIAR AL BACKEND CON usuario_id (NO usuario)
      const res = await axios.post('http://localhost:3000/api/cambiar-pass', {
        usuario_id: usuario.id,
        nueva_password: pass1
      });

      console.log("✅ Respuesta backend:", res.data);

      setExito(true);
      setPass1('');
      setPass2('');

      // Después de 2 segundos, ir al login
      setTimeout(() => {
        sessionStorage.removeItem('usuario_unemi');
        navigate('/');
      }, 2000);

    } catch (err: any) {
      console.error("❌ Error:", err);
      const mensajeError = err.response?.data?.error || err.message || "Error al cambiar contraseña";
      setError(mensajeError);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md border-t-4 border-orange-500">
        
        {exito ? (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={32} />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">¡Éxito!</h2>
            <p className="text-gray-500 text-sm mt-2">
              Tu contraseña ha sido actualizada correctamente. Serás redirigido al login en 2 segundos...
            </p>
          </div>
        ) : (
          <>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldAlert size={32} />
              </div>
              <h2 className="text-2xl font-bold text-gray-800">Cambio Obligatorio</h2>
              <p className="text-gray-500 text-sm mt-2">
                Por seguridad, debe cambiar su contraseña temporal antes de continuar.
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded flex items-center gap-2">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <form onSubmit={handleChange} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-600 ml-1">Nueva Contraseña</label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-2.5 text-gray-400" size={18} />
                  <input
                    type="password"
                    value={pass1}
                    onChange={e => setPass1(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent transition"
                    placeholder="Mínimo 6 caracteres"
                    disabled={cargando}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-600 ml-1">Confirmar Contraseña</label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-2.5 text-gray-400" size={18} />
                  <input
                    type="password"
                    value={pass2}
                    onChange={e => setPass2(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent transition"
                    placeholder="Repite la contraseña"
                    disabled={cargando}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={cargando}
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3 rounded-xl font-bold hover:from-orange-600 hover:to-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
              >
                {cargando ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save size={20} /> Cambiar Contraseña
                  </>
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}