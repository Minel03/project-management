'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import api from '@/utils/api';
import { 
  ArrowLeft, 
  Clock, 
  Search, 
  Filter, 
  Loader2, 
  MessageSquare,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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

interface Project {
  id: number;
  name: string;
}

export default function ActivityPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [logs, setLogs] = useState<ChangeLog[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProject, setSelectedProject] = useState<string>('all');

  const fetchLogsAndProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const [logsRes, projRes] = await Promise.all([
        api.get('/api/logs'),
        api.get('/api/projects')
      ]);

      if (logsRes.data.success) {
        setLogs(logsRes.data.data);
      }
      if (projRes.data.success) {
        setProjects(projRes.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch activity workspace:', err);
      setError('Could not load activity feed logs. Please verify backend connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user) {
      fetchLogsAndProjects();
    }
  }, [user, authLoading]);

  const handleEditRemark = async (logId: number, currentRemark: string | null) => {
    const newRemark = prompt("Edit the remark/reason for this status change:", currentRemark || "");
    if (newRemark === null) return;

    try {
      const res = await api.patch(`/api/logs/${logId}`, {
        remark: newRemark.trim()
      });
      if (res.data.success) {
        // Update local logs list
        setLogs(logs.map(log => log.id === logId ? { ...log, remark: newRemark.trim() } : log));
      }
    } catch (err) {
      console.error('Failed to update log remark:', err);
    }
  };

  // Filter logic
  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.task_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.operator_username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.remark && log.remark.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesProject = selectedProject === 'all' || String(log.project_name) === selectedProject;

    return matchesSearch && matchesProject;
  });

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Header */}
      <header className="sticky top-0 z-20 shrink-0 border-b border-slate-900 bg-slate-950/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => router.push('/')}
            className="text-slate-400 hover:text-slate-100"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-base font-bold tracking-tight text-slate-100">Global Activity Feed</h1>
            <p className="text-[10px] text-slate-500">Audit logs of all changes across your projects</p>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-6 space-y-6">
        {error && (
          <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/20 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
            <p className="text-xs text-slate-300">{error}</p>
          </div>
        )}

        {/* Filters Bar */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-900/40 p-4 border border-slate-900 rounded-2xl">
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
            <Input
              type="text"
              placeholder="Search by task, user, or remark..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-slate-950 border-slate-800 focus:border-indigo-500 focus:ring-indigo-500 text-xs text-slate-200"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <Filter className="w-4.5 h-4.5 text-slate-500" />
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 transition-colors w-full md:w-48"
            >
              <option value="all">All Projects</option>
              {projects.map((proj) => (
                <option key={proj.id} value={proj.name}>
                  {proj.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Logs Feed List */}
        <div className="space-y-4">
          {filteredLogs.length === 0 ? (
            <Card className="p-12 text-center border-slate-900 bg-slate-900/10">
              <Clock className="w-8 h-8 text-slate-800 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-400">No Logs Found</h3>
              <p className="text-xs text-slate-600 mt-1">Try broadening your filters or updating a task on your board.</p>
            </Card>
          ) : (
            filteredLogs.map((log) => {
              const formattedDate = new Date(log.created_at).toLocaleString([], {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });

              let actionText = '';
              let badgeStyles = '';
              let showBadge = false;

              if (log.old_status === log.new_status) {
                if (log.remark && log.remark.toLowerCase().includes('created')) {
                  actionText = 'created the task';
                } else {
                  actionText = 'updated details for';
                }
              } else {
                actionText = `changed status from ${log.old_status} to`;
                showBadge = true;
                if (log.new_status === 'Done') {
                  badgeStyles = 'bg-emerald-950 text-emerald-400 border border-emerald-500/20';
                } else if (log.new_status === 'In Progress') {
                  badgeStyles = 'bg-indigo-950 text-indigo-400 border border-indigo-500/20';
                } else {
                  badgeStyles = 'bg-slate-900 text-slate-400 border border-slate-800';
                }
              }

              return (
                <Card key={log.id} className="p-4 border-slate-900 bg-slate-900/20 hover:border-slate-800/80 transition-all flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                      <span className="text-slate-300">{log.operator_username}</span>
                      <span>•</span>
                      <span className="text-indigo-400/80">{log.project_name}</span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-100 truncate">{log.task_title}</h4>

                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
                      <span>{actionText}</span>
                      {showBadge && (
                        <Badge className={`${badgeStyles} font-bold text-[8px] uppercase px-1.5 py-0.5 rounded leading-none shrink-0`}>
                          {log.new_status}
                        </Badge>
                      )}
                    </div>

                    {log.remark && (
                      <div className="mt-2 p-2.5 rounded-lg bg-slate-950 border border-slate-900/60 flex items-start gap-2 max-w-xl">
                        <MessageSquare className="w-3.5 h-3.5 text-slate-600 mt-0.5 shrink-0" />
                        <p className="text-xs text-slate-400 italic font-mono leading-relaxed break-words">
                          "{log.remark}"
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex md:flex-col items-end justify-between shrink-0 text-right gap-2 border-t md:border-t-0 border-slate-900 pt-3 md:pt-0">
                    <span className="text-[10px] text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-600" />
                      {formattedDate}
                    </span>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleEditRemark(log.id, log.remark)}
                      className="border-slate-800 hover:bg-slate-900 hover:text-slate-200 text-[10px] px-2.5 py-1 h-7 cursor-pointer"
                    >
                      Edit Remark
                    </Button>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
