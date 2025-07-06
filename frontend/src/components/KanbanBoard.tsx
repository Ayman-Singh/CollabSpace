'use client'

import { useState, useEffect } from 'react'
import { Plus, MoreVertical, User, Calendar, Tag, MessageSquare } from 'lucide-react'
import { useSocket } from '@/hooks/useSocket'
import { useAuth } from '@/hooks/useAuth'

interface Task {
  id: string
  title: string
  description: string
  status: 'todo' | 'in-progress' | 'review' | 'done'
  priority: 'low' | 'medium' | 'high'
  assignee: string
  dueDate: string
  tags: string[]
  comments: number
  createdAt: string
}

interface KanbanBoardProps {}

export function KanbanBoard({}: KanbanBoardProps) {
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: '1',
      title: 'Implement authentication system',
      description: 'Create user authentication with JWT tokens and role-based access control',
      status: 'in-progress',
      priority: 'high',
      assignee: 'John Doe',
      dueDate: '2024-02-15',
      tags: ['backend', 'security'],
      comments: 3,
      createdAt: '2024-01-20'
    },
    {
      id: '2',
      title: 'Design responsive UI components',
      description: 'Create reusable React components with Tailwind CSS',
      status: 'todo',
      priority: 'medium',
      assignee: 'Jane Smith',
      dueDate: '2024-02-20',
      tags: ['frontend', 'ui'],
      comments: 1,
      createdAt: '2024-01-21'
    },
    {
      id: '3',
      title: 'Set up CI/CD pipeline',
      description: 'Configure GitHub Actions for automated testing and deployment',
      status: 'review',
      priority: 'high',
      assignee: 'Mike Johnson',
      dueDate: '2024-02-10',
      tags: ['devops', 'automation'],
      comments: 5,
      createdAt: '2024-01-19'
    },
    {
      id: '4',
      title: 'Write API documentation',
      description: 'Create comprehensive API documentation using OpenAPI/Swagger',
      status: 'done',
      priority: 'low',
      assignee: 'Sarah Wilson',
      dueDate: '2024-02-05',
      tags: ['documentation', 'api'],
      comments: 2,
      createdAt: '2024-01-18'
    }
  ])

  const [showAddTask, setShowAddTask] = useState(false)
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium' as const,
    assignee: '',
    dueDate: '',
    tags: ''
  })

  const { socket } = useSocket()
  const { user } = useAuth()

  const columns = [
    { id: 'todo', title: 'To Do', color: 'bg-secondary-100' },
    { id: 'in-progress', title: 'In Progress', color: 'bg-blue-100' },
    { id: 'review', title: 'Review', color: 'bg-yellow-100' },
    { id: 'done', title: 'Done', color: 'bg-green-100' }
  ]

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-error-500'
      case 'medium':
        return 'bg-warning-500'
      case 'low':
        return 'bg-success-500'
      default:
        return 'bg-secondary-500'
    }
  }

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'High'
      case 'medium':
        return 'Medium'
      case 'low':
        return 'Low'
      default:
        return 'Medium'
    }
  }

  const addTask = () => {
    if (!newTask.title.trim()) return

    const task: Task = {
      id: Date.now().toString(),
      title: newTask.title,
      description: newTask.description,
      status: 'todo',
      priority: newTask.priority,
      assignee: newTask.assignee || 'Unassigned',
      dueDate: newTask.dueDate,
      tags: newTask.tags ? newTask.tags.split(',').map(tag => tag.trim()) : [],
      comments: 0,
      createdAt: new Date().toISOString().split('T')[0]
    }

    setTasks(prev => [...prev, task])
    setNewTask({
      title: '',
      description: '',
      priority: 'medium',
      assignee: '',
      dueDate: '',
      tags: ''
    })
    setShowAddTask(false)

    // Emit to other users
    if (socket) {
      socket.emit('task-added', { task })
    }
  }

  const moveTask = (taskId: string, newStatus: string) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, status: newStatus as any } : task
    ))

    // Emit to other users
    if (socket) {
      socket.emit('task-moved', { taskId, newStatus })
    }
  }

  const deleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(task => task.id !== taskId))

    // Emit to other users
    if (socket) {
      socket.emit('task-deleted', { taskId })
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date()
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="p-6 bg-white border-b border-secondary-200">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-secondary-900">Kanban Board</h1>
            <p className="text-secondary-600">Track and manage your team's tasks</p>
          </div>
          <button
            onClick={() => setShowAddTask(true)}
            className="btn-primary"
          >
            <Plus size={16} className="mr-2" />
            Add Task
          </button>
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 p-6 overflow-x-auto">
        <div className="flex space-x-6 min-w-max">
          {columns.map((column) => (
            <div key={column.id} className="flex-shrink-0 w-80">
              <div className={`${column.color} rounded-lg p-4 mb-4`}>
                <h3 className="font-semibold text-secondary-900">{column.title}</h3>
                <p className="text-sm text-secondary-600">
                  {tasks.filter(task => task.status === column.id).length} tasks
                </p>
              </div>
              
              <div className="space-y-3">
                {tasks
                  .filter(task => task.status === column.id)
                  .map((task) => (
                    <div
                      key={task.id}
                      className="bg-white rounded-lg p-4 shadow-soft border border-secondary-200 hover:shadow-medium transition-shadow duration-200 cursor-move"
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', task.id)
                      }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault()
                        const taskId = e.dataTransfer.getData('text/plain')
                        moveTask(taskId, column.id)
                      }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-secondary-900 text-sm">
                          {task.title}
                        </h4>
                        <button className="p-1 hover:bg-secondary-100 rounded">
                          <MoreVertical size={14} className="text-secondary-500" />
                        </button>
                      </div>
                      
                      <p className="text-xs text-secondary-600 mb-3 line-clamp-2">
                        {task.description}
                      </p>
                      
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center">
                            <User size={12} className="text-primary-700" />
                          </div>
                          <span className="text-xs text-secondary-700">
                            {task.assignee}
                          </span>
                        </div>
                        
                        <div className={`px-2 py-1 rounded-full text-xs text-white ${getPriorityColor(task.priority)}`}>
                          {getPriorityText(task.priority)}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1">
                          <Calendar size={12} className="text-secondary-500" />
                          <span className={`text-xs ${
                            isOverdue(task.dueDate) ? 'text-error-600' : 'text-secondary-600'
                          }`}>
                            {formatDate(task.dueDate)}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {task.tags.map((tag, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-secondary-100 text-secondary-700 text-xs rounded-full"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      {task.comments > 0 && (
                        <div className="flex items-center space-x-1 mt-2">
                          <MessageSquare size={12} className="text-secondary-500" />
                          <span className="text-xs text-secondary-600">
                            {task.comments} comment{task.comments !== 1 ? 's' : ''}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Task Modal */}
      {showAddTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-secondary-900 mb-4">Add New Task</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                  className="input-field"
                  placeholder="Enter task title"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                  className="input-field h-20 resize-none"
                  placeholder="Enter task description"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask(prev => ({ ...prev, priority: e.target.value as any }))}
                    className="input-field"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={newTask.dueDate}
                    onChange={(e) => setNewTask(prev => ({ ...prev, dueDate: e.target.value }))}
                    className="input-field"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Assignee
                </label>
                <input
                  type="text"
                  value={newTask.assignee}
                  onChange={(e) => setNewTask(prev => ({ ...prev, assignee: e.target.value }))}
                  className="input-field"
                  placeholder="Enter assignee name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={newTask.tags}
                  onChange={(e) => setNewTask(prev => ({ ...prev, tags: e.target.value }))}
                  className="input-field"
                  placeholder="frontend, ui, bug"
                />
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={addTask}
                className="btn-primary flex-1"
              >
                Add Task
              </button>
              <button
                onClick={() => setShowAddTask(false)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 