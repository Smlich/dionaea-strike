import {
  loadGlobalHighScoreState,
  syncLiveHighScore,
} from './highScoreStore';
import type {
  EnemyArchetypeId,
  GameConfig,
  LandscapeId,
  LevelNumber,
  PetCatalogItem,
  PetId,
  SpeciesId,
} from './types';

export const CONFIG_STORAGE_KEY = 'dionaea_strike_config_v8';
export const HIGHSCORE_STORAGE_KEY = 'dionaea_strike_highscore_v2';
export const UNLOCKS_STORAGE_KEY = 'dionaea_strike_unlocks_v1';
export const PET_UNLOCKS_STORAGE_KEY = 'dionaea_strike_pet_unlocks_v1';
export const SELECTED_PET_STORAGE_KEY = 'dionaea_strike_selected_pet_v1';

export const STARTER_SPECIES: SpeciesId[] = ['dionaea', 'drosera', 'nepenthes', 'utricularia'];
export const ALL_SPECIES_IDS: SpeciesId[] = [
  'dionaea',
  'drosera',
  'nepenthes',
  'utricularia',
  'sarracenia',
  'pinguicula',
  'heliamphora',
  'cephalotus',
];

export const STARTER_PETS: PetId[] = ['batricio'];
export const ALL_PET_IDS: PetId[] = ['batricio', 'roy', 'sicario', 'palito', 'carpincho'];

export const PET_CATALOG: PetCatalogItem[] = [
  {
    id: 'batricio',
    name: 'Sapo Batricio',
    subtitle: 'Copiloto anfibio · Inicial',
    closeRangeLabel: 'Lengüetazo cazabalas',
    specialName: 'Llamado de Apareamiento',
    specialDesc: 'Canta con crogidos rítmicos invocando una lluvia de ranitas hembra venenosas.',
    unlockLevel: null,
    implemented: true,
    accentColor: '#22C55E',
  },
  {
    id: 'roy',
    name: 'Roy',
    subtitle: 'Gato blanco sordo (ojo azul y ojo verde)',
    closeRangeLabel: 'Maullidos molestos',
    specialName: 'Grito de Gato Malportado',
    specialDesc: 'Emite maullidos molestos de cerca y un alarido ensordecedor que barre balas y aturde.',
    unlockLevel: 1,
    implemented: true,
    accentColor: '#38BDF8',
  },
  {
    id: 'sicario',
    name: 'Sicario',
    subtitle: 'Gato gris atigrado de ojos verdes',
    closeRangeLabel: 'Pistola y balazos',
    specialName: 'Mafia Gatuna',
    specialDesc: 'Dispara su pistola a quemarropa e invoca a la mafia gatuna armada por varios segundos.',
    unlockLevel: 2,
    implemented: true,
    accentColor: '#4ADE80',
  },
  {
    id: 'palito',
    name: 'Palito',
    subtitle: 'Gato amarillo atigrado protector',
    closeRangeLabel: 'Corazones y escudo',
    specialName: 'Onda Enamoradora',
    specialDesc: 'Dispara corazones que enamoran lentamente y bloquea ataques con su escudo protector.',
    unlockLevel: 3,
    implemented: true,
    accentColor: '#FACC15',
  },
  {
    id: 'carpincho',
    name: 'Carpincho Matero',
    subtitle: 'Gaucho con sombrero y mate · Esgrima gaucha',
    closeRangeLabel: 'Facón largo + Poncho escudo',
    specialName: 'Infernales a Caballo',
    specialDesc: 'Combate cuerpo a cuerpo con facón de largo alcance y poncho escudo (sin disparos); con ¡SAPUCAIII! llama a los Infernales.',
    unlockLevel: 4,
    implemented: true,
    accentColor: '#F97316',
  },
  {
    id: 'locked_lv5',
    name: 'Mascota Nv.5',
    subtitle: 'Próximamente',
    closeRangeLabel: 'Poder legendario',
    specialName: 'Poder secreto',
    specialDesc: 'Disponible en futuras actualizaciones al vencer al Jefe Final.',
    unlockLevel: 5,
    implemented: false,
    accentColor: '#64748B',
  },
];

/**
 * CONFIGURACIÓN MAESTRA DEL JUEGO (Editable desde el modo Administrador)
 */
