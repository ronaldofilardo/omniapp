// scripts/ensure-test-db.js
const fs = require("fs");
const path = require("path");

function ensureTestDatabase() {
  const envFile = process.env.NODE_ENV === "test" ? ".env.test" : ".env";
  const envPath = path.join(process.cwd(), envFile);

  if (!fs.existsSync(envPath)) {
    console.error(`Arquivo ${envFile} não encontrado!`);
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, "utf8");
  const databaseUrl = envContent.match(/DATABASE_URL=["'](.+)["']/)?.[1];

  if (!databaseUrl) {
    console.error("DATABASE_URL não encontrada no arquivo de ambiente!");
    process.exit(1);
  }

  if (!databaseUrl.includes("omnib2_test")) {
    console.error("\x1b[31m[ERRO DE SEGURANÇA]\x1b[0m");
    console.error("Tentativa de executar testes no banco de desenvolvimento!");
    console.error(
      "O banco de dados deve ser omnib2_test para execução de testes."
    );
    process.exit(1);
  }

  console.log("✅ Usando banco de dados de teste:", databaseUrl);
}

ensureTestDatabase();
