import { useQuery } from '@tanstack/react-query'
import { db } from '@/services/data-source'
import { queryKeys } from '@/utils/queryKeys'

export function useBinCount() {
  const { data } = useQuery({
    queryKey: queryKeys.binList,
    queryFn: () => db.notes.list({ scope: 'trashed', sort: 'purged' }),
  })
  return data?.total ?? 0
}
