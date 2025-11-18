// ASCII art creatures for jump scare
// Multiple variations for variety

const CREATURES = [
  {
    name: 'ghost',
    art: `
     .--.
    (o  o)
    |  O |
     \\__/
    .-'  '-.
   /   __   \\
  |   /  \\   |
  |  |    |  |
   \\ |    | /
    '|    |'
     |    |
     |    |
    _|    |_
   (_______)
    `,
    color: '#ffffff'
  },
  {
    name: 'demon',
    art: `
      /\\___/\\
     ( o   o )
      )  ^  (
     |  \\_/  |
     |       |
    /|  ___  |\\
   / | |   | | \\
  |  | |   | |  |
  |  | |___| |  |
   \\ |_______| /
    \\         /
     |       |
     |       |
    _|       |_
   (___________) 
    `,
    color: '#ff0000'
  },
  {
    name: 'skull',
    art: `
       _______
      /       \\
     |  O   O  |
     |    ^    |
     |  \\___/  |
      \\_______/
        |   |
        |   |
       _|   |_
      |_______|
    `,
    color: '#cccccc'
  },
  {
    name: 'spider',
    art: `
    \\|/  \\|/
     \\ \\/ /
    --( o o )--
      (  ^  )
     /|\\  /|\\
    / | \\/ | \\
   |  |    |  |
    \\ |    | /
     \\|    |/
    `,
    color: '#8b4513'
  },
  {
    name: 'vampire',
    art: `
       /\\___/\\
      /  o o  \\
     |    ^    |
     |   \\_/   |
      \\  ^^^  /
       |     |
       |  |  |
      /|  |  |\\
     / |  |  | \\
    |  |  |  |  |
     \\ |  |  | /
      \\|  |  |/
       |  |  |
      _|  |  |_
     (__________)
    `,
    color: '#8b0000'
  },
  {
    name: 'monster',
    art: `
      ___________
     /  O     O  \\
    |   \\_____/   |
    |  /|||||\\    |
     \\/|||||||\\  /
      |||||||||/
      |   |   |
      |   |   |
     /|   |   |\\
    / |   |   | \\
   |  |   |   |  |
    \\ |   |   | /
     \\|   |   |/
      |   |   |
     _|   |   |_
    (___________)
    `,
    color: '#00ff00'
  },
  {
    name: 'witch',
    art: `
        /\\
       /  \\
      /____\\
       |  |
      /o  o\\
     |   ^   |
     |  \\_/  |
      \\____/
        ||
       /||\\
      / || \\
     |  ||  |
      \\ || /
       \\||/
        ||
       _||_
      (____) 
    `,
    color: '#9400d3'
  },
  {
    name: 'zombie',
    art: `
       _______
      /  x x  \\
     |    o    |
     |  \\___/  |
      \\_______/
        |   |
       /|   |\\
      / |   | \\
     |  |   |  |
      \\ |   | /
       \\|   |/
        |   |
        |   |
       _|   |_
      (_______)
    `,
    color: '#556b2f'
  }
];

/**
 * Get a random creature
 * @returns {Object} Creature object with name, art, and color
 */
function getRandomCreature() {
  const index = Math.floor(Math.random() * CREATURES.length);
  return CREATURES[index];
}

/**
 * Get a specific creature by name
 * @param {string} name - Creature name
 * @returns {Object|null} Creature object or null if not found
 */
function getCreatureByName(name) {
  return CREATURES.find(c => c.name === name) || null;
}

/**
 * Get all available creature names
 * @returns {string[]} Array of creature names
 */
function getCreatureNames() {
  return CREATURES.map(c => c.name);
}

// Export for use in renderer
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CREATURES,
    getRandomCreature,
    getCreatureByName,
    getCreatureNames
  };
}

// Also expose globally for browser context
if (typeof window !== 'undefined') {
  window.creatures = {
    CREATURES,
    getRandomCreature,
    getCreatureByName,
    getCreatureNames
  };
}
