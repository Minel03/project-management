import React from 'react';
import { Clock, CheckSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';

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

interface ChangeLogSidebarProps {
  logs: ChangeLog[];
  onEditLogRemark: (logId: number, currentRemark: string | null) => void;
}

export function ChangeLogSidebar({ logs, onEditLogRemark }: ChangeLogSidebarProps) {
  return (
    <aside className="w-full xl:w-80 border-t xl:border-t-0 xl:border-l border-slate-900 bg-slate-950/30 backdrop-blur-sm p-6 flex flex-col shrink-0 overflow-y-auto">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-4 h-4 text-indigo-500" />
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
                      onClick={() => onEditLogRemark(log.id, log.remark)}
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
  );
}
