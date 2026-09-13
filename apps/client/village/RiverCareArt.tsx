import type {LitterShape} from "./river-care";

export function LitterArt({shape}: {shape: LitterShape}) {
  return <svg viewBox="0 0 88 88" fill="none" aria-hidden="true" focusable="false">
    <ellipse cx="44" cy="76" rx="27" ry="5" fill="#274d4730"/>
    {shape === "peel" && <g stroke="#af771a" strokeWidth="2.5" strokeLinejoin="round">
      <path d="M42 31 48 12 55 14 48 37Z" fill="#b08a34"/>
      <path d="M45 32C39 50 23 57 12 48 17 72 37 75 48 39" fill="#ffde00"/>
      <path d="M47 34C50 56 64 64 77 54 72 77 53 77 45 39" fill="#ffd43f"/>
      <path d="M45 34C32 52 36 70 46 78 56 66 57 49 48 34" fill="#fff0a0"/>
      <path d="M45 44 46 68" stroke="#e7b52b"/>
    </g>}
    {shape === "flyer" && <g transform="rotate(-12 44 44)" strokeLinejoin="round">
      <path d="M22 13H61L70 24V72H22Z" fill="#fffaf0" stroke="#6d8b9b" strokeWidth="2"/>
      <path d="M61 13V25H70" fill="#d4e7ed" stroke="#6d8b9b" strokeWidth="2"/>
      <path d="M31 31H59M31 55H60M31 61H49" stroke="#72adc3" strokeWidth="3"/>
      <path d="m43 34 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z" fill="#f96366"/>
    </g>}
    {shape === "bottle" && <g transform="rotate(18 44 44)" stroke="#397c98" strokeWidth="2.5">
      <path d="M36 20H51V29L60 39V68Q60 76 51 76H36Q27 76 27 68V39L36 29Z" fill="#bce9f1"/>
      <rect x="35" y="12" width="17" height="10" rx="3" fill="#52a7da"/>
      <path d="M28 44H59V59H28Z" fill="#fffefa"/>
      <path d="M36 39V30M34 65V69" stroke="#fff" strokeWidth="4" strokeLinecap="round"/>
      <path d="m43 47 5 7H38Z" fill="#6dba32" stroke="none"/>
    </g>}
    {shape === "apple" && <g strokeWidth="2.5" strokeLinejoin="round">
      <path d="m44 22 3-12" stroke="#7a553b" strokeLinecap="round"/>
      <path d="M45 19Q57 4 65 15Q56 26 45 19" fill="#6dba32" stroke="#48732e"/>
      <path d="M23 28Q23 15 43 23Q64 17 65 31L54 40 56 56 65 62Q57 80 44 72Q30 80 23 62L34 55 32 40Z" fill="#fff1c9" stroke="#b17746"/>
      <path d="M23 28Q23 15 43 23Q64 17 65 31L54 35 44 32 34 36Z" fill="#f96366"/>
      <path d="m23 62 13-2 8 5 11-6 10 3Q57 80 44 72Q30 80 23 62" fill="#f96366"/>
      <path d="M42 44Q34 54 42 55Q47 52 42 44M49 50Q44 58 50 59" fill="#956141"/>
    </g>}
    {shape === "cardboard" && <g stroke="#987046" strokeWidth="2.5" strokeLinejoin="round">
      <path d="m15 30 39-14 22 19-39 16Z" fill="#dbb984"/>
      <path d="m15 30 22 21v25L15 55Z" fill="#c99a61"/>
      <path d="m37 51 39-16v26L37 76Z" fill="#edcc99"/>
      <path d="m22 34 33-12 13 12-32 12Z" fill="#977350"/>
      <path d="m50 49 14-6v15l-14 6Z" fill="#fff0d3" stroke="none"/>
      <path d="m56 48 4 7-8 3" stroke="#6d8c53"/>
    </g>}
    {shape === "can" && <g transform="rotate(-14 44 44)" stroke="#8c565a" strokeWidth="2.5">
      <path d="M25 22H63V67Q44 80 25 67Z" fill="#f96366"/>
      <ellipse cx="44" cy="22" rx="19" ry="7" fill="#e8eef0"/>
      <ellipse cx="46" cy="23" rx="6" ry="2.5" fill="#859da3"/>
      <path d="M29 65Q44 74 59 65" stroke="#e9eef1" strokeWidth="4"/>
      <path d="M33 34V56" stroke="#ffb0a7" strokeWidth="4" strokeLinecap="round"/>
      <circle cx="46" cy="48" r="10" fill="#fff2cc" stroke="none"/>
      <path d="m43 43 7 5-7 5" stroke="#cc635b" strokeLinecap="round"/>
    </g>}
  </svg>;
}

