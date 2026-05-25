'use client';

import React, { useEffect, useState } from 'react';
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
  FolderPlus, 
  Briefcase, 
  ChevronRight, 
  AlertCircle, 
  Loader2, 
  Folder, 
  Calendar,
} from 'lucide-react';
import { getInitials } from '@/lib/utils';
import { KanbanColumn } from '@/components/KanbanColumn';
import { ChangeLogSidebar } from '@/components/ChangeLogSidebar';
import { CreateProjectDialog } from '@/components/CreateProjectDialog';
import { EditProjectDialog } from '@/components/EditProjectDialog';
import { CreateTaskDialog } from '@/components/CreateTaskDialog';
import { EditTaskDialog } from '@/components/EditTaskDialog';

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

  // Active items for editing
  const [activeTask, setActiveTask] = useState<Task | null>(null);
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
      refreshLogs(project.id);
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
  const refreshLogs = async (projectId?: number) => {
    try {
      const targetProjId = projectId ?? activeProject?.id;
      const url = targetProjId ? `/api/logs?projectId=${targetProjId}` : '/api/logs';
      const logsRes = await api.get(url);
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
  const handleCreateProject = async (name: string, description: string) => {
    try {
      const res = await api.post('/api/projects', { name, description });
      if (res.data.success) {
        const createdProj = res.data.data;
        setProjects([createdProj, ...projects]);
        setActiveProject(createdProj);
        setTasks([]);
        refreshLogs();
      }
    } catch (err) {
      console.error('Create project failed:', err);
      throw err;
    }
  };

  const handleEditProject = async (name: string, description: string) => {
    if (!activeProject) return;
    try {
      const res = await api.put(`/api/projects/${activeProject.id}`, { name, description });
      if (res.data.success) {
        const updatedProj = res.data.data;
        setProjects(projects.map(p => p.id === updatedProj.id ? updatedProj : p));
        setActiveProject(updatedProj);
      }
    } catch (err) {
      console.error('Update project failed:', err);
      throw err;
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
  const handleCreateTask = async (title: string, description: string, assigneeId: number | null, status: 'Todo' | 'In Progress' | 'Done') => {
    if (!activeProject) return;
    try {
      const res = await api.post(`/api/projects/${activeProject.id}/tasks`, {
        title,
        description,
        status,
        assignedTo: assigneeId
      });

      if (res.data.success) {
        setTasks([...tasks, res.data.data]);
        refreshLogs();
      }
    } catch (err) {
      console.error('Create task failed:', err);
      throw err;
    }
  };

  const handleOpenEditTask = (task: Task) => {
    setActiveTask(task);
    setIsEditTaskOpen(true);
  };

  const handleUpdateTask = async (taskId: number, fields: {
    title: string;
    description: string;
    status: 'Todo' | 'In Progress' | 'Done';
    assignedTo: number | null;
    remark: string;
  }) => {
    try {
      const res = await api.put(`/api/tasks/${taskId}`, fields);
      if (res.data.success) {
        const updatedTask = res.data.data;
        setTasks(tasks.map(t => t.id === updatedTask.id ? updatedTask : t));
        refreshLogs();
      }
    } catch (err) {
      console.error('Update task failed:', err);
      throw err;
    }
  };

  const handleEditLogRemark = async (logId: number, currentRemark: string | null) => {
    const newRemark = prompt("Edit the remark/reason for this status change:", currentRemark || "");
    if (newRemark === null) return;

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
    
    if (!draggedTask || draggedTask.status === targetStatus) return;

    const remarkVal = prompt(`Enter a remark for moving "${draggedTask.title}" to ${targetStatus}:`);
    if (remarkVal === null) return;

    // Optimistically update frontend UI
    const updatedTasks = tasks.map(t => t.id === taskId ? { ...t, status: targetStatus } : t);
    setTasks(updatedTasks);

    try {
      const res = await api.put(`/api/tasks/${taskId}`, {
        status: targetStatus,
        remark: remarkVal.trim()
      });
      if (res.data.success) {
        const updatedTaskServer = res.data.data;
        setTasks(tasks.map(t => t.id === taskId ? updatedTaskServer : t));
        refreshLogs();
      }
    } catch (err) {
      console.error('Failed to update task status via drag-and-drop:', err);
      if (activeProject) handleSelectProject(activeProject);
    }
  };

  const getTasksByStatus = (status: 'Todo' | 'In Progress' | 'Done') => {
    return tasks.filter(t => t.status === status);
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
      {/* Header NavBar */}
      <header className="sticky top-0 z-20 shrink-0 border-b border-slate-900 bg-slate-950/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-600 font-extrabold text-slate-100 shadow-md shadow-indigo-600/20">
            A
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-slate-100 font-sans">AuraBoard</span>
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
              onClick={() => router.push('/activity')}
              className="py-1.5 px-3 rounded-lg border border-slate-800 hover:border-indigo-500/30 text-slate-400 hover:text-indigo-400 bg-slate-950/60 hover:bg-indigo-950/10 transition-all flex items-center gap-1.5 text-xs font-medium cursor-pointer"
            >
              <History className="w-3.5 h-3.5" />
              <span className="hidden sm:inline font-sans">Activity Feed</span>
            </button>

            <button
              onClick={logout}
              className="py-1.5 px-3 rounded-lg border border-slate-800 hover:border-rose-500/30 text-slate-400 hover:text-rose-400 bg-slate-950/60 hover:bg-rose-950/10 transition-all flex items-center gap-1.5 text-xs font-medium cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline font-sans">Logout</span>
            </button>

          </div>
        )}
      </header>

      {/* Main Workspace Frame */}
      {generalError ? (
        <div className="flex-1 flex items-center justify-center p-6 bg-slate-950">
          <div className="p-6 rounded-2xl bg-rose-950/20 border border-rose-500/20 max-w-md text-center">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-rose-300 mb-1 font-sans">System Error</h3>
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
        <div className="flex-1 flex items-center justify-center bg-slate-950">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-500">Syncing with workspace variables...</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-slate-950">
          
          {/* LEFT COLUMN: Project Panel */}
          <aside className="w-full lg:w-64 border-b lg:border-b-0 lg:border-r border-slate-900 bg-slate-950/50 backdrop-blur-sm p-4 flex flex-col overflow-y-auto shrink-0">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold uppercase tracking-wider">
                <Briefcase className="w-3.5 h-3.5 text-indigo-500" />
                <span className="font-sans">My Projects</span>
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
                      <h1 className="text-xl font-bold tracking-tight text-slate-100 font-sans">{activeProject.name}</h1>
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
                    <span className="font-sans">Create Task</span>
                  </button>
                </div>

                {/* Dashboard grid panel */}
                <div className="flex-1 flex flex-col xl:flex-row overflow-hidden">
                  
                  {/* Kanban Columns */}
                  <div className="flex-1 p-6 overflow-y-auto min-w-0">
                    {boardLoading ? (
                      <div className="h-full flex items-center justify-center">
                        <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full items-start">
                        <KanbanColumn
                          title="Todo"
                          status="Todo"
                          tasks={getTasksByStatus('Todo')}
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                          onEditTask={handleOpenEditTask}
                        />
                        <KanbanColumn
                          title="In Progress"
                          status="In Progress"
                          tasks={getTasksByStatus('In Progress')}
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                          onEditTask={handleOpenEditTask}
                        />
                        <KanbanColumn
                          title="Done"
                          status="Done"
                          tasks={getTasksByStatus('Done')}
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                          onEditTask={handleOpenEditTask}
                        />
                      </div>
                    )}
                  </div>

                  {/* Change Log timeline activity sidebar */}
                  <ChangeLogSidebar
                    logs={logs}
                    onEditLogRemark={handleEditLogRemark}
                  />

                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <Folder className="w-12 h-12 text-slate-800 mb-3" />
                <h3 className="text-base font-bold text-slate-300 font-sans">No Project Active</h3>
                <p className="text-xs text-slate-500 max-w-sm mt-1 mb-5">
                  Select a project from the sidebar to view its Kanban board, or configure a new workspace right away.
                </p>
                <button
                  onClick={() => setIsProjModalOpen(true)}
                  className="py-2 px-4 rounded-xl font-semibold bg-indigo-600 hover:bg-indigo-500 text-slate-100 shadow-md shadow-indigo-600/10 active:scale-[0.98] transition-all flex items-center gap-1.5 text-xs cursor-pointer"
                >
                  <FolderPlus className="w-4 h-4" />
                  <span className="font-sans">Create First Project</span>
                </button>
              </div>
            )}
          </main>
        </div>
      )}

      {/* ==========================================
          MODALS & DIALOGS
          ========================================== */}
      <CreateProjectDialog
        isOpen={isProjModalOpen}
        onClose={() => setIsProjModalOpen(false)}
        onCreate={handleCreateProject}
      />

      <EditProjectDialog
        isOpen={isEditProjOpen}
        onClose={() => setIsEditProjOpen(false)}
        project={activeProject}
        onSave={handleEditProject}
      />

      <CreateTaskDialog
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        members={members}
        onCreate={handleCreateTask}
      />

      <EditTaskDialog
        isOpen={isEditTaskOpen}
        onClose={() => setIsEditTaskOpen(false)}
        task={activeTask}
        members={members}
        onSave={handleUpdateTask}
      />
    </div>
  );
}
