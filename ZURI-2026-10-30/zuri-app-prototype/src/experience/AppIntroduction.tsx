import { useEffect, useRef, useState } from 'react';
import { AppGlyph } from './AppGlyph';
import type { World } from './model';

const steps: { eyebrow: string; title: string; description: string; world?: World; action?: string }[] = [
  {
    eyebrow: 'WELCOME TO ZURI',
    title: 'A calmer place to make things happen.',
    description: 'ZURI brings your communities, plans, conversations and memories together. This short tour shows you where to begin.',
  },
  {
    eyebrow: '01 · FIND YOUR PEOPLE',
    title: 'Aura is for people and places.',
    description: 'Explore communities and real-world places. Public listings are meant to help you discover—not to turn your life into a public feed.',
    world: 'aura',
    action: 'Explore Aura',
  },
  {
    eyebrow: '02 · MAKE YOUR NEXT MOVE',
    title: 'Motion helps you plan.',
    description: 'Keep tasks, events and invitations in view. Your personal planning stays yours unless you choose to share it.',
    world: 'motion',
    action: 'Open Motion',
  },
  {
    eyebrow: '03 · SHARE AND REMEMBER',
    title: 'Rizz and Lore give your ideas a home.',
    description: 'Use Rizz for channels and conversations. Use Lore to collect moments and chapters. Your profile controls what others can discover.',
    world: 'lore',
    action: 'Visit your profile',
  },
  {
    eyebrow: 'YOU’RE READY',
    title: 'Start wherever you are.',
    description: 'Use the left navigation to move between worlds. You can reopen this introduction from the help button whenever you need it.',
  },
];

export default function AppIntroduction({ onClose, launch }: { onClose: () => void; launch: (world: World) => void }) {
  const [index, setIndex] = useState(0);
  const dialog = useRef<HTMLDivElement>(null);
  const step = steps[index];

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.current?.focus();
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        finish();
        return;
      }
      if (event.key !== 'Tab' || !dialog.current) return;
      const focusable = Array.from(dialog.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      } else if (!dialog.current.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousFocus?.focus();
    };
  }, []);

  function finish() {
    try {
      localStorage.setItem('zuri-web-introduction-v1', 'complete');
    } catch {
      // The URL trigger still makes this introduction available for this visit.
    }
    onClose();
  }

  return <div className="zw-tour-backdrop" role="presentation">
    <section
      aria-labelledby="zw-tour-title"
      aria-modal="true"
      className="zw-tour-dialog"
      ref={dialog}
      role="dialog"
      tabIndex={-1}
    >
      <header className="zw-tour-header">
        <span className="zw-tour-mark" aria-hidden="true">✦</span>
        <span>YOUR ZURI INTRODUCTION</span>
        <button aria-label="Skip introduction" onClick={finish} type="button">Skip</button>
      </header>
      <div className="zw-tour-progress" role="group" aria-label={`Step ${index + 1} of ${steps.length}`}>
        {steps.map((_, stepIndex) => <span aria-current={stepIndex === index ? 'step' : undefined} key={stepIndex}/>)}
      </div>
      {step.world && <span className="zw-tour-world"><AppGlyph name={step.world} size={34}/></span>}
      <p className="zw-tour-eyebrow">{step.eyebrow}</p>
      <h2 id="zw-tour-title">{step.title}</h2>
      <p className="zw-tour-description">{step.description}</p>
      <footer className="zw-tour-actions">
        <button className="zw-tour-secondary" disabled={index === 0} onClick={() => setIndex(index - 1)} type="button">Back</button>
        {step.world && <button className="zw-tour-secondary" onClick={() => { launch(step.world!); finish(); }} type="button">{step.action}</button>}
        {index < steps.length - 1
          ? <button className="zw-tour-primary" onClick={() => setIndex(index + 1)} type="button">Next <span aria-hidden="true">→</span></button>
          : <button className="zw-tour-primary" onClick={finish} type="button">Go to ZURI <span aria-hidden="true">→</span></button>}
      </footer>
    </section>
  </div>;
}
