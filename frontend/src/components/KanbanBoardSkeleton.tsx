import { Skeleton } from '@/components/ui/skeleton';

function KanbanColumnSkeleton({ cards = 2 }: { cards?: number }) {
  return (
    <div className='p-4 rounded-2xl bg-card/45 border border-border min-h-100 flex flex-col'>
      <div className='flex items-center justify-between mb-4 pb-2 border-b border-border'>
        <div className='flex items-center gap-2'>
          <Skeleton className='w-2 h-2 rounded-full' />
          <Skeleton className='h-3.5 w-20' />
        </div>
        <Skeleton className='h-5 w-6 rounded-full' />
      </div>
      <div className='space-y-3 flex-1'>
        {Array.from({ length: cards }).map((_, i) => (
          <div
            key={i}
            className='p-3 rounded-xl border border-border bg-muted/20 space-y-2.5'>
            <Skeleton className='h-3.5 w-4/5' />
            <Skeleton className='h-2.5 w-full' />
            <Skeleton className='h-2.5 w-2/3' />
            <div className='flex items-center justify-between pt-1'>
              <Skeleton className='h-6 w-6 rounded-full' />
              <Skeleton className='h-2.5 w-14' />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function KanbanBoardSkeleton() {
  return (
    <div className='grid grid-cols-1 md:grid-cols-3 gap-6 h-full items-start'>
      <KanbanColumnSkeleton cards={2} />
      <KanbanColumnSkeleton cards={3} />
      <KanbanColumnSkeleton cards={1} />
    </div>
  );
}
