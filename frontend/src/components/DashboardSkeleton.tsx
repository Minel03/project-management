import { Skeleton } from '@/components/ui/skeleton';
import { KanbanBoardSkeleton } from '@/components/KanbanBoardSkeleton';

export function DashboardSkeleton() {
  return (
    <div className='flex-1 flex flex-col lg:flex-row overflow-hidden bg-background'>
      <aside className='w-full lg:w-64 border-b lg:border-b-0 lg:border-r border-border bg-card/45 backdrop-blur-sm p-4 flex flex-col shrink-0'>
        <div className='flex items-center justify-between mb-4'>
          <Skeleton className='h-3.5 w-24' />
          <Skeleton className='h-7 w-7 rounded-md' />
        </div>
        <div className='space-y-1.5'>
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className='flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20'>
              <div className='flex items-center gap-2.5 min-w-0 flex-1'>
                <Skeleton className='h-4 w-4 shrink-0 rounded' />
                <Skeleton className='h-3.5 flex-1 max-w-[120px]' />
              </div>
              <Skeleton className='h-3.5 w-3.5 shrink-0' />
            </div>
          ))}
        </div>
      </aside>

      <main className='flex-1 flex flex-col min-w-0 overflow-hidden'>
        <div className='p-6 border-b border-border bg-card/20 shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
          <div className='space-y-2 flex-1'>
            <Skeleton className='h-6 w-48' />
            <Skeleton className='h-3 w-full max-w-xl' />
            <div className='flex items-center gap-3 pt-1'>
              <Skeleton className='h-2.5 w-24' />
              <Skeleton className='h-2.5 w-20' />
              <Skeleton className='h-2.5 w-28' />
            </div>
          </div>
          <Skeleton className='h-9 w-28 rounded-xl shrink-0' />
        </div>

        <div className='flex-1 flex flex-col xl:flex-row overflow-hidden'>
          <div className='flex-1 p-6 overflow-y-auto min-w-0'>
            <KanbanBoardSkeleton />
          </div>

          <aside className='w-full xl:w-80 border-t xl:border-t-0 xl:border-l border-border bg-card/35 p-6 flex flex-col shrink-0'>
            <Skeleton className='h-3.5 w-32 mb-4' />
            <div className='space-y-6 pl-4 border-l border-border'>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className='space-y-2'>
                  <Skeleton className='h-2.5 w-12' />
                  <Skeleton className='h-3 w-full' />
                  <Skeleton className='h-2.5 w-3/4' />
                </div>
              ))}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
