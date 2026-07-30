import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Calendar as CalendarIcon, Clock, User, BookOpen, Filter, Pencil, UserCheck } from 'lucide-react'
import type { Batch, User as UserType, Course } from '@/types'

interface WeeklyTimetableCalendarProps {
  batches: Batch[]
  facultyMembers: UserType[]
  courses: Course[]
  onEditBatch: (batch: Batch) => void
  isManagementView: boolean
}

const DAYS_OF_WEEK = [
  { key: 'Mon', label: 'Monday', full: 'Monday' },
  { key: 'Tue', label: 'Tuesday', full: 'Tuesday' },
  { key: 'Wed', label: 'Wednesday', full: 'Wednesday' },
  { key: 'Thu', label: 'Thursday', full: 'Thursday' },
  { key: 'Fri', label: 'Friday', full: 'Friday' },
  { key: 'Sat', label: 'Saturday', full: 'Saturday' },
]

export default function WeeklyTimetableCalendar({
  batches,
  facultyMembers,
  courses,
  onEditBatch,
  isManagementView,
}: WeeklyTimetableCalendarProps) {
  const [selectedFaculty, setSelectedFaculty] = useState<string>('all')
  const [selectedCourse, setSelectedCourse] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Filter batches based on faculty, course, and search
  const filteredBatches = batches.filter((b) => {
    if (selectedFaculty !== 'all' && b.faculty_id !== selectedFaculty) return false
    if (selectedCourse !== 'all' && b.course_id !== selectedCourse) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchName = b.batch_name.toLowerCase().includes(q)
      const matchCourse = b.course?.name?.toLowerCase().includes(q)
      const matchFaculty = b.faculty?.name?.toLowerCase().includes(q)
      if (!matchName && !matchCourse && !matchFaculty) return false
    }
    return true
  })

  // Helper to check if a batch falls on a specific day
  const isBatchOnDay = (batch: Batch, dayKey: string, dayFull: string) => {
    const daysStr = (batch.days_of_week || batch.schedule_days || '').toLowerCase()
    if (!daysStr) return true // Default show if unassigned
    if (daysStr.includes('daily') || daysStr.includes('mon to sat') || daysStr.includes('all days')) return true
    if (daysStr.includes(dayKey.toLowerCase()) || daysStr.includes(dayFull.toLowerCase())) return true
    return false
  }

  return (
    <div className="space-y-4">
      {/* FILTER HEADER */}
      <Card className="shadow-sm border border-slate-200 bg-slate-50/50">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <Filter className="h-4 w-4 text-primary" />
              <span>Timetable Filters:</span>
            </div>

            <div className="flex flex-wrap items-center gap-3 flex-1 max-w-3xl">
              {/* Search */}
              <div className="min-w-[180px] flex-1">
                <Input
                  placeholder="Search batch or course..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 text-xs bg-white"
                />
              </div>

              {/* Faculty Filter */}
              <div className="w-[180px]">
                <Select value={selectedFaculty} onValueChange={setSelectedFaculty}>
                  <SelectTrigger className="h-9 text-xs bg-white">
                    <SelectValue placeholder="All Faculty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Faculty Members</SelectItem>
                    {facultyMembers.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Course Filter */}
              <div className="w-[180px]">
                <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                  <SelectTrigger className="h-9 text-xs bg-white">
                    <SelectValue placeholder="All Courses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Courses / ACC</SelectItem>
                    {courses.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {(selectedFaculty !== 'all' || selectedCourse !== 'all' || searchQuery) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedFaculty('all')
                    setSelectedCourse('all')
                    setSearchQuery('')
                  }}
                  className="h-9 text-xs text-rose-600 hover:text-rose-700"
                >
                  Reset Filters
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* WEEKLY TIMETABLE GRID (Mon to Sat) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {DAYS_OF_WEEK.map((day) => {
          const dayBatches = filteredBatches.filter((b) => isBatchOnDay(b, day.key, day.full))

          return (
            <Card key={day.key} className="shadow-sm border border-slate-200/90 flex flex-col h-full bg-white">
              <CardHeader className="py-2.5 px-3 bg-slate-100/80 border-b border-slate-200 rounded-t-xl flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <CalendarIcon className="h-3.5 w-3.5 text-primary" />
                  {day.label}
                </CardTitle>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-semibold bg-slate-200 text-slate-700">
                  {dayBatches.length} Classes
                </Badge>
              </CardHeader>

              <CardContent className="p-2 space-y-2 flex-1 min-h-[260px] bg-slate-50/30">
                {dayBatches.length === 0 ? (
                  <div className="h-full min-h-[180px] flex flex-col items-center justify-center text-center p-3 text-slate-400">
                    <Clock className="h-6 w-6 mb-1 text-slate-300 stroke-[1.5]" />
                    <p className="text-[11px] italic">No classes scheduled</p>
                  </div>
                ) : (
                  dayBatches.map((b) => (
                    <div
                      key={`${day.key}-${b.id}`}
                      className="group relative rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm hover:shadow-md hover:border-primary/50 transition-all space-y-1.5"
                    >
                      {/* Course & Status Header */}
                      <div className="flex items-center justify-between text-[11px]">
                        <Badge variant="outline" className="text-[10px] font-bold px-1.5 py-0 bg-sky-50 text-sky-800 border-sky-200">
                          {b.course?.name || 'ACC / Course'}
                        </Badge>
                        <Badge
                          variant={b.status === 'ongoing' ? 'success' : 'secondary'}
                          className="text-[9px] px-1 py-0 uppercase tracking-wider"
                        >
                          {b.status || 'ongoing'}
                        </Badge>
                      </div>

                      {/* Batch Name */}
                      <div className="font-bold text-xs text-slate-900 leading-tight flex items-center justify-between">
                        <span>{b.batch_name}</span>
                      </div>

                      {/* Timing */}
                      <div className="text-[11px] text-amber-700 font-semibold flex items-center gap-1 bg-amber-50/80 px-1.5 py-0.5 rounded border border-amber-200/60">
                        <Clock className="h-3 w-3 text-amber-600 shrink-0" />
                        <span className="truncate">{b.timing || '10:00 AM - 12:00 PM'}</span>
                      </div>

                      {/* Faculty */}
                      <div className="text-[11px] text-slate-600 flex items-center justify-between pt-1 border-t border-slate-100">
                        <div className="flex items-center gap-1 truncate max-w-[120px]">
                          <UserCheck className="h-3 w-3 text-emerald-600 shrink-0" />
                          <span className="font-medium truncate">{b.faculty?.name || 'Unassigned'}</span>
                        </div>
                        {isManagementView && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 opacity-80 group-hover:opacity-100 hover:bg-slate-100 rounded"
                            onClick={() => onEditBatch(b)}
                            title="Edit Class Schedule"
                          >
                            <Pencil className="h-3 w-3 text-slate-500 hover:text-primary" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
