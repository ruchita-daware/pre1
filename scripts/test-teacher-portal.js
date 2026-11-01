const testTeachers = [
  {
    name: 'Meera Nambiar (Main Campus Teacher)',
    email: 'teacher.main.multirole@sunshine.demo',
    password: 'PreOne@2026',
    expectedRooms: ['PLA-A', 'PLA-B'],
  },
  {
    name: 'Sunita Deshmukh (2nd Branch Teacher)',
    email: 'teacher.2nd.1@sunshine.demo',
    password: 'PreOne@2026',
    expectedRooms: ['PG-SEC-3073'],
  },
  {
    name: 'Arjun Das (Pune Branch Teacher)',
    email: 'teacher.pune.1@sunshine.demo',
    password: 'PreOne@2026',
    expectedRooms: ['PLA-D-8J5'],
  },
];

async function run() {
  console.log('====================================================');
  console.log('🧪 TESTING TEACHER PORTAL & STUDENT DATA LOADING');
  console.log('====================================================\n');

  for (const t of testTeachers) {
    console.log(`\n▶ Testing: ${t.name} (${t.email})`);

    // 1. Login
    const loginRes = await fetch('http://localhost:3000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: t.email,
        password: t.password,
      }),
    });

    const setCookies = loginRes.headers.getSetCookie ? loginRes.headers.getSetCookie() : [loginRes.headers.get('set-cookie')].filter(Boolean);
    const cookieHeader = setCookies.map(c => c.split(';')[0]).join('; ');
    const loginData = await loginRes.json();

    if (!loginRes.ok || !loginData.success) {
      console.error(`  ❌ Login failed:`, loginData);
      continue;
    }
    console.log(`  ✅ Login successful! User ID: ${loginData.data.user.id}, Role: ${loginData.data.user.role}`);

    // Headers with cookie
    const headers = {
      Cookie: cookieHeader,
      'Content-Type': 'application/json',
    };

    // 2. Test /api/v1/teacher/today
    const todayRes = await fetch('http://localhost:3000/api/v1/teacher/today', { headers });
    const todayData = await todayRes.json();
    if (todayRes.ok && todayData.success) {
      const sections = todayData.data.sections || todayData.data.classrooms || [];
      console.log(`  ✅ /api/v1/teacher/today: Loaded ${sections.length} assigned section(s)/classroom(s)`);
      for (const room of sections) {
        console.log(`     - Section: "${room.name}" (ID: ${room.id}), Expected Students: ${room.expected || 0}, Pending Attendance: ${room.attendancePending}`);
      }
    } else {
      console.error(`  ❌ /api/v1/teacher/today failed:`, todayData);
    }

    // 3. Test /api/v1/students
    const studentsRes = await fetch('http://localhost:3000/api/v1/students', { headers });
    const studentsData = await studentsRes.json();
    if (studentsRes.ok && studentsData.success) {
      const students = studentsData.data || [];
      console.log(`  ✅ /api/v1/students: Loaded ${students.length} student(s) visible to teacher`);
      if (students.length > 0) {
        console.log(`     - Sample student: ${students[0].firstName} ${students[0].lastName} (${students[0].admissionNumber}) in classroom ${students[0].classroom?.name || students[0].classroomId}`);
      }
    } else {
      console.error(`  ❌ /api/v1/students failed:`, studentsData);
    }

    // 4. Test /api/v1/classrooms
    const classroomsRes = await fetch('http://localhost:3000/api/v1/classrooms', { headers });
    const classroomsData = await classroomsRes.json();
    if (classroomsRes.ok && classroomsData.success) {
      const rooms = classroomsData.data || [];
      console.log(`  ✅ /api/v1/classrooms: Loaded ${rooms.length} classroom(s) visible to teacher`);
    } else {
      console.error(`  ❌ /api/v1/classrooms failed:`, classroomsData);
    }

    // 5. Test /api/v1/attendance
    const classrooms = classroomsData.data || [];
    if (classrooms.length > 0) {
      const targetRoomId = classrooms[0].id;
      const attendanceRes = await fetch(`http://localhost:3000/api/v1/attendance?classroomId=${targetRoomId}`, { headers });
      const attendanceData = await attendanceRes.json();
      if (attendanceRes.ok && attendanceData.success) {
        const attRecords = attendanceData.data || [];
        console.log(`  ✅ /api/v1/attendance for classroom "${classrooms[0].name}": HTTP 200 OK (${attRecords.length} records)`);
      } else {
        console.error(`  ❌ /api/v1/attendance failed:`, attendanceData);
      }
    }
  }

  console.log('\n====================================================');
  console.log('🏁 TEACHER PORTAL VERIFICATION COMPLETE');
  console.log('====================================================');
}

run().catch(console.error);
