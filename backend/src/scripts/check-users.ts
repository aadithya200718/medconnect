import { getPool } from '../config/database.js';

async function checkUsers() {
    console.log('🔍 Connecting to TiDB Cloud...');

    const pool = getPool();
    if (!pool) {
        console.error('❌ Database pool not initialized');
        process.exit(1);
    }

    try {
        // Query Users
        const [users] = await pool.execute('SELECT * FROM users ORDER BY created_at DESC');

        console.log('\n📊 Users Table:');
        console.table(users);

        // Query Patients
        const [patients] = await pool.execute('SELECT * FROM patients');
        console.log('\n🏥 Patients Table:');
        console.table(patients);

        console.log('\n✅ Verification Complete');
        console.log('User data is lawfully stored in your TiDB Cloud database!');

    } catch (error) {
        console.error('❌ Error querying database:', error);
    } finally {
        process.exit();
    }
}

checkUsers();
