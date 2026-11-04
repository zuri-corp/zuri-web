'use client';

import Image from 'next/image';
import { useState } from 'react';
import { innovationScenes } from '@/lib/content/innovation-scenes';

export default function HomeArtwork() {
  const [paused, setPaused] = useState(false);
  return <>
    <div className={`home-artwork${paused ? ' is-paused' : ''}`} aria-hidden="true">
      {innovationScenes.map((scene, index) => <div className={`home-artwork-slide artwork-slide-${index}`} key={scene.slug}>
        <Image src={`/artwork/history/${scene.slug}.png`} alt="" fill sizes="100vw" quality={75} preload={index === 0}/>
      </div>)}
      <div className="home-artwork-veil"/>
    </div>
    <button type="button" className="home-artwork-toggle" onClick={() => setPaused(!paused)} aria-label={paused ? 'Resume background slideshow' : 'Pause background slideshow'}>
      <span aria-hidden="true">{paused ? '▷' : 'Ⅱ'}</span> {paused ? 'Resume motion' : 'Pause motion'}
    </button>
  </>;
}
