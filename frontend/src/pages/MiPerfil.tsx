import { useState } from 'react';
import axios from 'axios';
import { User, Lock, Save, ShieldCheck } from 'lucide-react';

export default function MiPerfil() {
  const [pass1, setPass1] = useState('');
  const [pass2, setPass2] = useState('');
  
  const usuarioData = localStorage.getItem('usuario_unemi');
  const usuario = usuarioData ? JSON.parse(usuarioData) : {};

  const handleCambioPass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pass1 !== pass2) return alert("Las contraseñas no coinciden");
    if (pass1.length < 6) return alert("La contraseña es muy corta");

    try {
      await axios.post('http://localhost:3000/api/cambiar-pass', {
        usuario: usuario.usuario,
        nueva_password: pass1
      });
      alert("✅ Contraseña actualizada correctamente");
      setPass1(''); setPass2('');
    } catch (e) { alert("Error al actualizar"); }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-unemi-text">Mi Perfil</h2>
        <p className="text-gray-500 text-sm">Información de cuenta y seguridad.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* TARJETA DE INFO (Izquierda) */}
        <div className="md:col-span-1">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center">
            <div className="w-24 h-24 bg-unemi-primary text-white rounded-full flex items-center justify-center text-3xl font-bold mx-auto mb-4 shadow-lg shadow-unemi-primary/30">
              {usuario.iniciales || 'UA'}
            </div>
            <h3 className="text-xl font-bold text-gray-800">{usuario.nombre}</h3>
            <p className="text-sm text-gray-400 font-mono mt-1">@{usuario.usuario}</p>
            
            <div className="mt-6 pt-6 border-t border-gray-50">
              <span className="inline-flex items-center gap-2 bg-orange-50 text-orange-600 px-3 py-1 rounded-full text-xs font-bold border border-orange-100">
                <ShieldCheck size={14}/> {usuario.rol}
              </span>
            </div>
          </div>
        </div>

        {/* FORMULARIO (Derecha) */}
        <div className="md:col-span-2">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
              <Lock size={20} className="text-unemi-primary"/> Cambiar Contraseña
            </h3>
            
            <form onSubmit={handleCambioPass} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Nueva Contraseña</label>
                <input 
                  type="password" 
                  value={pass1} 
                  onChange={e=>setPass1(e.target.value)} 
                  className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:border-unemi-primary focus:ring-2 focus:ring-unemi-primary/20 transition-all"
                  placeholder="••••••••"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Confirmar Contraseña</label>
                <input 
                  type="password" 
                  value={pass2} 
                  onChange={e=>setPass2(e.target.value)} 
                  className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:border-unemi-primary focus:ring-2 focus:ring-unemi-primary/20 transition-all"
                  placeholder="••••••••"
                />
              </div>

              <div className="pt-4 flex justify-end">
                <button className="bg-unemi-primary text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-unemi-secondary transition-all shadow-lg shadow-unemi-primary/30">
                  <Save size={20}/> Actualizar Clave
                </button>
              </div>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}