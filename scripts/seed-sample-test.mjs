import fs from 'fs';
import path from 'path';

const DB_FILE = path.join(process.cwd(), '.data', 'local_db.json');

if (fs.existsSync(DB_FILE)) {
  const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));

  if (db.tests.length === 0) {
    const testId = 'test-jee-sample-01';

    db.tests.push({
      id: testId,
      title: 'JEE Main Physics & Chemistry: Mock Exam 01',
      subject: 'Physics & Chemistry',
      chapter: 'Mechanics & Thermodynamics',
      topic: 'Comprehensive Model Paper',
      class_grade: 'Class 11 & 12',
      description: 'Standard competitive exam model paper with single-choice MCQs and numerical questions.',
      instructions: 'Each question carries 4 marks. For single-choice MCQs, 1 mark is deducted for incorrect response. No negative marking for numerical questions.',
      total_marks: 20,
      duration_minutes: 25,
      exam_mode: 'instant_quick_test', // Set as quick test so student gets immediate evaluation!
      status: 'published',
      negative_marking_enabled: true,
      shuffle_questions: false,
      shuffle_options: false,
      anti_cheat_settings: {
        fullscreen_required: false,
        tab_monitoring: true,
        clipboard_monitoring: true,
        context_menu_disabled: true,
        keyboard_monitoring: true,
        idle_monitoring: true,
      },
      created_by: 'admin-uuid',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Q1: Single Correct MCQ
    const q1Id = 'q1-uuid';
    db.questions.push({
      id: q1Id,
      test_id: testId,
      question_number: 1,
      question_text: 'A body starts from rest with a uniform acceleration of 4 m/s². What will be its velocity after 6 seconds?',
      question_type: 'mcq_single',
      marks: 4,
      negative_marks: 1,
      explanation: 'Using first equation of motion: v = u + at. Here u = 0, a = 4 m/s², t = 6 s => v = 0 + 4 * 6 = 24 m/s.',
      numerical_answer: null,
      numerical_tolerance: 0,
      order_index: 0,
      created_at: new Date().toISOString(),
    });
    db.question_options.push(
      { id: 'opt1-a', question_id: q1Id, option_letter: 'A', option_text: '12 m/s', is_correct: false, order_index: 0 },
      { id: 'opt1-b', question_id: q1Id, option_letter: 'B', option_text: '24 m/s', is_correct: true, order_index: 1 },
      { id: 'opt1-c', question_id: q1Id, option_letter: 'C', option_text: '36 m/s', is_correct: false, order_index: 2 },
      { id: 'opt1-d', question_id: q1Id, option_letter: 'D', option_text: '48 m/s', is_correct: false, order_index: 3 }
    );

    // Q2: Numerical Question
    const q2Id = 'q2-uuid';
    db.questions.push({
      id: q2Id,
      test_id: testId,
      question_number: 2,
      question_text: 'A block of mass 5 kg is pulled on a frictionless horizontal floor by a force of 30 N. Find the acceleration produced in m/s².',
      question_type: 'numerical',
      marks: 4,
      negative_marks: 0,
      explanation: 'Newton second law: F = m * a => a = F / m = 30 N / 5 kg = 6 m/s².',
      numerical_answer: 6,
      numerical_tolerance: 0.1,
      numerical_tolerance_type: 'exact',
      order_index: 1,
      created_at: new Date().toISOString(),
    });

    // Q3: Chemistry MCQ
    const q3Id = 'q3-uuid';
    db.questions.push({
      id: q3Id,
      test_id: testId,
      question_number: 3,
      question_text: 'Which quantum number determines the spatial orientation of an orbital in an atom?',
      question_type: 'mcq_single',
      marks: 4,
      negative_marks: 1,
      explanation: 'The magnetic quantum number (m_l) describes the orientation of the orbital in space relative to an external magnetic field.',
      numerical_answer: null,
      numerical_tolerance: 0,
      order_index: 2,
      created_at: new Date().toISOString(),
    });
    db.question_options.push(
      { id: 'opt3-a', question_id: q3Id, option_letter: 'A', option_text: 'Principal quantum number (n)', is_correct: false, order_index: 0 },
      { id: 'opt3-b', question_id: q3Id, option_letter: 'B', option_text: 'Azimuthal quantum number (l)', is_correct: false, order_index: 1 },
      { id: 'opt3-c', question_id: q3Id, option_letter: 'C', option_text: 'Magnetic quantum number (m)', is_correct: true, order_index: 2 },
      { id: 'opt3-d', question_id: q3Id, option_letter: 'D', option_text: 'Spin quantum number (s)', is_correct: false, order_index: 3 }
    );

    // Q4: Thermodynamics MCQ
    const q4Id = 'q4-uuid';
    db.questions.push({
      id: q4Id,
      test_id: testId,
      question_number: 4,
      question_text: 'In an isothermal process for an ideal gas, which of the following quantities remains strictly constant?',
      question_type: 'mcq_single',
      marks: 4,
      negative_marks: 1,
      explanation: 'An isothermal process occurs at constant temperature (ΔT = 0), and therefore the internal energy (U) also remains constant (ΔU = 0).',
      numerical_answer: null,
      numerical_tolerance: 0,
      order_index: 3,
      created_at: new Date().toISOString(),
    });
    db.question_options.push(
      { id: 'opt4-a', question_id: q4Id, option_letter: 'A', option_text: 'Pressure', is_correct: false, order_index: 0 },
      { id: 'opt4-b', question_id: q4Id, option_letter: 'B', option_text: 'Volume', is_correct: false, order_index: 1 },
      { id: 'opt4-c', question_id: q4Id, option_letter: 'C', option_text: 'Temperature & Internal Energy', is_correct: true, order_index: 2 },
      { id: 'opt4-d', question_id: q4Id, option_letter: 'D', option_text: 'Entropy', is_correct: false, order_index: 3 }
    );

    // Q5: Numerical Question
    const q5Id = 'q5-uuid';
    db.questions.push({
      id: q5Id,
      test_id: testId,
      question_number: 5,
      question_text: 'A Carnot engine operates between temperatures 500 K and 300 K. What is its percentage thermal efficiency (%)?',
      question_type: 'numerical',
      marks: 4,
      negative_marks: 0,
      explanation: 'Efficiency η = 1 - (T_cold / T_hot) = 1 - (300 / 500) = 1 - 0.6 = 0.40 = 40%.',
      numerical_answer: 40,
      numerical_tolerance: 0.1,
      numerical_tolerance_type: 'exact',
      order_index: 4,
      created_at: new Date().toISOString(),
    });

    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
    console.log('Seeded sample JEE test: test-jee-sample-01');
  }
}
