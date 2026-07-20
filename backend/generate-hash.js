const bcrypt = require('bcrypt');

async function generate() {
    const adminHash = await bcrypt.hash('admin123', 10);
    const teacherHash = await bcrypt.hash('teacher123', 10);
    const parentHash = await bcrypt.hash('parent123', 10);
    
    console.log('\n=========================================');
    console.log('COPY THESE EXACT HASHES:');
    console.log('=========================================');
    console.log('Admin hash (admin123):');
    console.log(adminHash);
    console.log('\nTeacher hash (teacher123):');
    console.log(teacherHash);
    console.log('\nParent hash (parent123):');
    console.log(parentHash);
    console.log('\nLengths:', adminHash.length, teacherHash.length, parentHash.length);
    console.log('=========================================\n');
}

generate();