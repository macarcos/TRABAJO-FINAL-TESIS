// test-db.ts
import { createClient } from "@libsql/client";
import dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();

const url = process.env.TURSO_DATABASE_URL || "";
const authToken = process.env.TURSO_AUTH_TOKEN || "";

const db = createClient({ url, authToken });

async function testDB() {
  try {
    console.log("🔍 Conectando a Turso...\n");

    // 1. VER TODOS LOS USUARIOS
    console.log("📋 LISTA DE USUARIOS:");
    const usuarios = await db.execute(`
      SELECT usuario, primer_nombre, primer_apellido, tipo_persona, seed_billetera 
      FROM personas
    `);
    console.table(usuarios.rows);

    // 2. VER USUARIO ESPECÍFICO
    console.log("\n🔎 BUSCANDO: marcos.salazar");
    const marcos = await db.execute({
      sql: `
        SELECT usuario, primer_nombre, tipo_persona, seed_billetera, foto_url, estado
        FROM personas 
        WHERE usuario = ?
      `,
      args: ['marcos.salazar']
    });

    if (marcos.rows.length > 0) {
      console.log("✅ Usuario encontrado:");
      console.table(marcos.rows);

      const user = marcos.rows[0] as any;

      // 3. ACTUALIZAR SEED SI ESTÁ VACÍO
      if (!user.seed_billetera || user.seed_billetera === '') {
        console.log("\n⚠️ El usuario NO tiene seed_billetera");
        console.log("🔧 Generando seed...");
        
        const nuevoSeed = crypto.randomBytes(32).toString('hex');
        
        await db.execute({
          sql: "UPDATE personas SET seed_billetera = ? WHERE usuario = ?",
          args: [nuevoSeed, 'marcos.salazar']
        });

        console.log(`✅ Seed actualizado: ${nuevoSeed}`);

        // Verificar
        const verificar = await db.execute({
          sql: "SELECT usuario, seed_billetera FROM personas WHERE usuario = ?",
          args: ['marcos.salazar']
        });
        console.log("\n✅ VERIFICACIÓN:");
        console.table(verificar.rows);
      } else {
        console.log(`\n✅ El usuario YA tiene seed: ${user.seed_billetera}`);
      }
    } else {
      console.log("❌ Usuario 'marcos.salazar' no encontrado");
    }

    // 4. ESTADÍSTICAS GENERALES
    console.log("\n📊 ESTADÍSTICAS:");
    const stats = await db.execute(`
      SELECT 
        COUNT(*) as total_usuarios,
        SUM(CASE WHEN seed_billetera IS NOT NULL AND seed_billetera != '' THEN 1 ELSE 0 END) as con_seed,
        SUM(CASE WHEN seed_billetera IS NULL OR seed_billetera = '' THEN 1 ELSE 0 END) as sin_seed
      FROM personas
    `);
    console.table(stats.rows);

    console.log("\n✅ Test completado");

  } catch (error) {
    console.error("❌ Error:", error);
  }
}

testDB();