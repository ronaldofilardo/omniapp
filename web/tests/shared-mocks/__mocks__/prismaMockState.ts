// Estado compartilhado para mocks do Prisma
export let _mockEvents: any[] = [];
export let _mockFiles: any[] = [];

export function resetPrismaMockState() {
  _mockEvents.length = 0;
  _mockFiles.length = 0;
}
