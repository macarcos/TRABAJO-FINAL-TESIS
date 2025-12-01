import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Lock, User } from 'lucide-react';

export default function Login() {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCargando(true);

    try {
      const res = await axios.post('http://localhost:3000/api/login', { usuario, password });

      if (res.data.auth) {
        localStorage.setItem('usuario_unemi', JSON.stringify(res.data.user));
        
        // LÓGICA DE SEGURIDAD
        if (res.data.user.needsReset) {
          navigate('/cambiar-password'); // Redirige a cambio obligatorio
        } else {
          navigate('/dashboard'); // Entra normal
        }
      }
    } catch (err: any) {
      setError('Credenciales incorrectas.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-unemi-bg p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border-t-4 border-unemi-primary">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-unemi-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 text-unemi-primary">
            <Lock size={32} />
          </div>
          <h1 className="text-2xl font-bold text-unemi-text">UniAccess</h1>
          <p className="text-gray-500 text-sm">Sistema de Control de Acceso</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {error && <div className="bg-red-50 text-red-500 p-3 rounded text-sm text-center">{error}</div>}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Usuario</label>
            <div className="relative">
              <User className="absolute left-3 top-3 text-gray-400" size={20} />
              <input type="text" placeholder="Usuario" className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-unemi-primary/50" value={usuario} onChange={(e) => setUsuario(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-gray-400" size={20} />
              <input type="password" placeholder="••••••••" className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-unemi-primary/50" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
          </div>
          <button type="submit" disabled={cargando} className="w-full py-3 bg-unemi-primary text-white rounded-lg font-bold hover:bg-unemi-secondary transition">{cargando ? 'Entrando...' : 'Iniciar Sesión'}</button>
        </form>
      </div>
    </div>
  );
}