export const DEFAULT_GAME_CONFIG: GameConfig = {
  gameTitle: 'DIONAEA STRIKE',
  gameSubtitle: 'Campaña Aérea sobre la Tierra en 5 Regiones',
  player: {
    maxHp: 5,
    moveSpeed: 430,
    baseFireInterval: 0.27,
    autoFire: true,
    specialCooldownSec: 9,
    invulnerableDurationSec: 1.25,
    mutagenCycleSec: 1.75,
    frogAlly: {
      enabled: true,
      name: 'Sapo Batricio',
      tongueCooldownSec: 2.6,
      tongueRange: 175,
      bubbleDamage: 13,
    },
  },
  species: {
    dionaea: {
      id: 'dionaea',
      name: 'Dionaea',
      scientificName: 'Dionaea muscipula',
      roleLabel: 'Espinas y Mordida Snap',
      biologicalTrait: 'Pelos sensitivos de disparo veloz y trampa mecánica mandibular.',
      levelDescriptions: [
        'Nv. 1: 1 espina balística y Mordida Snap periódica que corta esporas.',
        'Nv. 2: Doble ráfaga de espinas y fauces laterales más anchas.',
        'Nv. 3: Triple abanico de espinas y Frenesí Mandibular que recarga Pulso.',
        'Nv. 4 (MÁX): Cuádruple abanico perforante y ondas Snap de largo alcance.',
        'Nv. 5 (SECRETA · EMPERATRIZ SOLAR): 5 espinas doradas perforantes + doble mordida solar gigante.',
      ],
      enabled: true,
      damage: 16,
      fireRateMultiplier: 1.0,
      accentColor: '#E11D48',
      secondaryColor: '#4ADE80',
      traitStrength: 6,
    },
    drosera: {
      id: 'drosera',
      name: 'Drosera',
      scientificName: 'Drosera capensis',
      roleLabel: 'Mucílago Adhesivo',
      biologicalTrait: 'Tentáculos glandulares recubiertos de rocío pegajoso paralizante.',
      levelDescriptions: [
        'Nv. 1: 1 gota parabólica de mucílago que ralentiza (-48%) a las presas.',
        'Nv. 2: Doble arco rebotante con salpicadura adhesiva en área.',
        'Nv. 3: Triple cascada con Capullo de Rocío que inmoviliza y +35% daño.',
        'Nv. 4 (MÁX): Lluvia de 4 globos de doble rebote que paraliza enjambres.',
        'Nv. 5 (SECRETA): Rocío Primordial eterno.',
      ],
      enabled: true,
      damage: 13,
      fireRateMultiplier: 1.1,
      accentColor: '#F59E0B',
      secondaryColor: '#FB7185',
      traitStrength: 0.48,
    },
    nepenthes: {
      id: 'nepenthes',
      name: 'Nepenthes',
      scientificName: 'Nepenthes alata',
      roleLabel: 'Jarras de Ácido',
      biologicalTrait: 'Jarras digestivas llenas de enzimas que disuelven exoesqueletos.',
      levelDescriptions: [
        'Nv. 1: 1 bomba aérea de néctar ácido que crea nubes corrosivas.',
        'Nv. 2: Doble descarga ácida que perfora escudos de quitina.',
        'Nv. 3: Bombas ampliadas y Erupción Digestiva en cadena al eliminar presas.',
        'Nv. 4 (MÁX): Triple bombardeo de jarras con nubes ácidas persistentes.',
        'Nv. 5 (SECRETA): Diluvio Enzimático abisal.',
      ],
      enabled: true,
      damage: 25,
      fireRateMultiplier: 1.08,
      accentColor: '#A855F7',
      secondaryColor: '#FDE047',
      traitStrength: 32,
    },
    utricularia: {
      id: 'utricularia',
      name: 'Utricularia',
      scientificName: 'Utricularia vulgaris',
      roleLabel: 'Vejigas de Vacío',
      biologicalTrait: 'Trampas de succión por presión negativa ultrarrápida (<1ms).',
      levelDescriptions: [
        'Nv. 1: 1 torpedo de vacío antigravedad que atrae insectos pequeños.',
        'Nv. 2: Disparo continuo que genera vórtices orbitales al impactar.',
        'Nv. 3: Doble torpedo divergente y Sifón Vital que cura +1 HP.',
        'Nv. 4 (MÁX): Triple descarga de vacío de alta succión y recarga rápida.',
        'Nv. 5 (SECRETA): Singularidad Botánica absoluta.',
      ],
      enabled: true,
      damage: 18,
      fireRateMultiplier: 1.15,
      accentColor: '#06B6D4',
      secondaryColor: '#67E8F9',
      traitStrength: 175,
    },
    sarracenia: {
      id: 'sarracenia',
      name: 'Sarracenia',
      scientificName: 'Sarracenia purpurea',
      roleLabel: 'Misiles Trompeta',
      biologicalTrait: 'Hojas tubulares propulsoras que aceleran proyectiles tras caer.',
      levelDescriptions: [
        'Nv. 1: 1 misil trompeta que cae levemente y acelera a velocidad supersónica.',
        'Nv. 2: Doble salva propulsada con estela perforante de néctar.',
        'Nv. 3: Triple batería de trompetas de alta penetración.',
        'Nv. 4 (MÁX): Cuádruple salva sónica rompe-blindajes.',
        'Nv. 5 (SECRETA): Trompeta Imperial hiper-sónica.',
      ],
      unlockRequirementLevel: 1,
      enabled: true,
      damage: 21,
      fireRateMultiplier: 1.12,
      accentColor: '#EC4899',
      secondaryColor: '#FDBA74',
      traitStrength: 420,
    },
    pinguicula: {
      id: 'pinguicula',
      name: 'Pinguicula',
      scientificName: 'Pinguicula moranensis',
      roleLabel: 'Cristales Rebotantes',
      biologicalTrait: 'Grasilla de rocío cristalino que rebota entre capas atmosféricas.',
      levelDescriptions: [
        'Nv. 1: 1 cristal graso que rebota en suelo y techo ralentizando enemigos.',
        'Nv. 2: Doble cristal de triple rebote en diagonal.',
        'Nv. 3: Cristales perforantes que congelan exoesqueletos.',
        'Nv. 4 (MÁX): Triple lluvia de cristales de cuádruple rebote eterno.',
        'Nv. 5 (SECRETA): Prisma Glacial perpetuo.',
      ],
      unlockRequirementLevel: 2,
      enabled: true,
      damage: 17,
      fireRateMultiplier: 1.1,
      accentColor: '#34D399',
      secondaryColor: '#BAE6FD',
      traitStrength: 0.52,
    },
    heliamphora: {
      id: 'heliamphora',
      name: 'Heliamphora',
      scientificName: 'Heliamphora nutans',
      roleLabel: 'Arcos Solares',
      biologicalTrait: 'Jarras de los tepuyes que canalizan luz ascendente en espiral.',
      levelDescriptions: [
        'Nv. 1: 1 hoja solar curva que asciende en arco contra amenazas altas.',
        'Nv. 2: Doble arco solar cruzado (hélice alta y baja).',
        'Nv. 3: Arcos solares perforantes de energía tepuy.',
        'Nv. 4 (MÁX): Triple abanico solar antigravedad de largo alcance.',
        'Nv. 5 (SECRETA): Sol del Tepuy incandescente.',
      ],
      unlockRequirementLevel: 3,
      enabled: true,
      damage: 20,
      fireRateMultiplier: 1.14,
      accentColor: '#FBBF24',
      secondaryColor: '#FEF08A',
      traitStrength: 280,
    },
    cephalotus: {
      id: 'cephalotus',
      name: 'Cephalotus',
      scientificName: 'Cephalotus follicularis',
      roleLabel: 'Morteros Dentados',
      biologicalTrait: 'Jarras mocasín acorazadas que detonan en esquirlas dentadas.',
      levelDescriptions: [
        'Nv. 1: 1 mortero dentado de caída pesada que se fragmenta al impactar.',
        'Nv. 2: Doble mortero de fragmentación dentada perforante.',
        'Nv. 3: Morteros con triple fragmentación horizontal al detonar.',
        'Nv. 4 (MÁX): Triple bombardeo mocasín con lluvia de esquirlas.',
        'Nv. 5 (SECRETA): Leviatán Dentado abisal.',
      ],
      unlockRequirementLevel: 4,
      enabled: true,
      damage: 27,
      fireRateMultiplier: 1.06,
      accentColor: '#84CC16',
      secondaryColor: '#F43F5E',
      traitStrength: 2,
    },
  },
  enemies: {
    drone: {
      id: 'drone',
      name: 'Mosca Exploradora',
      scientificHint: 'Díptero real ligero',
      hp: 40,
      speed: 170,
      score: 110,
      radius: 19,
      fireInterval: 1.65,
      accentColor: '#4ADE80',
    },
    mosquito: {
      id: 'mosquito',
      name: 'Mosquito Lancero',
      scientificHint: 'Estilete veloz',
      hp: 28,
      speed: 255,
      score: 160,
      radius: 13,
      fireInterval: 1.48,
      accentColor: '#FACC15',
    },
    tank: {
      id: 'tank',
      name: 'Acorazado Real',
      scientificHint: 'Tábano imperial blindado',
      hp: 150,
      speed: 96,
      score: 340,
      radius: 35,
      fireInterval: 1.85,
      accentColor: '#F97316',
    },
    sniper: {
      id: 'sniper',
      name: 'Mantis Monóculo',
      scientificHint: 'Asilidae francotiradora',
      hp: 58,
      speed: 168,
      score: 250,
      radius: 23,
      fireInterval: 1.92,
      accentColor: '#EC4899',
    },
    flanker: {
      id: 'flanker',
      name: 'Cazador Orbital',
      scientificHint: 'Interceptor fungoso',
      hp: 42,
      speed: 222,
      score: 210,
      radius: 16,
      fireInterval: 1.56,
      accentColor: '#38BDF8',
    },
    hornet: {
      id: 'hornet',
      name: 'Avispón Guardia',
      scientificHint: 'Escolta real de aguijón',
      hp: 88,
      speed: 145,
      score: 280,
      radius: 27,
      fireInterval: 1.75,
      accentColor: '#FB7185',
    },
    locust: {
      id: 'locust',
      name: 'Langosta Saltarina',
      scientificHint: 'Saltamontes parabólico',
      hp: 56,
      speed: 190,
      score: 220,
      radius: 21,
      fireInterval: 1.68,
      accentColor: '#84CC16',
    },
    bomber: {
      id: 'bomber',
      name: 'Escarabajo Galeón',
      scientificHint: 'Bombardero pesado orbital',
      hp: 118,
      speed: 120,
      score: 310,
      radius: 31,
      fireInterval: 1.88,
      accentColor: '#C084FC',
    },
  },
  waves: [
    // NIVEL 1 (PAMPA AL AMANECER · ANIME / RAP AR — ~164s pista)
    {
      id: 1,
      level: 1,
      title: 'Nivel 1 · Amanecer en la Pampa',
      landscape: 'pampa_dawn',
      durationSec: 24,
      spawnIntervalSec: 0.86,
      archetypes: ['drone', 'mosquito', 'locust'],
      dropsMutagen: true,
    },
    {
      id: 2,
      level: 1,
      title: 'Nivel 1 · Delta del Paraná',
      landscape: 'pampa_dawn',
      durationSec: 25,
      spawnIntervalSec: 0.82,
      archetypes: ['drone', 'tank', 'locust', 'sniper'],
      dropsMutagen: false,
    },
    {
      id: 3,
      level: 1,
      title: 'Nivel 1 · Molinos de Viento',
      landscape: 'pampa_dawn',
      durationSec: 25,
      spawnIntervalSec: 0.78,
      archetypes: ['mosquito', 'tank', 'sniper', 'flanker'],
      dropsMutagen: false,
    },
    // NIVEL 2 (SELVA MISIONERA Y CATARATAS · CUMBIA — ~159s pista)
    {
      id: 4,
      level: 2,
      title: 'Nivel 2 · Selva Misionera',
      landscape: 'jungle_falls',
      durationSec: 25,
      spawnIntervalSec: 0.88,
      archetypes: ['mosquito', 'flanker', 'locust', 'drone'],
      dropsMutagen: true,
    },
    {
      id: 5,
      level: 2,
      title: 'Nivel 2 · Garganta de las Cataratas',
      landscape: 'jungle_falls',
      durationSec: 26,
      spawnIntervalSec: 0.84,
      archetypes: ['flanker', 'tank', 'hornet', 'locust'],
      dropsMutagen: false,
    },
    {
      id: 6,
      level: 2,
      title: 'Nivel 2 · Bruma Tropical de Cumbia',
      landscape: 'jungle_falls',
      durationSec: 26,
      spawnIntervalSec: 0.78,
      archetypes: ['hornet', 'tank', 'bomber', 'sniper'],
      dropsMutagen: false,
    },
    // NIVEL 3 (BUENOS AIRES NOCTURNO · BOOM BAP — ~180s pista)
    {
      id: 7,
      level: 3,
      title: 'Nivel 3 · Buenos Aires Nocturno',
      landscape: 'city_night',
      durationSec: 26,
      spawnIntervalSec: 0.76,
      archetypes: ['tank', 'sniper', 'hornet', 'drone'],
      dropsMutagen: false,
    },
    {
      id: 8,
      level: 3,
      title: 'Nivel 3 · Avenidas Bajo Lluvia',
      landscape: 'city_night',
      durationSec: 27,
      spawnIntervalSec: 0.72,
      archetypes: ['mosquito', 'tank', 'flanker', 'bomber'],
      dropsMutagen: true,
    },
    {
      id: 9,
      level: 3,
      title: 'Nivel 3 · Obelisco Boom Bap',
      landscape: 'city_night',
      durationSec: 27,
      spawnIntervalSec: 0.68,
      archetypes: ['hornet', 'sniper', 'locust', 'bomber'],
      dropsMutagen: false,
    },
    // NIVEL 4 (AUTOPISTA Y PUERTO · RAP AR CALLEJERO — ~164s pista)
    {
      id: 10,
      level: 4,
      title: 'Nivel 4 · Viaducto al Crepúsculo',
      landscape: 'urban_viaduct',
      durationSec: 25,
      spawnIntervalSec: 0.66,
      archetypes: ['sniper', 'mosquito', 'flanker', 'locust'],
      dropsMutagen: false,
    },
    {
      id: 11,
      level: 4,
      title: 'Nivel 4 · Puerto y Puente Colgante',
      landscape: 'urban_viaduct',
      durationSec: 26,
      spawnIntervalSec: 0.62,
      archetypes: ['tank', 'sniper', 'hornet', 'bomber'],
      dropsMutagen: true,
    },
    {
      id: 12,
      level: 4,
      title: 'Nivel 4 · Asfalto Callejero',
      landscape: 'urban_viaduct',
      durationSec: 26,
      spawnIntervalSec: 0.58,
      archetypes: ['mosquito', 'hornet', 'flanker', 'bomber'],
      dropsMutagen: false,
    },
    // NIVEL 5 (QUEBRADA DE HUMAHUACA Y ANDES · EL HUMAHUQUEÑO — ~151s pista)
    {
      id: 13,
      level: 5,
      title: 'Nivel 5 · Quebrada de Humahuaca',
      landscape: 'humahuaca_andes',
      durationSec: 25,
      spawnIntervalSec: 0.56,
      archetypes: ['hornet', 'flanker', 'sniper', 'locust'],
      dropsMutagen: false,
    },
    {
      id: 14,
      level: 5,
      title: 'Nivel 5 · Cerros de Siete Colores',
      landscape: 'humahuaca_andes',
      durationSec: 26,
      spawnIntervalSec: 0.53,
      archetypes: ['tank', 'hornet', 'bomber', 'sniper'],
      dropsMutagen: true,
    },
    {
      id: 15,
      level: 5,
      title: 'Nivel 5 · Cumbres Andinas del Inti',
      landscape: 'humahuaca_andes',
      durationSec: 27,
      spawnIntervalSec: 0.5,
      archetypes: ['drone', 'mosquito', 'tank', 'sniper', 'flanker', 'hornet', 'locust', 'bomber'],
      dropsMutagen: false,
    },
  ],
  miniBosses: [
    {
      level: 1,
      name: 'SYRPHUS VORTEX',
      subtitle: 'Mini-Jefe Nv.1 · Bumeranes de Bronce',
      mechanicHint: 'Lanza cuchillas bumerán que frenan y regresan en curva sobre la Pampa',
      landscape: 'pampa_dawn',
      maxHp: 640,
      speed: 165,
      scoreBonus: 700,
      fireInterval: 1.25,
    },
    {
      level: 2,
      name: 'MANTIS TROPICAL',
      subtitle: 'Mini-Jefe Nv.2 · Cocos Rebotantes',
      mechanicHint: 'Dispara esferas de néctar con gravedad que rebotan entre las cascadas',
      landscape: 'jungle_falls',
      maxHp: 820,
      speed: 175,
      scoreBonus: 900,
      fireInterval: 1.18,
    },
    {
      level: 3,
      name: 'VESPULA PESADA',
      subtitle: 'Mini-Jefe Nv.3 · Morteros Boom Bap',
      mechanicHint: 'Descarga morteros parabólicos con ondas sísmicas sobre las avenidas',
      landscape: 'city_night',
      maxHp: 1020,
      speed: 155,
      scoreBonus: 1150,
      fireInterval: 1.12,
    },
    {
      level: 4,
      name: 'ASILUS CALLEJERO',
      subtitle: 'Mini-Jefe Nv.4 · Salto Teletransportado',
      mechanicHint: 'Se teletransporta en vertical dejando sombra y lanza dardos rebotantes',
      landscape: 'urban_viaduct',
      maxHp: 1220,
      speed: 195,
      scoreBonus: 1400,
      fireInterval: 1.04,
    },
    {
      level: 5,
      name: 'CÓNDOR-TÁBANO ANDINO',
      subtitle: 'Mini-Jefe Nv.5 · Vientos de la Quebrada',
      mechanicHint: 'Desata ráfagas de viento andino que empujan la nave y abanicos sónicos',
      landscape: 'humahuaca_andes',
      maxHp: 1480,
      speed: 185,
      scoreBonus: 1700,
      fireInterval: 0.96,
    },
  ],
  bosses: [
    {
      level: 1,
      name: 'TRILOBITES ABISAL',
      subtitle: 'Jefe Nv.1 · Xenomorfo Fósil (1 Mecánica)',
      mechanicHint: '1 mecánica: coraza fósil retráctil con estallido radial de esporas',
      landscape: 'pampa_dawn',
      maxHp: 710,
      speed: 140,
      scoreBonus: 1500,
      fireInterval: 1.38,
      unlocksSpecies: 'sarracenia',
      unlocksPet: 'roy',
    },
    {
      level: 2,
      name: 'MARIQUITA PARÁSITA',
      subtitle: 'Jefe Nv.2 · Xenomorfo Carmesí (2 Mecánicas)',
      mechanicHint: '2 mecánicas: huevos parásitos rebotantes y apertura de élitros con enjambre',
      landscape: 'jungle_falls',
      maxHp: 1840,
      speed: 160,
      scoreBonus: 2000,
      fireInterval: 1.24,
      unlocksSpecies: 'pinguicula',
      unlocksPet: 'sicario',
    },
    {
      level: 3,
      name: 'AVISPA XENO-REINA',
      subtitle: 'Jefe Nv.3 · Xenomorfo Predador (3 Mecánicas)',
      mechanicHint: '3 mecánicas: abanico de aguijones, embestida depredadora y morteros de veneno',
      landscape: 'city_night',
      maxHp: 3390,
      speed: 176,
      scoreBonus: 2600,
      fireInterval: 1.12,
      unlocksSpecies: 'heliamphora',
      unlocksPet: 'palito',
    },
    {
      level: 4,
      name: 'MANTIS ESPECTRAL',
      subtitle: 'Jefe Nv.4 · Xenomorfo Segadora (4 Mecánicas)',
      mechanicHint: '4 mecánicas: parpadeo espectral, guadañas bumerán, láseres gemelos y rebotes',
      landscape: 'urban_viaduct',
      maxHp: 5480,
      speed: 192,
      scoreBonus: 3200,
      fireInterval: 1.0,
      unlocksSpecies: 'cephalotus',
      unlocksPet: 'carpincho',
    },
    {
      level: 5,
      name: 'ESCORPIÓN EMPERADOR',
      subtitle: 'Jefe Final Nv.5 · Xenomorfo Coloso (5 Mecánicas)',
      mechanicHint: '5 mecánicas: viento andino, pozos gravitatorios, meteoros, rayo ácido y nova de tenazas',
      landscape: 'humahuaca_andes',
      maxHp: 8750,
      speed: 208,
      scoreBonus: 5000,
      fireInterval: 0.88,
    },
  ],
};

