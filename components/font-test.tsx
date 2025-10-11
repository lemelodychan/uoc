'use client'

import React from 'react'

export function FontTest() {
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-display font-bold">
        Space Grotesk Display Font
      </h1>
      <p className="text-lg font-body">
        Public Sans Body Font - This should be the default body text font with good readability.
      </p>
      <p className="text-sm font-mono">
        JetBrains Mono Monospace Font - Used for stats, numbers, and technical data.
      </p>
      
      <div className="mt-6 p-4 bg-muted rounded-lg">
        <h2 className="font-display font-semibold mb-2">Font Classes Test:</h2>
        <div className="space-y-2 text-sm">
          <div><code className="font-mono bg-background px-2 py-1 rounded">font-display</code> - Space Grotesk</div>
          <div><code className="font-mono bg-background px-2 py-1 rounded">font-body</code> - Public Sans</div>
          <div><code className="font-mono bg-background px-2 py-1 rounded">font-mono</code> - JetBrains Mono</div>
        </div>
      </div>
    </div>
  )
}
