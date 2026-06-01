'use client';

import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import {
  Plus,
  Trash2,
  Edit3,
  User as UserIcon,
  Users,
  Briefcase,
  ChevronRight,
  AlertCircle,
  Folder,
  Calendar,
  FolderPlus,
} from 'lucide-react';
import { KanbanColumn } from '@/components/KanbanColumn';
import { KanbanBoardSkeleton } from '@/components/KanbanBoardSkeleton';
import { ChangeLogSidebar } from '@/components/ChangeLogSidebar';
import { DashboardSkeleton } from '@/components/DashboardSkeleton';
import { DashboardHeader } from '@/components/DashboardHeader';
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
import { useDashboard } from '@/hooks/useDashboard';
import type { Task } from '@/types/dashboard';

export default function DashboardPage() {
  const { logout } = useAuth();
  const { theme, setTheme } = useTheme();

  const cycleTheme = () => {
    if (theme === 'system') setTheme('light');
    else if (theme === 'light') setTheme('dark');
    else setTheme('system');
  };

  const dashboard = useDashboard();

  const {
    user,
    authLoading,
    canManageWorkspace,
    projects,
    activeProject,
    logs,
    assignableTeams,
    dataLoading,
    boardLoading,
    generalError,
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
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleConfirmMoveTask,
    closeMoveRemarkDialog,
    getTasksByStatus,
    canEditTask,
  } = dashboard;

  if (authLoading) {
    return (
      <div className='min-h-screen flex flex-col bg-background text-foreground'>
        <DashboardHeader loading />
        <DashboardSkeleton />
      </div>
    );
  }

  return (
    <div className='min-h-screen flex flex-col bg-background text-foreground transition-colors duration-200'>
      <DashboardHeader
        user={user}
        theme={theme}
        onCycleTheme={cycleTheme}
        onLogout={logout}
      />

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
        <DashboardSkeleton />
      ) : (
        <div className='flex-1 flex flex-col lg:flex-row overflow-hidden bg-background'>
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

          <main className='flex-1 flex flex-col min-w-0 overflow-y-auto lg:overflow-hidden'>
            {activeProject ? (
              <div className='flex-1 flex flex-col overflow-hidden'>
                <div className='p-6 border-b border-border bg-card/20 shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-colors duration-200'>
                  <div>
                    <div className='flex items-center gap-3'>
                      <h1 className='text-xl font-bold tracking-tight text-foreground font-sans'>
                        {activeProject.name}
                      </h1>
                      {canManageWorkspace ? (
                        <div className='flex items-center gap-1'>
                          <button
                            onClick={() => setIsEditProjOpen(true)}
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

                <div className='flex-1 flex flex-col xl:flex-row overflow-hidden'>
                  <div className='flex-1 p-6 overflow-y-auto min-w-0'>
                    {boardLoading ? (
                      <KanbanBoardSkeleton />
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

      <Dialog open={isDeleteProjOpen} onOpenChange={setIsDeleteProjOpen}>
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
          if (!open) closeMoveRemarkDialog();
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
              onClick={closeMoveRemarkDialog}
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