export function RiverBackdrop() {
  return <svg className="river-backdrop" viewBox="0 0 720 360" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
    <rect width="720" height="360" fill="#dcedcc"/>
    <path d="M0 120Q150 20 318 90T720 70V0H0Z" fill="#b9d8ae"/>
    <path d="M-30 202Q130 85 350 176T760 144V292Q573 364 339 265T-30 303Z" fill="#ecdcad"/>
    <path className="river-water" d="M-30 222Q132 104 350 197T760 164V270Q573 343 339 244T-30 282Z" fill="#78cbd8"/>
    <path className="river-murk" d="M-30 222Q132 104 350 197T760 164V270Q573 343 339 244T-30 282Z" fill="#899d88"/>
    <g fill="none" stroke="#e1fbef" strokeWidth="3" opacity=".7" strokeLinecap="round" className="river-ripples">
      <path d="M55 239q24-12 45-9M170 170q29 0 45 7M259 211q25 2 42 10M440 259q40 10 63 5M603 211q23-6 42-13"/>
      <path d="M81 259q14-8 27-7M361 240l20 6M575 279l26-4"/>
    </g>
    <g fill="#567d56" opacity=".28" className="river-murk">
      <ellipse cx="152" cy="205" rx="30" ry="6"/><ellipse cx="390" cy="239" rx="49" ry="9"/><ellipse cx="601" cy="255" rx="33" ry="8"/>
    </g>
    <g className="river-fish" fill="#fff2dc" stroke="#cf7355" strokeWidth="2">
      <g transform="translate(290 202) rotate(15)"><path d="m-18 0-14-10v20Z"/><ellipse rx="22" ry="8"/><path d="m-5-7 7 6-2 8" stroke="#f57958" strokeWidth="9"/><circle cx="13" cy="-2" r="2" fill="#263d60" stroke="none"/></g>
      <g transform="translate(505 240) rotate(170)"><path d="m-14 0-11-8v16Z"/><ellipse rx="17" ry="6"/><path d="m-2-5 4 4-2 6" stroke="#f5b344" strokeWidth="7"/><circle cx="11" cy="-1" r="1.7" fill="#263d60" stroke="none"/></g>
    </g>
    <g fill="#8daa86" stroke="#6d8a71" strokeWidth="2">
      <ellipse cx="25" cy="195" rx="22" ry="12"/><ellipse cx="386" cy="291" rx="20" ry="11"/><ellipse cx="657" cy="140" rx="26" ry="12"/><ellipse cx="699" cy="314" rx="27" ry="14"/>
    </g>
    <g stroke="#af6150" strokeWidth="8" fill="none">
      <path d="M541 121Q585 96 626 101M540 139Q586 114 629 119"/>
      <path d="m549 115 13 60m8-66 13 60m8-65 13 61m7-62 13 62" stroke="#e4b47e" strokeWidth="12"/>
      <path d="M537 159Q583 132 635 139"/>
      <path d="m541 129-5-26m34 11-4-24m32 20-3-24m33 23-1-23" strokeWidth="5"/>
      <path d="M534 103Q581 77 635 87" strokeWidth="6"/>
    </g>
    <g transform="translate(70 10)">
      <path d="m33 25-5 75m63-75 5 75" stroke="#b15f4d" strokeWidth="10"/>
      <path d="M16 42H109M8 23Q62 32 117 22" stroke="#bc5a4d" strokeWidth="9"/>
      <path d="M5 18Q62 28 120 16" stroke="#364f50" strokeWidth="6"/>
      <path d="M41 46v15m43-15v15" stroke="#947347" strokeWidth="2"/>
      <rect x="32" y="57" width="18" height="23" rx="7" fill="#fff0ba"/>
      <rect x="75" y="57" width="18" height="23" rx="7" fill="#fff0ba"/>
    </g>
    <g stroke="#795d43" strokeWidth="9" fill="none"><path d="M685 110V46m0 31-21-20m21 7 16-23M25 102V40m0 33 18-20"/></g>
    <g fill="#f5b5b6"><circle cx="671" cy="39" r="25"/><circle cx="702" cy="32" r="29"/><circle cx="680" cy="16" r="26"/><circle cx="13" cy="29" r="27"/><circle cx="40" cy="34" r="23"/></g>
    <g fill="#ffd7cd"><circle cx="653" cy="24" r="13"/><circle cx="691" cy="46" r="16"/><circle cx="39" cy="17" r="13"/></g>
    <g stroke="#639856" strokeWidth="3" fill="none" strokeLinecap="round">
      <path d="m80 325 3-16 6 15 6-11m359 25 3-18 7 19 8-9m230-8 3-19 8 15M228 103l3-14 6 11"/>
    </g>
    <g className="river-flowers" fill="#f7a8aa"><circle cx="80" cy="305" r="5"/><circle cx="459" cy="317" r="5"/><circle cx="699" cy="298" r="5"/></g>
  </svg>;
}
