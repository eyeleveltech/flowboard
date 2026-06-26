const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const hash = await bcrypt.hash('admin123', 10);
  await prisma.user.updateMany({
    where: { email: 'akmal@eyelevelstudio.in' },
    data: { password: hash }
  });
  console.log('Password reset successfully');
}
run().catch(console.error).finally(() => prisma.$disconnect());
