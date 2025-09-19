import { accountEmailService } from './src/services/accountEmailService.js';

async function testAccountEmailService() {
  try {
    // Test data for reminder email
    const testEntries = [
      {
        defaultFields: {
          companyName: 'Test Company 1',
          billingDate: new Date('2024-03-15'),
          dueDate: new Date('2024-03-17')
        },
        masterTypeName: 'Invoice',
        daysUntilDue: 1
      },
      {
        defaultFields: {
          companyName: 'Test Company 2',
          billingDate: new Date('2024-03-15'),
          dueDate: new Date('2024-03-20')
        },
        masterTypeName: 'Payment',
        daysUntilDue: 4
      }
    ];

    // Test reminder email
    console.log('Testing reminder email...');
    await accountEmailService.sendReminderEmail(
      'intern@novusha.com',
      'intern@novusha.com',
      testEntries
    );

    // Test account creation email
    console.log('\nTesting account creation email...');
    await accountEmailService.sendAccountCreatedEmail(
      'intern@novusha.com',
      'intern@novusha.com',
      {
        companyName: 'New Test Company',
        masterTypeName: 'Invoice',
        billingDate: new Date('2024-03-15'),
        dueDate: new Date('2024-03-25')
      }
    );

    console.log('\n✅ All email tests completed successfully');
  } catch (error) {
    console.error('\n❌ Error during email testing:', error);
  }
}

testAccountEmailService();
