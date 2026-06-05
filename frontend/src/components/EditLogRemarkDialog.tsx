import React, { useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

interface EditLogRemarkDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentRemark: string | null;
  onSave: (remark: string) => void;
}

export function EditLogRemarkDialog({
  isOpen,
  onClose,
  currentRemark,
  onSave,
}: EditLogRemarkDialogProps) {
  const remarkRef = useRef<HTMLTextAreaElement>(null);

  const handleSave = () => {
    onSave(remarkRef.current?.value.trim() ?? '');
    onClose();
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={onClose}>
      <DialogContent className='sm:max-w-106.25'>
        <DialogHeader>
          <DialogTitle>Edit Remark</DialogTitle>
        </DialogHeader>
        <div className='grid gap-4 py-4'>
          <div className='grid gap-2'>
            <label
              htmlFor='remark'
              className='text-sm font-medium'>
              Remark/Reason for Status Change
            </label>
            <Textarea
              key={`${isOpen}-${currentRemark ?? ''}`}
              ref={remarkRef}
              id='remark'
              placeholder='Enter remark...'
              defaultValue={currentRemark || ''}
              className='h-32'
            />
          </div>
        </div>
        <div className='flex justify-end gap-2'>
          <Button
            variant='outline'
            onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Remark</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
