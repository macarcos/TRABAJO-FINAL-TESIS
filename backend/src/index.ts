import express from 'express';
import cors from 'cors';
import { initDB } from './config/db';
import apiRoutes from './routes/api';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Log de peticiones
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.path}`);
  next();
});

// Ruta de prueba
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Servidor funcionando' });
});

// Rutas API
app.use('/api', apiRoutes);

// Error 404
app.use((req, res) => {
  console.log(`❌ 404: ${req.path}`);
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Iniciar servidor
const iniciar = async () => {
  try {
    console.log('⏳ Inicializando base de datos...');
    await initDB();
    console.log('✅ Base de datos lista\n');
    
    app.listen(3000, () => {
      console.log('🚀 Servidor UNEMI en puerto 3000');
      console.log('🔗 http://localhost:3000');
      console.log('📋 API: http://localhost:3000/api/acceso/ultimos\n');
    });
  } catch (err) {
    console.error('❌ Error fatal:', err);
    process.exit(1);
  }
};

iniciar();