export function cloneGameConfig(cfg: GameConfig): GameConfig {
  return JSON.parse(JSON.stringify(cfg)) as GameConfig;
}

const ENEMY_KEYS: EnemyArchetypeId[] = [
  'drone',
  'mosquito',
  'tank',
  'sniper',
  'flanker',
  'hornet',
  'locust',
  'bomber',
];

function clampNum(val: unknown, fallback: number, min: number, max: number): number {
  if (typeof val !== 'number' || !Number.isFinite(val)) return fallback;
  return Math.max(min, Math.min(max, val));
}

function normalizeLandscape(val: unknown, fallback: LandscapeId): LandscapeId {
  if (val === 'pampa_dawn' || val === 'orbit_dawn' || val === 'canyon') return 'pampa_dawn';
  if (val === 'jungle_falls' || val === 'amber_thermosphere' || val === 'amber_mesa') return 'jungle_falls';
  if (val === 'city_night' || val === 'crimson_exosphere' || val === 'crimson_storm') return 'city_night';
  if (val === 'urban_viaduct' || val === 'auroral_stratosphere') return 'urban_viaduct';
  if (val === 'humahuaca_andes' || val === 'andean_zenith') return 'humahuaca_andes';
  return fallback;
}

function normalizeLevel(val: unknown, fallback: LevelNumber): LevelNumber {
  if (val === 1 || val === 2 || val === 3 || val === 4 || val === 5) return val;
  return fallback;
}

