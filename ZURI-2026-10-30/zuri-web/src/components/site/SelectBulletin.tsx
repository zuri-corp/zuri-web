export default function SelectBulletin() {
  return <div className="select-bulletin" aria-hidden="true"><svg viewBox="0 0 240 190" fill="none">
    <defs><linearGradient id="bulletin-paper" x1="30" y1="20" x2="170" y2="160" gradientUnits="userSpaceOnUse"><stop stopColor="#fff0f3"/><stop offset="1" stopColor="#ff9bb1"/></linearGradient></defs>
    <g className="bulletin-sheet"><rect x="24" y="20" width="150" height="136" rx="9" fill="#7c072d" stroke="#ffc2d2" strokeWidth="1.5"/><path d="M24 53h150" stroke="#ffafc5"/><circle cx="39" cy="37" r="3" fill="#ffc2d2"/><circle cx="51" cy="37" r="3" fill="#ffc2d2"/><circle cx="63" cy="37" r="3" fill="#ffc2d2"/><rect x="38" y="68" width="52" height="48" rx="3" fill="url(#bulletin-paper)"/><path d="M103 73h55m-55 12h45m-45 13h51M38 132h91" stroke="#ffcfdb" strokeWidth="5" strokeLinecap="round"/><path d="m53 102 11-20 12 20Z" fill="#ab1944"/></g>
    <g className="bulletin-click-rays" stroke="#ffe2ea" strokeWidth="2.5" strokeLinecap="round"><path d="m157 97 1-13m-19 20-11-6m43 12 12-5"/><circle cx="157" cy="116" r="25" strokeWidth="1"/></g>
    <path className="bulletin-cursor" d="m151 110 8 61 15-17 14 27 12-6-14-26 23-3Z" fill="#fff8fb" stroke="#8d1038" strokeWidth="3" strokeLinejoin="round"/>
  </svg></div>;
}
