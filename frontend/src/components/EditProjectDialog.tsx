import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

interface Project {
  id: number;
  name: string;
  description: string;
  creator_name: string;
  team_name?: string;
  team_id?: number;
  created_at: string;
}

interface EditProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
  onSave: (name: string, description: string, teamId: number) => Promise<void>;
  teams: { id: number; name: string }[];
}

export function EditProjectDialog({ isOpen, onClose, project, onSave, teams }: EditProjectDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [teamId, setTeamId] = useState<number | ''>('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (project) {
      setName(project.name);
      setDescription(project.description || '');
      setTeamId(project.team_id || '');
    }
  }, [project, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !teamId) return;
    setSubmitting(true);
    try {
      await onSave(name, description, Number(teamId));
      onClose();
    } catch (err) {
      console.error('Failed to update project:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-slate-900 border border-slate-800 text-slate-100 sm:max-w-md rounded-3xl p-6">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-slate-100">Edit Project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 font-sans">Project Name</label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Project name"
              className="bg-slate-950 border-slate-800 focus:border-indigo-500 focus:ring-indigo-500 text-xs text-slate-200"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 font-sans">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe project details..."
              rows={3}
              className="bg-slate-950 border-slate-800 focus:border-indigo-500 focus:ring-indigo-500 text-xs text-slate-200 resize-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 font-sans">Assign Team</label>
            <select
              value={teamId}
              onChange={(e) => setTeamId(e.target.value ? Number(e.target.value) : '')}
              className="w-full h-10 rounded-2xl border border-slate-800 bg-slate-950 px-3 text-xs text-slate-200 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              required
            >
              <option value="" disabled>Select a team for the project</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            {teams.length === 0 && (
              <p className="text-[10px] text-rose-400 mt-1 font-sans">
                You must lead a team (or be admin with teams created) to assign this project.
              </p>
            )}
          </div>
          <Button
            type="submit"
            disabled={submitting || !teamId}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-slate-100 text-xs font-bold py-2.5 rounded-xl cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
          >
            {submitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
