'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import api from '@/utils/api';
import {
  ArrowLeft,
  Clock,
  Search,
  Filter,
  Loader2,
  MessageSquare,
  AlertCircle,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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
  isAudit?: boolean;
}

interface Project {
  id: number;
  name: string;
}

export default function ActivityPage() {
  const { user, loading: authLoading } = useAuth();
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  const [logs, setLogs] = useState<ChangeLog[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [isRemarkModalOpen, setIsRemarkModalOpen] = useState(false);
  const [editingRemarkLogId, setEditingRemarkLogId] = useState<number | null>(
    null,
  );
  const [editingRemarkText, setEditingRemarkText] = useState('');
  const [remarkSaving, setRemarkSaving] = useState(false);

  const cycleTheme = () => {
    if (theme === 'system') setTheme('light');
    else if (theme === 'light') setTheme('dark');
    else setTheme('system');
  };

  const fetchLogsAndProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const [logsRes, projRes] = await Promise.all([
        api.get('/api/logs'),
        api.get('/api/projects'),
      ]);

      if (logsRes.data.success) {
        setLogs(logsRes.data.data);
      }
      if (projRes.data.success) {
        setProjects(projRes.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch activity workspace:', err);
      setError(
        'Could not load activity feed logs. Please verify backend connection.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      if (user.role !== 'admin') {
        router.push('/');
        return;
      }
      fetchLogsAndProjects();
    }
  }, [user, authLoading, router]);

  const handleOpenEditRemark = (
    logId: number,
    currentRemark: string | null,
  ) => {
    setEditingRemarkLogId(logId);
    setEditingRemarkText(currentRemark || '');
    setIsRemarkModalOpen(true);
  };

  const handleSaveRemark = async () => {
    if (editingRemarkLogId === null) return;

    try {
      setRemarkSaving(true);
      const trimmedRemark = editingRemarkText.trim();
      const res = await api.patch(`/api/logs/${editingRemarkLogId}`, {
        remark: trimmedRemark,
      });
      if (res.data.success) {
        setLogs((prevLogs) => {
          const updatedLogs = prevLogs.map((log) =>
            log.id === editingRemarkLogId
              ? { ...log, remark: trimmedRemark }
              : log,
          );
          if (res.data.audit) {
            return [{ ...res.data.audit, isAudit: true }, ...updatedLogs];
          }
          return updatedLogs;
        });
      }
      setIsRemarkModalOpen(false);
      setEditingRemarkLogId(null);
      setEditingRemarkText('');
    } catch (err) {
      console.error('Failed to update log remark:', err);
    } finally {
      setRemarkSaving(false);
    }
  };

  // Filter logic
  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredLogs = logs.filter((log) => {
    const logRemark = log.remark ? log.remark.toLowerCase() : '';
    const matchesSearch =
      normalizedSearch === '' ||
      log.task_title.toLowerCase().includes(normalizedSearch) ||
      log.operator_username.toLowerCase().includes(normalizedSearch) ||
      log.project_name.toLowerCase().includes(normalizedSearch) ||
      logRemark.includes(normalizedSearch);

    const matchesProject =
      selectedProject === 'all' || String(log.project_name) === selectedProject;

    return matchesSearch && matchesProject;
  });

  if (authLoading || loading) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-background text-foreground'>
        <Loader2 className='w-8 h-8 text-indigo-500 animate-spin' />
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-background text-foreground flex flex-col font-sans transition-colors duration-200'>
      {/* Header */}
      <header className='sticky top-0 z-20 shrink-0 border-b border-border bg-card/85 backdrop-blur-md px-6 py-4 flex items-center justify-between transition-colors duration-200'>
        <div className='flex items-center gap-3'>
          <Button
            variant='ghost'
            size='icon'
            onClick={() => router.push('/')}
            className='text-muted-foreground hover:text-foreground cursor-pointer'>
            <ArrowLeft className='w-4 h-4' />
          </Button>
          <div>
            <h1 className='text-base font-bold tracking-tight text-foreground'>
              Global Activity Feed
            </h1>
            <p className='text-[10px] text-muted-foreground'>
              Audit logs of all changes across your projects
            </p>
          </div>
        </div>

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
      </header>

      {/* Main Container */}
      <main className='flex-1 max-w-4xl w-full mx-auto p-6 space-y-6'>
        {error && (
          <div className='p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-3'>
            <AlertCircle className='w-5 h-5 text-rose-500 shrink-0' />
            <p className='text-xs text-foreground'>{error}</p>
          </div>
        )}

        {/* Filters Bar */}
        <div className='flex flex-col md:flex-row gap-4 items-center justify-between bg-card/70 p-4 border border-border rounded-2xl transition-colors'>
          <div className='relative w-full md:w-72'>
            <Search className='absolute left-3 top-2.5 w-4 h-4 text-muted-foreground' />
            <Input
              type='text'
              placeholder='Search by task, user, or remark...'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className='pl-9 bg-background border-input focus:border-indigo-500 focus:ring-indigo-500 text-xs text-foreground'
            />
          </div>

          <div className='flex items-center gap-2 w-full md:w-auto justify-end'>
            <Filter className='w-4.5 h-4.5 text-muted-foreground' />
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className='px-3 py-2 rounded-lg bg-background border border-input text-xs text-foreground focus:outline-none focus:border-indigo-500 transition-colors w-full md:w-48'>
              <option value='all'>All Projects</option>
              {projects.map((proj) => (
                <option
                  key={proj.id}
                  value={proj.name}>
                  {proj.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Logs Feed List */}
        <div className='space-y-4'>
          {filteredLogs.length === 0 ? (
            <Card className='p-12 text-center border-border bg-card/50'>
              <Clock className='w-8 h-8 text-muted-foreground/40 mx-auto mb-3' />
              <h3 className='text-sm font-bold text-foreground'>
                No Logs Found
              </h3>
              <p className='text-xs text-muted-foreground mt-1'>
                Try broadening your filters or updating a task on your board.
              </p>
            </Card>
          ) : (
            filteredLogs.map((log) => {
              const formattedDate = new Date(log.created_at).toLocaleString(
                [],
                {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                },
              );

              let actionText = '';
              let badgeStyles = '';
              let showBadge = false;
              const isAuditLog =
                log.isAudit ||
                (log.remark?.startsWith('Remark edited from') ?? false);

              if (isAuditLog) {
                actionText = 'recorded an audit event for';
              } else if (log.old_status === log.new_status) {
                if (
                  log.remark &&
                  log.remark.toLowerCase().includes('created')
                ) {
                  actionText = 'created the task';
                } else {
                  actionText = 'updated details for';
                }
              } else {
                actionText = `changed status from ${log.old_status} to`;
                showBadge = true;
                if (log.new_status === 'Done') {
                  badgeStyles =
                    'bg-emerald-950 text-emerald-400 border border-emerald-500/20';
                } else if (log.new_status === 'In Progress') {
                  badgeStyles =
                    'bg-indigo-950 text-indigo-400 border border-indigo-500/20';
                } else {
                  badgeStyles =
                    'bg-muted text-muted-foreground border border-border';
                }
              }

              return (
                <Card
                  key={log.id}
                  className={`p-4 transition-all flex flex-col md:flex-row md:items-start justify-between gap-4 ${
                    isAuditLog
                      ? 'bg-muted/40 border-border ring-1 ring-border'
                      : 'bg-card/70 border-border hover:border-foreground/15'
                  }`}>
                  <div className='space-y-1.5 min-w-0'>
                    <div className='flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider'>
                      <span className='text-foreground/85'>
                        {log.operator_username}
                      </span>
                      <span>|</span>
                      <span className='text-indigo-600 dark:text-indigo-400/80'>
                        {log.project_name}
                      </span>
                      {isAuditLog && (
                        <span className='rounded-full border border-border bg-background/70 px-2 py-0.5 text-[9px] text-muted-foreground'>
                          Audit Entry
                        </span>
                      )}
                    </div>

                    <h4 className='text-sm font-bold text-foreground truncate'>
                      {log.task_title}
                    </h4>

                    <div className='flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground'>
                      <span>{actionText}</span>
                      {showBadge && (
                        <Badge
                          className={`${badgeStyles} font-bold text-[8px] uppercase px-1.5 py-0.5 rounded leading-none shrink-0`}>
                          {log.new_status}
                        </Badge>
                      )}
                    </div>

                    {log.remark && (
                      <div className='mt-2 p-2.5 rounded-lg bg-background border border-border flex items-start gap-2 max-w-xl'>
                        <MessageSquare className='w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0' />
                        <p className='text-xs text-muted-foreground italic font-mono leading-relaxed wrap-break-word'>
                          "{log.remark}"
                        </p>
                      </div>
                    )}
                  </div>

                  <div className='flex md:flex-col items-end justify-between shrink-0 text-right gap-2 border-t md:border-t-0 border-border pt-3 md:pt-0'>
                    <span className='text-[10px] text-muted-foreground flex items-center gap-1'>
                      <Clock className='w-3 h-3 text-muted-foreground' />
                      {formattedDate}
                    </span>
                    {!isAuditLog && user?.id === log.user_id ? (
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => handleOpenEditRemark(log.id, log.remark)}
                        className='border-border bg-background hover:bg-muted hover:text-foreground text-[10px] px-2.5 py-1 h-7 cursor-pointer'>
                        Edit Remark
                      </Button>
                    ) : isAuditLog ? (
                      <Badge className='bg-muted text-muted-foreground border border-border text-[10px] uppercase px-2 py-1 rounded'>
                        Audit Entry
                      </Badge>
                    ) : (
                      <span className='text-[10px] text-muted-foreground italic'>
                        Only the remark owner can edit
                      </span>
                    )}
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </main>

      <Dialog
        open={isRemarkModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsRemarkModalOpen(false);
            setEditingRemarkLogId(null);
            setEditingRemarkText('');
          }
        }}>
        <DialogContent className='bg-popover border border-border text-popover-foreground sm:max-w-md rounded-3xl p-6'>
          <DialogHeader>
            <DialogTitle className='text-base font-bold text-foreground'>
              Edit remark
            </DialogTitle>
            <DialogDescription className='text-sm text-muted-foreground'>
              Update the remark for this status change.
            </DialogDescription>
          </DialogHeader>

          <textarea
            value={editingRemarkText}
            onChange={(e) => setEditingRemarkText(e.target.value)}
            placeholder='Enter remark...'
            className='min-h-35 w-full resize-none rounded-2xl border border-input bg-background px-3 py-3 text-sm text-foreground outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
          />

          <DialogFooter className='mt-4 flex justify-end gap-2'>
            <Button
              variant='outline'
              onClick={() => {
                setIsRemarkModalOpen(false);
                setEditingRemarkLogId(null);
                setEditingRemarkText('');
              }}
              disabled={remarkSaving}
              className='rounded-xl border-border bg-background text-foreground hover:bg-muted'>
              Cancel
            </Button>
            <Button
              onClick={handleSaveRemark}
              disabled={remarkSaving}>
              {remarkSaving ? 'Saving...' : 'Save Remark'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
