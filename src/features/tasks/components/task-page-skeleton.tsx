export function TaskPageSkeleton() {
  return (
    <>
      <div className="tasks-mobile-only">
        <MobileTaskListSkeleton />
      </div>
      <div className="tasks-desktop-only">
        <DesktopTaskWorkbenchSkeleton />
      </div>
    </>
  );
}

export function DesktopTaskWorkbenchSkeleton() {
  return (
    <section
      className="desktop-task-workbench task-page-skeleton task-page-skeleton--desktop"
      aria-label="正在加载任务"
      aria-busy="true"
    >
      <div className="desktop-task-workbench__main">
        <header className="desktop-task-workbench__topbar">
          <div>
            <h1>任务</h1>
            <SkeletonBlock className="task-page-skeleton__subtitle" />
          </div>
          <SkeletonBlock className="task-page-skeleton__search" />
        </header>

        <div className="desktop-task-toolbar">
          <div className="task-page-skeleton__tabs">
            {Array.from({ length: 4 }, (_, index) => (
              <SkeletonBlock key={index} className="task-page-skeleton__tab" />
            ))}
          </div>
          <div className="task-page-skeleton__controls">
            {Array.from({ length: 4 }, (_, index) => (
              <SkeletonBlock key={index} className="task-page-skeleton__control" />
            ))}
          </div>
        </div>

        <div className="desktop-task-table task-page-skeleton__table" aria-hidden="true">
          <div className="desktop-task-table__viewport">
            <div className="desktop-task-table__head">
              {Array.from({ length: 7 }, (_, index) => (
                <SkeletonBlock key={index} className="task-page-skeleton__head-cell" />
              ))}
            </div>
            <div className="desktop-task-table__body">
              {Array.from({ length: 7 }, (_, rowIndex) => (
                <div key={rowIndex} className="desktop-task-table__row task-page-skeleton__row">
                  {Array.from({ length: 7 }, (_, cellIndex) => (
                    <SkeletonBlock
                      key={cellIndex}
                      className={`task-page-skeleton__cell task-page-skeleton__cell--${cellIndex + 1}`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        <footer className="desktop-task-workbench__footer" aria-hidden="true">
          <SkeletonBlock className="task-page-skeleton__footer-action" />
          <SkeletonBlock className="task-page-skeleton__footer-meta" />
        </footer>
      </div>

      <TaskDetailPanelSkeleton />
    </section>
  );
}

export function TaskDetailPanelSkeleton() {
  return (
    <aside className="task-detail-panel task-detail-panel--skeleton" aria-label="正在加载任务详情" aria-busy="true">
      <div className="task-page-skeleton__detail-tabs" aria-hidden="true">
        <SkeletonBlock />
        <SkeletonBlock />
      </div>
      <div className="task-page-skeleton__detail-copy" aria-hidden="true">
        <SkeletonBlock className="task-page-skeleton__detail-title" />
        <SkeletonBlock />
        <SkeletonBlock className="task-page-skeleton__detail-line-short" />
      </div>
      <div className="task-page-skeleton__detail-fields" aria-hidden="true">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index}>
            <SkeletonBlock />
            <SkeletonBlock />
          </div>
        ))}
      </div>
      <SkeletonBlock className="task-page-skeleton__detail-action" />
    </aside>
  );
}

export function MobileTaskListSkeleton() {
  return (
    <section
      className="mobile-task-list task-page-skeleton task-page-skeleton--mobile"
      aria-label="正在加载任务"
      aria-busy="true"
    >
      <header className="mobile-page-header mobile-task-list__header">
        <div className="mobile-page-header__copy">
          <SkeletonBlock className="task-page-skeleton__mobile-count" />
          <h1>任务</h1>
        </div>
        <SkeletonBlock className="task-page-skeleton__mobile-add" />
      </header>
      <SkeletonBlock className="task-page-skeleton__mobile-search" />
      <div className="mobile-task-list__chips" aria-hidden="true">
        {Array.from({ length: 4 }, (_, index) => (
          <SkeletonBlock key={index} className="task-page-skeleton__mobile-chip" />
        ))}
      </div>
      <div className="mobile-task-list__stats" aria-hidden="true">
        {Array.from({ length: 3 }, (_, index) => (
          <SkeletonBlock key={index} className="task-page-skeleton__mobile-stat" />
        ))}
      </div>
      <div className="mobile-task-list__items" aria-hidden="true">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="mobile-task-item task-page-skeleton__mobile-item">
            <SkeletonBlock className="task-page-skeleton__mobile-check" />
            <div>
              <SkeletonBlock />
              <SkeletonBlock className="task-page-skeleton__mobile-item-meta" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SkeletonBlock({ className = "" }: { className?: string }) {
  return <span className={`task-page-skeleton__block ${className}`.trim()} aria-hidden="true" />;
}
