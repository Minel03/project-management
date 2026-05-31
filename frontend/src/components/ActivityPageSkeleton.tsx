import { Skeleton } from '@/components/ui/skeleton';

function ActivityLogCardSkeleton() {
  return (
    <div className='p-4 rounded-xl border border-border bg-card/70 flex flex-col md:flex-row md:items-start justify-between gap-4'>
      <div className='space-y-2 min-w-0 flex-1'>
        <div className='flex flex-wrap items-center gap-2'>
          <Skeleton className='h-2.5 w-20' />
          <Skeleton className='h-2.5 w-1' />
          <Skeleton className='h-2.5 w-24' />
        </div>
        <Skeleton className='h-4 w-3/5 max-w-xs' />
        <Skeleton className='h-3 w-48' />
        <Skeleton className='h-12 w-full max-w-xl rounded-lg' />
      </div>
      <div className='flex md:flex-col items-end gap-2 shrink-0 border-t md:border-t-0 border-border pt-3 md:pt-0'>
        <Skeleton className='h-2.5 w-24' />
        <Skeleton className='h-7 w-20 rounded-md' />
      </div>
    </div>
  );
}

export function ActivityPageSkeleton() {
  return (
    <div className='min-h-screen bg-background text-foreground flex flex-col font-sans'>
      <header className='sticky top-0 z-20 shrink-0 border-b border-border bg-card/85 backdrop-blur-md px-6 py-4 flex items-center justify-between'>
        <div className='flex items-center gap-3'>
          <Skeleton className='h-9 w-9 rounded-md' />
          <div className='space-y-1.5'>
            <Skeleton className='h-4 w-40' />
            <Skeleton className='h-2.5 w-56' />
          </div>
        </div>
        <Skeleton className='h-8 w-28 rounded-lg hidden sm:block' />
      </header>

      <main className='flex-1 max-w-4xl w-full mx-auto p-6 space-y-6'>
        <div className='flex flex-col md:flex-row gap-4 items-center justify-between bg-card/70 p-4 border border-border rounded-2xl'>
          <Skeleton className='h-9 w-full md:w-72 rounded-lg' />
          <Skeleton className='h-9 w-full md:w-48 rounded-lg' />
        </div>

        <div className='space-y-4'>
          {Array.from({ length: 5 }).map((_, i) => (
            <ActivityLogCardSkeleton key={i} />
          ))}
        </div>
      </main>
    </div>
  );
}
