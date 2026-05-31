import { Skeleton } from '@/components/ui/skeleton';

function AdminFormSectionSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className='rounded-3xl border border-border bg-card/70 p-6'>
      <div className='flex items-center gap-3 mb-5'>
        <Skeleton className='h-5 w-5 rounded' />
        <div className='space-y-1.5 flex-1'>
          <Skeleton className='h-5 w-40' />
          <Skeleton className='h-3 w-64' />
        </div>
      </div>
      <div className='grid gap-4'>
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className='grid gap-2'>
            <Skeleton className='h-3.5 w-20' />
            <Skeleton className='h-10 w-full rounded-2xl' />
          </div>
        ))}
        <div className='flex justify-end'>
          <Skeleton className='h-9 w-32 rounded-md' />
        </div>
      </div>
    </div>
  );
}

export function AdminUserRowSkeleton() {
  return (
    <div className='grid gap-3 rounded-3xl border border-border bg-background/60 p-4 sm:grid-cols-[1fr_auto_auto] sm:items-center'>
      <div className='space-y-1.5'>
        <Skeleton className='h-4 w-28' />
        <Skeleton className='h-3 w-40' />
      </div>
      <Skeleton className='h-10 w-28 rounded-2xl' />
      <Skeleton className='h-9 w-9 rounded-md justify-self-end' />
    </div>
  );
}

export function AdminUsersListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className='space-y-3'>
      {Array.from({ length: rows }).map((_, i) => (
        <AdminUserRowSkeleton key={i} />
      ))}
    </div>
  );
}

export function AdminTeamRowSkeleton() {
  return (
    <div className='w-full rounded-3xl border border-border bg-background/50 p-4'>
      <div className='flex items-center justify-between gap-3'>
        <div className='space-y-1.5'>
          <Skeleton className='h-4 w-32' />
          <Skeleton className='h-3 w-24' />
        </div>
        <Skeleton className='h-4 w-4 rounded' />
      </div>
    </div>
  );
}

export function AdminTeamsListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className='space-y-3'>
      {Array.from({ length: rows }).map((_, i) => (
        <AdminTeamRowSkeleton key={i} />
      ))}
    </div>
  );
}

export function AdminPageSkeleton() {
  return (
    <div className='min-h-screen bg-background text-foreground flex flex-col font-sans'>
      <header className='sticky top-0 z-20 shrink-0 border-b border-border bg-card/85 backdrop-blur-md px-6 py-4 flex flex-wrap items-center justify-between gap-4'>
        <div className='flex items-center gap-3'>
          <Skeleton className='h-9 w-9 rounded-md' />
          <div className='space-y-1.5'>
            <Skeleton className='h-4 w-32' />
            <Skeleton className='h-2.5 w-52' />
          </div>
        </div>
        <Skeleton className='h-8 w-28 rounded-lg hidden sm:block' />
      </header>

      <main className='flex-1 max-w-4xl w-full mx-auto p-6 space-y-6'>
        <section className='grid gap-6'>
          <AdminFormSectionSkeleton fields={4} />
          <AdminFormSectionSkeleton fields={2} />
        </section>

        <section className='grid gap-6'>
          <div className='rounded-3xl border border-border bg-card/70 p-6'>
            <div className='flex items-center gap-3 mb-5'>
              <Skeleton className='h-5 w-5 rounded' />
              <div className='space-y-1.5 flex-1'>
                <Skeleton className='h-5 w-32' />
                <Skeleton className='h-3 w-56' />
              </div>
            </div>
            <Skeleton className='h-9 w-full rounded-2xl mb-4' />
            <AdminUsersListSkeleton rows={5} />
          </div>

          <div className='rounded-3xl border border-border bg-card/70 p-6'>
            <div className='flex items-center gap-3 mb-5'>
              <Skeleton className='h-5 w-5 rounded' />
              <div className='space-y-1.5 flex-1'>
                <Skeleton className='h-5 w-20' />
                <Skeleton className='h-3 w-64' />
              </div>
            </div>
            <AdminTeamsListSkeleton rows={3} />
          </div>
        </section>
      </main>
    </div>
  );
}
