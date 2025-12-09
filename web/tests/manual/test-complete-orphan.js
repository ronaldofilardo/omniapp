const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function testOrphanFlow() {
  try {
    console.log("🧪 Testando fluxo completo de arquivos órfãos...\n");

    // 1. Buscar usuário e profissional
    const user = await prisma.user.findFirst();
    const professional = await prisma.professional.findFirst();
    if (!user || !professional) {
      throw new Error("Usuário ou profissional não encontrado");
    }
    console.log(`✅ Usuário: ${user.email} (${user.id})`);
    console.log(`✅ Profissional: ${professional.name} (${professional.id})\n`);

    // 2. Criar evento com arquivo via API
    const eventData = {
      title: "Teste Órfão Completo",
      date: "2025-11-18",
      type: "EXAME",
      startTime: "16:00",
      endTime: "17:00",
      professionalId: professional.id,
      files: [
        {
          slot: "result",
          name: "laudo-orfao-completo.pdf",
          url: "/uploads/laudo-orfao-completo.pdf",
          uploadDate: "2025-11-18T16:00:00Z",
        },
      ],
    };

    const createResponse = await fetch(
      `http://localhost:3000/api/events?userId=${user.id}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventData),
      }
    );

    if (!createResponse.ok) {
      throw new Error(`Erro ao criar evento: ${createResponse.status}`);
    }

    const event = await createResponse.json();
    console.log(`✅ Evento criado: ${event.id}`);

    // 3. Verificar arquivo criado
    const filesBefore = await prisma.file.findMany({
      where: { eventId: event.id },
    });
    console.log(
      `✅ Arquivo criado: ${filesBefore[0].name} (${filesBefore[0].id})\n`
    );

    // 4. Deletar evento SEM deletar arquivos
    const deleteResponse = await fetch("http://localhost:3000/api/events", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: event.id, deleteFiles: false }),
    });

    if (!deleteResponse.ok) {
      throw new Error(`Erro ao deletar evento: ${deleteResponse.status}`);
    }
    console.log(`✅ Evento deletado sem deletar arquivos`);

    // 5. Verificar arquivo órfão no banco
    const orphanFile = await prisma.file.findFirst({
      where: { id: filesBefore[0].id },
    });
    console.log(`✅ Arquivo órfão no banco:`, {
      id: orphanFile?.id,
      name: orphanFile?.name,
      isOrphaned: orphanFile?.isOrphaned,
      eventId: orphanFile?.eventId,
      orphanedReason: orphanFile?.orphanedReason,
    });

    // 6. Testar API de arquivos órfãos
    const orphanResponse = await fetch(
      `http://localhost:3000/api/repository/orphan-files?userId=${user.id}`
    );
    if (orphanResponse.ok) {
      const orphanData = await orphanResponse.json();
      console.log(
        `✅ API de órfãos retorna ${orphanData.length} arquivo(s):`,
        orphanData.map((f) => f.name)
      );
    } else {
      console.error(`❌ Erro na API de órfãos: ${orphanResponse.status}`);
    }

    console.log(
      `\n🎉 Teste completo! Agora abra o frontend e vá para Repositório para ver os arquivos órfãos.`
    );
  } catch (error) {
    console.error("❌ Erro no teste:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testOrphanFlow();
