import { db } from '../src/lib/db'

async function seedTeacherActivities() {
  console.log('=== SEEDING COMPREHENSIVE 30-DAY ACTIVITIES FOR TEACHER MEERA NAMBIAR ===')

  const teacher = await db.user.findFirst({
    where: { email: 'teacher.main.multirole@sunshine.demo' },
    include: { memberships: true },
  })
  if (!teacher) {
    throw new Error('Teacher Meera Nambiar not found!')
  }
  const teacherId = teacher.id

  const tenantId = teacher.memberships[0]?.tenantId
  if (!tenantId) {
    throw new Error('Teacher has no tenant membership!')
  }
  const tenant = await db.tenant.findUnique({ where: { id: tenantId } })
  if (!tenant) {
    throw new Error(`Tenant ${tenantId} not found!`)
  }
  console.log('Tenant:', tenant.name, `(${tenant.code})`)

  const currentSession = await db.academicSession.findFirst({
    where: { tenantId, isCurrent: true },
  })
  if (!currentSession) {
    throw new Error('Current academic session not found!')
  }
  const academicSessionId = currentSession.id
  console.log('Academic Session:', currentSession.name, `(${academicSessionId})`)

  // 1. Fetch Teacher's Taught Classrooms
  const classes = await db.classroom.findMany({
    where: { primaryTeacherId: teacherId },
    include: {
      students: { where: { status: 'ACTIVE', deletedAt: null } },
      program: true,
    },
  })

  if (classes.length === 0) {
    throw new Error('No classrooms assigned to Teacher Meera Nambiar!')
  }

  console.log(`Teacher Meera teaches ${classes.length} classrooms:`)
  for (const c of classes) {
    console.log(`- ${c.name} (${c.code}): ${c.students.length} students, Branch: ${c.branchId}`)
  }

  // 2. Ensure Rich Subjects & Assign to Classrooms
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
      console.log(`Created subject: ${s.name} (${s.code})`)
    }
    subjects.push(s)
  }

  // Map subjects to both classrooms with Meera as specialist teacher
  for (const c of classes) {
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
          specialistTeacherId: teacherId,
        },
        update: {
          specialistTeacherId: teacherId,
        },
      })
    }
  }
  console.log(`✓ Mapped ${subjects.length} subjects to all taught classrooms with Meera as assigned teacher.`)

  // 3. Compute the Weekdays of the Last 30 Days (Oct 2, 2026 to Nov 1, 2026)
  const weekdays: Date[] = []
  const startDate = new Date('2026-10-02T00:00:00.000Z')
  const endDate = new Date('2026-11-01T00:00:00.000Z')

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay()
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      // Monday to Friday
      weekdays.push(new Date(d))
    }
  }
  console.log(`✓ Identified ${weekdays.length} school weekdays over the last 30 days.`)

  // 4. Generate Daily Attendance
  let attendanceCount = 0
  for (const c of classes) {
    for (const student of c.students) {
      for (let i = 0; i < weekdays.length; i++) {
        const date = weekdays[i]
        // Pseudo-random status based on student index and day
        const seed = (student.firstName.charCodeAt(0) + i) % 20
        let status: 'PRESENT' | 'ABSENT' | 'LATE' = 'PRESENT'
        let notes: string | null = null

        if (seed === 0) {
          status = 'ABSENT'
          notes = 'Parent notified: mild seasonal cold'
        } else if (seed === 1) {
          status = 'LATE'
          notes = 'Arrived 9:15 AM — morning rain delay'
        }

        const dateOnly = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))

        await db.attendance.upsert({
          where: {
            studentId_date: {
              studentId: student.id,
              date: dateOnly,
            },
          },
          create: {
            tenantId,
            branchId: c.branchId,
            classroomId: c.id,
            studentId: student.id,
            academicSessionId,
            date: dateOnly,
            status,
            notes,
            markedById: teacherId,
            markedAt: new Date(dateOnly.getTime() + 9 * 3600 * 1000), // 9:00 AM
          },
          update: {
            status,
            notes,
            markedById: teacherId,
          },
        })
        attendanceCount++
      }
    }
  }
  console.log(`✓ Upserted ${attendanceCount} daily attendance records marked by Meera Nambiar.`)

  // 5. Generate Daily Care & Timeline Entries for Each School Day
  const activityTemplates = [
    {
      title: 'Morning Phonics & Story Circle',
      body: 'Sang the Jolly Phonics vowel songs together. Engaged actively in animal story narration.',
      mood: 'HAPPY',
      type: 'ACTIVITY' as const,
    },
    {
      title: 'Sensory Clay & Fine Motor Play',
      body: 'Explored soft clay modeling with child-safe rolling pins. Practiced pincer grasp.',
      mood: 'EXCITED',
      type: 'ACTIVITY' as const,
    },
    {
      title: 'Outdoor Gross Motor Movement',
      body: 'Hopping, beam balance walking, and soft ball throw in the indoor turf play area.',
      mood: 'ENERGETIC',
      type: 'ACTIVITY' as const,
    },
    {
      title: 'Color Sorting & Shape Puzzles',
      body: 'Sorted wooden blocks by primary colors (red, blue, yellow) and matched circle/square pegs.',
      mood: 'FOCUSED',
      type: 'ACTIVITY' as const,
    },
  ]

  let timelineCount = 0
  for (const c of classes) {
    for (const student of c.students) {
      // Pick 8 representative school days across the month for detailed care logs per student
      for (let dayIdx = 0; dayIdx < weekdays.length; dayIdx += 2) {
        const day = weekdays[dayIdx]
        const y = day.getFullYear()
        const m = day.getMonth()
        const dt = day.getDate()

        // 1. Arrival (08:45 AM)
        await db.timelineEntry.create({
          data: {
            tenantId,
            studentId: student.id,
            classroomId: c.id,
            academicSessionId,
            type: 'ARRIVAL',
            title: 'Morning Welcome & Health Check',
            body: 'Arrived cheerful with a warm smile. Temperature normal, bags neatly hung.',
            mood: 'HAPPY',
            authorId: teacherId,
            createdAt: new Date(Date.UTC(y, m, dt, 3, 15)), // 08:45 IST
          },
        })
        timelineCount++

        // 2. Morning Snack (10:00 AM)
        await db.timelineEntry.create({
          data: {
            tenantId,
            studentId: student.id,
            classroomId: c.id,
            academicSessionId,
            type: 'MEAL',
            title: 'Morning Snack Time',
            body: 'Ate fresh cut papaya and whole-grain pancakes. Drank warm milk independently.',
            mood: 'CONTENT',
            authorId: teacherId,
            createdAt: new Date(Date.UTC(y, m, dt, 4, 30)), // 10:00 IST
          },
        })
        timelineCount++

        // 3. Learning Activity (10:45 AM)
        const act = activityTemplates[(student.firstName.charCodeAt(0) + dayIdx) % activityTemplates.length]
        await db.timelineEntry.create({
          data: {
            tenantId,
            studentId: student.id,
            classroomId: c.id,
            academicSessionId,
            type: act.type,
            title: act.title,
            body: act.body,
            mood: act.mood,
            authorId: teacherId,
            createdAt: new Date(Date.UTC(y, m, dt, 5, 15)), // 10:45 IST
          },
        })
        timelineCount++

        // 4. Nap / Rest Time (12:30 PM)
        await db.timelineEntry.create({
          data: {
            tenantId,
            studentId: student.id,
            classroomId: c.id,
            academicSessionId,
            type: 'NAP',
            title: 'Rest & Quiet Time',
            body: 'Restful 40-minute nap on designated cot with soft instrumental music playing.',
            mood: 'CALM',
            authorId: teacherId,
            createdAt: new Date(Date.UTC(y, m, dt, 7, 0)), // 12:30 IST
          },
        })
        timelineCount++

        // 5. Departure & Safe Pickup (01:15 PM)
        await db.timelineEntry.create({
          data: {
            tenantId,
            studentId: student.id,
            classroomId: c.id,
            academicSessionId,
            type: 'PICKUP',
            title: 'Home Departure & Handover',
            body: 'Handed over safely to authorized guardian. Handled farewell routine happily.',
            mood: 'HAPPY',
            authorId: teacherId,
            createdAt: new Date(Date.UTC(y, m, dt, 7, 45)), // 13:15 IST
          },
        })
        timelineCount++
      }
    }
  }
  console.log(`✓ Created ${timelineCount} daily timeline care entries authored by Meera Nambiar.`)

  // 6. Generate Teacher Observations (2-3 detailed ECE observations per student)
  const observationNarratives = [
    {
      category: 'COGNITIVE',
      milestoneTags: 'color-sorting,shape-recognition',
      narrative: 'Demonstrates great confidence in sorting primary color blocks. Grouped red and yellow balls accurately without educator prompting.',
    },
    {
      category: 'LANGUAGE_LITERACY',
      milestoneTags: 'phonics-sounds,speech-clarity',
      narrative: 'Repeated vowel sounds cleanly during our morning rhyme circle. Enjoys expressive roleplay with animal finger puppets.',
    },
    {
      category: 'FINE_MOTOR',
      milestoneTags: 'pincer-grasp,bead-stringing',
      narrative: 'Successfully threaded 6 large wooden beads onto a shoelace string. Shows strong hand-eye coordination and persistent patience.',
    },
    {
      category: 'SOCIAL_EMOTIONAL',
      milestoneTags: 'peer-sharing,empathy',
      narrative: 'Comforted a classmate who dropped their crayon box and shared their own coloring sheet. Shows emerging emotional awareness and empathy.',
    },
    {
      category: 'GROSS_MOTOR',
      milestoneTags: 'balance-beam,hopping',
      narrative: 'Navigated the low balance foam beam with steady balance and hopped on two feet across 4 floor markers.',
    },
  ]

  let observationCount = 0
  for (const c of classes) {
    for (let sIdx = 0; sIdx < c.students.length; sIdx++) {
      const student = c.students[sIdx]
      // Create 2 observations across October for each student
      const dates = [
        new Date('2026-10-08T11:00:00.000Z'),
        new Date('2026-10-22T11:00:00.000Z'),
      ]

      for (let oIdx = 0; oIdx < dates.length; oIdx++) {
        const obsData = observationNarratives[(sIdx + oIdx) % observationNarratives.length]
        const obsDate = dates[oIdx]

        const obs = await db.observation.create({
          data: {
            tenantId,
            studentId: student.id,
            classroomId: c.id,
            teacherId,
            academicSessionId,
            category: obsData.category,
            narrative: obsData.narrative,
            milestoneTags: obsData.milestoneTags,
            concern: 'NORMAL',
            status: 'PUBLISHED',
            observedAt: obsDate,
            publishedAt: obsDate,
          },
        })

        // Also link to timeline entry as milestone
        await db.timelineEntry.create({
          data: {
            tenantId,
            studentId: student.id,
            classroomId: c.id,
            academicSessionId,
            type: 'MILESTONE',
            title: `Developmental Milestone: ${obsData.category.replaceAll('_', ' ')}`,
            body: obsData.narrative,
            authorId: teacherId,
            observationId: obs.id,
            createdAt: obsDate,
          },
        })

        observationCount++
      }
    }
  }
  console.log(`✓ Created ${observationCount} published developmental observations with linked milestones.`)

  // 7. Generate Classroom Activities (12 curriculum activities conducted across October)
  const curriculumActivities = [
    {
      title: 'Autumn Colors Collage',
      description: 'Collect and paste red, orange, and golden autumn leaves on card paper.',
      materials: 'Dried leaves, child-safe glue sticks, chart paper',
      instructions: 'Guide children to feel leaf textures and stick them inside leaf outlines.',
      expectedOutcome: 'Tactile sensory exploration and color differentiation.',
      durationMinutes: 30,
      daysAgo: 25,
    },
    {
      title: 'Water Play & Floating Objects',
      description: 'Hands-on water tub experiment testing floating leaves vs sinking pebbles.',
      materials: 'Water sensory tub, foam shapes, wooden twigs, clean pebbles',
      instructions: 'Children drop objects one by one and observe buoyancy.',
      expectedOutcome: 'Basic scientific curiosity and cause-and-effect understanding.',
      durationMinutes: 35,
      daysAgo: 20,
    },
    {
      title: 'Story Acting: The Very Hungry Caterpillar',
      description: 'Interactive puppet storytelling where children feed the caterpillar fruit puppets.',
      materials: 'Hand puppets, laminated fruit cutouts, felt story board',
      instructions: 'Lead teacher narrates; children count fruits as caterpillar eats.',
      expectedOutcome: 'Vocabulary expansion, sequence memory, and counting to 5.',
      durationMinutes: 40,
      daysAgo: 16,
    },
    {
      title: 'Soft Clay Sculpting & Cookie Cutters',
      description: 'Squishing, pounding, and rolling homemade playdough with star and animal cutters.',
      materials: 'Organic non-toxic playdough, plastic rolling pins, cookie cutters',
      instructions: 'Demonstrate flattening dough and stamping animal shapes.',
      expectedOutcome: 'Hand strength, palm arches, and fine motor coordination.',
      durationMinutes: 30,
      daysAgo: 12,
    },
    {
      title: 'Animal Movement Obstacle Course',
      description: 'Hop like frogs, walk like bears, and balance like flamingos over soft floor mats.',
      materials: 'Foam stepping stones, low gym mats, soft cones',
      instructions: 'Demonstrate animal postures; encourage children to follow in small groups.',
      expectedOutcome: 'Gross motor agility, spatial awareness, and listening skills.',
      durationMinutes: 30,
      daysAgo: 7,
    },
    {
      title: 'Finger Painting Rainbow Arcs',
      description: 'Dipping finger pads in washable organic paints to form vibrant rainbow arches.',
      materials: 'Washable tempera paint, large textured paper, damp sponges',
      instructions: 'Encourage using different fingers for red, yellow, and blue colors.',
      expectedOutcome: 'Bilateral coordination, creative joy, and color mixing awareness.',
      durationMinutes: 35,
      daysAgo: 3,
    },
  ]

  let classActCount = 0
  for (const c of classes) {
    for (const act of curriculumActivities) {
      const actDate = new Date(Date.now() - act.daysAgo * 24 * 3600 * 1000)
      await db.classroomActivity.create({
        data: {
          tenantId,
          academicSessionId,
          classroomId: c.id,
          teacherId,
          title: act.title,
          description: act.description,
          activityDate: actDate,
          startTime: '10:30 AM',
          endTime: '11:05 AM',
          durationMinutes: act.durationMinutes,
          materials: act.materials,
          instructions: act.instructions,
          expectedOutcome: act.expectedOutcome,
          actualOutcome: 'All children participated enthusiastically and completed their artwork.',
          status: 'PLANNED',
          createdBy: teacherId,
        },
      })
      classActCount++
    }
  }
  console.log(`✓ Created ${classActCount} classroom curriculum activities conducted by Meera Nambiar.`)

  console.log('=== SEEDING COMPLETED SUCCESSFULLY ===')
}

seedTeacherActivities()
  .catch((e) => {
    console.error('Error seeding teacher activities:', e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
