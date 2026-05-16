const ANIMALS = [
  // ─── COMMON (60% chance) ───────────────────────────────────────
  {
    id: 'rabbit',
    name: '🐰 Kelinci',
    rarity: 'Common',
    rarityColor: '#95a5a6',
    value: 150,
    emoji: '🐰',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/Oryctolagus_cuniculus_Rcdo.jpg/640px-Oryctolagus_cuniculus_Rcdo.jpg',
    description: 'Kelinci liar yang lucu dan gesit.',
    catchRate: 0.75,
  },
  {
    id: 'squirrel',
    name: '🐿️ Tupai',
    rarity: 'Common',
    rarityColor: '#95a5a6',
    value: 120,
    emoji: '🐿️',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/Tamias_striatus2.jpg/640px-Tamias_striatus2.jpg',
    description: 'Tupai kecil yang suka menimbun makanan.',
    catchRate: 0.80,
  },
  {
    id: 'deer',
    name: '🦌 Rusa',
    rarity: 'Common',
    rarityColor: '#95a5a6',
    value: 200,
    emoji: '🦌',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Roe_deer_%28Capreolus_capreolus%29_male.jpg/640px-Roe_deer_%28Capreolus_capreolus%29_male.jpg',
    description: 'Rusa dengan tanduk yang indah.',
    catchRate: 0.65,
  },
  {
    id: 'fox',
    name: '🦊 Rubah',
    rarity: 'Common',
    rarityColor: '#95a5a6',
    value: 250,
    emoji: '🦊',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/03/Red_Fox_%28Vulpes_vulpes%29_-_British_Wildlife_Centre-4.jpg/640px-Red_Fox_%28Vulpes_vulpes%29_-_British_Wildlife_Centre-4.jpg',
    description: 'Rubah merah yang cerdik.',
    catchRate: 0.60,
  },

  // ─── UNCOMMON (25% chance) ─────────────────────────────────────
  {
    id: 'wolf',
    name: '🐺 Serigala',
    rarity: 'Uncommon',
    rarityColor: '#2ecc71',
    value: 500,
    emoji: '🐺',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Kolm%C3%A5rden_Wolf.jpg/640px-Kolm%C3%A5rden_Wolf.jpg',
    description: 'Serigala pemimpin kawanan.',
    catchRate: 0.45,
  },
  {
    id: 'bear',
    name: '🐻 Beruang',
    rarity: 'Uncommon',
    rarityColor: '#2ecc71',
    value: 600,
    emoji: '🐻',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Chengdu-pandas-d10.jpg/640px-Chengdu-pandas-d10.jpg',
    description: 'Beruang besar yang kuat.',
    catchRate: 0.40,
  },
  {
    id: 'eagle',
    name: '🦅 Elang',
    rarity: 'Uncommon',
    rarityColor: '#2ecc71',
    value: 550,
    emoji: '🦅',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Bald_Eagle_Portrait.jpg/640px-Bald_Eagle_Portrait.jpg',
    description: 'Elang raja langit.',
    catchRate: 0.42,
  },

  // ─── RARE (12% chance) ─────────────────────────────────────────
  {
    id: 'lion',
    name: '🦁 Singa',
    rarity: 'Rare',
    rarityColor: '#3498db',
    value: 1200,
    emoji: '🦁',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/Lion_waiting_in_Namibia.jpg/640px-Lion_waiting_in_Namibia.jpg',
    description: 'Raja hutan yang agung.',
    catchRate: 0.30,
  },
  {
    id: 'tiger',
    name: '🐯 Harimau',
    rarity: 'Rare',
    rarityColor: '#3498db',
    value: 1500,
    emoji: '🐯',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Walking_tiger_female.jpg/640px-Walking_tiger_female.jpg',
    description: 'Harimau Bengal yang misterius.',
    catchRate: 0.25,
  },
  {
    id: 'panda',
    name: '🐼 Panda',
    rarity: 'Rare',
    rarityColor: '#3498db',
    value: 1300,
    emoji: '🐼',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Grosser_Panda.JPG/640px-Grosser_Panda.JPG',
    description: 'Panda raksasa yang menggemaskan.',
    catchRate: 0.28,
  },

  // ─── EPIC (5% chance) ──────────────────────────────────────────
  {
    id: 'dragon',
    name: '🐉 Naga',
    rarity: 'Epic',
    rarityColor: '#9b59b6',
    value: 5000,
    emoji: '🐉',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Draco_volans_2.jpg/640px-Draco_volans_2.jpg',
    description: 'Kadal terbang mirip naga legendaris!',
    catchRate: 0.15,
  },
  {
    id: 'unicorn',
    name: '🦄 Unicorn',
    rarity: 'Epic',
    rarityColor: '#9b59b6',
    value: 6000,
    emoji: '🦄',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/62/White_horse_face_2.jpg/640px-White_horse_face_2.jpg',
    description: 'Kuda putih magis yang sangat langka!',
    catchRate: 0.12,
  },

  // ─── LEGENDARY (2% chance) ─────────────────────────────────────
  {
    id: 'phoenix',
    name: '🔥 Phoenix',
    rarity: 'Legendary',
    rarityColor: '#e74c3c',
    value: 15000,
    emoji: '🔥',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Flamingo_filter.jpg/640px-Flamingo_filter.jpg',
    description: '🌟 Burung api legendaris yang bangkit dari abu!',
    catchRate: 0.05,
  },
  {
    id: 'kraken',
    name: '🦑 Kraken',
    rarity: 'Legendary',
    rarityColor: '#e74c3c',
    value: 20000,
    emoji: '🦑',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Octopus3.jpg/640px-Octopus3.jpg',
    description: '🌟 Monster laut raksasa dari kedalaman samudra!',
    catchRate: 0.03,
  },
];

function getRandomAnimal() {
  const rand = Math.random() * 100;
  let pool;

  if (rand < 2) {
    pool = ANIMALS.filter(a => a.rarity === 'Legendary');
  } else if (rand < 7) {
    pool = ANIMALS.filter(a => a.rarity === 'Epic');
  } else if (rand < 19) {
    pool = ANIMALS.filter(a => a.rarity === 'Rare');
  } else if (rand < 44) {
    pool = ANIMALS.filter(a => a.rarity === 'Uncommon');
  } else {
    pool = ANIMALS.filter(a => a.rarity === 'Common');
  }

  return pool[Math.floor(Math.random() * pool.length)];
}

function getAnimalById(id) {
  return ANIMALS.find(a => a.id === id);
}

module.exports = { ANIMALS, getRandomAnimal, getAnimalById };
