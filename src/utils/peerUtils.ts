const adjectives = ['swift', 'bright', 'happy', 'cool', 'grand', 'sunny', 'merry', 'lucky'];
const nouns = ['crab', 'panda', 'gecko', 'eagle', 'shark', 'koala', 'llama', 'bison'];

export function generateRoomId(): string {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 900) + 100;
  return `fpg-${adj}-${noun}-${num}`;
}

export function generatePlayerId(name: string): string {
  return `${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now().toString(36)}`;
}