export function sanitizeGameConfig(raw: unknown): GameConfig {
  const base = cloneGameConfig(DEFAULT_GAME_CONFIG);
  if (!raw || typeof raw !== 'object') return base;
  const input = raw as Partial<GameConfig>;

  if (typeof input.gameTitle === 'string' && input.gameTitle.trim()) {
    base.gameTitle = input.gameTitle.trim().slice(0, 32);
  }
  if (typeof input.gameSubtitle === 'string' && input.gameSubtitle.trim()) {
    base.gameSubtitle = input.gameSubtitle.trim().slice(0, 48);
  }

  if (input.player && typeof input.player === 'object') {
    base.player.maxHp = Math.round(clampNum(input.player.maxHp, base.player.maxHp, 1, 12));
    base.player.moveSpeed = Math.round(clampNum(input.player.moveSpeed, base.player.moveSpeed, 180, 800));
    base.player.baseFireInterval = clampNum(input.player.baseFireInterval, base.player.baseFireInterval, 0.06, 0.6);
    if (typeof input.player.autoFire === 'boolean') base.player.autoFire = input.player.autoFire;
    base.player.specialCooldownSec = clampNum(input.player.specialCooldownSec, base.player.specialCooldownSec, 3, 30);
    base.player.invulnerableDurationSec = clampNum(
      input.player.invulnerableDurationSec,
      base.player.invulnerableDurationSec,
      0.3,
      4
    );
    base.player.mutagenCycleSec = clampNum(input.player.mutagenCycleSec, base.player.mutagenCycleSec, 0.7, 5);

    if (input.player.frogAlly && typeof input.player.frogAlly === 'object') {
      const f = input.player.frogAlly;
      if (typeof f.enabled === 'boolean') base.player.frogAlly.enabled = f.enabled;
      if (typeof f.name === 'string' && f.name.trim()) base.player.frogAlly.name = f.name.trim().slice(0, 24);
      base.player.frogAlly.tongueCooldownSec = clampNum(
        f.tongueCooldownSec,
        base.player.frogAlly.tongueCooldownSec,
        1.0,
        8.0
      );
      base.player.frogAlly.tongueRange = Math.round(
        clampNum(f.tongueRange, base.player.frogAlly.tongueRange, 90, 320)
      );
      base.player.frogAlly.bubbleDamage = Math.round(
        clampNum(f.bubbleDamage, base.player.frogAlly.bubbleDamage, 4, 80)
      );
    }
  }

  if (input.species && typeof input.species === 'object') {
    for (const key of ALL_SPECIES_IDS) {
      const s = input.species[key];
      if (!s || typeof s !== 'object') continue;
      const target = base.species[key];
      if (typeof s.name === 'string' && s.name.trim()) target.name = s.name.trim().slice(0, 24);
      if (typeof s.roleLabel === 'string' && s.roleLabel.trim()) target.roleLabel = s.roleLabel.trim().slice(0, 40);
      if (typeof s.biologicalTrait === 'string' && s.biologicalTrait.trim()) {
        target.biologicalTrait = s.biologicalTrait.trim().slice(0, 140);
      }
      if (typeof s.enabled === 'boolean') target.enabled = key === 'dionaea' ? true : s.enabled;
      target.damage = Math.round(clampNum(s.damage, target.damage, 1, 200));
      target.fireRateMultiplier = clampNum(s.fireRateMultiplier, target.fireRateMultiplier, 0.5, 2.5);
      target.traitStrength = clampNum(s.traitStrength, target.traitStrength, 0.1, 600);
      if (typeof s.accentColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(s.accentColor)) {
        target.accentColor = s.accentColor;
      }
    }
  }

  if (input.enemies && typeof input.enemies === 'object') {
    const rawEnemies = input.enemies as Record<string, Partial<GameConfig['enemies']['drone']> | undefined>;
    for (const key of ENEMY_KEYS) {
      const e = rawEnemies[key] ?? (key === 'hornet' ? rawEnemies.spider : undefined);
      if (!e || typeof e !== 'object') continue;
      const target = base.enemies[key];
      if (typeof e.name === 'string' && e.name.trim()) target.name = e.name.trim().slice(0, 28);
      target.hp = Math.round(clampNum(e.hp, target.hp, 5, 1000));
      target.speed = Math.round(clampNum(e.speed, target.speed, 30, 500));
      target.score = Math.round(clampNum(e.score, target.score, 10, 5000));
      target.fireInterval = clampNum(e.fireInterval, target.fireInterval, 0.6, 8);
      if (typeof e.accentColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(e.accentColor)) {
        target.accentColor = e.accentColor;
      }
    }
  }

  if (Array.isArray(input.waves) && input.waves.length > 0) {
    const sanitized = input.waves.slice(0, 15).map((w, idx) => {
      const def = DEFAULT_GAME_CONFIG.waves[idx] ?? DEFAULT_GAME_CONFIG.waves[0];
      const archetypes = Array.isArray(w.archetypes)
        ? w.archetypes
            .map((a) => ((a as string) === 'spider' ? 'hornet' : a))
            .filter((a): a is EnemyArchetypeId => ENEMY_KEYS.includes(a as EnemyArchetypeId))
        : def.archetypes;
      return {
        id: idx + 1,
        level: normalizeLevel(w.level, def.level),
        title: typeof w.title === 'string' && w.title.trim() ? w.title.trim().slice(0, 48) : def.title,
        landscape: normalizeLandscape(w.landscape, def.landscape),
        durationSec: Math.round(clampNum(w.durationSec, def.durationSec, 8, 90)),
        spawnIntervalSec: clampNum(w.spawnIntervalSec, def.spawnIntervalSec, 0.35, 3.0),
        archetypes: archetypes.length > 0 ? archetypes : def.archetypes,
        dropsMutagen: typeof w.dropsMutagen === 'boolean' ? w.dropsMutagen : def.dropsMutagen,
      };
    });

    // Guarantee every campaign level (1..5) always has valid contiguous waves even when loading
    // a legacy saved config with fewer than 15 waves.
    const mergedWaves: GameConfig['waves'] = [];
    for (const lvl of [1, 2, 3, 4, 5] as const) {
      const customForLevel = sanitized.filter((w) => w.level === lvl);
      if (customForLevel.length > 0) {
        mergedWaves.push(...customForLevel);
      } else {
        mergedWaves.push(
          ...DEFAULT_GAME_CONFIG.waves
            .filter((w) => w.level === lvl)
            .map((w) => ({ ...w, archetypes: [...w.archetypes] }))
        );
      }
    }
    base.waves = mergedWaves.map((w, idx) => ({ ...w, id: idx + 1 }));
  }

  if (Array.isArray(input.miniBosses)) {
    for (let i = 0; i < Math.min(5, input.miniBosses.length); i++) {
      const mb = input.miniBosses[i];
      if (!mb || typeof mb !== 'object') continue;
      const target = base.miniBosses[i];
      if (typeof mb.name === 'string' && mb.name.trim()) target.name = mb.name.trim().slice(0, 32);
      if (typeof mb.subtitle === 'string' && mb.subtitle.trim()) target.subtitle = mb.subtitle.trim().slice(0, 48);
      target.landscape = normalizeLandscape(mb.landscape, target.landscape);
      target.maxHp = Math.round(clampNum(mb.maxHp, target.maxHp, 180, 8000));
      target.speed = Math.round(clampNum(mb.speed, target.speed, 40, 400));
      target.scoreBonus = Math.round(clampNum(mb.scoreBonus, target.scoreBonus, 200, 15000));
      target.fireInterval = clampNum(mb.fireInterval, target.fireInterval, 0.5, 4);
    }
  }

  if (Array.isArray(input.bosses)) {
    for (let i = 0; i < Math.min(5, input.bosses.length); i++) {
      const b = input.bosses[i];
      if (!b || typeof b !== 'object') continue;
      const target = base.bosses[i];
      if (typeof b.name === 'string' && b.name.trim()) target.name = b.name.trim().slice(0, 32);
      if (typeof b.subtitle === 'string' && b.subtitle.trim()) target.subtitle = b.subtitle.trim().slice(0, 48);
      target.landscape = normalizeLandscape(b.landscape, target.landscape);
      target.maxHp = Math.round(clampNum(b.maxHp, target.maxHp, 250, 14000));
      target.speed = Math.round(clampNum(b.speed, target.speed, 40, 400));
      target.scoreBonus = Math.round(clampNum(b.scoreBonus, target.scoreBonus, 500, 25000));
      target.fireInterval = clampNum(b.fireInterval, target.fireInterval, 0.5, 4);
    }
  }

  return base;
}

