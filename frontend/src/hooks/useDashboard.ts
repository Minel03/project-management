'use client';

import { useEffect, useRef, useState, type DragEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import api from '@/utils/api';
import { getErrorMessage } from '@/lib/get-error-message';
import { toast } from 'sonner';
import type {
  AssignableTeam,
  ChangeLog,
  Project,
  Task,
  TaskStatus,
} from '@/types/dashboard';

export function useDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const canManageWorkspace =
    user?.role === 'admin' || (user?.leaderOf?.length ?? 0) > 0;

  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [logs, setLogs] = useState<ChangeLog[]>([]);
  const [assignableTeams, setAssignableTeams] = useState<AssignableTeam[]>([]);

  const [dataLoading, setDataLoading] = useState(true);
  const [boardLoading, setBoardLoading] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [creatingProject, setCreatingProject] = useState(false);
  const [editingProject, setEditingProject] = useState(false);
  const [deletingProject, setDeletingProject] = useState(false);
  const [creatingTask, setCreatingTask] = useState(false);
  const [editingTask, setEditingTask] = useState(false);
  const [deletingTask, setDeletingTask] = useState(false);
  const [savingMoveRemark, setSavingMoveRemark] = useState(false);
  const [savingLogRemark, setSavingLogRemark] = useState(false);
  const creatingProjectRef = useRef(false);
  const editingProjectRef = useRef(false);
  const deletingProjectRef = useRef(false);
  const creatingTaskRef = useRef(false);
  const editingTaskRef = useRef(false);
  const deletingTaskRef = useRef(false);
  const savingMoveRemarkRef = useRef(false);
  const savingLogRemarkRef = useRef(false);

  const [isMoveRemarkOpen, setIsMoveRemarkOpen] = useState(false);
  const [moveRemark, setMoveRemark] = useState('');
  const [moveTargetStatus, setMoveTargetStatus] = useState<TaskStatus | null>(
    null,
  );
  const [draggedTaskForMove, setDraggedTaskForMove] = useState<Task | null>(
    null,
  );

  const [isProjModalOpen, setIsProjModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isViewTaskOpen, setIsViewTaskOpen] = useState(false);
  const [isEditTaskOpen, setIsEditTaskOpen] = useState(false);
  const [isEditProjOpen, setIsEditProjOpen] = useState(false);
  const [isDeleteProjOpen, setIsDeleteProjOpen] = useState(false);
  const [isDeleteTaskOpen, setIsDeleteTaskOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<number | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [isEditLogRemarkOpen, setIsEditLogRemarkOpen] = useState(false);
  const [editLogRemarkId, setEditLogRemarkId] = useState<number | null>(null);
  const [editLogRemarkCurrent, setEditLogRemarkCurrent] = useState<
    string | null
  >(null);

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

  const handleSelectProject = async (project: Project) => {
    setActiveProject(project);
    setBoardLoading(true);
    try {
      const res = await api.get(`/api/projects/${project.id}`);
      if (res.data.success) {
        const projectDetail = res.data.data;
        setTasks(projectDetail.tasks || []);
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

  const fetchData = async () => {
    try {
      setDataLoading(true);
      setGeneralError(null);

      const [projRes, , logsRes, teamsRes] = await Promise.all([
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

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  const handleCreateProject = async (
    name: string,
    description: string,
    teamId: number,
  ) => {
    if (creatingProjectRef.current) return;
    try {
      creatingProjectRef.current = true;
      setCreatingProject(true);
      const res = await api.post('/api/projects', {
        name,
        description,
        teamId,
      });
      if (res.data.success) {
        const createdProj = res.data.data;
        setProjects((prev) => [createdProj, ...prev]);
        await handleSelectProject(createdProj);
        refreshLogs();
        toast.success('Project created.');
      }
    } catch (err) {
      console.error('Create project failed:', err);
      toast.error(getErrorMessage(err, 'Could not create project.'));
      throw err;
    } finally {
      creatingProjectRef.current = false;
      setCreatingProject(false);
    }
  };

  const handleEditProject = async (
    name: string,
    description: string,
    teamId: number,
  ) => {
    if (!activeProject || editingProjectRef.current) return;
    try {
      editingProjectRef.current = true;
      setEditingProject(true);
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
        toast.success('Project updated.');
      }
    } catch (err) {
      console.error('Update project failed:', err);
      toast.error(getErrorMessage(err, 'Could not update project.'));
      throw err;
    } finally {
      editingProjectRef.current = false;
      setEditingProject(false);
    }
  };

  const handleDeleteProject = async (projectId: number) => {
    if (deletingProjectRef.current) return;
    try {
      deletingProjectRef.current = true;
      setDeletingProject(true);
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
        toast.success('Project deleted.');
      }
    } catch (err) {
      console.error('Delete project failed:', err);
      toast.error(getErrorMessage(err, 'Could not delete project.'));
    } finally {
      setIsDeleteProjOpen(false);
      setProjectToDelete(null);
      deletingProjectRef.current = false;
      setDeletingProject(false);
    }
  };

  const handleCreateTask = async (
    title: string,
    description: string,
    assigneeIds: number[],
    status: TaskStatus,
    dueDate: string | null,
  ) => {
    if (!activeProject || creatingTaskRef.current) return;
    try {
      creatingTaskRef.current = true;
      setCreatingTask(true);
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
        toast.success('Task created.');
      }
    } catch (err) {
      console.error('Create task failed:', err);
      toast.error(getErrorMessage(err, 'Could not create task.'));
      throw err;
    } finally {
      creatingTaskRef.current = false;
      setCreatingTask(false);
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
      status: TaskStatus;
      assignedTo: number[] | null;
      dueDate: string | null;
      remark: string;
    },
  ) => {
    if (editingTaskRef.current) return;
    try {
      editingTaskRef.current = true;
      setEditingTask(true);
      const res = await api.put(`/api/tasks/${taskId}`, fields);
      if (res.data.success) {
        replaceTask(res.data.data);
        refreshLogs();
        toast.success('Task updated.');
      }
    } catch (err) {
      console.error('Update task failed:', err);
      toast.error(getErrorMessage(err, 'Could not update task.'));
      throw err;
    } finally {
      editingTaskRef.current = false;
      setEditingTask(false);
    }
  };

  const handleRequestDeleteTask = (task: Task) => {
    setTaskToDelete(task);
    setIsEditTaskOpen(false);
    setIsDeleteTaskOpen(true);
  };

  const handleDeleteTask = async () => {
    if (!taskToDelete || deletingTaskRef.current) return;

    try {
      deletingTaskRef.current = true;
      setDeletingTask(true);
      await api.delete(`/api/tasks/${taskToDelete.id}`);
      setTasks((currentTasks) =>
        currentTasks.filter((task) => task.id !== taskToDelete.id),
      );
      setActiveTask((currentTask) =>
        currentTask?.id === taskToDelete.id ? null : currentTask,
      );
      refreshLogs();
      toast.success('Task deleted.');
    } catch (err) {
      console.error('Delete task failed:', err);
      toast.error(getErrorMessage(err, 'Could not delete task.'));
    } finally {
      setIsDeleteTaskOpen(false);
      setTaskToDelete(null);
      deletingTaskRef.current = false;
      setDeletingTask(false);
    }
  };

  const handleAddTaskComment = async (taskId: number, comment: string) => {
    try {
      const res = await api.post(`/api/tasks/${taskId}/comments`, { comment });
      if (res.data.success && res.data.task) {
        replaceTask(res.data.task);
        refreshLogs();
        toast.success('Comment added.');
        return res.data.task as Task;
      }
    } catch (err) {
      console.error('Add comment failed:', err);
      toast.error(getErrorMessage(err, 'Could not add comment.'));
      throw err;
    }
  };

  const handleAddSubtask = async (
    taskId: number,
    title: string,
    assignedTo: number | null,
  ) => {
    try {
      const res = await api.post(`/api/tasks/${taskId}/subtasks`, {
        title,
        assignedTo,
      });
      if (res.data.success && res.data.task) {
        replaceTask(res.data.task);
        refreshLogs();
        toast.success('Subtask added.');
        return res.data.task as Task;
      }
    } catch (err) {
      console.error('Add subtask failed:', err);
      toast.error(getErrorMessage(err, 'Could not add subtask.'));
      throw err;
    }
  };

  const handleToggleSubtask = async (
    taskId: number,
    subtaskId: number,
    isDone: boolean,
  ) => {
    try {
      const res = await api.patch(
        `/api/tasks/${taskId}/subtasks/${subtaskId}`,
        { isDone },
      );
      if (res.data.success && res.data.task) {
        replaceTask(res.data.task);
        refreshLogs();
        return res.data.task as Task;
      }
    } catch (err) {
      console.error('Toggle subtask failed:', err);
      toast.error(getErrorMessage(err, 'Could not update subtask.'));
      throw err;
    }
  };

  const handleEditLogRemark = (logId: number, currentRemark: string | null) => {
    setEditLogRemarkId(logId);
    setEditLogRemarkCurrent(currentRemark);
    setIsEditLogRemarkOpen(true);
  };

  const handleSaveLogRemark = async (newRemark: string) => {
    if (editLogRemarkId === null || savingLogRemarkRef.current) return;

    try {
      savingLogRemarkRef.current = true;
      setSavingLogRemark(true);
      const res = await api.patch(`/api/logs/${editLogRemarkId}`, {
        remark: newRemark,
      });
      if (res.data.success) {
        refreshLogs();
        toast.success('Remark updated.');
        setIsEditLogRemarkOpen(false);
      }
    } catch (err) {
      console.error('Failed to update log remark:', err);
      toast.error(getErrorMessage(err, 'Could not update remark.'));
    } finally {
      savingLogRemarkRef.current = false;
      setSavingLogRemark(false);
    }
  };

  const handleDragOver = (e: DragEvent, _status: TaskStatus) => {
    e.preventDefault();
  };

  const handleDragLeave = () => {};

  const handleDrop = async (e: DragEvent, targetStatus: TaskStatus) => {
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
    if (
      !draggedTaskForMove ||
      !moveTargetStatus ||
      savingMoveRemarkRef.current
    )
      return;

    const taskId = draggedTaskForMove.id;
    const remark = moveRemark.trim() || null;

    try {
      savingMoveRemarkRef.current = true;
      setSavingMoveRemark(true);
      const res = await api.put(`/api/tasks/${taskId}`, {
        status: moveTargetStatus,
        remark,
      });

      if (res.data.success) {
        const updatedTaskServer = res.data.data;
        setTasks(tasks.map((t) => (t.id === taskId ? updatedTaskServer : t)));
        refreshLogs();
        toast.success(`Task moved to ${moveTargetStatus}.`);
      }
    } catch (err) {
      console.error('Failed to update task status via drag-and-drop:', err);
      toast.error(getErrorMessage(err, 'Could not move task.'));
      if (activeProject) handleSelectProject(activeProject);
    } finally {
      setIsMoveRemarkOpen(false);
      setDraggedTaskForMove(null);
      setMoveTargetStatus(null);
      setMoveRemark('');
      savingMoveRemarkRef.current = false;
      setSavingMoveRemark(false);
    }
  };

  const closeMoveRemarkDialog = () => {
    setIsMoveRemarkOpen(false);
    setDraggedTaskForMove(null);
    setMoveTargetStatus(null);
    setMoveRemark('');
  };

  const getTasksByStatus = (status: TaskStatus) => {
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

  return {
    user,
    authLoading,
    canManageWorkspace,
    projects,
    activeProject,
    tasks,
    logs,
    assignableTeams,
    dataLoading,
    boardLoading,
    generalError,
    creatingProject,
    editingProject,
    deletingProject,
    creatingTask,
    editingTask,
    deletingTask,
    savingMoveRemark,
    savingLogRemark,
    isMoveRemarkOpen,
    moveRemark,
    setMoveRemark,
    moveTargetStatus,
    draggedTaskForMove,
    isProjModalOpen,
    setIsProjModalOpen,
    isTaskModalOpen,
    setIsTaskModalOpen,
    isViewTaskOpen,
    setIsViewTaskOpen,
    isEditTaskOpen,
    setIsEditTaskOpen,
    isEditProjOpen,
    setIsEditProjOpen,
    isDeleteProjOpen,
    setIsDeleteProjOpen,
    isDeleteTaskOpen,
    setIsDeleteTaskOpen,
    projectToDelete,
    setProjectToDelete,
    taskToDelete,
    setTaskToDelete,
    activeTask,
    fetchData,
    handleSelectProject,
    handleCreateProject,
    handleEditProject,
    handleDeleteProject,
    handleCreateTask,
    handleOpenEditTask,
    handleOpenViewTask,
    handleUpdateTask,
    handleRequestDeleteTask,
    handleDeleteTask,
    handleAddTaskComment,
    handleAddSubtask,
    handleToggleSubtask,
    handleEditLogRemark,
    handleSaveLogRemark,
    isEditLogRemarkOpen,
    setIsEditLogRemarkOpen,
    editLogRemarkId,
    editLogRemarkCurrent,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleConfirmMoveTask,
    closeMoveRemarkDialog,
    getTasksByStatus,
    canEditTask,
  };
}
