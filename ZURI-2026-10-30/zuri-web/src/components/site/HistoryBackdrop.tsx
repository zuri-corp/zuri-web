'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

import { innovationScenes as scenes } from '@/lib/content/innovation-scenes';

export default function HistoryBackdrop() {
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let timer: ReturnType<typeof setInterval> | undefined;
    function sync() {
      clearInterval(timer);
      if (playing && !motion.matches && !document.hidden) timer = setInterval(() => setActive(value => (value + 1) % scenes.length), 9000);
    }
    sync();
    motion.addEventListener('change', sync);
    document.addEventListener('visibilitychange', sync);
    return () => { clearInterval(timer); motion.removeEventListener('change', sync); document.removeEventListener('visibilitychange', sync); };
  }, [playing]);

  return <>
    <div className="history-backdrop" aria-hidden="true">{scenes.map((scene, index) => <div key={scene.slug} className={`history-frame${active === index ? ' is-active' : ''}`}>
      <Image src={`/artwork/history/${scene.slug}.png`} alt="" fill sizes="100vw" quality={80} preload={index === 0}/>
    </div>)}<div className="history-shade"/></div>
    <div className="history-scene-note" aria-hidden="true"><span>{String(active + 1).padStart(2, '0')} / 08</span><strong>{scenes[active].title}</strong><small>{scenes[active].theme}</small></div>
    <div className="page-wrap history-controls">
      <div><span className="history-caption">Human history, illustrated</span><p>AI-generated historical interpretations</p></div>
      <div className="history-scene-picker" role="group" aria-label="Choose a historical illustration">{scenes.map((scene, index) => <button key={scene.slug} type="button" aria-label={`Show ${scene.title}`} aria-pressed={active === index} title={scene.title} onClick={() => { setActive(index); setPlaying(false); }}><span>{String(index + 1).padStart(2, '0')}</span></button>)}</div>
      <button className="history-play" type="button" onClick={() => setPlaying(!playing)} aria-label={playing ? 'Pause historical slideshow' : 'Play historical slideshow'}><span aria-hidden="true">{playing ? 'Ⅱ' : '▷'}</span> {playing ? 'Pause' : 'Play'}</button>
    </div>
  </>;
}

