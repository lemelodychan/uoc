import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Icon } from "@iconify/react"

export function ClassFeaturesSkeleton({ count = 3 }: { count?: number }) {
  return (
    <Card className="flex flex-col gap-3">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-6 w-32" />
        </div>
        <Skeleton className="h-8 w-20" />
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {Array.from({ length: count }).map((_, index) => (
            <div key={index} className="border rounded-lg p-3 space-y-2">
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-6 w-6 rounded" />
                  <Skeleton className="h-6 w-6 rounded" />
                </div>
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function ClassFeatureItemSkeleton() {
  return (
    <div className="border rounded-lg p-3 space-y-2">
      <div className="flex items-start justify-between">
        <div className="space-y-1 flex-1">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-6 rounded" />
          <Skeleton className="h-6 w-6 rounded" />
        </div>
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  )
}

export function ClassFeaturesEmptySkeleton() {
  return (
    <Card className="flex flex-col gap-3">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-6 w-32" />
        </div>
        <Skeleton className="h-8 w-20" />
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-center py-8">
          <Skeleton className="w-12 h-12 mx-auto mb-4 rounded-full" />
          <Skeleton className="h-6 w-48 mx-auto mb-2" />
          <Skeleton className="h-4 w-64 mx-auto" />
        </div>
      </CardContent>
    </Card>
  )
}