export function loadUnlockedSpecies(): SpeciesId[] {
  if (typeof window === 'undefined') return [...STARTER_SPECIES];
  try {
    const raw = window.localStorage.getItem(UNLOCKS_STORAGE_KEY);
    if (!raw) return [...STARTER_SPECIES];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [...STARTER_SPECIES];
    const valid = parsed.filter((s): s is SpeciesId => ALL_SPECIES_IDS.includes(s as SpeciesId));
    const merged = new Set<SpeciesId>([...STARTER_SPECIES, ...valid]);
    return ALL_SPECIES_IDS.filter((id) => merged.has(id));
  } catch {
    return [...STARTER_SPECIES];
  }
}

export function saveUnlockedSpecies(unlocked: SpeciesId[]): SpeciesId[] {
  const merged = new Set<SpeciesId>([...STARTER_SPECIES, ...unlocked.filter((s) => ALL_SPECIES_IDS.includes(s))]);
  const clean = ALL_SPECIES_IDS.filter((id) => merged.has(id));
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(UNLOCKS_STORAGE_KEY, JSON.stringify(clean));
    } catch {
      // Ignore storage errors
    }
  }
  return clean;
}

export function unlockSpeciesForNextRuns(speciesId: SpeciesId): {
  unlocked: SpeciesId[];
  newlyUnlocked: boolean;
} {
  const current = loadUnlockedSpecies();
  if (current.includes(speciesId)) {
    return { unlocked: current, newlyUnlocked: false };
  }
  const next = saveUnlockedSpecies([...current, speciesId]);
  return { unlocked: next, newlyUnlocked: true };
}

