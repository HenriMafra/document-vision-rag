import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

let cachedSql: NeonQueryFunction<false, false> | null = null;

/**
 * Cliente Neon (HTTP, serverless) com inicializacao preguicosa:
 * evita falhas de build quando DATABASE_URL ainda nao foi definida.
 */
export function getDb(): NeonQueryFunction<false, false> {
  if (!cachedSql) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error(
        "DATABASE_URL nao definida. Copie .env.example para .env e preencha a connection string do Neon."
      );
    }
    cachedSql = neon(url);
  }
  return cachedSql;
}
