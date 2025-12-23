import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useForm } from 'react-hook-form';
import { Save, User, Mail, Phone, CreditCard, AlertCircle, CheckCircle2, Zap, Copy, X, ScanLine, Globe, MapPin, Flag, ChevronDown } from 'lucide-react';

// 🇪🇨 LISTA DE PROVINCIAS
const PROVINCIAS = [
  { codigo: '01', nombre: 'Azuay' }, { codigo: '02', nombre: 'Bolívar' }, { codigo: '03', nombre: 'Cañar' },
  { codigo: '04', nombre: 'Carchi' }, { codigo: '05', nombre: 'Cotopaxi' }, { codigo: '06', nombre: 'Chimborazo' },
  { codigo: '07', nombre: 'El Oro' }, { codigo: '08', nombre: 'Esmeraldas' }, { codigo: '09', nombre: 'Guayas' },
  { codigo: '10', nombre: 'Imbabura' }, { codigo: '11', nombre: 'Loja' }, { codigo: '12', nombre: 'Los Ríos' },
  { codigo: '13', nombre: 'Manabí' }, { codigo: '14', nombre: 'Morona Santiago' }, { codigo: '15', nombre: 'Napo' },
  { codigo: '16', nombre: 'Pastaza' }, { codigo: '17', nombre: 'Pichincha' }, { codigo: '18', nombre: 'Tungurahua' },
  { codigo: '19', nombre: 'Zamora Chinchipe' }, { codigo: '20', nombre: 'Galápagos' }, { codigo: '21', nombre: 'Sucumbíos' },
  { codigo: '22', nombre: 'Orellana' }, { codigo: '23', nombre: 'Santo Domingo' }, { codigo: '24', nombre: 'Santa Elena' },
];

// 🌎 LISTA DE PAÍSES CON CÓDIGO ISO (Para cargar la imagen real de la bandera)
const PAISES = [
    { nombre: "Ecuador", dial: "+593", iso: "ec" },
    { nombre: "EE.UU.", dial: "+1", iso: "us" },
    { nombre: "España", dial: "+34", iso: "es" },
    { nombre: "Alemania", dial: "+49", iso: "de" },
    { nombre: "Argentina", dial: "+54", iso: "ar" },
    { nombre: "Bolivia", dial: "+591", iso: "bo" },
    { nombre: "Brasil", dial: "+55", iso: "br" },
    { nombre: "Canadá", dial: "+1", iso: "ca" },
    { nombre: "Chile", dial: "+56", iso: "cl" },
    { nombre: "China", dial: "+86", iso: "cn" },
    { nombre: "Colombia", dial: "+57", iso: "co" },
    { nombre: "Costa Rica", dial: "+506", iso: "cr" },
    { nombre: "Cuba", dial: "+53", iso: "cu" },
    { nombre: "El Salvador", dial: "+503", iso: "sv" },
    { nombre: "Francia", dial: "+33", iso: "fr" },
    { nombre: "Guatemala", dial: "+502", iso: "gt" },
    { nombre: "Honduras", dial: "+504", iso: "hn" },
    { nombre: "Italia", dial: "+39", iso: "it" },
    { nombre: "Japón", dial: "+81", iso: "jp" },
    { nombre: "México", dial: "+52", iso: "mx" },
    { nombre: "Nicaragua", dial: "+505", iso: "ni" },
    { nombre: "Panamá", dial: "+507", iso: "pa" },
    { nombre: "Paraguay", dial: "+595", iso: "py" },
    { nombre: "Perú", dial: "+51", iso: "pe" },
    { nombre: "Portugal", dial: "+351", iso: "pt" },
    { nombre: "Reino Unido", dial: "+44", iso: "gb" },
    { nombre: "Rep. Dom.", dial: "+1-809", iso: "do" },
    { nombre: "Rusia", dial: "+7", iso: "ru" },
    { nombre: "Uruguay", dial: "+598", iso: "uy" },
    { nombre: "Venezuela", dial: "+58", iso: "ve" },
    { nombre: "Otro", dial: "other", iso: "globe" } 
];

