// Shared types for the page. Types only: no runtime code lives in this file.

/** The nine sections, in page order. */
export type SectionId =
  | 'preloader'
  | 'hero'
  | 'speed'
  | 'capabilities'
  | 'code'
  | 'family'
  | 'pricing'
  | 'closing'
  | 'footer';

/** The block formations the 17 machined blocks can take (architecture section 6). */
export type FormationId =
  | 'stanza'
  | 'race'
  | 'cap-0'
  | 'cap-1'
  | 'cap-2'
  | 'recede'
  | 'family'
  | 'rest'
  | 'column';

/** Render quality tier, chosen from device hints and adjusted by the quality watchdog. */
export type Tier = 'low' | 'mid' | 'high';

/** Page theme. Paper is the light theme, ink the dark one. */
export type Theme = 'paper' | 'ink';
