import express from 'express';
import cors from 'cors';
import { initDB } from './config/db';
import apiRoutes from './routes/api';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use('/api', apiRoutes);

app.listen(3000, async () => {
  console.log("🚀 Servidor UNEMI en puerto 3000");
  await initDB();
});