export default function RegistroPersonas() {
  const { register, handleSubmit, reset, formState: { errors }, setValue, watch } = useForm({
      defaultValues: {
          codigo_pais: '+593', // Valor por defecto
          pais_iso: 'ec',
          telefono: '',
          provincia: '',
          cedula: '',
          primer_nombre: '',
          segundo_nombre: '',
          primer_apellido: '',
          segundo_apellido: '',
          correo: '',
          tipo_persona: '',
          rfid_code: ''
      }
  });
  
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  
  // ESTADOS PARA DROPDOWNS PERSONALIZADOS
  const [mostrarMenuPaises, setMostrarMenuPaises] = useState(false);
  const [mostrarMenuProvincias, setMostrarMenuProvincias] = useState(false);
  const [prefijoManual, setPrefijoManual] = useState('');

  // ESTADO PARA EL TOAST DE ÉXITO
  const [notificacion, setNotificacion] = useState<any>(null);
  const [showToast, setShowToast] = useState(false);

  const [rfidCapturado, setRfidCapturado] = useState('');
  const ultimoCodigoRef = useRef('');

  // 🔥 ESTADOS DE LÓGICA DE NEGOCIO
  const [esExtranjero, setEsExtranjero] = useState(false);
  
  // OBSERVADORES DE FORMULARIO
  const provinciaSeleccionada = watch('provincia'); 
  const codigoPaisSeleccionado = watch('codigo_pais');
  const paisIsoSeleccionado = watch('pais_iso');

  // OBJETO PROVINCIA ACTUAL
  const provinciaObj = PROVINCIAS.find(p => p.codigo === provinciaSeleccionada);

  // 🔥 CALCULAR PLACEHOLDER DINÁMICO CÉDULA
  const placeholderCedula = esExtranjero 
      ? "Pasaporte (Ej: A1234567)" 
      : provinciaSeleccionada 
          ? `${provinciaSeleccionada}12345678` 
          : "0912345678";

  // =======================================================
  // 🔥 LÓGICA RFID AUTOMÁTICA (TU CÓDIGO ORIGINAL INTACTO)
  // =======================================================
  useEffect(() => {
    const interval = setInterval(() => {
      if ((window as any).obtenerUltimoDatoRFID) {
        const raw = (window as any).obtenerUltimoDatoRFID();
        if (!raw) return;

        const texto = raw.trim();

        if (texto.includes("Esperando") || texto.includes("tarjeta") || texto.includes("NFC")) {
           if (texto !== ultimoCodigoRef.current) ultimoCodigoRef.current = ''; 
           return;
        }

        if (texto.length < 4) return; 

        if (texto === ultimoCodigoRef.current) return;

        ultimoCodigoRef.current = texto;

        const partes = texto.split(':');
        const codigoLimpio = partes.length === 2 ? partes[1].trim() : texto;

        console.log("📥 RFID Detectado Automáticamente:", codigoLimpio);

        setRfidCapturado(codigoLimpio);
        setValue('rfid_code', codigoLimpio);
        
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
    ultimoCodigoRef.current = ''; 
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

  // AL CAMBIAR EL SWITCH DE NACIONALIDAD
  const toggleNacionalidad = (valor: boolean) => {
      setEsExtranjero(valor);
      setValue('cedula', ''); 
      setValue('provincia', '');
      setValue('telefono', ''); 
      setValue('codigo_pais', valor ? '+1' : '+593');
      setValue('pais_iso', valor ? 'us' : 'ec');
      setPrefijoManual('');
  };

  // FUNCIONES PARA SELECCIONAR DEL MENÚ
  const seleccionarPais = (pais: any) => {
      setValue('codigo_pais', pais.dial);
      setValue('pais_iso', pais.iso);
      setMostrarMenuPaises(false);
  };

  const seleccionarProvincia = (prov: any) => {
      setValue('provincia', prov.codigo);
      setMostrarMenuProvincias(false);
  };

  const onSubmit = async (data: any) => {
    setCargando(true);
    setMensaje({ tipo: '', texto: '' });
    
    try {
      // 🔥 LÓGICA DE TELÉFONO:
      let telefonoFinal = data.telefono;
      
      if (esExtranjero) {
          const prefijo = data.codigo_pais === 'other' ? prefijoManual : data.codigo_pais;
          telefonoFinal = `${prefijo} ${data.telefono}`;
      }

      const payload = {
        primer_nombre: data.primer_nombre,
        segundo_nombre: data.segundo_nombre || null,
        primer_apellido: data.primer_apellido,
        segundo_apellido: data.segundo_apellido || null,
        cedula: data.cedula,
        correo: data.correo,
        telefono: telefonoFinal || null,
        tipo_persona: data.tipo_persona,
        rfid_code: rfidCapturado || data.rfid_code || null,
        provincia: esExtranjero ? null : data.provincia,
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
      setEsExtranjero(false); 
      setPrefijoManual('');

    } catch (error: any) {
      const msg = error.response?.data?.error || error.message || "Error al registrar";
      setMensaje({ tipo: 'error', texto: `❌ Error: ${msg}` });
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="space-y-4 p-4 relative">
      
      {/* TOAST FLOTANTE DE ÉXITO */}
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

      {/* HEADER DE PÁGINA */}
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

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-5 rounded-xl shadow-md border-2 border-orange-500 space-y-5">
          
          {/* DATOS PERSONALES */}
          <div>
            <h3 className="text-sm font-bold text-blue-900 mb-3 flex items-center gap-2 border-b border-gray-100 pb-2 uppercase tracking-wide">
              <User className="text-orange-500" size={16}/> Datos Personales
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Primer Nombre *</label>
                <input {...register("primer_nombre", { required: "Requerido" })} placeholder="Juan" className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg outline-none focus:border-orange-500 transition"/>
                {errors.primer_nombre && <p className="text-red-500 text-[10px] mt-0.5">{errors.primer_nombre.message as string}</p>}
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Segundo Nombre</label>
                <input {...register("segundo_nombre")} placeholder="Carlos" className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg outline-none focus:border-orange-500 transition"/>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Primer Apellido *</label>
                <input {...register("primer_apellido", { required: "Requerido" })} placeholder="Pérez" className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg outline-none focus:border-orange-500 transition"/>
                {errors.primer_apellido && <p className="text-red-500 text-[10px] mt-0.5">{errors.primer_apellido.message as string}</p>}
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Segundo Apellido</label>
                <input {...register("segundo_apellido")} placeholder="García" className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg outline-none focus:border-orange-500 transition"/>
              </div>
            </div>
          </div>

          {/* CONTACTO E IDENTIFICACIÓN */}
          <div>
            <div className="flex justify-between items-center mb-3 border-b border-gray-100 pb-2">
                <h3 className="text-sm font-bold text-blue-900 flex items-center gap-2 uppercase tracking-wide">
                    <Mail className="text-orange-500" size={16}/> Identificación y Contacto
                </h3>
                {/* 🔥 TOGGLE NACIONAL / EXTRANJERO */}
                <div className="flex bg-gray-100 p-0.5 rounded-lg">
                    <button 
                        type="button" 
                        onClick={() => toggleNacionalidad(false)} 
                        className={`px-3 py-1 text-[10px] font-bold rounded-md transition flex items-center gap-1 ${!esExtranjero ? 'bg-white text-blue-900 shadow-sm' : 'text-gray-500'}`}
                    >
                        🇪🇨 Nacional
                    </button>
                    <button 
                        type="button" 
                        onClick={() => toggleNacionalidad(true)} 
                        className={`px-3 py-1 text-[10px] font-bold rounded-md transition flex items-center gap-1 ${esExtranjero ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500'}`}
                    >
                        <Globe size={12}/> Extranjero
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* SELECTOR PROVINCIA (SOLO NACIONAL - CON BADGE) */}
              {!esExtranjero && (
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Provincia *</label>
                    <div className="relative">
                        <div 
                            className="w-full py-2 px-3 border border-gray-200 rounded-lg flex items-center cursor-pointer bg-white hover:border-orange-500 focus-within:ring-1 focus-within:ring-orange-500"
                            onClick={() => setMostrarMenuProvincias(!mostrarMenuProvincias)}
                        >
                            {provinciaObj ? (
                                <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-700 mr-2 border border-blue-200">
                                    {provinciaObj.codigo}
                                </div>
                            ) : (
                                <MapPin size={16} className="text-gray-400 mr-2"/>
                            )}
                            
                            <span className={`text-xs ${provinciaObj ? 'text-gray-800' : 'text-gray-400'}`}>
                                {provinciaObj ? `${provinciaObj.nombre}` : 'Seleccione...'}
                            </span>
                            <ChevronDown size={14} className="ml-auto text-gray-400"/>
                        </div>

                        {mostrarMenuProvincias && (
                            <div className="absolute top-full left-0 w-full z-50 bg-white border border-gray-200 rounded-lg shadow-xl mt-1 max-h-60 overflow-y-auto">
                                {PROVINCIAS.map(prov => (
                                    <div 
                                        key={prov.codigo} 
                                        className="flex items-center gap-3 p-2 hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-0"
                                        onClick={() => seleccionarProvincia(prov)}
                                    >
                                        <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500 border border-gray-200">
                                            {prov.codigo}
                                        </div>
                                        <span className="text-xs font-medium text-gray-700">{prov.nombre}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    {errors.provincia && <p className="text-red-500 text-[10px] mt-0.5">Requerido</p>}
                  </div>
              )}

              {/* CAMPO CÉDULA / PASAPORTE */}
              <div className={esExtranjero ? "md:col-span-1" : "md:col-span-1"}>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">{esExtranjero ? "Pasaporte / ID *" : "Cédula *"}</label>
                <div className="relative">
                  <CreditCard className="absolute left-2.5 top-2 text-gray-400" size={14}/>
                  <input 
                    {...register("cedula", { 
                        required: "Requerido", 
                        validate: (value) => {
                            if (esExtranjero) {
                                if (value.length < 5) return "Mínimo 5 caracteres";
                                if (value.length > 20) return "Máximo 20 caracteres";
                                return true;
                            } else {
                                if (!provinciaSeleccionada) return "Seleccione provincia";
                                if (value.length !== 10) return "Debe tener 10 dígitos";
                                if (!value.startsWith(provinciaSeleccionada)) return `Debe iniciar con ${provinciaSeleccionada}`;
                                return true;
                            }
                        }
                    })} 
                    placeholder={placeholderCedula} 
                    className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-none transition"
                    maxLength={esExtranjero ? 20 : 10}
                    onInput={(e) => { 
                        if (!esExtranjero) e.currentTarget.value = e.currentTarget.value.replace(/\D/g, '').slice(0, 10); 
                    }}
                  />
                </div>
                {errors.cedula && <p className="text-red-500 text-[10px] mt-0.5">{errors.cedula.message as string}</p>}
              </div>
              
              <div className={esExtranjero ? "md:col-span-2" : "md:col-span-1"}>
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
              
              {/* 🔥 TELÉFONO: LÓGICA CON BANDERAS Y MANUAL */}
              {esExtranjero ? (
                  <div className={`md:col-span-3 grid gap-4 ${codigoPaisSeleccionado === 'other' ? 'grid-cols-4' : 'grid-cols-3'}`}>
                      <div className="col-span-1">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">País</label>
                        <div className="relative">
                            <div 
                                className="w-full h-[34px] border border-gray-200 rounded-lg flex items-center px-2 cursor-pointer bg-white hover:border-orange-500"
                                onClick={() => setMostrarMenuPaises(!mostrarMenuPaises)}
                            >
                                {codigoPaisSeleccionado === 'other' ? (
                                    <Globe size={16} className="text-gray-600"/>
                                ) : (
                                    <img 
                                        src={`https://flagcdn.com/w40/${paisIsoSeleccionado}.png`} 
                                        alt="flag" 
                                        className="w-5 h-auto rounded-sm object-cover border border-gray-200"
                                    />
                                )}
                                <span className="text-xs ml-2 text-gray-700 truncate">{codigoPaisSeleccionado}</span>
                                <ChevronDown size={14} className="ml-auto text-gray-400"/>
                            </div>

                            {mostrarMenuPaises && (
                                <div className="absolute top-full left-0 w-64 z-50 bg-white border border-gray-200 rounded-lg shadow-xl mt-1 max-h-60 overflow-y-auto">
                                    {PAISES.map(p => (
                                        <div 
                                            key={p.iso} 
                                            className="flex items-center gap-2 p-2 hover:bg-orange-50 cursor-pointer border-b border-gray-50 last:border-0"
                                            onClick={() => seleccionarPais(p)}
                                        >
                                            {p.iso !== 'globe' ? (
                                                <img src={`https://flagcdn.com/w40/${p.iso}.png`} alt={p.nombre} className="w-5 h-auto rounded-sm shadow-sm"/>
                                            ) : <Globe size={16} className="text-gray-500"/>}
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-gray-700">{p.nombre}</span>
                                                <span className="text-[10px] text-gray-500">{p.dial}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                      </div>

                      {/* INPUT MANUAL SI ELIGE "OTRO" */}
                      {codigoPaisSeleccionado === 'other' && (
                          <div className="col-span-1 animate-fadeIn">
                              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Prefijo</label>
                              <input 
                                  type="text" 
                                  placeholder="+XX" 
                                  value={prefijoManual}
                                  onChange={(e) => setPrefijoManual(e.target.value)}
                                  className="w-full px-2 py-2 text-xs border border-gray-200 rounded-lg focus:ring-1 focus:ring-orange-500 outline-none text-center"
                              />
                          </div>
                      )}

                      <div className={codigoPaisSeleccionado === 'other' ? 'col-span-2' : 'col-span-2'}>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Celular Extranjero</label>
                        <div className="relative">
                            <Phone className="absolute left-2.5 top-2 text-gray-400" size={14}/>
                            <input 
                                {...register("telefono")} 
                                placeholder="123456789" 
                                className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-lg outline-none focus:border-orange-500" 
                                maxLength={15}
                            />
                        </div>
                      </div>
                  </div>
              ) : (
                  // NACIONAL: Solo Input Texto
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Celular</label>
                    <div className="relative">
                        <Phone className="absolute left-2.5 top-2 text-gray-400" size={14}/>
                        <input 
                            {...register("telefono", { pattern: { value: /^\d+$/, message: "Solo números" } })} 
                            placeholder="0987654321" 
                            className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-lg outline-none focus:border-orange-500 transition" 
                            maxLength={10}
                            onInput={(e) => { e.currentTarget.value = e.currentTarget.value.replace(/\D/g, '').slice(0, 10); }}
                        />
                    </div>
                  </div>
              )}

            </div>
          </div>

          {/* CLASIFICACIÓN Y RFID (TU CÓDIGO ORIGINAL) */}
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