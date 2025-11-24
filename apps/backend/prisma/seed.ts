import { PrismaClient } from '@prisma/client';
import { PasswordService } from '../src/services/password.service';

const prisma = new PrismaClient();

async function createTestUser() {
  try {
    const email = 'admin@artemis.com';
    const password = 'Admin123!';

    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      console.log('❌ User already exists:', email);
      return;
    }

    // Create company
    const company = await prisma.company.create({
      data: {
        name: 'Artemis Tech',
      },
    });

    // Hash password
    const hashedPassword = await PasswordService.hash(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: 'Administrator',
        companyId: company.id,
      },
    });

    // Create sample chat sessions
    const chat1 = await prisma.chatSession.create({
      data: {
        userId: user.id,
        title: 'Project Planning Discussion',
      },
    });

    const chat2 = await prisma.chatSession.create({
      data: {
        userId: user.id,
        title: 'Budget Analysis Q4',
      },
    });

    const chat3 = await prisma.chatSession.create({
      data: {
        userId: user.id,
        title: 'Marketing Strategy 2024',
      },
    });

    console.log('✅ Test user and workspaces created successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Email:', email);
    console.log('🔑 Password:', password);
    console.log('👤 Name:', `${user.firstName} ${user.lastName}`);
    console.log('💼 Role:', user.role);
    console.log('🏢 Company:', company.name);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('👤 User ID:', user.id);
    console.log('🏢 Company ID:', company.id);
    console.log('💬 Chat Sessions:', chat1.id, chat2.id, chat3.id);
  } catch (error) {
    console.error('❌ Error creating test user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();
