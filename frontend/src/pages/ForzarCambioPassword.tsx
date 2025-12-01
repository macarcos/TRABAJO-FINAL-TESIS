import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Lock, Save, ShieldAlert } from 'lucide-react';

export default function ForzarCambioPassword() {
  const navigate = useNavigate();
  const [pass1, setPass1] = useState('');
  const [pass2, setPass2] = useState('');
  
  const usuarioData = localStorage.getItem('usuario_unemi');
  const usuario = usuarioData ? JSON.parse(usuarioData) : null;

  // ✅ PROTECCIÓN: Si es el Super Admin, redirigir al dashboard
  useEffect(() => {
    if (!usuario) {
      window.location.href = '/';
      return;
    }

    // ✅ Si es el usuario 'admin', no debe estar aquí
    if (usuario.usuario === 'admin') {
      navigate('/dashboard');
    }
  }, [usuario, navigate]);

  if (!usuario) return null;

  const handleChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pass1 !== pass2) return alert("❌ Las contraseñas no coinciden.");
    if (pass1.length < 6) return alert("⚠️ La contraseña debe tener al menos 6 caracteres.");

    try {
      await axios.post('http://localhost:3000/api/cambiar-pass', {
        usuario: usuario.usuario,
        nueva_password: pass1
      });

      alert("✅ Contraseña actualizada con éxito.\nPor favor, inicie sesión con su nueva clave.");
      
      localStorage.removeItem('usuario_unemi');
      navigate('/');

    } catch (error) {
      alert("Error al cambiar contraseña");
    }
  };

  return (
    <div className="min-h-screen bg-unemi-bg flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border-t-4 border-orange-500">
        
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldAlert size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">Cambio Obligatorio</h2>
          <p className="text-gray-500 text-sm mt-2">
            Por seguridad, debe cambiar su contraseña temporal antes de continuar.
          </p>
        </div>

        <form onSubmit={handleChange} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-500 ml-1">Nueva Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 text-gray-400" size={18}/>
              <input type="password" value={pass1} onChange={e=>setPass1(e.target.value)} className="w-full pl-10 p-2 border rounded-xl outline-none focus:ring-2 focus:ring-orange-200" placeholder="Mínimo 6 caracteres" required />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 ml-1">Confirmar Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 text-gray-400" size={18}/>
              <input type="password" value={pass2} onChange={e=>setPass2(e.target.value)} className="w-full pl-10 p-2 border rounded-xl outline-none focus:ring-2 focus:ring-orange-200" placeholder="Repita la contraseña" required />
            </div>
          </div>

          <button type="submit" className="w-full bg-orange-500 text-white py-3 rounded-xl font-bold hover:bg-orange-600 transition flex justify-center gap-2">
            <Save size={20}/> Actualizar y Salir
          </button>
        </form>
      </div>
    </div>
  );
}