export function resetUnlockedSpecies(): SpeciesId[] {
  return saveUnlockedSpecies([...STARTER_SPECIES]);
}

function migratePetId(raw: unknown): PetId | null {
  if (raw === 'pip' || raw === 'batricio') return 'batricio';
  if (raw === 'roy') return 'roy';
  if (raw === 'sicario') return 'sicario';
  if (raw === 'palito') return 'palito';
  if (raw === 'carpincho') return 'carpincho';
  return null;
}

export function loadUnlockedPets(): PetId[] {
  if (typeof window === 'undefined') return [...STARTER_PETS];
  try {
    const raw = window.localStorage.getItem(PET_UNLOCKS_STORAGE_KEY);
    if (!raw) return [...STARTER_PETS];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [...STARTER_PETS];
    const valid = parsed
      .map((p) => migratePetId(p))
      .filter((p): p is PetId => p !== null && ALL_PET_IDS.includes(p));
    const merged = new Set<PetId>([...STARTER_PETS, ...valid]);
    return ALL_PET_IDS.filter((id) => merged.has(id));
  } catch {
    return [...STARTER_PETS];
  }
}

export function saveUnlockedPets(unlocked: PetId[]): PetId[] {
  const valid = unlocked
    .map((p) => migratePetId(p))
    .filter((p): p is PetId => p !== null && ALL_PET_IDS.includes(p));
  const merged = new Set<PetId>([...STARTER_PETS, ...valid]);
  const clean = ALL_PET_IDS.filter((id) => merged.has(id));
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(PET_UNLOCKS_STORAGE_KEY, JSON.stringify(clean));
    } catch {
      // Ignore storage errors
    }
  }
  return clean;
}

