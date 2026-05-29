'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import api from '@/utils/api';
import {
  Plus,
  LogOut,
  Trash2,
  Edit3,
  User as UserIcon,
  Users,
  History,
  FolderPlus,
  Briefcase,
  ChevronRight,
  AlertCircle,
  Loader2,
  Folder,
  Calendar,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';
import { getInitials } from '@/lib/utils';
import { KanbanColumn } from '@/components/KanbanColumn';
import { ChangeLogSidebar } from '@/components/ChangeLogSidebar';
import { CreateProjectDialog } from '@/components/CreateProjectDialog';
import { EditProjectDialog } from '@/components/EditProjectDialog';
import { CreateTaskDialog } from '@/components/CreateTaskDialog';
import { EditTaskDialog } from '@/components/EditTaskDialog';
import { TaskViewDialog } from '@/components/TaskViewDialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface Project {
  id: number;
  name: string;
  description: string;
  user_id?: number;
  creator_name: string;
  team_name?: string;
  team_id?: number;
  teamMembers?: Member[];
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
  started_by: number | null;
  started_by_name: string | null;
  due_date: string | null;
  assignees?: { id: number; username: string }[];
  comments?: TaskComment[];
  subtasks?: Subtask[];
  created_at: string;
  updated_at: string;
}

interface TaskComment {
  id: number;
  task_id: number;
  user_id: number;
  username: string;
  comment: string;
  created_at: string;
}

interface Subtask {
  id: number;
  task_id: number;
  title: string;
  assigned_to: number | null;
  assignee_name: string | null;
  is_done: boolean | number;
}

interface Member {
  id: number;
  username: string;
  email: string;
  role?: 'admin' | 'leader' | 'member';
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
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const canManageWorkspace =
    user?.role === 'admin' || (user?.leaderOf?.length ?? 0) > 0;

  const cycleTheme = () => {
    if (theme === 'system') setTheme('light');
    else if (theme === 'light') setTheme('dark');
    else setTheme('system');
  };

  // Core Data State
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [logs, setLogs] = useState<ChangeLog[]>([]);
  const [assignableTeams, setAssignableTeams] = useState<
    { id: number; name: string }[]
  >([]);

  // UI State
  const [dataLoading, setDataLoading] = useState(true);
  const [boardLoading, setBoardLoading] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Move task remark modal
  const [isMoveRemarkOpen, setIsMoveRemarkOpen] = useState(false);
  const [moveRemark, setMoveRemark] = useState('');
  const [moveTargetStatus, setMoveTargetStatus] = useState<
    'Todo' | 'In Progress' | 'Done' | null
  >(null);
  const [draggedTaskForMove, setDraggedTaskForMove] = useState<Task | null>(
    null,
  );

