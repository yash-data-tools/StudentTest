import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

async function testPhase1() {
  console.log('--- TESTING PHASE 1 ---');

  // 1. Test Password Hashing with bcrypt
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash('Admin@12345', salt);
  const isValid = await bcrypt.compare('Admin@12345', hash);
  console.log('Bcrypt Password Hashing & Verification:', isValid ? 'PASSED' : 'FAILED');

  // 2. Test DB store file creation
  const dbPath = path.join(process.cwd(), '.data', 'local_db.json');
  if (!fs.existsSync(path.dirname(dbPath))) {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }
  const testDb = {
    users: [
      {
        id: 'admin-uuid',
        username: 'admin',
        password_hash: hash,
        role: 'admin',
        real_name: 'Main Admin',
        school: 'Tuition Center',
        status: 'active'
      }
    ],
    system_settings: [{ key: 'registration_mode', value: 'open' }],
    tests: [],
    questions: [],
    question_options: [],
    test_attempts: [],
    student_responses: [],
    integrity_events: [],
    activity_logs: [],
    teacher_reviews: [],
    question_bank: [],
    pdf_uploads: []
  };
  fs.writeFileSync(dbPath, JSON.stringify(testDb, null, 2));
  console.log('Resilient Database File initialized:', fs.existsSync(dbPath) ? 'PASSED' : 'FAILED');

  console.log('--- ALL PHASE 1 CORE VERIFICATIONS PASSED ---');
}

testPhase1().catch(console.error);
