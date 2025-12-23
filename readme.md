# dentro del frontend y backend
npm run dev





# 🛡️ Guía de Flujo de Trabajo Git: Respaldo y Nuevas Funcionalidades

Esta guía describe el proceso para guardar arreglos críticos, crear un punto de restauración seguro (backup) y preparar el entorno para desarrollar nuevas funcionalidades sin romper lo que ya funciona.

## 📋 Resumen del Objetivo
1.  **Guardar** lo que acabamos de arreglar (Error de keys y RFID).
2.  **Respaldar** todo el proyecto en una rama segura en la nube.
3.  **Iniciar** una rama limpia para trabajar en el Login y Visitantes.

---

## 🚀 Pasos a Ejecutar en la Terminal

### Paso 1: Guardar los cambios actuales (Commit)
Primero, aseguramos que el código corregido se guarde en el historial local de la rama actual.

// git add .
// git commit -m "Fix: Error de keys duplicadas y lógica RFID en modal editar"

Paso 2: Crear el Punto de Restauración (Backup)
Creamos una rama "espejo" idéntica a la actual y la subimos a GitHub.

# Crear rama de respaldo y moverse a ella

// git checkout -b backup-rfid-funcionando 

la parte de <backup-rfid-funcionando> pyede ser cambiado por ejemplo 
git checkout -b respaldo-tesis-martes

# Subir este respaldo a la nube (GitHub)

// git push origin backup-rfid-funcionando

asi mismo se pone el mismo nombre de arriba en la parte <backup-rfid-funcionando>

¿Para qué sirve? Funciona como un "Punto de Guardado" en un videojuego. Si en el futuro rompes el código intentando hacer el Login, siempre podrás descargar esta rama (backup-rfid-funcionando) y volver a tener el sistema funcionando perfecto tal como está hoy.

Paso 3: Preparar el terreno para lo nuevo
Volvemos a la rama principal para usarla como base limpia.

# Regresar a la rama principal

// git checkout main

# (Opcional) Asegurar que main tenga lo último de la nube

// git pull origin main

¿Para qué sirve? Nos salimos de la carpeta del backup para no trabajar sobre ella por error. Volvemos a la base del proyecto.

Paso 4: Crear el espacio de trabajo para el Login
Creamos una rama específica para la nueva tarea.


# Crear rama para la nueva funcionalidad (Feature)

// git checkout -b feature/login-visitantes-credenciales

¿Para qué sirve? Crea un entorno aislado. Aquí puedes borrar, romper y experimentar con el Login. Si te equivocas, la rama main y tu backup siguen intactos. Es la forma profesional de trabajar.