  // Modals Open State
  const [isProjModalOpen, setIsProjModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isViewTaskOpen, setIsViewTaskOpen] = useState(false);
  const [isEditTaskOpen, setIsEditTaskOpen] = useState(false);
  const [isEditProjOpen, setIsEditProjOpen] = useState(false);
  const [isDeleteProjOpen, setIsDeleteProjOpen] = useState(false);
  const [isDeleteTaskOpen, setIsDeleteTaskOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<number | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  // Active items for editing
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  // Fetch Core Data (Projects, Users, Logs)
  const fetchData = async () => {
    try {
      setDataLoading(true);
      setGeneralError(null);

      const [projRes, logsRes, teamsRes] = await Promise.all([
        api.get('/api/projects'),
        api.get('/api/users'),
        api.get('/api/logs'),
        api.get('/api/teams'),
      ]);

      if (projRes.data.success) {
        setProjects(projRes.data.data);
        if (projRes.data.data.length > 0 && !activeProject) {
          handleSelectProject(projRes.data.data[0]);
        }
      }

      if (logsRes.data.success) {
        setLogs(logsRes.data.data);
      }

      if (teamsRes.data.success) {
        const teamsData = teamsRes.data.data;
        if (user?.role === 'admin') {
          setAssignableTeams(teamsData.allTeams || []);
        } else {
          setAssignableTeams(teamsData.leaderOf || []);
        }
      }
    } catch (err) {
      console.error('Fetch dashboard details failed:', err);
      setGeneralError(
        'Failed to fetch data from API. Please verify backend state.',
      );
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
        const projectDetail = res.data.data;
        setTasks(projectDetail.tasks || []);
        // Enrich activeProject with teamMembers so task assignee dropdowns
        // are scoped to only the project's team members
        setActiveProject((prev) =>
          prev
            ? { ...prev, teamMembers: projectDetail.teamMembers || [] }
            : prev,
        );
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
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  // Refresh Logs Utility
  const refreshLogs = async (projectId?: number) => {
    try {
      const targetProjId = projectId ?? activeProject?.id;
      const url = targetProjId
        ? `/api/logs?projectId=${targetProjId}`
        : '/api/logs';
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
  const handleCreateProject = async (
    name: string,
    description: string,
    teamId: number,
  ) => {
    try {
      const res = await api.post('/api/projects', {
        name,
        description,
        teamId,
      });
      if (res.data.success) {
        const createdProj = res.data.data;
        setProjects((prev) => [createdProj, ...prev]);
        // Use handleSelectProject so teamMembers are immediately fetched
        // and the assignee dropdown works right after project creation
        await handleSelectProject(createdProj);
        refreshLogs();
      }
    } catch (err) {
      console.error('Create project failed:', err);
      throw err;
    }
  };

  const handleEditProject = async (
    name: string,
    description: string,
    teamId: number,
  ) => {
    if (!activeProject) return;
    try {
      const res = await api.put(`/api/projects/${activeProject.id}`, {
        name,
        description,
        teamId,
      });
      if (res.data.success) {
        const updatedProj = res.data.data;
        setProjects(
          projects.map((p) => (p.id === updatedProj.id ? updatedProj : p)),
        );
        setActiveProject(updatedProj);
      }
    } catch (err) {
      console.error('Update project failed:', err);
      throw err;
    }
  };

  const handleDeleteProject = async (projectId: number) => {
    try {
      const res = await api.delete(`/api/projects/${projectId}`);
      if (res.data.success) {
        const remaining = projects.filter((p) => p.id !== projectId);
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
    } finally {
      setIsDeleteProjOpen(false);
      setProjectToDelete(null);
    }
  };

  // ==========================================
  // TASK CRUD HANDLERS
  // ==========================================
  const handleCreateTask = async (
    title: string,
    description: string,
    assigneeIds: number[],
    status: 'Todo' | 'In Progress' | 'Done',
    dueDate: string | null,
  ) => {
    if (!activeProject) return;
    try {
      const res = await api.post(`/api/projects/${activeProject.id}/tasks`, {
        title,
        description,
        status,
        assignedTo: assigneeIds,
        dueDate,
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

  const handleOpenViewTask = (task: Task) => {
    setActiveTask(task);
    setIsViewTaskOpen(true);
  };

  const replaceTask = (updatedTask: Task) => {
    setTasks((currentTasks) =>
      currentTasks.map((t) => (t.id === updatedTask.id ? updatedTask : t)),
    );
    setActiveTask((currentTask) =>
      currentTask?.id === updatedTask.id ? updatedTask : currentTask,
    );
  };

  const handleUpdateTask = async (
    taskId: number,
    fields: {
      title: string;
      description: string;
      status: 'Todo' | 'In Progress' | 'Done';
      assignedTo: number[] | null;
      dueDate: string | null;
      remark: string;
    },
  ) => {
    try {
      const res = await api.put(`/api/tasks/${taskId}`, fields);
      if (res.data.success) {
        const updatedTask = res.data.data;
        replaceTask(updatedTask);
        refreshLogs();
      }
    } catch (err) {
      console.error('Update task failed:', err);
      throw err;
    }
  };

  const handleRequestDeleteTask = (task: Task) => {
    setTaskToDelete(task);
    setIsEditTaskOpen(false);
    setIsDeleteTaskOpen(true);
  };

  const handleDeleteTask = async () => {
    if (!taskToDelete) return;

    try {
      await api.delete(`/api/tasks/${taskToDelete.id}`);
      setTasks((currentTasks) =>
        currentTasks.filter((task) => task.id !== taskToDelete.id),
      );
      setActiveTask((currentTask) =>
        currentTask?.id === taskToDelete.id ? null : currentTask,
      );
      refreshLogs();
    } catch (err) {
      console.error('Delete task failed:', err);
    } finally {
      setIsDeleteTaskOpen(false);
      setTaskToDelete(null);
    }
  };

  const handleAddTaskComment = async (taskId: number, comment: string) => {
    const res = await api.post(`/api/tasks/${taskId}/comments`, { comment });
    if (res.data.success && res.data.task) {
      replaceTask(res.data.task);
      refreshLogs();
    }
  };

  const handleAddSubtask = async (
    taskId: number,
    title: string,
    assignedTo: number | null,
  ) => {
    const res = await api.post(`/api/tasks/${taskId}/subtasks`, {
      title,
      assignedTo,
    });
    if (res.data.success && res.data.task) {
      replaceTask(res.data.task);
      refreshLogs();
    }
  };

  const handleToggleSubtask = async (
    taskId: number,
    subtaskId: number,
    isDone: boolean,
  ) => {
    const res = await api.patch(`/api/tasks/${taskId}/subtasks/${subtaskId}`, {
      isDone,
    });
    if (res.data.success && res.data.task) {
      replaceTask(res.data.task);
      refreshLogs();
    }
  };

  const handleEditLogRemark = async (
    logId: number,
    currentRemark: string | null,
  ) => {
    const newRemark = prompt(
      'Edit the remark/reason for this status change:',
      currentRemark || '',
    );
    if (newRemark === null) return;

    try {
      const res = await api.patch(`/api/logs/${logId}`, {
        remark: newRemark.trim(),
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
  const handleDragOver = (
    e: React.DragEvent,
    _status: 'Todo' | 'In Progress' | 'Done',
  ) => {
    e.preventDefault();
  };

  const handleDragLeave = () => {};

  const handleDrop = async (
    e: React.DragEvent,
    targetStatus: 'Todo' | 'In Progress' | 'Done',
  ) => {
    e.preventDefault();
    const taskIdStr = e.dataTransfer.getData('text/plain');
    if (!taskIdStr) return;

    const taskId = parseInt(taskIdStr);
    const draggedTask = tasks.find((t) => t.id === taskId);

    if (!draggedTask || draggedTask.status === targetStatus) return;

    setDraggedTaskForMove(draggedTask);
    setMoveTargetStatus(targetStatus);
    setMoveRemark('');
    setIsMoveRemarkOpen(true);
  };

  const handleConfirmMoveTask = async () => {
    if (!draggedTaskForMove || !moveTargetStatus) return;

    const taskId = draggedTaskForMove.id;
    const remark = moveRemark.trim() || null;

    try {
      const res = await api.put(`/api/tasks/${taskId}`, {
        status: moveTargetStatus,
        remark,
      });

      if (res.data.success) {
        const updatedTaskServer = res.data.data;
        setTasks(tasks.map((t) => (t.id === taskId ? updatedTaskServer : t)));
        refreshLogs();
      }
    } catch (err) {
      console.error('Failed to update task status via drag-and-drop:', err);
      if (activeProject) handleSelectProject(activeProject);
    } finally {
      setIsMoveRemarkOpen(false);
      setDraggedTaskForMove(null);
      setMoveTargetStatus(null);
      setMoveRemark('');
    }
  };

  const getTasksByStatus = (status: 'Todo' | 'In Progress' | 'Done') => {
    return tasks.filter((t) => t.status === status);
  };

  const canEditTask = (task: Task) => {
    if (canManageWorkspace) return true;
    if (!user) return false;
    return (
      task.assigned_to === user.id ||
      Boolean(task.assignees?.some((assignee) => assignee.id === user.id))
    );
  };

  if (authLoading) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-background text-foreground'>
        <Loader2 className='w-8 h-8 text-indigo-500 animate-spin' />
      </div>
    );
  }

  return (
    <div className='min-h-screen flex flex-col bg-background text-foreground transition-colors duration-200'>
      {/* Header NavBar */}
      <header className='sticky top-0 z-20 shrink-0 border-b border-border bg-card/85 backdrop-blur-md px-6 py-4 flex items-center justify-between transition-colors duration-200'>
        <div className='flex items-center gap-3'>
          <div>
            <span className='text-base font-semibold text-foreground font-sans tracking-tight'>
              Project Management Tool
            </span>
          </div>
        </div>

        {user && (
          <div className='flex items-center gap-4'>
            {/* Theme Toggle Button */}
            <button
              onClick={cycleTheme}
              className='py-1.5 px-3 rounded-lg border border-border hover:border-indigo-500/30 text-muted-foreground hover:text-indigo-600 dark:hover:text-indigo-400 bg-background/50 hover:bg-muted transition-all flex items-center gap-1.5 text-xs font-medium cursor-pointer'
              title={`Theme: ${theme.charAt(0).toUpperCase() + theme.slice(1)} (Click to toggle)`}>
              {theme === 'light' && <Sun className='w-3.5 h-3.5' />}
              {theme === 'dark' && <Moon className='w-3.5 h-3.5' />}
              {theme === 'system' && <Monitor className='w-3.5 h-3.5' />}
              <span className='hidden sm:inline font-sans capitalize'>
                {theme === 'system' ? 'System Theme' : `${theme} Mode`}
              </span>
            </button>

            {user?.role === 'admin' && (
              <button
                onClick={() => router.push('/activity')}
                className='py-1.5 px-3 rounded-lg border border-border hover:border-indigo-500/30 text-muted-foreground hover:text-indigo-600 dark:hover:text-indigo-400 bg-background/50 hover:bg-muted transition-all flex items-center gap-1.5 text-xs font-medium cursor-pointer'>
                <History className='w-3.5 h-3.5' />
                <span className='hidden sm:inline font-sans'>
                  Activity Feed
                </span>
              </button>
            )}

            {user?.role === 'admin' && (
              <button
                onClick={() => router.push('/admin')}
                className='py-1.5 px-3 rounded-lg border border-border hover:border-emerald-500/30 text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 bg-background/50 hover:bg-muted transition-all flex items-center gap-1.5 text-xs font-medium cursor-pointer'>
                <UserIcon className='w-3.5 h-3.5' />
                <span className='hidden sm:inline font-sans'>
                  Admin Console
                </span>
              </button>
            )}

            <div className='flex items-center gap-2.5'>
              <div className='w-8 h-8 rounded-full bg-muted border border-indigo-500/20 flex items-center justify-center text-xs font-semibold text-indigo-600 dark:text-indigo-300'>
                {getInitials(user.username)}
              </div>
              <div className='hidden sm:block text-left'>
                <p className='text-xs font-semibold text-foreground/90'>
                  {user.username}
                </p>
                <p className='text-[10px] text-muted-foreground'>
                  {user.email}
                </p>
              </div>
            </div>

            <button
              onClick={logout}
              className='py-1.5 px-3 rounded-lg border border-border hover:border-rose-500/30 text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400 bg-background/50 hover:bg-muted transition-all flex items-center gap-1.5 text-xs font-medium cursor-pointer'>
              <LogOut className='w-3.5 h-3.5' />
              <span className='hidden sm:inline font-sans'>Logout</span>
            </button>
          </div>
        )}
      </header>

      {/* Main Workspace Frame */}
      {generalError ? (
        <div className='flex-1 flex items-center justify-center p-6 bg-background'>
          <div className='p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 max-w-md text-center'>
            <AlertCircle className='w-10 h-10 text-rose-500 mx-auto mb-3' />
            <h3 className='text-lg font-bold text-rose-500 mb-1 font-sans'>
              System Error
            </h3>
            <p className='text-xs text-muted-foreground mb-4'>{generalError}</p>
            <button
              onClick={fetchData}
              className='py-1.5 px-4 rounded-lg bg-muted hover:bg-muted/80 text-foreground border border-border text-xs font-medium cursor-pointer'>
              Retry Connection
            </button>
          </div>
        </div>
      ) : dataLoading ? (
        <div className='flex-1 flex items-center justify-center bg-background'>
          <div className='text-center'>
            <Loader2 className='w-8 h-8 text-indigo-500 animate-spin mx-auto mb-3' />
            <p className='text-xs text-muted-foreground'>
              Syncing with workspace variables...
            </p>
          </div>
        </div>
      ) : (
        <div className='flex-1 flex flex-col lg:flex-row overflow-hidden bg-background'>
          {/* LEFT COLUMN: Project Panel */}
          <aside className='w-full lg:w-64 border-b lg:border-b-0 lg:border-r border-border bg-card/45 backdrop-blur-sm p-4 flex flex-col overflow-y-auto shrink-0 transition-colors duration-200'>
            <div className='flex items-center justify-between mb-4'>
              <div className='flex items-center gap-1.5 text-muted-foreground text-xs font-bold uppercase tracking-wider'>
                <Briefcase className='w-3.5 h-3.5 text-indigo-500' />
                <span className='font-sans'>My Projects</span>
              </div>
              {canManageWorkspace ? (
                <button
                  onClick={() => setIsProjModalOpen(true)}
                  className='p-1 rounded-md border border-indigo-500/20 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 transition-all cursor-pointer'
                  title='Create Project'>
                  <Plus className='w-4 h-4' />
                </button>
              ) : null}
            </div>

            {projects.length === 0 ? (
              <div className='text-center py-8 px-4 border border-dashed border-border rounded-xl'>
                <Folder className='w-6 h-6 text-muted-foreground/60 mx-auto mb-2' />
                <p className='text-xs text-muted-foreground'>
                  No projects yet.
                </p>
                {canManageWorkspace ? (
                  <button
                    onClick={() => setIsProjModalOpen(true)}
                    className='mt-2.5 text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-semibold cursor-pointer'>
                    Create one now
                  </button>
                ) : (
                  <p className='mt-2.5 text-xs text-muted-foreground'>
                    Only team leaders and admins can create new projects.
                  </p>
                )}
              </div>
            ) : (
              <div className='space-y-1.5'>
                {projects.map((proj) => {
                  const isActive = activeProject?.id === proj.id;
                  return (
                    <div
                      key={proj.id}
                      onClick={() => handleSelectProject(proj)}
                      className={`group w-full flex items-center justify-between p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        isActive
                          ? 'bg-indigo-600/10 border-indigo-500/40 text-indigo-600 dark:text-indigo-200'
                          : 'bg-muted/20 border-border hover:border-foreground/10 text-muted-foreground hover:text-foreground'
                      }`}>
                      <div className='flex items-center gap-2.5 min-w-0'>
                        <Folder
                          className={`w-4 h-4 shrink-0 ${isActive ? 'text-indigo-500 dark:text-indigo-400' : 'text-muted-foreground/60'}`}
                        />
                        <span className='text-xs font-semibold truncate leading-none'>
                          {proj.name}
                        </span>
                      </div>
                      <ChevronRight
                        className={`w-3.5 h-3.5 transition-transform shrink-0 ${
                          isActive
                            ? 'text-indigo-500 dark:text-indigo-400 translate-x-0.5'
                            : 'text-muted-foreground/40 group-hover:text-muted-foreground/75'
                        }`}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </aside>

          {/* RIGHT COLUMN & BOARD: Kanban + Live Feed */}
          <main className='flex-1 flex flex-col min-w-0 overflow-y-auto lg:overflow-hidden'>
            {activeProject ? (
              <div className='flex-1 flex flex-col overflow-hidden'>
                {/* Project SubHeader */}
                <div className='p-6 border-b border-border bg-card/20 shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-colors duration-200'>
                  <div>
                    <div className='flex items-center gap-3'>
                      <h1 className='text-xl font-bold tracking-tight text-foreground font-sans'>
                        {activeProject.name}
                      </h1>
                      {canManageWorkspace ? (
                        <div className='flex items-center gap-1'>
                          <button
                            onClick={() => {
                              setIsEditProjOpen(true);
                            }}
                            className='p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer'
                            title='Edit Project'>
                            <Edit3 className='w-3.5 h-3.5' />
                          </button>
                          <button
                            onClick={() => {
                              setProjectToDelete(activeProject.id);
                              setIsDeleteProjOpen(true);
                            }}
                            className='p-1 rounded-md text-muted-foreground hover:text-rose-500 hover:bg-muted transition-colors cursor-pointer'
                            title='Delete Project'>
                            <Trash2 className='w-3.5 h-3.5' />
                          </button>
                        </div>
                      ) : null}
                    </div>
                    <p className='text-xs text-muted-foreground mt-1 max-w-xl'>
                      {activeProject.description || 'No description provided.'}
                    </p>
                    <div className='flex items-center gap-3 mt-2 text-[10px] text-muted-foreground'>
                      <span className='flex items-center gap-1'>
                        <UserIcon className='w-3 h-3 text-indigo-500' />
                        Owner: {activeProject.creator_name}
                      </span>
                      {activeProject.team_name && (
                        <>
                          <span>|</span>
                          <span className='flex items-center gap-1'>
                            <Users className='w-3 h-3 text-emerald-500' />
                            Team: {activeProject.team_name}
                          </span>
                        </>
                      )}
                      <span>|</span>
                      <span className='flex items-center gap-1'>
                        <Calendar className='w-3 h-3 text-cyan-500' />
                        Created:{' '}
                        {new Date(
                          activeProject.created_at,
                        ).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {canManageWorkspace ? (
                    <button
                      onClick={() => setIsTaskModalOpen(true)}
                      className='self-start sm:self-auto py-2 px-3.5 rounded-xl font-semibold bg-indigo-600 hover:bg-indigo-500 text-primary-foreground shadow-md shadow-indigo-600/10 active:scale-[0.98] transition-all flex items-center gap-1.5 text-xs cursor-pointer'>
                      <Plus className='w-4 h-4' />
                      <span className='font-sans'>Create Task</span>
                    </button>
                  ) : null}
                </div>

                {/* Dashboard grid panel */}
                <div className='flex-1 flex flex-col xl:flex-row overflow-hidden'>
                  {/* Kanban Columns */}
                  <div className='flex-1 p-6 overflow-y-auto min-w-0'>
                    {boardLoading ? (
                      <div className='h-full flex items-center justify-center'>
                        <Loader2 className='w-6 h-6 text-indigo-500 animate-spin' />
                      </div>
                    ) : (
                      <div className='grid grid-cols-1 md:grid-cols-3 gap-6 h-full items-start'>
                        <KanbanColumn
                          title='Todo'
                          status='Todo'
                          tasks={getTasksByStatus('Todo')}
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                          onViewTask={(task) =>
                            handleOpenViewTask(task as Task)
                          }
                          onEditTask={(task) =>
                            handleOpenEditTask(task as Task)
                          }
                          canEditTask={(task) => canEditTask(task as Task)}
                        />
                        <KanbanColumn
                          title='In Progress'
                          status='In Progress'
                          tasks={getTasksByStatus('In Progress')}
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                          onViewTask={(task) =>
                            handleOpenViewTask(task as Task)
                          }
                          onEditTask={(task) =>
                            handleOpenEditTask(task as Task)
                          }
                          canEditTask={(task) => canEditTask(task as Task)}
                        />
                        <KanbanColumn
                          title='Done'
                          status='Done'
                          tasks={getTasksByStatus('Done')}
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                          onViewTask={(task) =>
                            handleOpenViewTask(task as Task)
                          }
                          onEditTask={(task) =>
                            handleOpenEditTask(task as Task)
                          }
                          canEditTask={(task) => canEditTask(task as Task)}
                        />
                      </div>
                    )}
                  </div>

                  {/* Change Log timeline activity sidebar */}
                  <ChangeLogSidebar
                    logs={logs}
                    currentUserId={user?.id}
                    onEditLogRemark={handleEditLogRemark}
                  />
                </div>
              </div>
            ) : (
              <div className='flex-1 flex flex-col items-center justify-center p-6 text-center'>
                <Folder className='w-12 h-12 text-muted-foreground/30 mb-3' />
                <h3 className='text-base font-bold text-foreground/90 font-sans'>
                  No Project Active
                </h3>
                <p className='text-xs text-muted-foreground max-w-sm mt-1 mb-5'>
                  Select a project from the sidebar to view its Kanban board, or
                  configure a new workspace right away.
                </p>
                {canManageWorkspace ? (
                  <button
                    onClick={() => setIsProjModalOpen(true)}
                    className='py-2 px-4 rounded-xl font-semibold bg-indigo-600 hover:bg-indigo-500 text-primary-foreground shadow-md shadow-indigo-600/10 active:scale-[0.98] transition-all flex items-center gap-1.5 text-xs cursor-pointer'>
                    <FolderPlus className='w-4 h-4' />
                    <span className='font-sans'>Create First Project</span>
                  </button>
                ) : (
                  <p className='text-xs text-muted-foreground max-w-sm mt-3'>
                    Only team leaders and admins can create the first project.
                  </p>
                )}
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
        teams={assignableTeams}
      />

      <EditProjectDialog
        isOpen={isEditProjOpen}
        onClose={() => setIsEditProjOpen(false)}
        project={activeProject}
        onSave={handleEditProject}
        teams={assignableTeams}
      />

      <Dialog
        open={isDeleteProjOpen}
        onOpenChange={setIsDeleteProjOpen}>
        <DialogContent className='bg-popover border border-border text-popover-foreground sm:max-w-md rounded-3xl p-6'>
          <DialogHeader>
            <DialogTitle className='text-base font-bold text-foreground flex items-center gap-2'>
              <Trash2 className='w-4.5 h-4.5 text-rose-500' />
              Delete Project
            </DialogTitle>
            <DialogDescription className='text-sm text-muted-foreground font-sans'>
              Are you sure you want to delete this project? All tasks and change
              logs will be lost permanently.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className='mt-4 flex justify-end gap-2'>
            <Button
              variant='outline'
              onClick={() => {
                setIsDeleteProjOpen(false);
                setProjectToDelete(null);
              }}
              className='rounded-xl border-border bg-background text-foreground hover:bg-muted cursor-pointer'>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (projectToDelete) {
                  await handleDeleteProject(projectToDelete);
                }
              }}
              className='bg-rose-600 hover:bg-rose-500 text-rose-foreground rounded-xl cursor-pointer'>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CreateTaskDialog
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        members={activeProject?.teamMembers || []}
        onCreate={handleCreateTask}
      />

      <EditTaskDialog
        isOpen={isEditTaskOpen}
        onClose={() => setIsEditTaskOpen(false)}
        task={activeTask}
        members={activeProject?.teamMembers || []}
        onSave={handleUpdateTask}
        canDeleteTask={canManageWorkspace}
        onDeleteTask={(task) => handleRequestDeleteTask(task as Task)}
      />

      <TaskViewDialog
        isOpen={isViewTaskOpen}
        onClose={() => setIsViewTaskOpen(false)}
        task={activeTask}
        members={activeProject?.teamMembers || []}
        onAddComment={handleAddTaskComment}
        onAddSubtask={handleAddSubtask}
        onToggleSubtask={handleToggleSubtask}
      />

      <Dialog
        open={isDeleteTaskOpen}
        onOpenChange={(open) => {
          setIsDeleteTaskOpen(open);
          if (!open) setTaskToDelete(null);
        }}>
        <DialogContent className='bg-popover border border-border text-popover-foreground sm:max-w-md rounded-3xl p-6'>
          <DialogHeader>
            <DialogTitle className='text-base font-bold text-foreground flex items-center gap-2'>
              <Trash2 className='w-4.5 h-4.5 text-rose-500' />
              Delete Task
            </DialogTitle>
            <DialogDescription className='text-sm text-muted-foreground font-sans'>
              {taskToDelete
                ? `Delete "${taskToDelete.title}" permanently? Comments, checklist items, assignees, and task activity logs will also be removed.`
                : 'Delete this task permanently?'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className='mt-4 flex justify-end gap-2'>
            <Button
              variant='outline'
              onClick={() => {
                setIsDeleteTaskOpen(false);
                setTaskToDelete(null);
              }}
              className='rounded-xl border-border bg-background text-foreground hover:bg-muted cursor-pointer'>
              Cancel
            </Button>
            <Button
              onClick={handleDeleteTask}
              className='bg-rose-600 hover:bg-rose-500 text-white rounded-xl cursor-pointer'>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isMoveRemarkOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsMoveRemarkOpen(false);
            setDraggedTaskForMove(null);
            setMoveTargetStatus(null);
            setMoveRemark('');
          }
        }}>
        <DialogContent className='bg-popover border border-border text-popover-foreground sm:max-w-md rounded-3xl p-6'>
          <DialogHeader>
            <DialogTitle className='text-base font-bold text-foreground'>
              Move task to {moveTargetStatus}
            </DialogTitle>
            <DialogDescription className='text-sm text-muted-foreground'>
              {draggedTaskForMove
                ? `Add a remark for moving "${draggedTaskForMove.title}" to ${moveTargetStatus}.`
                : 'Add a remark for this status change.'}
            </DialogDescription>
          </DialogHeader>

          <textarea
            value={moveRemark}
            onChange={(e) => setMoveRemark(e.target.value)}
            placeholder='Optional remark'
            className='min-h-30 w-full resize-none rounded-2xl border border-input bg-background px-3 py-3 text-sm text-foreground outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
          />

          <DialogFooter className='mt-4 flex justify-end gap-2'>
            <Button
              variant='outline'
              onClick={() => {
                setIsMoveRemarkOpen(false);
                setDraggedTaskForMove(null);
                setMoveTargetStatus(null);
                setMoveRemark('');
              }}
              className='rounded-xl border-border bg-background text-foreground hover:bg-muted'>
              Cancel
            </Button>
            <Button onClick={handleConfirmMoveTask}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
