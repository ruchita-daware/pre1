import { db } from '../src/lib/db'

async function seedAllTeachersAndStudentsActivities() {
  console.log('========================================================================')
  console.log('=== SEEDING COMPREHENSIVE 30-DAY OPERATIONAL DATA (3 TEACHERS + 4 ROOMS) ===')
  console.log('========================================================================\n')

  // 1. Resolve Academic Session & Tenant
  const teacherMeera = await db.user.findFirst({
    where: { email: 'teacher.main.multirole@sunshine.demo' },
    include: { memberships: true },
  })
  if (!teacherMeera) throw new Error('Meera Nambiar not found!')
  const tenantId = teacherMeera.memberships[0]?.tenantId
  if (!tenantId) throw new Error('Tenant ID not found!')

  const tenant = await db.tenant.findUnique({ where: { id: tenantId } })
  console.log(`Tenant: ${tenant?.name} (${tenant?.code})`)

  const currentSession = await db.academicSession.findFirst({
    where: { tenantId, isCurrent: true },
  })
  if (!currentSession) throw new Error('Active Academic Session not found!')
  const academicSessionId = currentSession.id
  console.log(`Academic Session: ${currentSession.name} (${academicSessionId})\n`)

  // 2. Resolve or Update the 3 Target Teachers
  // Password hash for PreOne@2026
  const passwordHash = teacherMeera.passwordHash

  // Target Teacher 1: Meera Nambiar
  console.log('Configuring Teacher 1: Meera Nambiar')
  const meeraUser = teacherMeera

  // Target Teacher 2: Arjun Das
  console.log('Configuring Teacher 2: Arjun Das')
  let arjunUser = await db.user.findFirst({
    where: { email: 'teacher.pune.1@sunshine.demo' },
  })
  if (!arjunUser) {
    arjunUser = await db.user.findFirst({
      where: { fullName: { contains: 'Arjun Das', mode: 'insensitive' } },
    })
  }
  if (!arjunUser) throw new Error('Teacher Arjun Das not found!')
  await db.user.update({
    where: { id: arjunUser.id },
    data: { passwordHash, mustChangePassword: false, status: 'ACTIVE' },
  })

  // Target Teacher 3: Sunita Deshmukh
  console.log('Configuring Teacher 3: Sunita Deshmukh')
  let sunitaUser = await db.user.findFirst({
    where: { email: 'teacher.2nd.1@sunshine.demo' },
  })
  if (!sunitaUser) {
    sunitaUser = await db.user.findFirst({
      where: { fullName: { contains: 'Sunita Deshmukh', mode: 'insensitive' }, roles: { has: 'TEACHER' } },
    })
  }
  if (!sunitaUser) throw new Error('Teacher Sunita Deshmukh not found!')
  await db.user.update({
    where: { id: sunitaUser.id },
    data: { passwordHash, mustChangePassword: false, status: 'ACTIVE' },
  })

  // 3. Resolve the 4 Target Classrooms
  const targetClassroomCodes = ['PLA-A', 'PLA-B', 'PG-SEC-3073', 'PLA-D-8J5']
  const classrooms = await db.classroom.findMany({
    where: { code: { in: targetClassroomCodes } },
    include: {
      program: true,
      students: { where: { status: 'ACTIVE', deletedAt: null } },
    },
  })

  console.log(`\nFound ${classrooms.length} target classrooms:`)
  for (const c of classrooms) {
    console.log(`- ${c.name} (${c.code}): ${c.students.length} students | Branch: ${c.branchId} | Program: ${c.program?.name}`)
  }

  const roomMap: Record<string, typeof classrooms[0]> = {}
  for (const c of classrooms) {
    roomMap[c.code] = c
  }

  // Ensure classroom primary teachers
  if (roomMap['PLA-A']) {
    await db.classroom.update({ where: { id: roomMap['PLA-A'].id }, data: { primaryTeacherId: meeraUser.id } })
  }
  if (roomMap['PLA-B']) {
    await db.classroom.update({ where: { id: roomMap['PLA-B'].id }, data: { primaryTeacherId: meeraUser.id } })
  }
  if (roomMap['PG-SEC-3073']) {
    await db.classroom.update({ where: { id: roomMap['PG-SEC-3073'].id }, data: { primaryTeacherId: sunitaUser.id } })
  }
  if (roomMap['PLA-D-8J5']) {
    await db.classroom.update({ where: { id: roomMap['PLA-D-8J5'].id }, data: { primaryTeacherId: arjunUser.id } })
  }
  console.log('✓ Verified primary teacher linkage on all 4 classrooms.')

  // 4. Ensure StaffProfiles for All 3 Teachers
  const teacherConfigs = [
    {
      user: meeraUser,
      code: 'EMP-2026-005',
      designation: 'Lead Teacher & Curriculum Coordinator',
      branchId: roomMap['PLA-A']?.branchId || meeraUser.memberships[0]?.branchId,
    },
    {
      user: arjunUser,
      code: 'EMP-2026-006',
      designation: 'Primary Educator - Pune Campus',
      branchId: roomMap['PLA-D-8J5']?.branchId || arjunUser.memberships[0]?.branchId,
    },
    {
      user: sunitaUser,
      code: 'EMP-2026-007',
      designation: 'Senior Playgroup Teacher',
      branchId: roomMap['PG-SEC-3073']?.branchId || sunitaUser.memberships[0]?.branchId,
    },
  ]

  const staffProfiles: Record<string, any> = {}
  for (const tc of teacherConfigs) {
    let sp = await db.staffProfile.findFirst({
      where: { userId: tc.user.id },
    })
    let empCode = tc.code
    const existingWithCode = await db.staffProfile.findFirst({
      where: { tenantId, employeeCode: empCode },
    })
    if (existingWithCode && existingWithCode.userId !== tc.user.id) {
      empCode = `EMP-TCH-${tc.user.id.slice(0, 6).toUpperCase()}`
    }

    if (!sp) {
      sp = await db.staffProfile.create({
        data: {
          tenantId,
          userId: tc.user.id,
          branchId: tc.branchId!,
          employeeCode: empCode,
          designation: tc.designation,
          department: 'Academics',
          employmentType: 'FULL_TIME',
          status: 'ACTIVE',
          joiningDate: new Date('2024-06-01T00:00:00.000Z'),
        },
      })
      console.log(`Created StaffProfile for ${tc.user.fullName}: ${sp.employeeCode}`)
    } else {
      sp = await db.staffProfile.update({
        where: { id: sp.id },
        data: {
          status: 'ACTIVE',
          designation: tc.designation,
          branchId: tc.branchId!,
        },
      })
      console.log(`Updated StaffProfile for ${tc.user.fullName}: ${sp.employeeCode}`)
    }
    staffProfiles[tc.user.id] = sp
  }

  // 5. Compute Weekdays for the Last 30 Days (Oct 2, 2026 to Nov 1, 2026)
  const weekdays: Date[] = []
  const startDate = new Date('2026-10-02T00:00:00.000Z')
  const endDate = new Date('2026-11-01T00:00:00.000Z')

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay()
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      weekdays.push(new Date(d))
    }
  }
  console.log(`\n✓ Identified ${weekdays.length} school weekdays over the last 30 days.`)

  // 6. Seed Staff Attendance (AttendanceStaff) for All 3 Teachers
  console.log('\n--- Seeding Staff Attendance ---')
  let staffAttendanceCount = 0
  for (const tc of teacherConfigs) {
    const sp = staffProfiles[tc.user.id]
    if (!sp || !tc.branchId) continue

    for (const d of weekdays) {
      const dateOnly = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
      // Random arrival between 08:15 and 08:30 IST (02:45 to 03:00 UTC)
      const minuteOffset = (tc.user.fullName.charCodeAt(0) + d.getDate()) % 15
      const checkIn = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 2, 45 + minuteOffset))
      // Departure between 16:15 and 16:30 IST (10:45 to 11:00 UTC)
      const checkOut = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 10, 45 + minuteOffset))

      await db.attendanceStaff.upsert({
        where: {
          staffProfileId_date: {
            staffProfileId: sp.id,
            date: dateOnly,
          },
        },
        create: {
          tenantId,
          branchId: tc.branchId,
          staffProfileId: sp.id,
          date: dateOnly,
          status: 'PRESENT',
          checkIn,
          checkOut,
          source: 'MANUAL',
          shiftHours: 8.0,
          workedHours: 8.0,
          lateMinutes: 0,
          notes: 'Regular on-duty day',
          markedByName: 'System Auto-Register',
        },
        update: {
          status: 'PRESENT',
          checkIn,
          checkOut,
          workedHours: 8.0,
        },
      })
      staffAttendanceCount++
    }
  }
  console.log(`✓ Upserted ${staffAttendanceCount} staff attendance records for the 3 teachers.`)

  // 7. Map Subjects to All 4 Classrooms
  console.log('\n--- Mapping Subjects to Classrooms ---')
  const subjectDefs: { code: string; name: string; subjectType: 'CORE' | 'OPTIONAL' | 'ACTIVITY'; description: string }[] = [
    { code: 'M1', name: 'Early Numeracy & Shapes', subjectType: 'CORE', description: 'Counting, patterns, shapes' },
    { code: 'E1', name: 'Phonics & Early English', subjectType: 'CORE', description: 'Vowels, vocabulary, story rhymes' },
    { code: 'ART1', name: 'Art & Creative Sensory Play', subjectType: 'ACTIVITY', description: 'Coloring, dough, sensory materials' },
    { code: 'MUS1', name: 'Rhymes, Rhythm & Music', subjectType: 'ACTIVITY', description: 'Singing, musical instruments, rhythm' },
    { code: 'SCI1', name: 'Nature & Sensory Discovery', subjectType: 'ACTIVITY', description: 'Plants, water play, textures' },
  ]

  const subjects: any[] = []
  for (const sDef of subjectDefs) {
    let s = await db.subject.findFirst({
      where: { tenantId, code: sDef.code },
    })
    if (!s) {
      s = await db.subject.create({
        data: {
          tenantId,
          code: sDef.code,
          name: sDef.name,
          subjectType: sDef.subjectType,
          description: sDef.description,
          status: 'ACTIVE',
        },
      })
    }
    subjects.push(s)
  }

  for (const c of classrooms) {
    const assignedTeacherId =
      c.code === 'PLA-D-8J5'
        ? arjunUser.id
        : c.code === 'PG-SEC-3073'
        ? sunitaUser.id
        : meeraUser.id

    for (const sub of subjects) {
      await db.classroomSubject.upsert({
        where: {
          classroomId_subjectId: {
            classroomId: c.id,
            subjectId: sub.id,
          },
        },
        create: {
          tenantId,
          classroomId: c.id,
          subjectId: sub.id,
          specialistTeacherId: assignedTeacherId,
        },
        update: {
          specialistTeacherId: assignedTeacherId,
        },
      })
    }
  }
  console.log(`✓ Mapped 5 subjects across all 4 classrooms with specialist teacher assignments.`)

  // 8. Student Daily Attendance
  console.log('\n--- Seeding Student Daily Attendance ---')
  let studentAttendanceCount = 0
  for (const c of classrooms) {
    const teacherId =
      c.code === 'PLA-D-8J5'
        ? arjunUser.id
        : c.code === 'PG-SEC-3073'
        ? sunitaUser.id
        : meeraUser.id

    for (const s of c.students) {
      for (let i = 0; i < weekdays.length; i++) {
        const d = weekdays[i]
        const dateOnly = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
        const seed = (s.firstName.charCodeAt(0) + i) % 20

        let status: 'PRESENT' | 'ABSENT' | 'LATE' = 'PRESENT'
        let notes: string | null = null

        if (seed === 0) {
          status = 'ABSENT'
          notes = 'Parent notified: mild cold / resting at home'
        } else if (seed === 1) {
          status = 'LATE'
          notes = 'Arrived 09:20 AM'
        }

        await db.attendance.upsert({
          where: {
            studentId_date: {
              studentId: s.id,
              date: dateOnly,
            },
          },
          create: {
            tenantId,
            branchId: c.branchId,
            classroomId: c.id,
            studentId: s.id,
            academicSessionId,
            date: dateOnly,
            status,
            notes,
            markedById: teacherId,
            markedAt: new Date(dateOnly.getTime() + 9 * 3600 * 1000),
          },
          update: {
            status,
            notes,
            markedById: teacherId,
          },
        })
        studentAttendanceCount++
      }
    }
  }
  console.log(`✓ Upserted ${studentAttendanceCount} student attendance records across 50 students.`)

  // 9. Timeline Care & Routine Logs
  console.log('\n--- Seeding Timeline Care & Routine Logs ---')
  const activityTemplates = [
    { title: 'Morning Phonics & Circle Time', body: 'Explored letter sounds and sang phonics rhymes with enthusiasm.', mood: 'HAPPY', type: 'ACTIVITY' as const },
    { title: 'Sensory Sand & Clay Sculpting', body: 'Practiced fine motor coordination shaping animals with soft clay.', mood: 'CONTENT', type: 'ACTIVITY' as const },
    { title: 'Gross Motor Movement & Balance', body: 'Completed the balance beam and two-footed jump game on indoor mat.', mood: 'ENERGETIC', type: 'ACTIVITY' as const },
    { title: 'Color Sorting & Stacking Blocks', body: 'Sorted wooden blocks by primary colors and built tall towers.', mood: 'FOCUSED', type: 'ACTIVITY' as const },
  ]

  let timelineCount = 0
  for (const c of classrooms) {
    const teacherId =
      c.code === 'PLA-D-8J5'
        ? arjunUser.id
        : c.code === 'PG-SEC-3073'
        ? sunitaUser.id
        : meeraUser.id

    for (const s of c.students) {
      // Pick 8 representative school days for detailed daily routine logs
      for (let dayIdx = 0; dayIdx < weekdays.length; dayIdx += 2) {
        const day = weekdays[dayIdx]
        const y = day.getFullYear()
        const m = day.getMonth()
        const dt = day.getDate()

        // Arrival
        await db.timelineEntry.create({
          data: {
            tenantId,
            studentId: s.id,
            classroomId: c.id,
            academicSessionId,
            type: 'ARRIVAL',
            title: 'Morning Welcome & Health Check',
            body: 'Arrived energetic and cheerfully greeted teachers. Health check clear.',
            mood: 'HAPPY',
            authorId: teacherId,
            createdAt: new Date(Date.UTC(y, m, dt, 3, 15)),
          },
        })
        timelineCount++

        // Meal
        await db.timelineEntry.create({
          data: {
            tenantId,
            studentId: s.id,
            classroomId: c.id,
            academicSessionId,
            type: 'MEAL',
            title: 'Morning Snack & Fresh Fruit',
            body: 'Ate sliced apples and warm milk cheerfully. Finished full portion.',
            mood: 'CONTENT',
            authorId: teacherId,
            createdAt: new Date(Date.UTC(y, m, dt, 4, 30)),
          },
        })
        timelineCount++

        // Activity
        const act = activityTemplates[(s.firstName.charCodeAt(0) + dayIdx) % activityTemplates.length]
        await db.timelineEntry.create({
          data: {
            tenantId,
            studentId: s.id,
            classroomId: c.id,
            academicSessionId,
            type: act.type,
            title: act.title,
            body: act.body,
            mood: act.mood,
            authorId: teacherId,
            createdAt: new Date(Date.UTC(y, m, dt, 5, 30)),
          },
        })
        timelineCount++

        // Nap
        await db.timelineEntry.create({
          data: {
            tenantId,
            studentId: s.id,
            classroomId: c.id,
            academicSessionId,
            type: 'NAP',
            title: 'Quiet Nap & Rest Time',
            body: 'Rested peacefully on cot for 75 minutes. Woke up refreshed.',
            mood: 'CALM',
            authorId: teacherId,
            createdAt: new Date(Date.UTC(y, m, dt, 7, 0)),
          },
        })
        timelineCount++

        // Bathroom
        await db.timelineEntry.create({
          data: {
            tenantId,
            studentId: s.id,
            classroomId: c.id,
            academicSessionId,
            type: 'BATHROOM',
            title: 'Assisted Bathroom & Hand Hygiene',
            body: 'Assisted toilet routine followed by independent soapy handwashing.',
            mood: 'CONTENT',
            authorId: teacherId,
            createdAt: new Date(Date.UTC(y, m, dt, 8, 30)),
          },
        })
        timelineCount++

        // Pickup
        await db.timelineEntry.create({
          data: {
            tenantId,
            studentId: s.id,
            classroomId: c.id,
            academicSessionId,
            type: 'PICKUP',
            title: 'Safe Dismissal & Parent Handover',
            body: 'Packed backpack with craft work and handed over safely to parent.',
            mood: 'HAPPY',
            authorId: teacherId,
            createdAt: new Date(Date.UTC(y, m, dt, 9, 45)),
          },
        })
        timelineCount++
      }
    }
  }
  console.log(`✓ Created ${timelineCount} daily routine timeline care entries.`)

  // 10. End-of-Day Daily Reports (DailyReport)
  console.log('\n--- Seeding Daily Reports ---')
  let dailyReportCount = 0
  for (const c of classrooms) {
    const teacherId =
      c.code === 'PLA-D-8J5'
        ? arjunUser.id
        : c.code === 'PG-SEC-3073'
        ? sunitaUser.id
        : meeraUser.id

    for (const s of c.students) {
      for (let dayIdx = 0; dayIdx < weekdays.length; dayIdx += 3) {
        const day = weekdays[dayIdx]
        const dateOnly = new Date(Date.UTC(day.getFullYear(), day.getMonth(), day.getDate()))

        await db.dailyReport.upsert({
          where: {
            tenantId_studentId_reportDate: {
              tenantId,
              studentId: s.id,
              reportDate: dateOnly,
            },
          },
          create: {
            tenantId,
            studentId: s.id,
            classroomId: c.id,
            academicSessionId,
            reportDate: dateOnly,
            status: 'PUBLISHED',
            publishedAt: new Date(dateOnly.getTime() + 15 * 3600 * 1000),
            publishedBy: teacherId,
            attendanceStatus: 'PRESENT',
            summaryText: `${s.firstName} had a wonderful day exploring learning stations and socializing nicely with peers.`,
            activitiesSummary: ['Morning Phonics', 'Clay Modeling', 'Outdoor Movement'],
            mealsSummary: { snack: 'Papaya & Milk', portion: 'All eaten' },
            napSummary: { duration: '75 mins', status: 'Peaceful' },
            parentRecipientsCount: 1,
            notificationStatus: 'SENT',
          },
          update: {
            status: 'PUBLISHED',
            summaryText: `${s.firstName} had a wonderful day exploring learning stations and socializing nicely with peers.`,
          },
        })
        dailyReportCount++
      }
    }
  }
  console.log(`✓ Upserted ${dailyReportCount} end-of-day daily reports.`)

  // 11. Developmental Observations & Milestones
  console.log('\n--- Seeding Developmental Observations ---')
  const observationTemplates = [
    {
      domain: 'LANGUAGE_LITERACY' as const,
      title: 'Vocabulary & Rhyme Engagement',
      narrative: 'Demonstrates clear pronunciation of words during storytelling and joins in reciting phonetic rhymes.',
      milestones: ['Uses 4-5 word sentences', 'Identifies familiar animals by sound'],
    },
    {
      domain: 'COGNITIVE' as const,
      title: 'Shape Sorting & Spatial Awareness',
      narrative: 'Successfully sorts circles, triangles, and squares into shape-sorter box with minimal guidance.',
      milestones: ['Recognizes primary colors', 'Matches geometric shapes'],
    },
    {
      domain: 'FINE_MOTOR' as const,
      title: 'Pincer Grasp & Bead Threading',
      narrative: 'Shows steady hand-eye coordination using thumb and index finger to thread large wooden beads onto string.',
      milestones: ['Mature pincer grasp', 'Threads 3+ beads independently'],
    },
    {
      domain: 'GROSS_MOTOR' as const,
      title: 'Two-Footed Jump & Balance Beam',
      narrative: 'Walked across the low balance beam without stepping off, landing with a steady two-footed hop.',
      milestones: ['Maintains balance on narrow beam', 'Two-footed landing'],
    },
    {
      domain: 'SOCIAL_EMOTIONAL' as const,
      title: 'Sharing Toys & Cooperative Play',
      narrative: 'Shared building blocks with peers during table construction and helped tidy up bins before circle time.',
      milestones: ['Engages in cooperative play', 'Demonstrates classroom tidy-up habits'],
    },
  ]

  let observationCount = 0
  for (const c of classrooms) {
    const teacherId =
      c.code === 'PLA-D-8J5'
        ? arjunUser.id
        : c.code === 'PG-SEC-3073'
        ? sunitaUser.id
        : meeraUser.id

    for (const s of c.students) {
      for (let oIdx = 0; oIdx < 2; oIdx++) {
        const obs = observationTemplates[(s.firstName.charCodeAt(0) + oIdx) % observationTemplates.length]
        const obsDate = weekdays[oIdx * 4] || weekdays[0]

        await db.observation.create({
          data: {
            tenantId,
            studentId: s.id,
            classroomId: c.id,
            teacherId,
            academicSessionId,
            category: obs.domain,
            narrative: `${obs.title}: ${s.firstName} ${obs.narrative}`,
            milestoneTags: obs.milestones.join(', '),
            observedAt: obsDate,
            publishedAt: obsDate,
            status: 'PUBLISHED',
            concern: 'NORMAL',
          },
        })
        observationCount++
      }
    }
  }
  console.log(`✓ Created ${observationCount} published developmental observations.`)

  // 12. Classroom Activities
  console.log('\n--- Seeding Classroom Activities ---')
  const classroomActivityDefs = [
    { title: 'Autumn Leaves Sensory Tray', desc: 'Explored crisp dry leaves, pinecones, and textured bark with magnifiers.' },
    { title: 'Montessori Wooden Cylinder Blocks', desc: 'Seriated cylinders by height and diameter to develop spatial discernment.' },
    { title: 'Primary Colors Water Splashing & Mixing', desc: 'Poured colored water to observe red and blue mix into purple.' },
    { title: 'Animal Sound Storytelling Circle', desc: 'Interactive puppet storytelling highlighting jungle and farm sounds.' },
    { title: 'Obstacle Course Motor Crawl & Hop', desc: 'Crawled through soft tunnel, hopped on number mats, and tossed beanbag.' },
  ]

  let activityCount = 0
  for (const c of classrooms) {
    const teacherId =
      c.code === 'PLA-D-8J5'
        ? arjunUser.id
        : c.code === 'PG-SEC-3073'
        ? sunitaUser.id
        : meeraUser.id

    for (let aIdx = 0; aIdx < classroomActivityDefs.length; aIdx++) {
      const act = classroomActivityDefs[aIdx]
      const scheduledDate = weekdays[aIdx * 3] || weekdays[0]

      await db.classroomActivity.create({
        data: {
          tenantId,
          classroomId: c.id,
          academicSessionId,
          title: act.title,
          description: act.desc,
          teacherId,
          activityDate: scheduledDate,
          status: 'COMPLETED',
          expectedOutcome: 'Sensory enrichment, cognitive classification, peer socialization',
          materials: 'Sensory bins, wooden manipulatives, natural leaves, child-safe mats',
        },
      })
      activityCount++
    }
  }
  console.log(`✓ Created ${activityCount} completed classroom activities.`)

  // 13. Transport Seed: Vehicles, Drivers, Routes, Stops, Assignments, and Trips
  console.log('\n--- Seeding Transport System ---')
  const branches = await db.branch.findMany({ where: { tenantId } })

  for (const b of branches) {
    // 1. Vehicle
    const reg = `MH-BUS-${b.id.slice(0, 4).toUpperCase()}-2026`
    let veh = await db.vehicle.findFirst({ where: { tenantId, registrationNumber: reg } })
    if (!veh) {
      veh = await db.vehicle.findFirst({ where: { tenantId, branchId: b.id } })
    }
    if (!veh) {
      veh = await db.vehicle.create({
        data: {
          tenantId,
          branchId: b.id,
          registrationNumber: reg,
          vehicleType: 'BUS',
          makeModel: 'Force Traveller School Bus',
          capacity: 22,
          status: 'ACTIVE',
        },
      })
    }

    // 2. Driver StaffProfile
    const driverCode = `DRV-${b.id.slice(0, 4).toUpperCase()}-01`
    let driver = await db.staffProfile.findFirst({
      where: { tenantId, employeeCode: driverCode },
    })
    if (!driver) {
      driver = await db.staffProfile.findFirst({
        where: { tenantId, branchId: b.id, designation: { contains: 'Driver' } },
      })
    }
    if (!driver) {
      const driverName = b.name.includes('Pune') ? 'Ramesh Shinde' : b.name.includes('2nd') ? 'Suresh Patil' : 'Ganesh Pawar'
      const driverEmail = `${driverCode.toLowerCase()}@sunshine.demo`

      let driverUser = await db.user.findFirst({ where: { email: driverEmail } })
      if (!driverUser) {
        driverUser = await db.user.create({
          data: {
            fullName: driverName,
            email: driverEmail,
            username: driverCode.toLowerCase(),
            passwordHash,
            status: 'ACTIVE',
          },
        })
      }
      await db.tenantUser.upsert({
        where: {
          tenantId_userId: {
            tenantId,
            userId: driverUser.id,
          },
        },
        create: {
          tenantId,
          userId: driverUser.id,
          branchId: b.id,
          role: 'STAFF',
          roles: ['STAFF'],
          status: 'ACTIVE',
        },
        update: {
          role: 'STAFF',
          roles: ['STAFF'],
          status: 'ACTIVE',
        },
      })

      driver = await db.staffProfile.create({
        data: {
          tenantId,
          userId: driverUser.id,
          branchId: b.id,
          employeeCode: driverCode,
          designation: 'School Bus Driver',
          department: 'Transport',
          employmentType: 'FULL_TIME',
          status: 'ACTIVE',
          joiningDate: new Date('2024-01-01'),
        },
      })
    }

    // 3. Transport Route
    const routeCode = `RT-${b.id.slice(0, 4).toUpperCase()}-01`
    let route = await db.transportRoute.findFirst({
      where: { tenantId, code: routeCode },
    })
    if (!route) {
      route = await db.transportRoute.create({
        data: {
          tenantId,
          branchId: b.id,
          code: routeCode,
          name: `${b.name} Express Route`,
          status: 'ACTIVE',
          description: `Serves residential hubs around ${b.name}`,
          vehicleId: veh.id,
          driverProfileId: driver.id,
        },
      })
    }

    // 4. Route Stops
    let stops = await db.routeStop.findMany({ where: { routeId: route.id } })
    if (stops.length === 0) {
      const stop1 = await db.routeStop.create({
        data: {
          tenantId,
          routeId: route.id,
          name: 'Greenwoods Residential Gate',
          landmark: 'Opposite Community Clubhouse',
          sequence: 1,
          morningPickupTime: '08:00',
          eveningDropTime: '15:15',
          status: 'ACTIVE',
        },
      })
      const stop2 = await db.routeStop.create({
        data: {
          tenantId,
          routeId: route.id,
          name: 'Palm Meadows Junction',
          landmark: 'Near Floral Circle',
          sequence: 2,
          morningPickupTime: '08:15',
          eveningDropTime: '15:30',
          status: 'ACTIVE',
        },
      })
      stops = [stop1, stop2]
    }

    // 5. Student Transport Assignments
    const branchClassrooms = classrooms.filter((c) => c.branchId === b.id)
    for (const bc of branchClassrooms) {
      for (let sIdx = 0; sIdx < bc.students.length; sIdx++) {
        // Assign roughly 60% of students
        if (sIdx % 2 === 0) {
          const s = bc.students[sIdx]
          const existingAssignment = await db.studentTransportAssignment.findFirst({
            where: { tenantId, studentId: s.id },
          })
          if (!existingAssignment) {
            await db.studentTransportAssignment.create({
              data: {
                tenantId,
                branchId: b.id,
                academicSessionId,
                studentId: s.id,
                routeId: route.id,
                pickupStopId: stops[0].id,
                dropStopId: stops[1].id,
                tripType: 'TWO_WAY',
                startDate: new Date('2026-06-01'),
                status: 'ACTIVE',
                monthlyFeeCents: 250000,
              },
            })
          }
        }
      }
    }

    // 6. Daily Transport Trips (Morning & Evening)
    for (const day of weekdays) {
      const dateOnly = new Date(Date.UTC(day.getFullYear(), day.getMonth(), day.getDate()))

      // Morning Trip
      const morningStart = new Date(Date.UTC(day.getFullYear(), day.getMonth(), day.getDate(), 2, 30))
      const morningEnd = new Date(Date.UTC(day.getFullYear(), day.getMonth(), day.getDate(), 3, 15))
      await db.transportTrip.upsert({
        where: {
          tenantId_routeId_tripDate_tripType: {
            tenantId,
            routeId: route.id,
            tripDate: dateOnly,
            tripType: 'MORNING',
          },
        },
        create: {
          tenantId,
          branchId: b.id,
          routeId: route.id,
          vehicleId: veh.id,
          driverProfileId: driver.id,
          tripDate: dateOnly,
          tripType: 'MORNING',
          status: 'COMPLETED',
          scheduledStartTime: '08:00',
          actualStartTime: morningStart,
          actualEndTime: morningEnd,
          delayMinutes: 0,
          notes: 'Smooth morning pickup, all assigned children onboarded safely.',
        },
        update: {
          status: 'COMPLETED',
          actualStartTime: morningStart,
          actualEndTime: morningEnd,
        },
      })

      // Afternoon Drop
      const dropStart = new Date(Date.UTC(day.getFullYear(), day.getMonth(), day.getDate(), 9, 30))
      const dropEnd = new Date(Date.UTC(day.getFullYear(), day.getMonth(), day.getDate(), 10, 15))
      await db.transportTrip.upsert({
        where: {
          tenantId_routeId_tripDate_tripType: {
            tenantId,
            routeId: route.id,
            tripDate: dateOnly,
            tripType: 'EVENING',
          },
        },
        create: {
          tenantId,
          branchId: b.id,
          routeId: route.id,
          vehicleId: veh.id,
          driverProfileId: driver.id,
          tripDate: dateOnly,
          tripType: 'EVENING',
          status: 'COMPLETED',
          scheduledStartTime: '15:00',
          actualStartTime: dropStart,
          actualEndTime: dropEnd,
          delayMinutes: 0,
          notes: 'Safe afternoon drop to verified guardians.',
        },
        update: {
          status: 'COMPLETED',
          actualStartTime: dropStart,
          actualEndTime: dropEnd,
        },
      })
    }
    console.log(`✓ Configured Route, Vehicle, Stops, Assignments & Trips for branch: ${b.name}`)
  }

  // 14. Academic Progress & Report Cards
  console.log('\n--- Seeding Report Cards ---')
  // Ensure a DocumentTemplate for Report Card exists
  let reportCardTemplate = await db.documentTemplate.findFirst({
    where: { tenantId, type: 'REPORT_CARD' },
  })
  if (!reportCardTemplate) {
    reportCardTemplate = await db.documentTemplate.create({
      data: {
        tenantId,
        type: 'REPORT_CARD',
        name: 'Early Years Holistic Progress Report',
        content: { title: 'Early Years Holistic Progress Report', layout: 'preschool_term_v1' },
        isDefault: true,
      },
    })
  }

  let reportCardCount = 0
  for (const c of classrooms) {
    const teacher =
      c.code === 'PLA-D-8J5'
        ? arjunUser
        : c.code === 'PG-SEC-3073'
        ? sunitaUser
        : meeraUser

    for (const s of c.students) {
      await db.studentReportCard.upsert({
        where: {
          tenantId_academicSessionId_term_studentId_templateId: {
            tenantId,
            academicSessionId,
            term: 'TERM_1',
            studentId: s.id,
            templateId: reportCardTemplate.id,
          },
        },
        create: {
          tenantId,
          branchId: c.branchId,
          academicSessionId,
          studentId: s.id,
          classroomId: c.id,
          term: 'TERM_1',
          templateId: reportCardTemplate.id,
          status: 'PUBLISHED',
          evaluatorId: teacher.id,
          evaluatorName: teacher.fullName,
          overallGrade: 'EXCELLENT',
          attendancePct: 96,
          remarks: `${s.firstName} has adapted beautifully to preschool life, displaying strong curiosity, friendly peer relationships, and commendable listening habits.`,
          fieldValues: {
            language: { label: 'Language & Literacy', type: 'grade', value: 'Exceeding' },
            motor: { label: 'Motor Development', type: 'grade', value: 'Achieving' },
            social: { label: 'Social & Emotional', type: 'grade', value: 'Exceeding' },
          },
          publishedAt: new Date('2026-10-30T10:00:00.000Z'),
          publishedById: teacher.id,
          publishedByName: teacher.fullName,
        },
        update: {
          status: 'PUBLISHED',
          evaluatorName: teacher.fullName,
          overallGrade: 'EXCELLENT',
          attendancePct: 96,
        },
      })
      reportCardCount++
    }
  }
  console.log(`✓ Upserted ${reportCardCount} published Student Report Cards for Term 1 across all students.`)

  console.log('\n========================================================================')
  console.log('=== ALL 30-DAY OPERATIONAL DATA SUCCESSFULLY GENERATED FOR ALL 3 TEACHERS ===')
  console.log('========================================================================')
}

seedAllTeachersAndStudentsActivities()
  .catch((err) => {
    console.error('Seed script failed:', err)
    process.exit(1)
  })
  .finally(() => {
    process.exit(0)
  })