export function unlockPetForNextRuns(petId: PetId): {
  unlocked: PetId[];
  newlyUnlocked: boolean;
} {
  const current = loadUnlockedPets();
  if (current.includes(petId)) {
    return { unlocked: current, newlyUnlocked: false };
  }
  const next = saveUnlockedPets([...current, petId]);
  return { unlocked: next, newlyUnlocked: true };
}

export function resetUnlockedPets(): PetId[] {
  saveSelectedPet('batricio');
  return saveUnlockedPets([...STARTER_PETS]);
}

export function loadSelectedPet(): PetId {
  const unlocked = loadUnlockedPets();
  if (typeof window === 'undefined') return 'batricio';
  try {
    const raw = migratePetId(window.localStorage.getItem(SELECTED_PET_STORAGE_KEY));
    if (raw && unlocked.includes(raw)) return raw;
  } catch {
    // Ignore storage errors
  }
  return 'batricio';
}

export function saveSelectedPet(petId: PetId): PetId {
  const unlocked = loadUnlockedPets();
  const migrated = migratePetId(petId) ?? 'batricio';
  const safe: PetId = unlocked.includes(migrated) ? migrated : 'batricio';
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(SELECTED_PET_STORAGE_KEY, safe);
    } catch {
      // Ignore storage errors
    }
  }
  return safe;
}

export function loadGameConfig(): GameConfig {
  if (typeof window === 'undefined') return cloneGameConfig(DEFAULT_GAME_CONFIG);
  try {
    const raw = window.localStorage.getItem(CONFIG_STORAGE_KEY);
    if (!raw) return cloneGameConfig(DEFAULT_GAME_CONFIG);
    return sanitizeGameConfig(JSON.parse(raw));
  } catch {
    return cloneGameConfig(DEFAULT_GAME_CONFIG);
  }
}

export function saveGameConfig(config: GameConfig): GameConfig {
  const clean = sanitizeGameConfig(config);
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(clean));
    } catch {
      // Ignore storage quota errors
    }
  }
  return clean;
}

export function loadHighScore(): number {
  return loadGlobalHighScoreState().bestScore;
}

export function saveHighScore(score: number): number {
  return syncLiveHighScore(score).bestScore;
}
