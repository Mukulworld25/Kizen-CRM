import { useState, useEffect, useCallback } from 'react'
import { Plus, CheckCircle, Clock, User as UserIcon, FileText, Lock, Trash2, Edit2, Search, Filter } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Label, Textarea } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { supabase } from '@/lib/supabase'
import { logAuditEvent } from '@/lib/auditLogger'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import type { Task, Scratchpad } from '@/types'
import type { User as UserType } from '@/types'

export default function HodTaskSheet() {
  const { profile, isOwner } = useAuth()
  const queryClient = useQueryClient()

  // Task creation state
  const [taskOpen, setTaskOpen] = useState(false)
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDesc, setTaskDesc] = useState('')
  const [taskAssignee, setTaskAssignee] = useState('')
  const [taskDueDate, setTaskDueDate] = useState('')
  const [taskPriority, setTaskPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [isPrivate, setIsPrivate] = useState(false)

  // Edit task state
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editAssignee, setEditAssignee] = useState('')
  const [editDueDate, setEditDueDate] = useState('')
  const [editPriority, setEditPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [editPrivate, setEditPrivate] = useState(false)

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('all')
  const [scopeFilter, setScopeFilter] = useState<'all' | 'my' | 'delegated'>('all')

  // Scratchpad state
  const [scratchContent, setScratchContent] = useState('')
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  // Fetch all users for assignment
  const { data: users = [] } = useQuery({
    queryKey: ['hod-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, role')
        .eq('is_active', true)
        .order('name')
      if (error) throw error
      return (data ?? []) as UserType[]
    },
    enabled: !!profile,
  })

  // Fetch tasks
  const { data: allTasks = [] } = useQuery({
    queryKey: ['hod-tasks', profile?.id, isOwner],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*, assignee:users!tasks_assigned_to_fkey(name), creator:users!tasks_created_by_fkey(name)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as Task[]
    },
    enabled: !!profile,
  })

  // Privacy rule: Only creator and owners can view private tasks
  const visibleTasks = allTasks.filter((t) => {
    if (isOwner) return true
    if (!t.is_private) return true
    return t.created_by === profile?.id
  })

  // Apply search & filters
  const filteredTasks = visibleTasks.filter((t) => {
    // Status filter
    if (statusFilter === 'pending' && t.status === 'completed') return false
    if (statusFilter === 'completed' && t.status !== 'completed') return false

    // Scope filter
    if (scopeFilter === 'my' && t.assigned_to !== profile?.id) return false
    if (scopeFilter === 'delegated' && t.created_by !== profile?.id) return false

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      const titleMatch = (t.title || '').toLowerCase().includes(q)
      const descMatch = (t.description || '').toLowerCase().includes(q)
      const assigneeMatch = ((t.assignee as any)?.name || '').toLowerCase().includes(q)
      if (!titleMatch && !descMatch && !assigneeMatch) return false
    }

    return true
  })

  // Fetch scratchpad
  const { data: scratchpad } = useQuery({
    queryKey: ['hod-scratchpad', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scratchpad')
        .select('*')
        .eq('user_id', profile!.id)
        .single()
      if (error && error.code !== 'PGRST116') throw error
      return data as Scratchpad | null
    },
    enabled: !!profile,
  })

  useEffect(() => {
    if (scratchpad) {
      setScratchContent(scratchpad.content)
    }
  }, [scratchpad])

  const saveScratchpad = useMutation({
    mutationFn: async (content: string) => {
      const { error } = await supabase.from('scratchpad').upsert(
        { user_id: profile?.id, content, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      )
      if (error) throw error
    },
    onSuccess: () => {
      setLastSaved(new Date())
    },
    onError: (err) => toast.error('Failed to save: ' + err.message),
  })

  const autoSave = useCallback(() => {
    if (scratchContent) {
      saveScratchpad.mutate(scratchContent)
    }
  }, [scratchContent])

  useEffect(() => {
    const interval = setInterval(autoSave, 30000)
    return () => clearInterval(interval)
  }, [autoSave])

  // Create task
  const createTask = useMutation({
    mutationFn: async (task: Partial<Task>) => {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          ...task,
          created_by: profile?.id,
          is_private: isPrivate,
          priority: taskPriority,
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['hod-tasks'] })
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
      toast.success('Team task created')
      setTaskOpen(false)
      setTaskTitle('')
      setTaskDesc('')
      setTaskAssignee('')
      setTaskDueDate('')
      setTaskPriority('medium')
      setIsPrivate(false)
      logAuditEvent({
        action: 'task_create',
        entityType: 'task',
        entityId: data?.id,
        entityName: data?.title,
        details: `Created team task: ${data?.title}`,
        newData: data,
      })
    },
    onError: (err) => toast.error(err.message),
  })

  // Update task
  const updateTask = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { error } = await supabase.from('tasks').update(updates).eq('id', id)
      if (error) throw error
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['hod-tasks'] })
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
      toast.success('Task updated')
      setEditingTask(null)
      logAuditEvent({
        action: 'task_update',
        entityType: 'task',
        entityId: vars.id,
        details: `Updated task`,
        newData: vars,
      })
    },
    onError: (err) => toast.error(err.message),
  })

  // Delete task
  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tasks').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['hod-tasks'] })
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
      toast.success('Task deleted')
      logAuditEvent({
        action: 'task_delete',
        entityType: 'task',
        entityId: id,
        details: 'Deleted task',
      })
    },
    onError: (err) => toast.error(err.message),
  })

  // Toggle task status
  const toggleTaskStatus = (task: Task) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed'
    updateTask.mutate({ id: task.id, status: newStatus })
  }

  const handleOpenEdit = (task: Task) => {
    setEditingTask(task)
    setEditTitle(task.title)
    setEditDesc(task.description || '')
    setEditAssignee(task.assigned_to || '')
    setEditDueDate(task.due_date ? task.due_date.split('T')[0] : '')
    setEditPriority(task.priority || 'medium')
    setEditPrivate(Boolean(task.is_private))
  }

  const handleSaveEdit = () => {
    if (!editingTask || !editTitle.trim()) return
    updateTask.mutate({
      id: editingTask.id,
      title: editTitle.trim(),
      description: editDesc.trim() || null,
      assigned_to: editAssignee || null,
      due_date: editDueDate || null,
      priority: editPriority,
      is_private: editPrivate,
    })
  }

  const pendingCount = visibleTasks.filter((t) => t.status !== 'completed').length
  const completedCount = visibleTasks.filter((t) => t.status === 'completed').length

  const getPriorityBadge = (p?: string) => {
    switch (p) {
      case 'high':
        return <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-[10px] font-semibold">🔴 High</Badge>
      case 'low':
        return <Badge className="bg-sky-100 text-sky-800 border-sky-300 text-[10px] font-semibold">🔵 Low</Badge>
      default:
        return <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px] font-semibold">🟡 Medium</Badge>
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Team Tasks & Delegation Board */}
      <Card className="border border-slate-200 shadow-sm bg-white">
        <CardHeader className="border-b pb-3.5 space-y-3">
          <div className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base font-bold text-slate-900">Team Tasks & Delegation</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {pendingCount} pending · {completedCount} completed
              </p>
            </div>
            <Button size="sm" onClick={() => setTaskOpen(true)} className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold h-8">
              <Plus className="h-4 w-4 mr-1" /> New Team Task
            </Button>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex items-center gap-2 flex-wrap pt-1">
            <div className="relative flex-1 min-w-[160px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Search team tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs bg-slate-50 border-slate-200"
              />
            </div>
            <Select value={scopeFilter} onValueChange={(v) => setScopeFilter(v as any)}>
              <SelectTrigger className="w-32 h-8 text-xs bg-slate-50"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tasks</SelectItem>
                <SelectItem value="my">Assigned to Me</SelectItem>
                <SelectItem value="delegated">Created by Me</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${statusFilter === 'all' ? 'bg-white shadow-xs text-slate-900 font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('pending')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${statusFilter === 'pending' ? 'bg-white shadow-xs text-slate-900 font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Pending
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('completed')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${statusFilter === 'completed' ? 'bg-white shadow-xs text-slate-900 font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Done
              </button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 max-h-[500px] overflow-y-auto space-y-2.5">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm font-medium text-slate-600">No team tasks found.</p>
              <p className="text-xs text-muted-foreground mt-1">Assign your first task to staff or self.</p>
              <Button size="sm" onClick={() => setTaskOpen(true)} className="mt-4 bg-amber-500 text-slate-950 font-bold h-8">
                <Plus className="h-4 w-4 mr-1.5" /> Delegate Task
              </Button>
            </div>
          ) : (
            filteredTasks.map((task) => {
              const isPastDue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed'
              return (
                <div
                  key={task.id}
                  className={`rounded-xl border p-3 transition-all hover:shadow-xs ${task.status === 'completed' ? 'bg-slate-50/70 border-slate-200 opacity-75' : isPastDue ? 'bg-rose-50/30 border-rose-200' : 'bg-white border-slate-200'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => toggleTaskStatus(task)}
                      className="mt-0.5 shrink-0 text-slate-400 hover:text-emerald-600 transition-colors"
                      title={task.status === 'completed' ? 'Mark incomplete' : 'Mark complete'}
                    >
                      <CheckCircle className={`h-5 w-5 ${task.status === 'completed' ? 'text-emerald-600 fill-emerald-100' : ''}`} />
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-semibold text-sm ${task.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                          {task.title}
                        </span>
                        {getPriorityBadge(task.priority)}
                        {task.is_private && (
                          <Badge variant="outline" className="text-[10px] text-purple-700 bg-purple-50 border-purple-200 flex items-center gap-1">
                            <Lock className="h-2.5 w-2.5" /> Private
                          </Badge>
                        )}
                      </div>

                      {task.description && (
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">{task.description}</p>
                      )}

                      <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-500 flex-wrap">
                        {task.creator && (
                          <span>By <strong>{task.creator.name}</strong></span>
                        )}
                        {task.assignee && (
                          <span className="flex items-center gap-1 font-medium text-slate-700">
                            <UserIcon className="h-3 w-3 text-sky-600" /> {(task.assignee as any).name}
                          </span>
                        )}
                        {task.due_date && (
                          <span className={`flex items-center gap-1 font-mono ${isPastDue ? 'text-rose-600 font-bold' : ''}`}>
                            <Clock className="h-3 w-3" /> Due {format(new Date(task.due_date), 'MMM d, yyyy')}
                            {isPastDue && ' (Overdue)'}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-slate-400 hover:text-slate-700"
                        onClick={() => handleOpenEdit(task)}
                        title="Edit Task"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-slate-400 hover:text-rose-600"
                        onClick={() => {
                          if (confirm(`Delete task "${task.title}"?`)) {
                            deleteTask.mutate(task.id)
                          }
                        }}
                        title="Delete Task"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>

      {/* Scratchpad */}
      <Card className="border border-slate-200 shadow-sm bg-white">
        <CardHeader className="border-b pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-slate-900">Personal Scratchpad</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {lastSaved ? `Last saved: ${format(lastSaved, 'h:mm a')}` : 'Auto-saves every 30 seconds'}
              </p>
            </div>
            <FileText className="h-5 w-5 text-amber-500" />
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <textarea
            value={scratchContent}
            onChange={(e) => setScratchContent(e.target.value)}
            onBlur={() => autoSave()}
            placeholder="Type your notes, ideas, meeting drafts, or quick reminders here... Auto-saves every 30 seconds."
            className="w-full h-[430px] rounded-xl border border-slate-200 p-4 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-500 bg-slate-50/50 leading-relaxed"
          />
        </CardContent>
      </Card>

      {/* New Task Dialog */}
      <Dialog open={taskOpen} onOpenChange={setTaskOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Delegate Team Task</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-1">
            <div>
              <Label>Task Title <span className="text-rose-500">*</span></Label>
              <Input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="e.g. Aadya's probation review & goal setting" />
            </div>
            <div>
              <Label>Description & Action Items</Label>
              <Textarea value={taskDesc} onChange={(e) => setTaskDesc(e.target.value)} placeholder="Enter details, requirements or agenda..." rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Assign To Staff</Label>
                <Select value={taskAssignee} onValueChange={setTaskAssignee}>
                  <SelectTrigger><SelectValue placeholder="Select team member" /></SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.name} ({u.role})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={taskPriority} onValueChange={(v) => setTaskPriority(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">🔵 Low</SelectItem>
                    <SelectItem value="medium">🟡 Medium</SelectItem>
                    <SelectItem value="high">🔴 High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Due Date</Label>
              <Input type="date" value={taskDueDate} onChange={(e) => setTaskDueDate(e.target.value)} />
            </div>

            <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3 bg-slate-50/50">
              <div className="space-y-0.5">
                <Label className="text-xs font-semibold flex items-center gap-1.5 cursor-pointer">
                  <Lock className="h-3.5 w-3.5 text-purple-600" /> Private Task
                </Label>
                <p className="text-[11px] text-muted-foreground">Only you and Owner role can view this task</p>
              </div>
              <Switch checked={isPrivate} onCheckedChange={setIsPrivate} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTaskOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createTask.mutate({
                title: taskTitle.trim(),
                description: taskDesc.trim() || null,
                assigned_to: taskAssignee || null,
                due_date: taskDueDate || null,
              })}
              disabled={!taskTitle.trim() || createTask.isPending}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold"
            >
              {createTask.isPending ? 'Creating...' : 'Create Task'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Task Dialog */}
      <Dialog open={!!editingTask} onOpenChange={() => setEditingTask(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit Team Task</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-1">
            <div>
              <Label>Task Title <span className="text-rose-500">*</span></Label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Assign To Staff</Label>
                <Select value={editAssignee} onValueChange={setEditAssignee}>
                  <SelectTrigger><SelectValue placeholder="Select team member" /></SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.name} ({u.role})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={editPriority} onValueChange={(v) => setEditPriority(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">🔵 Low</SelectItem>
                    <SelectItem value="medium">🟡 Medium</SelectItem>
                    <SelectItem value="high">🔴 High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Due Date</Label>
              <Input type="date" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)} />
            </div>

            <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3 bg-slate-50/50">
              <div className="space-y-0.5">
                <Label className="text-xs font-semibold flex items-center gap-1.5 cursor-pointer">
                  <Lock className="h-3.5 w-3.5 text-purple-600" /> Private Task
                </Label>
                <p className="text-[11px] text-muted-foreground">Only you and Owner role can view this task</p>
              </div>
              <Switch checked={editPrivate} onCheckedChange={setEditPrivate} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTask(null)}>Cancel</Button>
            <Button
              onClick={handleSaveEdit}
              disabled={!editTitle.trim() || updateTask.isPending}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold"
            >
              {updateTask.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}