"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

/** Generic card section skeleton: header (icon + title + edit) + content lines */
export function SectionCardSkeleton({ contentLines = 4 }: { contentLines?: number }) {
  return (
    <Card className="flex flex-col gap-3">
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-6 w-32" />
          </div>
          <Skeleton className="h-8 w-14" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2">
          {Array.from({ length: contentLines }).map((_, i) => (
            <Skeleton
              key={i}
              className={`h-4 ${i === contentLines - 1 && contentLines > 1 ? "w-3/4" : "w-full"}`}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

/** Ability scores: 2x3 grid of score blocks */
export function AbilityScoresSkeleton() {
  return (
    <Card className="flex flex-col gap-3">
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-6 w-28" />
          </div>
          <Skeleton className="h-8 w-14" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="text-center flex flex-col items-center gap-1">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-10 rounded mx-auto" />
              <Skeleton className="h-6 w-12 rounded" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

/** Saving throws: list of rows */
export function SavingThrowsSkeleton() {
  return (
    <Card className="flex flex-col gap-3">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-6 w-28" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-6 w-10 rounded" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

/** Skills: header + sort buttons + list of skill rows */
export function SkillsSkeleton() {
  return (
    <Card className="flex flex-col gap-4 relative">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-6 w-16" />
          </div>
          <div className="flex gap-1">
            <Skeleton className="h-6 w-10 rounded" />
            <Skeleton className="h-6 w-14 rounded" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2">
          <div className="flex justify-between mb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
          </div>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-6 w-10 rounded" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

/** Money: 3 currency boxes */
export function MoneySkeleton() {
  return (
    <Card className="flex flex-col gap-3">
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-6 w-16" />
          </div>
          <Skeleton className="h-8 w-14" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-2">
          {["Gold", "Silver", "Copper"].map((_, i) => (
            <div key={i} className="flex flex-col gap-1 p-2 border rounded-lg">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-6 w-10 rounded" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

/** Combat stats: 2-col grid of stat blocks + HP/death saves area */
export function CombatStatsSkeleton() {
  return (
    <Card className="flex flex-col gap-3">
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-6 w-24" />
          </div>
          <Skeleton className="h-8 w-14" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-5 w-5 rounded" />
              <div className="flex flex-col gap-1">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-6 w-12 rounded" />
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-2 pt-2 border-t">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </CardContent>
    </Card>
  )
}

/** Aesthetic images strip: 6 image placeholders */
export function AestheticImagesSkeleton() {
  return (
    <Card className="p-0 rounded-none border-0 border-b overflow-hidden">
      <CardContent className="p-0">
        <div className="grid grid-cols-6 gap-0">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[112px] w-full rounded-none" />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

/** Character header: portrait + name + badges + buttons */
export function CharacterHeaderSkeleton() {
  return (
    <Card className="rounded-none border-0">
      <CardHeader className="pb-0">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="w-20 h-24 rounded-lg shrink-0" />
            <div className="flex flex-col gap-2">
              <Skeleton className="h-8 w-48" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-5 w-24 rounded-full" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-5 w-32 rounded-full" />
              </div>
              <Skeleton className="h-4 w-56" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-14" />
          </div>
        </div>
      </CardHeader>
    </Card>
  )
}
