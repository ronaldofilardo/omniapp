const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function testDatabase() {
  try {
    console.log("🔍 Verificando conexão com o banco...");

    // Testar se as tabelas existem
    const users = await prisma.user.findMany();
    console.log("✅ Usuários encontrados:", users.length);

    const professionals = await prisma.professional.findMany();
    console.log("✅ Profissionais encontrados:", professionals.length);

    const events = await prisma.healthEvent.findMany();
    console.log("✅ Eventos encontrados:", events.length);

    const files = await prisma.file.findMany();
    console.log("✅ Arquivos encontrados:", files.length);

    console.log("\n🎉 Todas as tabelas estão acessíveis!");

    // Testar criação de um profissional se não existir nenhum
    if (professionals.length === 0) {
      console.log("🔧 Criando profissional de teste...");
      const user = users[0]; // Usar o primeiro usuário encontrado
      const professional = await prisma.professional.create({
        data: {
          name: "Dr. Teste",
          specialty: "Clínico Geral",
          contact: "11999999999",
          userId: user.id,
        },
      });
      console.log("✅ Profissional criado:", professional.id);
    }
  } catch (error) {
    console.error("❌ Erro ao testar banco:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabase();
