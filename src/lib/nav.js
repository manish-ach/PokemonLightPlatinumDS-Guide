/* The guide's sections, grouped into the four lines that colour the chrome.
   One list, read by the top bar, the menu sheet and the home board. `key` is
   the value a page passes to the layout as `current`. */
export const LINES = [
  { key: 'world', label: 'World', sections: [
    { key: 'places', label: 'Places', path: 'places/', blurb: 'Every reachable place, with what the DexNav shows there.' },
    { key: 'gyms', label: 'Gyms', path: 'gyms/', blurb: 'Leaders, badges and full teams, in level order.' },
  ] },
  { key: 'mon', label: 'Pokémon', sections: [
    { key: 'dex', label: 'Dex', path: 'dex/', blurb: 'Regional dex, the off-dex gifts, the Alolan forms.' },
    { key: 'trades', label: 'Trades', path: 'trades/', blurb: 'Two ways to trade-evolve on one console.' },
    { key: 'gifts', label: 'Mystery Gift', path: 'gifts/', blurb: 'Every Wonder Card, in the order they went out.' },
  ] },
  { key: 'bag', label: 'Bag', sections: [
    { key: 'items', label: 'Items', path: 'items/', blurb: 'Seven pockets. Where each one is picked up or sold.' },
    { key: 'medals', label: 'Medals', path: 'medals/', blurb: 'What each does and where it is earned or bought.' },
  ] },
  { key: 'story', label: 'Story', sections: [
    { key: 'quests', label: 'Quests', path: 'quests/', blurb: 'Errands people offer you, and where the story stops.' },
    { key: 'sun', label: 'Sun Palace', path: 'sun-palace/', blurb: 'The gear puzzle, with a solver for your exact board.' },
  ] },
];

/* which line a section key sits on; '' for the home page and anything else */
export const lineOf = (key) => LINES.find((l) => l.sections.some((s) => s.key === key))?.key || '';
