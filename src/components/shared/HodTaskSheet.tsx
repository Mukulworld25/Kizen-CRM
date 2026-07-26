import { useState, useEffect, useCallback } from 'react'
import { Plus, CheckCircle, Clock, User as UserIcon, FileText } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Label, Textarea } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { supabase } from '@/lib/supabase'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import type { Task, Scratchpad } from '@/types'
import type { User as UserType } from '@/types'

export default function HodTaskSheet() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()

  // Task state
  const [taskOpen, setTaskOpen] = useState(false)
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDesc, setTaskDesc] = useState('')
  const [taskAssignee, setTaskAssignee] = useState('')
  const [taskDueDate, setTaskDueDate] = useState('')

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
  const { data: tasks = [] } = useQuery({
    queryKey: ['hod-tasks', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*, assignee:users!tasks_assigned_to_fkey(name), assigner:users!tasks_assigned_by_fkey(name)')
        .or(`assigned_by.eq.${profile?.id},assigned_to.eq.${profile?.id}`)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as Task[]
    },
    enabled: !!profile,
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

  // Initialize scratchpad content
  useEffect(() => {
    if (scratchpad) {
      setScratchContent(scratchpad.content)
    }
  }, [scratchpad])

  // Auto-save scratchpad
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

  // Auto-save every 30 seconds
  useEffect(() => {
    const interval = setInterval(autoSave, 30000)
    return () => clearInterval(interval)
  }, [autoSave])

  // Save on blur
  const handleScratchBlur = () => {
    autoSave()
  }

  // Create task
  const createTask = useMutation({
    mutationFn: async (task: Partial<Task>) => {
      const { data, error } = await supabase
        .from('tasks')
        .insert({ ...task, assigned_by: profile?.id })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hod-tasks'] })
      toast.success('Task created')
      setTaskOpen(false)
      setTaskTitle('')
      setTaskDesc('')
      setTaskAssignee('')
      setTaskDueDate('')
    },
    onError: (err) => toast.error(err.message),
  })

  // Complete task
  const completeTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tasks').update({ status: 'completed' }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hod-tasks'] })
      toast.success('Task completed')
    },
    onError: (err) => toast.error(err.message),
  })

  const pendingTasks = tasks.filter((t) => t.status !== 'completed')
  const completedTasks = tasks.filter((t) => t.status === 'completed')

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Task Delegation */}
      <Card className="border border-slate-200">
        <CardHeader className="flex flex-row items-center justify-between border-b pb-3">
          <div>
            <CardTitle className="text-base font-bold">Task Delegation</CardTitle>
            <p className="text-xs text-muted-foreground">{pendingTasks.length} pending · {completedTasks.length} completed</p>
          </div>
          <Button size="sm" onClick={() => setTaskOpen(true)}>
            <Plus className="h-4 w-4" /> New Task
          </Button>
        </CardHeader>
        <CardContent className="p-4 max-h-[400px] overflow-y-auto">
          {tasks.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">No tasks yet. Delegate your first task.</p>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="rounded-xl border border-slate-200 p-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold text-sm ${task.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                          {task.title}
                        </span>
                        <Badge variant={task.status === 'completed' ? 'success' : task.status === 'in_progress' ? 'default' : 'warning'} className="text-[10px]">
                          {task.status?.replace('_', ' ')}
                        </Badge>
                      </div>
                      {task.description && (
                        <p className="text-xs text-slate-500 mt-1">{task.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-400">
                        {task.assignee && (
                          <span className="flex items-center gap-1">
                            <UserIcon className="h-3 w-3" /> {task.assignee.name}
                          </span>
                        )}
                        {task.due_date && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {format(new Date(task.due_date), 'MMM d')}
                          </span>
                        )}
                      </div>
                    </div>
                    {task.status !== 'completed' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="shrink-0"
                        onClick={() => completeTask.mutate(task.id)}
                      >
                        <CheckCircle className="h-4 w-4 text-emerald-600" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scratchpad */}
      <Card className="border border-slate-200">
        <CardHeader className="border-b pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold">Scratchpad</CardTitle>
              <p className="text-xs text-muted-foreground">
                {lastSaved ? `Last saved: ${format(lastSaved, 'h:mm a')}` : 'Auto-saves every 30s'}
              </p>
            </div>
            <FileText className="h-5 w-5 text-slate-400" />
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <textarea
            value={scratchContent}
            onChange={(e) => setScratchContent(e.target.value)}
            onBlur={handleScratchBlur}
            placeholder="Type your notes, ideas, or quick reminders here... Auto-saves every 30 seconds."
            className="w-full h-[350px] rounded-xl border border-slate-200 p-4 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
          />
        </CardContent>
      </Card>

      {/* New Task Dialog */}
      <Dialog open={taskOpen} onOpenChange={setTaskOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delegate Task</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Task Title</Label>
              <Input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="e.g. Review batch attendance" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={taskDesc} onChange={(e) => setTaskDesc(e.target.value)} />
            </div>
            <div>
              <Label>Assign To</Label>
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
              <Label>Due Date</Label>
              <Input type="date" value={taskDueDate} onChange={(e) => setTaskDueDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTaskOpen(false)}>Cancel</Button>
            <Button onClick={() => createTask.mutate({ title: taskTitle, description: taskDesc, assigned_to: taskAssignee || null, due_date: taskDueDate || null })} disabled={!taskTitle}>
              Create Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}