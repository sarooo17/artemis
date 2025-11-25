import { PrismaClient } from '@prisma/client';
import { PasswordService } from '../src/services/password.service';

const prisma = new PrismaClient();

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...\n');

    // Create Billing Plans
    const freePlan = await prisma.billingPlan.create({
      data: {
        name: 'Free',
        description: 'Perfect for trying out Artemis',
        priceMonthly: 0,
        priceYearly: 0,
        maxUsers: 3,
        maxChatSessions: 50,
        features: JSON.stringify([
          'Up to 3 users',
          '50 chat sessions',
          'Basic AI assistant',
          'Email support'
        ]),
      },
    });

    const proPlan = await prisma.billingPlan.create({
      data: {
        name: 'Professional',
        description: 'For growing teams',
        priceMonthly: 29,
        priceYearly: 290,
        maxUsers: 10,
        maxChatSessions: 500,
        features: JSON.stringify([
          'Up to 10 users',
          '500 chat sessions',
          'Advanced AI models',
          'Fluentis integration',
          'Priority support',
          'Custom workflows'
        ]),
      },
    });

    const enterprisePlan = await prisma.billingPlan.create({
      data: {
        name: 'Enterprise',
        description: 'For large organizations',
        priceMonthly: 99,
        priceYearly: 990,
        maxUsers: -1,
        maxChatSessions: -1,
        features: JSON.stringify([
          'Unlimited users',
          'Unlimited chat sessions',
          'Premium AI models',
          'Full Fluentis integration',
          'Dedicated support',
          'Custom integrations',
          'Advanced security',
          'SSO & SAML'
        ]),
      },
    });

    console.log('✅ Created billing plans');

    // Create Companies
    const tostoGroup = await prisma.company.create({
      data: {
        name: 'Tosto Group',
        vatNumber: 'IT12345678901',
        domain: 'tostogroup.com',
        address: 'Via Roma 123, 20100 Milano, Italy',
        sector: 'manufacturing',
        language: 'it',
        currency: 'EUR',
        employeeCount: '201-500',
        billingPlanId: enterprisePlan.id,
      },
    });

    const artemisLabs = await prisma.company.create({
      data: {
        name: 'Artemis Labs',
        vatNumber: 'IT98765432109',
        domain: 'artemislabs.io',
        address: 'Via Garibaldi 45, 00100 Roma, Italy',
        sector: 'technology',
        language: 'en',
        currency: 'EUR',
        employeeCount: '11-50',
        billingPlanId: proPlan.id,
      },
    });

    console.log('✅ Created companies');

    // Create Departments for Tosto Group
    const salesDept = await prisma.department.create({
      data: {
        companyId: tostoGroup.id,
        name: 'Sales',
        description: 'Sales and customer relations team',
      },
    });

    const financeDept = await prisma.department.create({
      data: {
        companyId: tostoGroup.id,
        name: 'Finance',
        description: 'Financial management and accounting',
      },
    });

    const itDept = await prisma.department.create({
      data: {
        companyId: tostoGroup.id,
        name: 'IT',
        description: 'Information technology and systems',
      },
    });

    // Create Departments for Artemis Labs
    const engineeringDept = await prisma.department.create({
      data: {
        companyId: artemisLabs.id,
        name: 'Engineering',
        description: 'Software development team',
      },
    });

    console.log('✅ Created departments');

    // Create Roles
    const adminRole = await prisma.role.create({
      data: {
        departmentId: itDept.id,
        name: 'Administrator',
        description: 'Full system access',
        maxUsers: -1,
      },
    });

    const salesManagerRole = await prisma.role.create({
      data: {
        departmentId: salesDept.id,
        name: 'Sales Manager',
        description: 'Manages sales team',
        maxUsers: 5,
      },
    });

    const accountantRole = await prisma.role.create({
      data: {
        departmentId: financeDept.id,
        name: 'Accountant',
        description: 'Financial operations',
        maxUsers: 10,
      },
    });

    const devRole = await prisma.role.create({
      data: {
        departmentId: engineeringDept.id,
        name: 'Developer',
        description: 'Software developer',
        maxUsers: -1,
      },
    });

    console.log('✅ Created roles');

    // Create Permissions
    const permissions = await Promise.all([
      prisma.permission.create({ data: { name: 'manage_company', description: 'Manage company settings', category: 'settings' }}),
      prisma.permission.create({ data: { name: 'manage_users', description: 'Manage users and roles', category: 'users' }}),
      prisma.permission.create({ data: { name: 'manage_billing', description: 'Manage billing and subscriptions', category: 'billing' }}),
      prisma.permission.create({ data: { name: 'view_analytics', description: 'View analytics and reports', category: 'analytics' }}),
      prisma.permission.create({ data: { name: 'manage_workflows', description: 'Create and manage workflows', category: 'workflows' }}),
    ]);

    // Assign permissions to admin role
    await Promise.all(
      permissions.map(perm => 
        prisma.rolePermission.create({
          data: { roleId: adminRole.id, permissionId: perm.id }
        })
      )
    );

    console.log('✅ Created permissions');

    // Create Users
    const users = [
      {
        email: 'riccardo.tosto@tostogroup.com',
        password: 'Admin123!',
        firstName: 'Riccardo',
        lastName: 'Tosto',
        phoneNumber: '+39 340 123 4567',
        roleId: adminRole.id,
        companyId: tostoGroup.id,
        isCompanyOwner: true,
        isEmailVerified: true,
        onboardingCompleted: true,
      },
      {
        email: 'marco.rossi@tostogroup.com',
        password: 'Sales123!',
        firstName: 'Marco',
        lastName: 'Rossi',
        phoneNumber: '+39 340 234 5678',
        roleId: salesManagerRole.id,
        companyId: tostoGroup.id,
        isCompanyOwner: false,
        isEmailVerified: true,
        onboardingCompleted: true,
      },
      {
        email: 'giulia.bianchi@tostogroup.com',
        password: 'Finance123!',
        firstName: 'Giulia',
        lastName: 'Bianchi',
        phoneNumber: '+39 340 345 6789',
        roleId: accountantRole.id,
        companyId: tostoGroup.id,
        isCompanyOwner: false,
        isEmailVerified: true,
        onboardingCompleted: true,
      },
      {
        email: 'luca.verdi@artemislabs.io',
        password: 'Dev123!',
        firstName: 'Luca',
        lastName: 'Verdi',
        phoneNumber: '+39 340 456 7890',
        roleId: devRole.id,
        companyId: artemisLabs.id,
        isCompanyOwner: true,
        isEmailVerified: true,
        onboardingCompleted: true,
      },
    ];

    const createdUsers = [];
    for (const userData of users) {
      const hashedPassword = await PasswordService.hash(userData.password);
      const user = await prisma.user.create({
        data: {
          ...userData,
          hashedPassword,
          password: undefined,
        },
      });
      createdUsers.push({ ...user, password: userData.password });

      // Create user settings
      await prisma.userSettings.create({
        data: {
          userId: user.id,
          language: user.companyId === tostoGroup.id ? 'it' : 'en',
          timezone: 'Europe/Rome',
          theme: 'light',
          accentColor: '#3B82F6',
        },
      });
    }

    console.log('✅ Created users with settings');

    // Create Chat Sessions for each user
    const chatTopics = [
      ['Analisi vendite Q4', 'Piano marketing 2024', 'Budget preventivo', 'Riunione team'],
      ['Report mensile', 'Strategia clienti', 'Obiettivi Q1', 'Presentazione prodotto'],
      ['Chiusura bilancio', 'Analisi costi', 'Report fiscale', 'Budget dipartimento'],
      ['Sprint planning', 'Code review notes', 'Architecture design', 'Bug tracking'],
    ];

    for (let i = 0; i < createdUsers.length; i++) {
      const user = createdUsers[i];
      const topics = chatTopics[i];
      
      for (const topic of topics) {
        const session = await prisma.chatSession.create({
          data: {
            userId: user.id,
            title: topic,
          },
        });

        // Add some messages to each session
        await prisma.chatMessage.createMany({
          data: [
            {
              sessionId: session.id,
              role: 'user',
              content: `Ciao, ho bisogno di aiuto con: ${topic}`,
            },
            {
              sessionId: session.id,
              role: 'assistant',
              content: `Certo! Posso aiutarti con ${topic}. Cosa vorresti sapere nello specifico?`,
            },
          ],
        });
      }
    }

    console.log('✅ Created chat sessions with messages');

    // Create some security audit logs
    for (const user of createdUsers) {
      await prisma.securityAuditLog.createMany({
        data: [
          {
            userId: user.id,
            action: 'login',
            ipAddress: '192.168.1.100',
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0',
          },
          {
            userId: user.id,
            action: 'password_change',
            ipAddress: '192.168.1.100',
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0',
          },
        ],
      });
    }

    console.log('✅ Created security audit logs');

    // Create default dashboard categories and widgets for each user
    for (const user of createdUsers) {
      // Create Overview category (default)
      const overviewCategory = await prisma.dashboardCategory.create({
        data: {
          userId: user.id,
          name: 'Overview',
          icon: '📊',
          order: 0,
          isDefault: true,
        },
      });

      // Create Analytics category
      const analyticsCategory = await prisma.dashboardCategory.create({
        data: {
          userId: user.id,
          name: 'Analytics',
          icon: '📈',
          order: 1,
        },
      });

      // Create Sales category
      const salesCategory = await prisma.dashboardCategory.create({
        data: {
          userId: user.id,
          name: 'Sales',
          icon: '💰',
          order: 2,
        },
      });

      // Create Overview dashboard with sample widgets
      const overviewDashboard = await prisma.dashboard.create({
        data: {
          categoryId: overviewCategory.id,
          userId: user.id,
          name: 'Company Overview',
          description: 'Key metrics and performance indicators',
          order: 0,
        },
      });

      // Create sample widgets for Overview
      await prisma.dashboardWidget.createMany({
        data: [
          {
            dashboardId: overviewDashboard.id,
            type: 'metric',
            title: 'Total Revenue',
            description: 'Monthly revenue',
            config: JSON.stringify({ currency: 'EUR' }),
            data: JSON.stringify({ value: '€124,500', change: 12.5 }),
            position: JSON.stringify({ x: 0, y: 0, w: 1, h: 1 }),
          },
          {
            dashboardId: overviewDashboard.id,
            type: 'metric',
            title: 'Active Users',
            description: 'Current active users',
            config: JSON.stringify({}),
            data: JSON.stringify({ value: '1,234', change: 8.3 }),
            position: JSON.stringify({ x: 1, y: 0, w: 1, h: 1 }),
          },
          {
            dashboardId: overviewDashboard.id,
            type: 'metric',
            title: 'Conversion Rate',
            description: 'This month',
            config: JSON.stringify({}),
            data: JSON.stringify({ value: '3.24%', change: -2.1 }),
            position: JSON.stringify({ x: 2, y: 0, w: 1, h: 1 }),
          },
          {
            dashboardId: overviewDashboard.id,
            type: 'list',
            title: 'Recent Activities',
            description: 'Latest team updates',
            config: JSON.stringify({}),
            data: JSON.stringify({
              items: [
                { title: 'New order received', subtitle: '2 hours ago' },
                { title: 'Invoice sent to client', subtitle: '4 hours ago' },
                { title: 'Meeting scheduled', subtitle: 'Yesterday' },
                { title: 'Report generated', subtitle: '2 days ago' },
              ],
            }),
            position: JSON.stringify({ x: 0, y: 1, w: 2, h: 2 }),
          },
        ],
      });

      // Create Analytics dashboard
      const analyticsDashboard = await prisma.dashboard.create({
        data: {
          categoryId: analyticsCategory.id,
          userId: user.id,
          name: 'Performance Analytics',
          description: 'Detailed analytics and trends',
          order: 0,
        },
      });

      await prisma.dashboardWidget.create({
        data: {
          dashboardId: analyticsDashboard.id,
          type: 'chart',
          title: 'Monthly Performance',
          description: 'Revenue trends over time',
          config: JSON.stringify({ chartType: 'line', colors: ['#3B82F6'] }),
          data: JSON.stringify({
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{ label: 'Revenue', data: [12000, 15000, 13000, 18000, 20000, 22000] }],
          }),
          position: JSON.stringify({ x: 0, y: 0, w: 3, h: 2 }),
        },
      });

      // Create Sales dashboard
      const salesDashboard = await prisma.dashboard.create({
        data: {
          categoryId: salesCategory.id,
          userId: user.id,
          name: 'Sales Overview',
          description: 'Sales metrics and pipeline',
          order: 0,
        },
      });

      await prisma.dashboardWidget.createMany({
        data: [
          {
            dashboardId: salesDashboard.id,
            type: 'metric',
            title: 'Monthly Sales',
            description: 'Current month',
            config: JSON.stringify({ currency: 'EUR' }),
            data: JSON.stringify({ value: '€45,200', change: 15.8 }),
            position: JSON.stringify({ x: 0, y: 0, w: 1, h: 1 }),
          },
          {
            dashboardId: salesDashboard.id,
            type: 'table',
            title: 'Top Products',
            description: 'Best performing products',
            config: JSON.stringify({}),
            data: JSON.stringify({
              columns: ['Product', 'Sales', 'Growth'],
              rows: [
                ['Product A', '€12,500', '+12%'],
                ['Product B', '€9,800', '+8%'],
                ['Product C', '€7,200', '+5%'],
              ],
            }),
            position: JSON.stringify({ x: 0, y: 1, w: 2, h: 2 }),
          },
        ],
      });
    }

    console.log('✅ Created dashboard categories and widgets');

    // Summary
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Database seeded successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('👥 Created Users:\n');
    createdUsers.forEach(user => {
      console.log(`  📧 ${user.email}`);
      console.log(`  🔑 Password: ${user.password}`);
      console.log(`  👤 Name: ${user.firstName} ${user.lastName}`);
      console.log(`  🏢 Company: ${user.companyId === tostoGroup.id ? 'Tosto Group' : 'Artemis Labs'}`);
      console.log('');
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedDatabase();
