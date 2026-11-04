import HistoryBackdrop from '@/components/site/HistoryBackdrop';
import Link from 'next/link';

export const metadata = {
  title: 'About ZURI — Powering & Distributing Good Systems',
  description: 'From Göbekli Tepe to the age of AI: ZURI believes in recognising, powering, distributing and protecting good systems, with respect for those before us and responsibility to those after us.',
};

const beliefs = [
  ['Recognise', 'See the value in ideas, knowledge and ways of working. Acknowledge the people who make them possible.'],
  ['Power', 'Help useful systems work better, with the right technology, skills and support.'],
  ['Distribute', 'Help good systems reach the people who can use them. Make knowledge, tools and opportunity easier to discover and access.'],
  ['Protect', 'Care for the people, knowledge and trust behind those systems. Build with security, responsibility and continuity in mind.'],
];

export default function About() {
  return <main id="main" className="light-page innovation-about">
    <header className="innovation-hero">
      <HistoryBackdrop/>
      <div className="page-wrap innovation-hero-copy">
        <p className="eyebrow">ZURI / Powering &amp; Distributing Good Systems</p>
        <h1>The story of ZURI.<br/><em>A story of innovation.</em></h1>
        <p>Our story begins with a belief: every generation inherits the work of others, and has something to carry forward. Good systems help us turn curiosity, knowledge and shared effort into possibility.</p>
        <a href="#our-story" className="text-link">Before us. Beyond us. ↓</a>
      </div>
    </header>
    <section id="our-story" className="page-wrap about-story">
      <p className="eyebrow">Before us. Beyond us.</p>
      <div>
        <h2>We are part of<br/>a much longer story.</h2>
        <p>From Göbekli Tepe to the age of AI, we see a human story of curiosity, shared effort and systems that make things possible. For thousands of years, people have found ways to organise knowledge, solve problems and build together.</p>
        <p className="innovation-context">Illustrated scenes of discovery, faith, sacrifice and shared effort. The apple-tree scene draws on the familiar story of Newton’s curiosity.</p>
        <p>We appreciate humanity’s scientific endeavours, and the contribution of every person who has questioned, discovered, built, taught or cared for something that others could carry forward.</p>
        <p>We are not the first to walk this Earth. We will not be the last. What we build begins with what others have made possible, and carries a responsibility to those who come after us.</p>
        <p>At ZURI, we believe it is important to <strong>recognise, power, distribute and protect good systems.</strong> That belief guides the technology we build, the stories we tell and the connections we help people make.</p>
      </div>
    </section>
    <section className="system-beliefs-section">
      <div className="page-wrap section-pad">
        <p className="eyebrow">Our responsibility</p>
        <h2 className="headline">Respect what came before.<br/>Make what comes next worthwhile.</h2>
        <dl className="system-beliefs">{beliefs.map(([title, text], index) => <div key={title}><dt><span>0{index + 1}</span>{title}</dt><dd>{text}</dd></div>)}</dl>
      </div>
    </section>
    <section className="about-divisions"><div className="page-wrap section-pad">
      <p className="eyebrow">Shared foundation. Distinct experiences.</p>
      <h2 className="headline">One belief.<br/>Three ways to put it to work.</h2>
      <div className="division-columns">{[
        ['Tech', 'Capability', 'Build, connect and protect useful technology. Give people the tools and support to make it work.', '/tech', 'blue'],
        ['Select', 'Understanding', 'Recognise worthwhile ideas, examine how systems are used and share stories that help people make informed choices.', '/select', 'red'],
        ['Pamoja', 'Connection', 'Help people, businesses and their work be found. Give useful knowledge and opportunity a way to reach others.', '/pamoja', ''],
      ].map(([name, word, text, href, color]) => <Link href={href} key={name}><p className={`eyebrow ${color}`}>{word}</p><h3>{name} ↗</h3><p>{text}</p></Link>)}</div>
    </div></section>
    <section className="page-wrap section-pad narrow">
      <h2 className="headline">Something good<br/>to carry forward.</h2>
      <p className="intro">Whether you are building a business, sharing an idea or improving how something works, your contribution belongs in this story too.</p>
      <Link href="/contact" className="button button-dark">Begin a conversation →</Link>
    </section>
  </main>;
}

