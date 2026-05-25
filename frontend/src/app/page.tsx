'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import api from '@/utils/api';
import { 
  Plus, 
  LogOut, 
  Trash2, 
  Edit3, 
  User as UserIcon, 
  History, 
  CheckSquare, 
  FolderPlus, 
  Briefcase, 
  ChevronRight, 
  AlertCircle, 
  Loader2, 
  Folder, 
  Clock,
  Calendar,
  X,
  UserCheck
} from 'lucide-react';

interface Project {
  id: number;
  name: string;
  description: string;
  creator_name: string;
  created_at: string;
}

interface Task {
  id: number;
  project_id: number;
  title: string;
  description: string;
  status: 'Todo' | 'In Progress' | 'Done';
  assigned_to: number | null;
  assignee_name: string | null;
  created_at: string;
  updated_at: string;
}

interface Member {
  id: number;
  username: string;
  email: string;
}

interface ChangeLog {
  id: number;
  task_id: number;
  user_id: number;
  old_status: 'Todo' | 'In Progress' | 'Done';
  new_status: 'Todo' | 'In Progress' | 'Done';
  remark: string | null;
  created_at: string;
  task_title: string;
  project_name: string;
  operator_username: string;
}

export default function DashboardPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();

  // Core Data State
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [logs, setLogs] = useState<ChangeLog[]>([]);

  // UI State
  const [dataLoading, setDataLoading] = useState(true);
  const [boardLoading, setBoardLoading] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  // Modals Open State
  const [isProjModalOpen, setIsProjModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isEditTaskOpen, setIsEditTaskOpen] = useState(false);
  const [isEditProjOpen, setIsEditProjOpen] = useState(false);

  // Form Field State
  const [newProjName, setNewProjName] = useState('');
  const [newProjDesc, setNewProjDesc] = useState('');

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState<string>('');
  const [newTaskStatus, setNewTaskStatus] = useState<'Todo' | 'In Progress' | 'Done'>('Todo');

  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [editTaskTitle, setEditTaskTitle] = useState('');
  const [editTaskDesc, setEditTaskDesc] = useState('');
  const [editTaskAssignee, setEditTaskAssignee] = useState<string>('');
  const [editTaskStatus, setEditTaskStatus] = useState<'Todo' | 'In Progress' | 'Done'>('Todo');
  const [editTaskRemark, setEditTaskRemark] = useState('');

  const [editProjName, setEditProjName] = useState('');
  const [editProjDesc, setEditProjDesc] = useState('');

  // Fetch Core Data (Projects, Users, Logs)
  const fetchData = async () => {
    try {
      setDataLoading(true);
      setGeneralError(null);
      
      const [projRes, membersRes, logsRes] = await Promise.all([
        api.get('/api/projects'),
        api.get('/api/users'),
        api.get('/api/logs')
      ]);

      if (projRes.data.success) {
        setProjects(projRes.data.data);
        // Default to first project if available and none selected
        if (projRes.data.data.length > 0 && !activeProject) {
          handleSelectProject(projRes.data.data[0]);
        }
      }
      
      if (membersRes.data.success) {
        setMembers(membersRes.data.data);
      }

      if (logsRes.data.success) {
        setLogs(logsRes.data.data);
      }
    } catch (err: any) {
      console.error('Fetch dashboard details failed:', err);
      setGeneralError('Failed to fetch data from API. Please verify backend state.');
    } finally {
      setDataLoading(false);
    }
  };

  // Fetch Details of a Single Selected Project
  const handleSelectProject = async (project: Project) => {
    setActiveProject(project);
    setBoardLoading(true);
    try {
      const res = await api.get(`/api/projects/${project.id}`);
      if (res.data.success) {
        setTasks(res.data.data.tasks || []);
      }
    } catch (err) {
      console.error('Failed to load project tasks:', err);
    } finally {
      setBoardLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user) {
      fetchData();
    }
  }, [user, authLoading]);

  // Refresh Logs Utility
  const refreshLogs = async () => {
    try {
      const logsRes = await api.get('/api/logs');
      if (logsRes.data.success) {
        setLogs(logsRes.data.data);
      }
    } catch (err) {
      console.error('Failed to refresh activity logs:', err);
    }
  };

  // ==========================================
  // PROJECT CRUD HANDLERS
  // ==========================================
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName) return;

    try {
      const res = await api.post('/api/projects', {
        name: newProjName,
        description: newProjDesc
      });
      if (res.data.success) {
        const createdProj = res.data.data;
        setProjects([createdProj, ...projects]);
        setActiveProject(createdProj);
        setTasks([]);
        setIsProjModalOpen(false);
        setNewProjName('');
        setNewProjDesc('');
        refreshLogs();
      }
    } catch (err) {
      console.error('Create project failed:', err);
    }
  };

  const handleEditProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject || !editProjName) return;

    try {
      const res = await api.put(`/api/projects/${activeProject.id}`, {
        name: editProjName,
        description: editProjDesc
      });
      if (res.data.success) {
        const updatedProj = res.data.data;
        setProjects(projects.map(p => p.id === updatedProj.id ? updatedProj : p));
        setActiveProject(updatedProj);
        setIsEditProjOpen(false);
      }
    } catch (err) {
      console.error('Update project failed:', err);
    }
  };

  const handleDeleteProject = async (projectId: number) => {
    if (!confirm('Are you sure you want to delete this project? All tasks and change logs will be lost permanently.')) return;

    try {
      const res = await api.delete(`/api/projects/${projectId}`);
      if (res.data.success) {
        const remaining = projects.filter(p => p.id !== projectId);
        setProjects(remaining);
        if (activeProject?.id === projectId) {
          if (remaining.length > 0) {
            handleSelectProject(remaining[0]);
          } else {
            setActiveProject(null);
            setTasks([]);
          }
        }
        refreshLogs();
      }
    } catch (err) {
      console.error('Delete project failed:', err);
    }
  };

  // ==========================================
  // TASK CRUD HANDLERS
  // ==========================================
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject || !newTaskTitle) return;

    try {
      const res = await api.post(`/api/projects/${activeProject.id}/tasks`, {
        title: newTaskTitle,
        description: newTaskDesc,
        status: newTaskStatus,
        assignedTo: newTaskAssignee ? parseInt(newTaskAssignee) : null
      });

      if (res.data.success) {
        setTasks([...tasks, res.data.data]);
        setIsTaskModalOpen(false);
        setNewTaskTitle('');
        setNewTaskDesc('');
        setNewTaskAssignee('');
        setNewTaskStatus('Todo');
        refreshLogs();
      }
    } catch (err) {
      console.error('Create task failed:', err);
    }
  };

  const handleOpenEditTask = (task: Task) => {
    setActiveTask(task);
    setEditTaskTitle(task.title);
    setEditTaskDesc(task.description || '');
    setEditTaskAssignee(task.assigned_to ? String(task.assigned_to) : '');
    setEditTaskStatus(task.status);
    setEditTaskRemark('');
    setIsEditTaskOpen(true);
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTask) return;

    try {
      const res = await api.put(`/api/tasks/${activeTask.id}`, {
        title: editTaskTitle,
        description: editTaskDesc,
        status: editTaskStatus,
        assignedTo: editTaskAssignee ? parseInt(editTaskAssignee) : '',
        remark: editTaskRemark
      });

      if (res.data.success) {
        const updatedTask = res.data.data;
        setTasks(tasks.map(t => t.id === updatedTask.id ? updatedTask : t));
        setIsEditTaskOpen(false);
        setEditTaskRemark('');
        refreshLogs();
      }
    } catch (err) {
      console.error('Update task failed:', err);
    }
  };

  const handleEditLogRemark = async (logId: number, currentRemark: string | null) => {
    const newRemark = prompt("Edit the remark/reason for this status change:", currentRemark || "");
    if (newRemark === null) return; // User cancelled

    try {
      const res = await api.patch(`/api/logs/${logId}`, {
        remark: newRemark.trim()
      });
      if (res.data.success) {
        refreshLogs();
      }
    } catch (err) {
      console.error('Failed to update log remark:', err);
    }
  };

  // ==========================================
  // CUSTOM HTML5 DRAG & DROP HANDLERS
  // ==========================================
  const handleDragStart = (e: React.DragEvent, taskId: number) => {
    e.dataTransfer.setData('text/plain', String(taskId));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, status: 'Todo' | 'In Progress' | 'Done') => {
    e.preventDefault();
    setDragOverColumn(status);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: 'Todo' | 'In Progress' | 'Done') => {
    e.preventDefault();
    setDragOverColumn(null);
    const taskIdStr = e.dataTransfer.getData('text/plain');
    if (!taskIdStr) return;

    const taskId = parseInt(taskIdStr);
    const draggedTask = tasks.find(t => t.id === taskId);
    
    // Ignore drop if dropped in the same column
    if (!draggedTask || draggedTask.status === targetStatus) return;

    const remarkVal = prompt(`Enter a remark for moving "${draggedTask.title}" to ${targetStatus}:`);
    if (remarkVal === null) return; // User cancelled

    // Optimistically update frontend UI
    const updatedTasks = tasks.map(t => t.id === taskId ? { ...t, status: targetStatus } : t);
    setTasks(updatedTasks);

    try {
      const res = await api.put(`/api/tasks/${taskId}`, {
        status: targetStatus,
        remark: remarkVal.trim()
      });
      if (res.data.success) {
        // Sync with actual server payload to capture logs & date updates
        const updatedTaskServer = res.data.data;
        setTasks(tasks.map(t => t.id === taskId ? updatedTaskServer : t));
        refreshLogs();
      }
    } catch (err) {
      console.error('Failed to update task status via drag-and-drop:', err);
      // Revert optimism if network failed
      if (activeProject) handleSelectProject(activeProject);
    }
  };

  // Helper: Filter tasks by column status
  const getTasksByStatus = (status: 'Todo' | 'In Progress' | 'Done') => {
    return tasks.filter(t => t.status === status);
  };

  // Helper: Generates user initial letters for profiles
  const getInitials = (username: string) => {
    return username.slice(0, 2).toUpperCase();
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex flex-col z-10 overflow-hidden">
      {/* Background glow layers */}
      <div className="ambient-glow top-0 left-1/4 w-[600px] h-[600px]"></div>
      <div className="ambient-glow-cyan bottom-10 right-0 w-[500px] h-[500px]"></div>

      {/* Header NavBar */}
      <header className="sticky top-0 z-20 shrink-0 border-b border-slate-900 bg-slate-950/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-600 font-extrabold text-slate-100 shadow-md shadow-indigo-600/20">
            A
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-slate-100">AuraBoard</span>
            <span className="text-[10px] uppercase tracking-wider text-indigo-400 font-bold bg-indigo-500/10 border border-indigo-500/20 rounded-md px-1.5 py-0.5 ml-2">PRO</span>
          </div>
        </div>

        {user && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-indigo-500/20 flex items-center justify-center text-xs font-semibold text-indigo-300">
                {getInitials(user.username)}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-semibold text-slate-200">{user.username}</p>
                <p className="text-[10px] text-slate-500">{user.email}</p>
              </div>
            </div>
            
            <button
              onClick={logout}
              className="py-1.5 px-3 rounded-lg border border-slate-800 hover:border-rose-500/30 text-slate-400 hover:text-rose-400 bg-slate-950/60 hover:bg-rose-950/10 transition-all flex items-center gap-1.5 text-xs font-medium cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        )}
      </header>

      {/* Main Workspace Frame */}
      {generalError ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="p-6 rounded-2xl bg-rose-950/20 border border-rose-500/20 max-w-md text-center">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-rose-300 mb-1">System Error</h3>
            <p className="text-xs text-slate-400 mb-4">{generalError}</p>
            <button 
              onClick={fetchData} 
              className="py-1.5 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium cursor-pointer"
            >
              Retry Connection
            </button>
          </div>
        </div>
      ) : dataLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-500">Syncing with workspace variables...</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          
          {/* LEFT COLUMN: Project Panel */}
          <aside className="w-full lg:w-64 border-b lg:border-b-0 lg:border-r border-slate-900 bg-slate-950/50 backdrop-blur-sm p-4 flex flex-col overflow-y-auto shrink-0">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold uppercase tracking-wider">
                <Briefcase className="w-3.5 h-3.5 text-indigo-500" />
                <span>My Projects</span>
              </div>
              <button
                onClick={() => setIsProjModalOpen(true)}
                className="p-1 rounded-md bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 hover:text-indigo-300 border border-indigo-500/20 transition-all cursor-pointer"
                title="Create Project"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {projects.length === 0 ? (
              <div className="text-center py-8 px-4 border border-dashed border-slate-800 rounded-xl">
                <Folder className="w-6 h-6 text-slate-700 mx-auto mb-2" />
                <p className="text-xs text-slate-500">No projects yet.</p>
                <button
                  onClick={() => setIsProjModalOpen(true)}
                  className="mt-2.5 text-xs text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
                >
                  Create one now
                </button>
              </div>
            ) : (
              <div className="space-y-1.5">
                {projects.map((proj) => {
                  const isActive = activeProject?.id === proj.id;
                  return (
                    <div 
                      key={proj.id}
                      onClick={() => handleSelectProject(proj)}
                      className={`group w-full flex items-center justify-between p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        isActive 
                          ? 'bg-indigo-600/10 border-indigo-500/40 text-indigo-200' 
                          : 'bg-slate-900/20 border-slate-900 hover:border-slate-800 text-slate-400 hover:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Folder className={`w-4 h-4 shrink-0 ${isActive ? 'text-indigo-400' : 'text-slate-600'}`} />
                        <span className="text-xs font-semibold truncate leading-none">{proj.name}</span>
                      </div>
                      <ChevronRight className={`w-3.5 h-3.5 transition-transform shrink-0 ${
                        isActive ? 'text-indigo-400 translate-x-0.5' : 'text-slate-700 group-hover:text-slate-500'
                      }`} />
                    </div>
                  );
                })}
              </div>
            )}
          </aside>

          {/* RIGHT COLUMN & BOARD: Kanban + Live Feed */}
          <main className="flex-1 flex flex-col min-w-0 overflow-y-auto lg:overflow-hidden">
            
            {activeProject ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Project SubHeader */}
                <div className="p-6 border-b border-slate-900 bg-slate-950/20 shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h1 className="text-xl font-bold tracking-tight text-slate-100">{activeProject.name}</h1>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditProjName(activeProject.name);
                            setEditProjDesc(activeProject.description || '');
                            setIsEditProjOpen(true);
                          }}
                          className="p-1 rounded-md text-slate-500 hover:text-slate-300 hover:bg-slate-900 transition-colors cursor-pointer"
                          title="Edit Project"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteProject(activeProject.id)}
                          className="p-1 rounded-md text-slate-500 hover:text-rose-400 hover:bg-slate-900 transition-colors cursor-pointer"
                          title="Delete Project"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 max-w-xl">
                      {activeProject.description || 'No description provided.'}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <UserIcon className="w-3 h-3 text-indigo-400" />
                        Owner: {activeProject.creator_name}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-cyan-400" />
                        Created: {new Date(activeProject.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsTaskModalOpen(true)}
                    className="self-start sm:self-auto py-2 px-3.5 rounded-xl font-semibold bg-indigo-600 hover:bg-indigo-500 text-slate-100 shadow-md shadow-indigo-600/10 active:scale-[0.98] transition-all flex items-center gap-1.5 text-xs cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Task</span>
                  </button>
                </div>

                {/* Dashboard grid panel */}
                <div className="flex-1 flex flex-col xl:flex-row overflow-hidden">
                  
                  {/* Kanban Columns (70% viewport) */}
                  <div className="flex-1 p-6 overflow-y-auto min-w-0">
                    {boardLoading ? (
                      <div className="h-full flex items-center justify-center">
                        <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full items-start">
                        
                        {/* COLUMN: Todo */}
                        <div 
                          onDragOver={(e) => handleDragOver(e, 'Todo')}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, 'Todo')}
                          className={`kanban-dropzone p-4 rounded-2xl bg-slate-900/20 border border-slate-900 min-h-[400px] md:min-h-full flex flex-col ${
                            dragOverColumn === 'Todo' ? 'kanban-dropzone-active' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-900/60">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Todo</h3>
                            </div>
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-900 border border-slate-800 rounded-md px-2 py-0.5">
                              {getTasksByStatus('Todo').length}
                            </span>
                          </div>

                          <div className="flex-1 space-y-3 overflow-y-auto">
                            {getTasksByStatus('Todo').map(task => (
                              <div
                                key={task.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, task.id)}
                                className="group relative p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700/60 active:scale-[0.98] transition-all cursor-grab active:cursor-grabbing shadow-lg"
                              >
                                <button
                                  onClick={() => handleOpenEditTask(task)}
                                  className="absolute top-3 right-3 p-1 rounded-md opacity-0 group-hover:opacity-100 text-slate-500 hover:text-slate-300 hover:bg-slate-900 transition-all cursor-pointer"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <h4 className="text-xs font-bold text-slate-200 mb-1 pr-6 truncate">{task.title}</h4>
                                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed mb-3">
                                  {task.description || 'No description.'}
                                </p>
                                <div className="flex items-center justify-between">
                                  {task.assignee_name ? (
                                    <div className="flex items-center gap-1.5">
                                      <div className="w-5 h-5 rounded-full bg-indigo-950 border border-indigo-500/20 text-[9px] font-bold text-indigo-300 flex items-center justify-center uppercase" title={`Assigned to ${task.assignee_name}`}>
                                        {getInitials(task.assignee_name)}
                                      </div>
                                      <span className="text-[9px] text-slate-500 truncate max-w-[80px]">{task.assignee_name}</span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1 text-[9px] text-slate-600">
                                      <UserCheck className="w-3.5 h-3.5" />
                                      <span>Unassigned</span>
                                    </div>
                                  )}
                                  <span className="text-[9px] text-slate-600 flex items-center gap-1">
                                    <Clock className="w-2.5 h-2.5" />
                                    {new Date(task.updated_at).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                            ))}

                            {getTasksByStatus('Todo').length === 0 && (
                              <div className="h-24 border border-dashed border-slate-900 rounded-xl flex items-center justify-center">
                                <span className="text-[10px] text-slate-600">Drop tasks here</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* COLUMN: In Progress */}
                        <div 
                          onDragOver={(e) => handleDragOver(e, 'In Progress')}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, 'In Progress')}
                          className={`kanban-dropzone p-4 rounded-2xl bg-slate-900/20 border border-slate-900 min-h-[400px] md:min-h-full flex flex-col ${
                            dragOverColumn === 'In Progress' ? 'kanban-dropzone-active' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-900/60">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">In Progress</h3>
                            </div>
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-900 border border-slate-800 rounded-md px-2 py-0.5">
                              {getTasksByStatus('In Progress').length}
                            </span>
                          </div>

                          <div className="flex-1 space-y-3 overflow-y-auto">
                            {getTasksByStatus('In Progress').map(task => (
                              <div
                                key={task.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, task.id)}
                                className="group relative p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700/60 active:scale-[0.98] transition-all cursor-grab active:cursor-grabbing shadow-lg"
                              >
                                <button
                                  onClick={() => handleOpenEditTask(task)}
                                  className="absolute top-3 right-3 p-1 rounded-md opacity-0 group-hover:opacity-100 text-slate-500 hover:text-slate-300 hover:bg-slate-900 transition-all cursor-pointer"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <h4 className="text-xs font-bold text-slate-200 mb-1 pr-6 truncate">{task.title}</h4>
                                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed mb-3">
                                  {task.description || 'No description.'}
                                </p>
                                <div className="flex items-center justify-between">
                                  {task.assignee_name ? (
                                    <div className="flex items-center gap-1.5">
                                      <div className="w-5 h-5 rounded-full bg-indigo-950 border border-indigo-500/20 text-[9px] font-bold text-indigo-300 flex items-center justify-center uppercase" title={`Assigned to ${task.assignee_name}`}>
                                        {getInitials(task.assignee_name)}
                                      </div>
                                      <span className="text-[9px] text-slate-500 truncate max-w-[80px]">{task.assignee_name}</span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1 text-[9px] text-slate-600">
                                      <UserCheck className="w-3.5 h-3.5" />
                                      <span>Unassigned</span>
                                    </div>
                                  )}
                                  <span className="text-[9px] text-slate-600 flex items-center gap-1">
                                    <Clock className="w-2.5 h-2.5" />
                                    {new Date(task.updated_at).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                            ))}

                            {getTasksByStatus('In Progress').length === 0 && (
                              <div className="h-24 border border-dashed border-slate-900 rounded-xl flex items-center justify-center">
                                <span className="text-[10px] text-slate-600">Drop tasks here</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* COLUMN: Done */}
                        <div 
                          onDragOver={(e) => handleDragOver(e, 'Done')}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, 'Done')}
                          className={`kanban-dropzone p-4 rounded-2xl bg-slate-900/20 border border-slate-900 min-h-[400px] md:min-h-full flex flex-col ${
                            dragOverColumn === 'Done' ? 'kanban-dropzone-active' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-900/60">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Done</h3>
                            </div>
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-900 border border-slate-800 rounded-md px-2 py-0.5">
                              {getTasksByStatus('Done').length}
                            </span>
                          </div>

                          <div className="flex-1 space-y-3 overflow-y-auto">
                            {getTasksByStatus('Done').map(task => (
                              <div
                                key={task.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, task.id)}
                                className="group relative p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700/60 active:scale-[0.98] transition-all cursor-grab active:cursor-grabbing shadow-lg"
                              >
                                <button
                                  onClick={() => handleOpenEditTask(task)}
                                  className="absolute top-3 right-3 p-1 rounded-md opacity-0 group-hover:opacity-100 text-slate-500 hover:text-slate-300 hover:bg-slate-900 transition-all cursor-pointer"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <h4 className="text-xs font-bold text-slate-300/80 mb-1 pr-6 truncate line-through decoration-slate-600">{task.title}</h4>
                                <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed mb-3">
                                  {task.description || 'No description.'}
                                </p>
                                <div className="flex items-center justify-between">
                                  {task.assignee_name ? (
                                    <div className="flex items-center gap-1.5">
                                      <div className="w-5 h-5 rounded-full bg-slate-900 border border-slate-800 text-[9px] font-bold text-slate-400 flex items-center justify-center uppercase" title={`Assigned to ${task.assignee_name}`}>
                                        {getInitials(task.assignee_name)}
                                      </div>
                                      <span className="text-[9px] text-slate-500 truncate max-w-[80px]">{task.assignee_name}</span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1 text-[9px] text-slate-600">
                                      <UserCheck className="w-3.5 h-3.5" />
                                      <span>Unassigned</span>
                                    </div>
                                  )}
                                  <span className="text-[9px] text-slate-600 flex items-center gap-1">
                                    <Clock className="w-2.5 h-2.5" />
                                    {new Date(task.updated_at).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                            ))}

                            {getTasksByStatus('Done').length === 0 && (
                              <div className="h-24 border border-dashed border-slate-900 rounded-xl flex items-center justify-center">
                                <span className="text-[10px] text-slate-600">Drop tasks here</span>
                              </div>
                            )}
                          </div>
                        </div>

                      </div>
                    )}
                  </div>

                  {/* Change Log timeline activity (30% viewport) */}
                  <aside className="w-full xl:w-80 border-t xl:border-t-0 xl:border-l border-slate-900 bg-slate-950/30 backdrop-blur-sm p-6 flex flex-col shrink-0 overflow-y-auto">
                    <div className="flex items-center gap-2 mb-4">
                      <History className="w-4 h-4 text-indigo-500" />
                      <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Change Log Feed</h3>
                    </div>

                    {logs.length === 0 ? (
                      <div className="text-center py-10">
                        <CheckSquare className="w-6 h-6 text-slate-800 mx-auto mb-2" />
                        <p className="text-xs text-slate-500">No activity recorded yet.</p>
                      </div>
                    ) : (
                      <div className="relative border-l border-slate-900 pl-4 space-y-6">
                        {logs.slice(0, 20).map((log) => {
                          const logDate = new Date(log.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          });
                          
                          let logText = '';
                          let oldBadge = '';
                          let newBadge = '';

                          if (log.old_status === log.new_status) {
                            if (log.remark && log.remark.toLowerCase().includes('created')) {
                              logText = 'created task:';
                            } else {
                              logText = 'updated task details:';
                            }
                          } else {
                            logText = 'moved task to';
                            oldBadge = log.old_status;
                            newBadge = log.new_status;
                          }

                          return (
                            <div key={log.id} className="relative text-xs group">
                              {/* Connector dot */}
                              <span className="absolute left-[-21px] mt-1 w-2.5 h-2.5 rounded-full bg-slate-950 border-2 border-indigo-500/80"></span>
                              
                              <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                                <span className="font-semibold text-slate-300">{log.operator_username}</span>
                                <span className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => handleEditLogRemark(log.id, log.remark)}
                                    className="opacity-0 group-hover:opacity-100 text-indigo-400 hover:text-indigo-300 transition-opacity cursor-pointer text-[9px]"
                                    title="Edit Remark"
                                  >
                                    Edit Remark
                                  </button>
                                  <Clock className="w-2.5 h-2.5 text-slate-600" />
                                  {logDate}
                                </span>
                              </div>

                              <p className="text-slate-400 leading-relaxed">
                                {logText}{' '}
                                {newBadge && (
                                  <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wide leading-none ${
                                    newBadge === 'Done' ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/20' : 
                                    newBadge === 'In Progress' ? 'bg-indigo-950 text-indigo-400 border border-indigo-500/20' :
                                    'bg-slate-900 text-slate-400 border border-slate-800'
                                  }`}>
                                    {newBadge}
                                  </span>
                                )}
                              </p>
                              
                              <div className="mt-1 font-bold text-slate-200 truncate" title={log.task_title}>
                                {log.task_title}
                              </div>

                              {log.remark && (
                                <p className="text-[10px] text-slate-500 mt-1 pl-2 border-l border-slate-800 italic wrap-break-word">
                                  "{log.remark}"
                                </p>
                              )}
                              
                              <div className="text-[9px] text-indigo-500/60 mt-0.5 font-medium truncate">
                                {log.project_name}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </aside>

                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <Folder className="w-12 h-12 text-slate-800 mb-3" />
                <h3 className="text-base font-bold text-slate-300">No Project Active</h3>
                <p className="text-xs text-slate-500 max-w-sm mt-1 mb-5">
                  Select a project from the sidebar to view its Kanban board, or configure a new workspace right away.
                </p>
                <button
                  onClick={() => setIsProjModalOpen(true)}
                  className="py-2 px-4 rounded-xl font-semibold bg-indigo-600 hover:bg-indigo-500 text-slate-100 shadow-md shadow-indigo-600/10 active:scale-[0.98] transition-all flex items-center gap-1.5 text-xs cursor-pointer"
                >
                  <FolderPlus className="w-4 h-4" />
                  <span>Create First Project</span>
                </button>
              </div>
            )}

          </main>
        </div>
      )}

      {/* ==========================================
          MODALS & DIALOGS
          ========================================== */}
      
      {/* DIALOG: Create Project */}
      {isProjModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative">
            <button 
              onClick={() => setIsProjModalOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-md text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <h2 className="text-base font-bold text-slate-100 mb-4">Create Project</h2>
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Project Name</label>
                <input 
                  type="text" 
                  value={newProjName}
                  onChange={(e) => setNewProjName(e.target.value)}
                  placeholder="Website Overhaul, Marketing Campaign..."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none text-xs text-slate-200 transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Description</label>
                <textarea 
                  value={newProjDesc}
                  onChange={(e) => setNewProjDesc(e.target.value)}
                  placeholder="Describe details, objectives, or teams..."
                  rows={3}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none text-xs text-slate-200 transition-colors resize-none"
                />
              </div>
              <button 
                type="submit" 
                className="w-full py-2.5 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-500 text-slate-100 text-xs transition-colors cursor-pointer"
              >
                Create Project
              </button>
            </form>
          </div>
        </div>
      )}

      {/* DIALOG: Edit Project */}
      {isEditProjOpen && activeProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative">
            <button 
              onClick={() => setIsEditProjOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-md text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <h2 className="text-base font-bold text-slate-100 mb-4">Edit Project</h2>
            <form onSubmit={handleEditProject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Project Name</label>
                <input 
                  type="text" 
                  value={editProjName}
                  onChange={(e) => setEditProjName(e.target.value)}
                  placeholder="Project name"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none text-xs text-slate-200 transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Description</label>
                <textarea 
                  value={editProjDesc}
                  onChange={(e) => setEditProjDesc(e.target.value)}
                  placeholder="Describe project details"
                  rows={3}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none text-xs text-slate-200 transition-colors resize-none"
                />
              </div>
              <button 
                type="submit" 
                className="w-full py-2.5 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-500 text-slate-100 text-xs transition-colors cursor-pointer"
              >
                Save Changes
              </button>
            </form>
          </div>
        </div>
      )}

      {/* DIALOG: Create Task */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative">
            <button 
              onClick={() => setIsTaskModalOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-md text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <h2 className="text-base font-bold text-slate-100 mb-4">Create Task</h2>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Task Title</label>
                <input 
                  type="text" 
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Task title"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none text-xs text-slate-200 transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Description</label>
                <textarea 
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                  placeholder="Provide task notes..."
                  rows={2}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none text-xs text-slate-200 transition-colors resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Assignee</label>
                  <select 
                    value={newTaskAssignee}
                    onChange={(e) => setNewTaskAssignee(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none text-xs text-slate-300 transition-colors"
                  >
                    <option value="">Unassigned</option>
                    {members.map(m => (
                      <option key={m.id} value={m.id}>{m.username}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Status</label>
                  <select 
                    value={newTaskStatus}
                    onChange={(e) => setNewTaskStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none text-xs text-slate-300 transition-colors"
                  >
                    <option value="Todo">Todo</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Done">Done</option>
                  </select>
                </div>
              </div>
              <button 
                type="submit" 
                className="w-full py-2.5 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-500 text-slate-100 text-xs transition-colors cursor-pointer"
              >
                Create Task
              </button>
            </form>
          </div>
        </div>
      )}

      {/* DIALOG: Edit Task */}
      {isEditTaskOpen && activeTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative">
            <button 
              onClick={() => setIsEditTaskOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-md text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-100">Edit Task</h2>
            </div>

            <form onSubmit={handleUpdateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Task Title</label>
                <input 
                  type="text" 
                  value={editTaskTitle}
                  onChange={(e) => setEditTaskTitle(e.target.value)}
                  placeholder="Task title"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none text-xs text-slate-200 transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Description</label>
                <textarea 
                  value={editTaskDesc}
                  onChange={(e) => setEditTaskDesc(e.target.value)}
                  placeholder="Provide notes"
                  rows={2}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none text-xs text-slate-200 transition-colors resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Assignee</label>
                  <select 
                    value={editTaskAssignee}
                    onChange={(e) => setEditTaskAssignee(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none text-xs text-slate-300 transition-colors"
                  >
                    <option value="">Unassigned</option>
                    {members.map(m => (
                      <option key={m.id} value={m.id}>{m.username}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Status</label>
                  <select 
                    value={editTaskStatus}
                    onChange={(e) => setEditTaskStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none text-xs text-slate-300 transition-colors"
                  >
                    <option value="Todo">Todo</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Done">Done</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Remark / Reason (Optional)</label>
                <input 
                  type="text" 
                  value={editTaskRemark}
                  onChange={(e) => setEditTaskRemark(e.target.value)}
                  placeholder="Explain status change or modification reason"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none text-xs text-slate-200 transition-colors"
                />
              </div>

              <button 
                type="submit" 
                className="w-full py-2.5 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-500 text-slate-100 text-xs transition-colors cursor-pointer"
              >
                Save Changes
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
