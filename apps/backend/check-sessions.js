const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkSessions() {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, firstName: true, lastName: true }
    });
    console.log('👥 Users:', users);

    const sessions = await prisma.chatSession.findMany({
      include: {
        user: {
          select: { email: true }
        }
      }
    });
    console.log(`\n💬 Total chat sessions: ${sessions.length}`);
    sessions.forEach(s => {
      console.log(`  - ${s.title} (User: ${s.user?.email || 'N/A'}, ID: ${s.userId})`);
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSessions();
