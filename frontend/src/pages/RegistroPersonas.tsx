import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useForm } from 'react-hook-form';
import { Save, User, Mail, Phone, CreditCard, AlertCircle, CheckCircle2, Zap, Copy, X, ScanLine } from 'lucide-react';

export default function RegistroPersonas() {
  const { register, handleSubmit, reset, formState: { errors }, setValue } = useForm();
  
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  
  // ESTADO PARA EL TOAST DE ÉXITO
  const [notificacion, setNotificacion] = useState<any>(null);
  const [showToast, setShowToast] = useState(false);

  const [rfidCapturado, setRfidCapturado] = useState('');
  const ultimoCodigoRef = useRef('');

  // 🔥 LÓGICA RFID AUTOMÁTICA (SIEMPRE ESCUCHANDO)
  useEffect(() => {
    const interval = setInterval(() => {
      // Verificamos si la función del contexto global existe (inyectada por ArduinoContext)
      if ((window as any).obtenerUltimoDatoRFID) {
        const raw = (window as any).obtenerUltimoDatoRFID();
        if (!raw) return;

        const texto = raw.trim();

        // Ignorar mensajes de estado del Arduino
        if (texto.includes("Esperando") || texto.includes("tarjeta") || texto.includes("NFC")) {
           // Si el Arduino vuelve a estado de espera, reseteamos la referencia para permitir leer la misma tarjeta de nuevo si se retira y se pone
           if (texto !== ultimoCodigoRef.current) ultimoCodigoRef.current = ''; 
           return;
        }

        if (texto.length < 4) return; // Ignorar ruido

        // Si es el mismo código que acabamos de leer, no hacemos nada (evitar spam)
        if (texto === ultimoCodigoRef.current) return;

        ultimoCodigoRef.current = texto;

        const partes = texto.split(':');
        const codigoLimpio = partes.length === 2 ? partes[1].trim() : texto;

        console.log("📥 RFID Detectado Automáticamente:", codigoLimpio);

        // ✅ ASIGNACIÓN AUTOMÁTICA
        setRfidCapturado(codigoLimpio);
        setValue('rfid_code', codigoLimpio);
        
        // Feedback visual rápido
        setMensaje({
            tipo: 'success',
            texto: `Tarjeta detectada: ${codigoLimpio}`
        });
        setTimeout(() => setMensaje({ tipo: '', texto: '' }), 2000);
      }
    }, 300);

    return () => clearInterval(interval);
  }, [setValue]);

  const limpiarRFID = () => {
    setRfidCapturado('');
    setValue('rfid_code', '');
    ultimoCodigoRef.current = ''; // Permitir leer la misma tarjeta de nuevo
    setMensaje({ tipo: '', texto: '' });
  };

  const lanzarNotificacion = (data: any) => {
    setNotificacion(data);
    setTimeout(() => setShowToast(true), 10);
    setTimeout(() => {
        setShowToast(false);
        setTimeout(() => setNotificacion(null), 500);
    }, 8000);
  };

  const onSubmit = async (data: any) => {
    setCargando(true);
    setMensaje({ tipo: '', texto: '' });
    
    try {
      const payload = {
        primer_nombre: data.primer_nombre,
        segundo_nombre: data.segundo_nombre || null,
        primer_apellido: data.primer_apellido,
        segundo_apellido: data.segundo_apellido || null,
        cedula: data.cedula,
        correo: data.correo,
        telefono: data.telefono || null,
        tipo_persona: data.tipo_persona,
        rfid_code: rfidCapturado || data.rfid_code || null,
        foto_base64: null,
        vector_facial: null
      };

      const res = await axios.post('http://localhost:3000/api/registrar', payload);
      
      lanzarNotificacion({
        nombre: data.primer_nombre,
        apellido: data.primer_apellido,
        usuario: res.data.usuario,
        password: res.data.password,
        rfid: rfidCapturado || 'No registrado'
      });
      
      reset();
      limpiarRFID();

    } catch (error: any) {
      const msg = error.response?.data?.error || error.message || "Error al registrar";
      setMensaje({ tipo: 'error', texto: `❌ Error: ${msg}` });
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="space-y-4 p-4 relative">
      
      {/* TOAST FLOTANTE DE ÉXITO (ARRIBA DERECHA) */}
      {notificacion && (
        <div 
            className={`fixed top-20 right-4 z-50 w-80 bg-white rounded-xl shadow-2xl border-l-4 border-green-500 overflow-hidden
            transition-all duration-500 ease-in-out transform 
            ${showToast ? 'translate-x-0 opacity-100' : 'translate-x-[150%] opacity-0'}`}
        >
            <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2 text-green-600 font-bold">
                        <CheckCircle2 size={20} />
                        <span>¡Registro Exitoso!</span>
                    </div>
                    <button onClick={() => setShowToast(false)} className="text-gray-400 hover:text-gray-600">
                        <X size={16} />
                    </button>
                </div>
                
                <div className="space-y-2 text-xs bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <div>
                        <p className="text-gray-500 font-bold uppercase text-[10px]">Nombre</p>
                        <p className="font-semibold text-gray-800">{notificacion.nombre} {notificacion.apellido}</p>
                    </div>
                    
                    <div className="flex justify-between items-center bg-white p-1.5 rounded border border-gray-200">
                        <div>
                            <p className="text-[9px] text-gray-400 uppercase font-bold">Usuario</p>
                            <p className="font-mono text-blue-600 font-bold">{notificacion.usuario}</p>
                        </div>
                        <button onClick={() => navigator.clipboard.writeText(notificacion.usuario)} className="text-gray-400 hover:text-blue-500"><Copy size={14}/></button>
                    </div>

                    <div className="flex justify-between items-center bg-white p-1.5 rounded border border-gray-200">
                        <div>
                            <p className="text-[9px] text-gray-400 uppercase font-bold">Contraseña</p>
                            <p className="font-mono text-red-500 font-bold">{notificacion.password}</p>
                        </div>
                        <button onClick={() => navigator.clipboard.writeText(notificacion.password)} className="text-gray-400 hover:text-blue-500"><Copy size={14}/></button>
                    </div>

                    {notificacion.rfid !== 'No registrado' && (
                        <div>
                            <p className="text-gray-500 font-bold uppercase text-[10px]">RFID Asignado</p>
                            <p className="font-mono text-xs text-green-600 font-bold">{notificacion.rfid}</p>
                        </div>
                    )}
                </div>
                <p className="text-[10px] text-gray-400 mt-2 text-center italic">Cerrando automáticamente...</p>
            </div>
        </div>
      )}

      {/* HEADER DE PÁGINA (Estilo UniAccess) */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-800 p-4 rounded-xl shadow-md text-white flex justify-between items-center">
         <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
                <User size={20} className="text-orange-400"/> Registro de Personas
            </h2>
            <p className="text-blue-200 text-xs mt-0.5">Ingreso de nuevos usuarios al sistema</p>
         </div>
      </div>

      {mensaje.texto && (
          <div className={`p-3 rounded-lg border-l-4 text-xs font-bold flex items-center gap-2 shadow-sm animate-fade-in ${
            mensaje.tipo === 'success' ? 'bg-green-50 border-green-500 text-green-700' : 
            mensaje.tipo === 'error' ? 'bg-red-50 border-red-500 text-red-700' : 
            'bg-blue-50 border-blue-500 text-blue-700'
          }`}>
            {mensaje.tipo === 'success' ? <CheckCircle2 size={16}/> : mensaje.tipo === 'error' ? <AlertCircle size={16}/> : <Zap size={16} className="animate-pulse"/>}
            {mensaje.texto}
          </div>
      )}

      {/* ✅ CAMBIO APLICADO AQUÍ: 
          Se agregó 'border-2 border-orange-500' al contenedor principal del formulario 
      */}
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-5 rounded-xl shadow-md border-2 border-orange-500 space-y-5">
          
          {/* DATOS PERSONALES */}
          <div>
            <h3 className="text-sm font-bold text-blue-900 mb-3 flex items-center gap-2 border-b border-gray-100 pb-2 uppercase tracking-wide">
              <User className="text-orange-500" size={16}/> Datos Personales
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Primer Nombre *</label>
                <input {...register("primer_nombre", { required: "Requerido" })} placeholder="Juan" className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-none transition"/>
                {errors.primer_nombre && <p className="text-red-500 text-[10px] mt-0.5">{errors.primer_nombre.message as string}</p>}
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Segundo Nombre</label>
                <input {...register("segundo_nombre")} placeholder="Carlos" className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-none transition"/>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Primer Apellido *</label>
                <input {...register("primer_apellido", { required: "Requerido" })} placeholder="Pérez" className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-none transition"/>
                {errors.primer_apellido && <p className="text-red-500 text-[10px] mt-0.5">{errors.primer_apellido.message as string}</p>}
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Segundo Apellido</label>
                <input {...register("segundo_apellido")} placeholder="García" className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-none transition"/>
              </div>
            </div>
          </div>

          {/* CONTACTO */}
          <div>
            <h3 className="text-sm font-bold text-blue-900 mb-3 flex items-center gap-2 border-b border-gray-100 pb-2 uppercase tracking-wide">
              <Mail className="text-orange-500" size={16}/> Información de Contacto
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Cédula *</label>
                <div className="relative">
                  <CreditCard className="absolute left-2.5 top-2 text-gray-400" size={14}/>
                  <input 
                    {...register("cedula", { required: "Requerido", pattern: { value: /^09\d{8}$/, message: "Inicia con 09 (10 dígitos)" } })} 
                    placeholder="0912345678" 
                    className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-none transition"
                    maxLength={10}
                    onInput={(e) => { e.currentTarget.value = e.currentTarget.value.replace(/\D/g, '').slice(0, 10); }}
                  />
                </div>
                {errors.cedula && <p className="text-red-500 text-[10px] mt-0.5">{errors.cedula.message as string}</p>}
              </div>
              
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Correo *</label>
                <div className="relative">
                  <Mail className="absolute left-2.5 top-2 text-gray-400" size={14}/>
                  <input 
                    {...register("correo", { required: "Requerido", pattern: { value: /@unemi\.edu\.ec$/, message: "Debe ser @unemi.edu.ec" } })} 
                    placeholder="usuario@unemi.edu.ec" 
                    className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-none transition"
                  />
                </div>
                {errors.correo && <p className="text-red-500 text-[10px] mt-0.5">{errors.correo.message as string}</p>}
              </div>
              
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Teléfono</label>
                <div className="relative">
                  <Phone className="absolute left-2.5 top-2 text-gray-400" size={14}/>
                  <input 
                    {...register("telefono")} 
                    placeholder="0987654321" 
                    className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-none transition"
                    maxLength={10}
                    onInput={(e) => { e.currentTarget.value = e.currentTarget.value.replace(/\D/g, '').slice(0, 10); }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECCIÓN TIPO Y RFID AUTOMÁTICO */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-bold text-blue-900 mb-3 flex items-center gap-2 border-b border-gray-100 pb-2 uppercase tracking-wide">
                  <User className="text-orange-500" size={16}/> Clasificación
                </h3>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Tipo de Persona *</label>
                <select 
                  {...register("tipo_persona", { required: "Seleccione un tipo" })} 
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-none transition bg-white"
                >
                  <option value="">-- Seleccionar --</option>
                  <option value="Estudiante">🎓 Estudiante</option>
                  <option value="Docente">👨‍🏫 Docente</option>
                  <option value="Administrativo">💼 Administrativo</option>
                </select>
                {errors.tipo_persona && <p className="text-red-500 text-[10px] mt-0.5">{errors.tipo_persona.message as string}</p>}
              </div>

              <div>
                <h3 className="text-sm font-bold text-blue-900 mb-3 flex items-center gap-2 border-b border-gray-100 pb-2 uppercase tracking-wide">
                  <CreditCard className="text-orange-500" size={16}/> Tarjeta RFID
                </h3>
                
                {/* CAJA DE ESTADO RFID */}
                <div className={`p-3 rounded-lg border flex flex-col items-center justify-center transition-all min-h-[80px]
                    ${rfidCapturado 
                        ? 'bg-green-50 border-green-300' 
                        : 'bg-blue-50 border-blue-200'}`}>
                    
                    {rfidCapturado ? (
                        <div className="text-center w-full animate-bounce-in">
                            <div className="flex items-center justify-center gap-2 text-green-600 mb-1">
                                <CheckCircle2 size={20}/>
                                <span className="text-xs font-bold uppercase">Capturado Exitosamente</span>
                            </div>
                            <p className="font-mono text-sm font-bold text-gray-800 bg-white px-3 py-1 rounded border border-green-200 inline-block">{rfidCapturado}</p>
                            <div className="mt-2">
                                <button type="button" onClick={limpiarRFID} className="text-[10px] text-red-500 hover:text-red-700 underline">Borrar / Escanear otra</button>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center">
                            <div className="flex items-center justify-center gap-2 text-blue-600 mb-1 animate-pulse">
                                <ScanLine size={20}/>
                                <span className="text-xs font-bold uppercase">Escáner Activo</span>
                            </div>
                            <p className="text-[10px] text-blue-400">Acerca la tarjeta al lector...</p>
                        </div>
                    )}
                </div>
              </div>
          </div>

          {/* BOTÓN SUBMIT */}
          <div className="flex justify-end pt-2 border-t border-gray-100">
            <button 
              type="submit" 
              disabled={cargando} 
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold shadow-md text-xs transition-all
                ${cargando ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-gradient-to-r from-blue-900 to-blue-800 text-white hover:shadow-lg'}`}
            >
              {cargando ? <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div> : <Save size={16}/>}
              {cargando ? 'Guardando...' : 'Registrar Persona'}
            </button>
          </div>
      </form>
    </div>
  );
}