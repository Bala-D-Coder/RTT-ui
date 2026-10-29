import { lazy, Suspense, type ComponentType } from 'react'
import { PageLoader } from '@/components/PageLoader/PageLoader'

type LazyFactory = () => Promise<{ default: ComponentType }>

export function createLazyRoute(factory: LazyFactory) {
  const Component = lazy(factory)
  return {
    element: (
      <Suspense fallback={<PageLoader />}>
        <Component />
      </Suspense>
    ),
  }
}
