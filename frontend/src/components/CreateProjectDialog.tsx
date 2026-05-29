import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

interface CreateProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, description: string, teamId: number) => Promise<void>;
  teams: { id: number; name: string }[];
}

export function CreateProjectDialog({ isOpen, onClose, onCreate, teams }: CreateProjectDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [teamId, setTeamId] = useState<number | ''>('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !teamId) return;
    setSubmitting(true);
    try {
      await onCreate(name, description, Number(teamId));
      setName('');
      setDescription('');
      setTeamId('');
      onClose();
    } catch (err) {
      console.error('Failed to create project:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-popover border border-border text-popover-foreground sm:max-w-md rounded-3xl p-6">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-foreground">Create Project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5 font-sans">Project Name</label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Website Overhaul, Marketing Campaign..."
              className="bg-background border-input focus:border-indigo-500 focus:ring-indigo-500 text-xs text-foreground"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5 font-sans">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe details, objectives, or teams..."
              rows={3}
              className="bg-background border-input focus:border-indigo-500 focus:ring-indigo-500 text-xs text-foreground resize-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5 font-sans">Assign Team</label>
            <select
              value={teamId}
              onChange={(e) => setTeamId(e.target.value ? Number(e.target.value) : '')}
              className="w-full h-10 rounded-2xl border border-input bg-background px-3 text-xs text-foreground outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              required
            >
              <option value="" disabled>Select a team for the project</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            {teams.length === 0 && (
              <p className="text-[10px] text-rose-400 mt-1 font-sans">
                You must lead a team (or be admin with teams created) to create a project.
              </p>
            )}
          </div>
          <Button
            type="submit"
            disabled={submitting || !teamId}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2.5 rounded-xl cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
          >
            {submitting ? 'Creating...' : 'Create Project'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
