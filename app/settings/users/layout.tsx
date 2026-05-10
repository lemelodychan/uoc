import type { Metadata } from "next"

export const metadata: Metadata = { title: "Settings — Users" }

export default function SettingsUsersLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
