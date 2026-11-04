'use client';
export default function Error({ reset }: { reset: () => void }) { return <main id="main" style={{padding: 48}}><h1>Your workspace could not open</h1><p>Your saved data is still on this device.</p><button onClick={reset}>Try again</button><a href="/">Return to ZURI</a></main>; }
