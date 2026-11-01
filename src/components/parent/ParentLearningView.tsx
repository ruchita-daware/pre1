'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  BookOpen,
  Sparkles,
  Calendar,
  CheckCircle2,
  Clock,
  Play,
  Layers,
  ChevronRight,
  Brain,
  Palette,
  HeartHandshake,
  Compass,
  ArrowRight,
  Filter,
  Check,
  Music,
  Gamepad2,
  BookMarked,
  GraduationCap,
  AlertCircle,
  RefreshCw,
  FolderSync,
} from 'lucide-react'
import { PageHead, StatusBadge, EmptyState, Skeleton, KpiTile } from '@/components/preone/ui'
import { ParentStudentSelector } from '@/components/parent/ParentStudentSelector'
import { useParentStudents } from '@/lib/parent/use-parent-students'
import {
  Courses3DIcon,
  Rhymes3DIcon,
  Stories3DIcon,
  Games3DIcon,
} from '@/app/app/learning/Learning3DIcons'
import {
  EnglishSubjectIllustration,
  MathSubjectIllustration,
  EVSSubjectIllustration,
  CreativitySubjectIllustration,
} from '@/app/app/learning/SubjectIllustrations'
import { SharedMediaPlayer, MediaItem } from '@/app/app/learning/SharedMediaPlayer'
import { fmtDate } from '@/lib/format'

interface ActivityItem {
  id: string
  title: string
  activityType: string
  status: string
  description: string | null
  date: string
  classroomName?: string | null
  learningGoalName?: string | null
}

interface GoalProgress {
  id: string
  goalId: string
  goalName: string
  areaName: string
  stage: 'EMERGING' | 'DEVELOPING' | 'ACHIEVED' | 'EXTENDING'
  notes?: string | null
  updatedAt: string
}

