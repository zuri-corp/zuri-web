export default function PamojaNetwork() {
  return <div className="pamoja-network" aria-hidden="true"><svg viewBox="0 0 640 400" fill="none">
    <g className="network-orbits" stroke="currentColor"><ellipse cx="320" cy="195" rx="250" ry="140"/><ellipse cx="320" cy="195" rx="205" ry="180" transform="rotate(-28 320 195)"/></g>
    <g className="network-links"><path d="M320 195C260 190 225 100 130 100"/><path d="M320 195C380 190 415 100 510 100"/><path d="M320 195V320"/><path d="M130 100C135 250 180 320 320 320C460 320 505 245 510 100"/></g>
    <g className="network-flow"><path d="M320 195C260 190 225 100 130 100"/><path d="M320 195C380 190 415 100 510 100"/><path d="M320 195V320"/></g>
    <g className="network-satellites"><circle cx="62" cy="205" r="4"/><circle cx="218" cy="37" r="3"/><circle cx="415" cy="342" r="5"/><circle cx="575" cy="221" r="4"/><circle cx="237" cy="278" r="3"/></g>
    <g className="network-hub"><circle className="network-pulse" cx="320" cy="195" r="56"/><circle cx="320" cy="195" r="45"/><path d="M320 164c3 16 9 22 25 25-16 3-22 9-25 25-3-16-9-22-25-25 16-3 22-9 25-25Z"/><text x="320" y="229">PAMOJA</text></g>
    <g className="network-node node-people"><circle cx="130" cy="100" r="37"/><g className="network-icon"><circle cx="130" cy="89" r="8"/><path d="M112 117v-4c0-9 8-14 18-14s18 5 18 14v4M107 90a6 6 0 1 1 4-11m-13 28c0-7 4-11 10-11"/></g><text x="130" y="158">People</text></g>
    <g className="network-node node-business"><circle cx="510" cy="100" r="37"/><g className="network-icon"><rect x="488" y="88" width="44" height="29" rx="5"/><path d="M500 88v-6h20v6m-32 12c14 8 30 8 44 0m-22 0v10"/></g><text x="510" y="158">Businesses</text></g>
    <g className="network-node node-places"><circle cx="320" cy="320" r="37"/><g className="network-icon"><path d="M320 300c-10 0-17 7-17 16 0 12 17 25 17 25s17-13 17-25c0-9-7-16-17-16Z"/><circle cx="320" cy="316" r="6"/></g><text x="320" y="378">Places</text></g>
  </svg></div>;
}
