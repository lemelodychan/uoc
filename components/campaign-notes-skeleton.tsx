import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Icon } from "@iconify/react"

export function CampaignNotesSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} className="cursor-pointer">
          <CardContent>
            <div className="space-y-2">
              <Skeleton className="h-6 w-3/4" />
              <div className="flex items-center gap-x-4 gap-y-1 flex-row flex-wrap">
                <div className="flex items-center gap-1">
                  <Skeleton className="h-3 w-3 rounded-full" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <div className="flex items-center gap-1">
                  <Skeleton className="h-3 w-3 rounded-full" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function CampaignNotesListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} className="bg-card hover:bg-card/70 transition-colors rounded-xl">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-2">
                <Skeleton className="h-6 w-2/3" />
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <Skeleton className="h-3 w-3 rounded-full" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <div className="flex items-center gap-1">
                    <Skeleton className="h-3 w-3 rounded-full" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <div className="flex items-center gap-1">
                    <Skeleton className="h-3 w-3 rounded-full" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-9 w-16" />
                <Skeleton className="h-9 w-9" />
              </div>
            </div>
          </CardHeader>
        </Card>
      ))}
    </div>
  )
}

export function CampaignNotesEmptySkeleton() {
  return (
    <div className="text-center p-8 rounded-xl bg-card">
      <Skeleton className="w-12 h-12 mx-auto mb-4 rounded-full" />
      <Skeleton className="h-6 w-32 mx-auto mb-2" />
      <Skeleton className="h-4 w-64 mx-auto mb-4" />
      <Skeleton className="h-10 w-40 mx-auto" />
    </div>
  )
}