export function ParentLearningView({ session }: { session?: any }) {
  const { students, selectedStudentId, selectedStudent, selectStudent, loading: loadingStudents } = useParentStudents()
  const [activeTab, setActiveTab] = useState<'child_learning' | 'library'>('child_learning')

  // Child Learning data states
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [progress, setProgress] = useState<GoalProgress[]>([])
  const [loadingChildData, setLoadingChildData] = useState(false)
  const [childError, setChildError] = useState<string | null>(null)

  // PreO Library states
  const [selectedCategory, setSelectedCategory] = useState<'courses' | 'rhymes' | 'stories' | 'games' | null>(null)
  const [activePlayItem, setActivePlayItem] = useState<MediaItem | null>(null)

  // 1. Fetch child learning data when selected child changes
  const fetchChildLearning = useCallback(async (studentId: string) => {
    try {
      setLoadingChildData(true)
      setChildError(null)

      const [resProgress, resActivities] = await Promise.all([
        fetch(`/api/v1/academics/students/${encodeURIComponent(studentId)}/progress`).then((r) => r.json()).catch(() => ({ success: false, data: [] })),
        fetch('/api/v1/academics/activities').then((r) => r.json()).catch(() => ({ success: false, data: [] })),
      ])

      if (resProgress.success && Array.isArray(resProgress.data)) {
        setProgress(
          resProgress.data.map((p: any) => ({
            id: p.id || p.learningGoalId,
            goalId: p.learningGoalId,
            goalName: p.learningGoal?.name || p.goalName || 'Learning Milestone',
            areaName: p.learningGoal?.learningArea?.name || p.areaName || 'Developmental Area',
            stage: p.stage || 'DEVELOPING',
            notes: p.notes || null,
            updatedAt: p.updatedAt || new Date().toISOString(),
          }))
        )
      } else {
        setProgress([])
      }

      if (resActivities.success && Array.isArray(resActivities.data)) {
        setActivities(
          resActivities.data.map((a: any) => ({
            id: a.id,
            title: a.title,
            activityType: a.activityType,
            status: a.status,
            description: a.description,
            date: a.date,
            classroomName: a.classroom?.name || null,
            learningGoalName: a.learningGoal?.name || null,
          }))
        )
      } else {
        setActivities([])
      }
    } catch (err: any) {
      setChildError(err?.message || 'Network error loading child learning profile.')
    } finally {
      setLoadingChildData(false)
    }
  }, [])

  useEffect(() => {
    if (selectedStudentId) {
      fetchChildLearning(selectedStudentId)
    }
  }, [selectedStudentId, fetchChildLearning])

  // Curated learning media resources for preschool parents
  const SAMPLE_MEDIA: Record<'courses' | 'rhymes' | 'stories' | 'games', MediaItem[]> = {
    courses: [
      { id: 'c1', title: 'Phonics & Alphabet Sounds (A to Z)', type: 'audio', duration: '5 mins', source: '/audio/phonics_alphabet.mp3', subject: 'English', thumbnail: '/images/learning/phonics.webp' },
      { id: 'c2', title: 'Counting 1 to 20 with Preschool Rhyme', type: 'audio', duration: '4 mins', source: '/audio/counting_song.mp3', subject: 'Mathematics', thumbnail: '/images/learning/numbers.webp' },
      { id: 'c3', title: 'Colors, Shapes & Patterns Around Us', type: 'video', duration: '6 mins', source: '/video/shapes_patterns.mp4', subject: 'EVS', thumbnail: '/images/learning/shapes.webp' },
      { id: 'c4', title: 'Creative Fingerprint & Sponge Painting', type: 'document', duration: 'Self-paced', source: '/docs/sponge_painting_guide.pdf', subject: 'Creativity', thumbnail: '/images/learning/art.webp' },
    ],
    rhymes: [
      { id: 'r1', title: 'Twinkle Twinkle Little Star (Acoustic)', type: 'audio', duration: '2:15', source: '/audio/twinkle.mp3', thumbnail: '/images/learning/rhyme_star.webp' },
      { id: 'r2', title: 'Wheels on the Bus Go Round and Round', type: 'audio', duration: '2:40', source: '/audio/bus_wheels.mp3', thumbnail: '/images/learning/rhyme_bus.webp' },
      { id: 'r3', title: 'Old MacDonald Had a Farm (Animal Sounds)', type: 'audio', duration: '3:05', source: '/audio/macdonald.mp3', thumbnail: '/images/learning/rhyme_farm.webp' },
    ],
    stories: [
      { id: 's1', title: 'The Friendly Caterpillar Who Loved Colors', type: 'audio', duration: '4:20', source: '/audio/story_caterpillar.mp3', thumbnail: '/images/learning/story_caterpillar.webp' },
      { id: 's2', title: 'The Lion and the Little Mouse (Sharing & Kindness)', type: 'audio', duration: '3:45', source: '/audio/story_lion.mp3', thumbnail: '/images/learning/story_lion.webp' },
    ],
    games: [
      { id: 'g1', title: 'Animal Sound Detective (Match the Sound)', type: 'interactive', duration: 'Play', source: '/games/sound_detective.html', thumbnail: '/images/learning/game_sounds.webp' },
      { id: 'g2', title: 'Color Balloon Pop (Preschool Reflexes)', type: 'interactive', duration: 'Play', source: '/games/balloon_pop.html', thumbnail: '/images/learning/game_balloons.webp' },
    ],
  }

  return (
    <div className="page-shell max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* ── Page Header & Student Selector ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border/50">
        <div>
          <PageHead
            title="PreO Learning & Development"
            subtitle="Follow your child's pre-work activities, developmental milestones, and explore playful learning resources."
          />
        </div>
        <div>
          <ParentStudentSelector
            students={students}
            selectedStudentId={selectedStudentId}
            onSelectStudent={selectStudent}
          />
        </div>
      </div>

      {/* ── Navigation Tabs: Child Learning vs PreO Library ── */}
      <div className="flex items-center gap-2 border-b border-border/70 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('child_learning')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
            activeTab === 'child_learning'
              ? 'bg-purple-600 text-white shadow-2xs'
              : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <GraduationCap size={15} />
          <span>My Child's Activities & Goals</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('library')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
            activeTab === 'library'
              ? 'bg-purple-600 text-white shadow-2xs'
              : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <Sparkles size={15} />
          <span>PreO Learning Library</span>
        </button>
      </div>

      {activeTab === 'child_learning' ? (
        <div className="space-y-6">
          {loadingChildData ? (
            <div className="space-y-4">
              <div className="h-32 rounded-2xl bg-muted/30 animate-pulse border border-border/40" />
              <div className="h-64 rounded-2xl bg-muted/30 animate-pulse border border-border/40" />
            </div>
          ) : childError ? (
            <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 p-4 rounded-2xl text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{childError}</span>
            </div>
          ) : (
            <>
              {/* ── Summary Cards ── */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-2xs flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-300 flex items-center justify-center shrink-0">
                    <BookOpen size={20} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-foreground font-mono">{activities.length}</div>
                    <div className="text-xs text-muted-foreground font-medium">Class Learning Activities</div>
                  </div>
                </div>

                <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-2xs flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 flex items-center justify-center shrink-0">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-foreground font-mono">
                      {progress.filter((p) => p.stage === 'ACHIEVED' || p.stage === 'EXTENDING').length}
                    </div>
                    <div className="text-xs text-muted-foreground font-medium">Milestones Achieved</div>
                  </div>
                </div>

                <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-2xs flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 flex items-center justify-center shrink-0">
                    <Brain size={20} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-foreground font-mono">{progress.length}</div>
                    <div className="text-xs text-muted-foreground font-medium">Observed Learning Goals</div>
                  </div>
                </div>
              </div>

              {/* ── Section: Classroom Activities & Pre-work ── */}
              <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-border/50">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <BookOpen size={16} className="text-purple-600 dark:text-purple-400" />
                    <span>Scheduled Classroom Activities & Pre-Work</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    Activities planned for {selectedStudent?.name || 'your child'}&apos;s classroom
                  </span>
                </div>

                {activities.length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted-foreground">
                    No classroom learning activities are currently scheduled for this term.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {activities.map((act) => (
                      <div
                        key={act.id}
                        className="p-3.5 rounded-xl border border-border/70 hover:bg-muted/20 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-1">
                          <div className="font-semibold text-foreground text-[13px]">{act.title}</div>
                          {act.description && (
                            <p className="text-muted-foreground text-[11px] line-clamp-2">{act.description}</p>
                          )}
                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                            {act.classroomName && <span>Class: {act.classroomName}</span>}
                            {act.learningGoalName && (
                              <span className="px-1.5 py-0.2 rounded bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200/50">
                                Goal: {act.learningGoalName}
                              </span>
                            )}
                            <span>• Scheduled: {fmtDate(act.date)}</span>
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-2">
                          <StatusBadge
                            status={act.status}
                            label={
                              act.status === 'COMPLETED'
                                ? 'Completed'
                                : act.status === 'IN_PROGRESS'
                                ? 'In Progress'
                                : 'Planned'
                            }
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Section: Developmental Milestones ── */}
              <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-border/50">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Brain size={16} className="text-emerald-600 dark:text-emerald-400" />
                    <span>Developmental Milestones & Teacher Feedback</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    Teacher-observed progress in early childhood developmental domains
                  </span>
                </div>

                {progress.length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted-foreground">
                    No individual milestone records have been published yet for this term.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {progress.map((p) => {
                      const isAchieved = p.stage === 'ACHIEVED' || p.stage === 'EXTENDING'
                      return (
                        <div
                          key={p.id}
                          className="p-3.5 rounded-xl border border-border/70 bg-muted/20 space-y-2 text-xs"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                                {p.areaName}
                              </div>
                              <div className="font-semibold text-foreground text-[13px] mt-0.5">{p.goalName}</div>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                                isAchieved
                                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200'
                                  : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200'
                              }`}
                            >
                              {p.stage}
                            </span>
                          </div>

                          {p.notes && (
                            <p className="text-[11px] text-muted-foreground italic border-t border-border/40 pt-1.5">
                              &ldquo;{p.notes}&rdquo;
                            </p>
                          )}

                          <div className="text-[10px] text-muted-foreground text-right pt-0.5">
                            Observed {fmtDate(p.updatedAt)}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      ) : (
        /* ── PreO Learning Library Tab ── */
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              type="button"
              onClick={() => setSelectedCategory('courses')}
              className={`p-5 rounded-2xl border text-left transition-all cursor-pointer ${
                selectedCategory === 'courses'
                  ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-950/30 ring-1 ring-purple-500'
                  : 'border-border/80 bg-card hover:bg-muted/30'
              }`}
            >
              <Courses3DIcon size={44} />
              <div className="text-base font-bold text-foreground mt-3">Courses & Lessons</div>
              <p className="text-xs text-muted-foreground mt-1">Phonics, numbers, shapes and creative exploration</p>
            </button>

            <button
              type="button"
              onClick={() => setSelectedCategory('rhymes')}
              className={`p-5 rounded-2xl border text-left transition-all cursor-pointer ${
                selectedCategory === 'rhymes'
                  ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-950/30 ring-1 ring-purple-500'
                  : 'border-border/80 bg-card hover:bg-muted/30'
              }`}
            >
              <Rhymes3DIcon size={44} />
              <div className="text-base font-bold text-foreground mt-3">Preschool Rhymes</div>
              <p className="text-xs text-muted-foreground mt-1">Nursery songs, rhythm, and acoustic melodies</p>
            </button>

            <button
              type="button"
              onClick={() => setSelectedCategory('stories')}
              className={`p-5 rounded-2xl border text-left transition-all cursor-pointer ${
                selectedCategory === 'stories'
                  ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-950/30 ring-1 ring-purple-500'
                  : 'border-border/80 bg-card hover:bg-muted/30'
              }`}
            >
              <Stories3DIcon size={44} />
              <div className="text-base font-bold text-foreground mt-3">Bedtime Stories</div>
              <p className="text-xs text-muted-foreground mt-1">Gentle illustrated narratives and social stories</p>
            </button>

            <button
              type="button"
              onClick={() => setSelectedCategory('games')}
              className={`p-5 rounded-2xl border text-left transition-all cursor-pointer ${
                selectedCategory === 'games'
                  ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-950/30 ring-1 ring-purple-500'
                  : 'border-border/80 bg-card hover:bg-muted/30'
              }`}
            >
              <Games3DIcon size={44} />
              <div className="text-base font-bold text-foreground mt-3">Learning Games</div>
              <p className="text-xs text-muted-foreground mt-1">Interactive color pops and preschool sound quizzes</p>
            </button>
          </div>

          {/* Media Items in Selected Category */}
          <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border/50">
              <span className="text-sm font-semibold text-foreground uppercase tracking-wider">
                {selectedCategory ? `${selectedCategory.toUpperCase()} COLLECTION` : 'RECOMMENDED PRESCHOOL RESOURCES'}
              </span>
              <span className="text-xs text-muted-foreground">Click any item to play together with your child</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(SAMPLE_MEDIA[selectedCategory || 'courses'] || []).map((item) => (
                <div
                  key={item.id}
                  onClick={() => setActivePlayItem(item)}
                  className="p-3.5 rounded-xl border border-border/70 hover:border-purple-400 hover:bg-purple-50/20 dark:hover:bg-purple-950/20 transition-all flex items-center justify-between gap-3 cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Play size={16} fill="currentColor" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-foreground text-xs truncate group-hover:text-purple-600 transition-colors">
                        {item.title}
                      </div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                        <span className="capitalize">{item.type}</span>
                        <span>•</span>
                        <span>{item.duration}</span>
                        {item.subject && (
                          <>
                            <span>•</span>
                            <span className="text-purple-600 font-medium">{item.subject}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 text-purple-600 dark:text-purple-400">
                    <ChevronRight size={16} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Player Modal */}
          {activePlayItem && (
            <SharedMediaPlayer item={activePlayItem} onClose={() => setActivePlayItem(null)} />
          )}
        </div>
      )}
    </div>
  )
}
