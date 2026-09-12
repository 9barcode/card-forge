import type { CardElement, CardGrade } from './gameCache';

export interface CardCatalogEntry {
  templateId: string;
  name: string;
  element: CardElement;
  grade: CardGrade;
  imageKey: string;
}

const elements: readonly CardElement[] = [
  'EARTH',
  'WATER',
  'WIND',
  'FIRE',
  'LIGHT',
  'DARK',
];

const grades: readonly CardGrade[] = [
  'NORMAL',
  'MAGIC',
  'RARE',
  'SUPER_RARE',
  'UNIQUE',
  'LEGENDARY',
];

const namesByGrade: Readonly<Record<CardGrade, readonly string[]>> = {
  NORMAL: [
    '대지의 수호자',
    '물결의 정령',
    '바람의 궁수',
    '불꽃 기사',
    '빛의 사제',
    '그림자 도적',
  ],
  MAGIC: [
    '바위 주술사',
    '심해의 파도',
    '회오리 무희',
    '잿불 마법사',
    '여명의 기사',
    '밤안개 추적자',
  ],
  RARE: [
    '강철뿌리 거인',
    '서리의 마녀',
    '질풍의 정령',
    '홍염의 검사',
    '광휘의 성기사',
    '칠흑의 암살자',
  ],
  SUPER_RARE: [
    '지진의 거신',
    '해일의 지배자',
    '폭풍 그리핀',
    '불꽃 드래곤',
    '천상의 집행자',
    '망령의 지휘관',
  ],
  UNIQUE: [
    '태산의 제왕',
    '영원의 빙룡',
    '창공의 군주',
    '불멸의 불사조',
    '찬란한 심판',
    '파멸의 사신',
  ],
  LEGENDARY: [
    '태초의 대지신',
    '만해의 용왕',
    '천공의 폭풍신',
    '종말의 염룡',
    '창세의 광휘',
    '심연의 군주',
  ],
};

const imageKeysByGrade: Readonly<Record<CardGrade, readonly string[]>> = {
  NORMAL: [
    'cards/earth_guardian.png',
    'cards/wave_spirit.png',
    'cards/wind_archer.png',
    'cards/flame_knight.png',
    'cards/priest_of_light.png',
    'cards/shadow_rogue.png',
  ],
  MAGIC: [
    'cards/rock_shaman.png',
    'cards/deep_sea_wave.png',
    'cards/whirlwind_dancer.png',
    'cards/ember_mage.png',
    'cards/dawn_knight.png',
    'cards/night_mist_tracker.png',
  ],
  RARE: [
    'cards/steelroot_giant.png',
    'cards/frost_witch.png',
    'cards/gale_spirit.png',
    'cards/crimson_swordsman.png',
    'cards/radiant_paladin.png',
    'cards/pitch_black_assassin.png',
  ],
  SUPER_RARE: [
    'cards/earthquake_colossus.png',
    'cards/tidal_ruler.png',
    'cards/storm_griffin.png',
    'cards/flame_dragon.png',
    'cards/celestial_executor.png',
    'cards/spectral_commander.png',
  ],
  UNIQUE: [
    'cards/mountain_emperor.png',
    'cards/eternal_ice_dragon.png',
    'cards/sky_sovereign.png',
    'cards/immortal_phoenix.png',
    'cards/radiant_judgment.png',
    'cards/doom_reaper.png',
  ],
  LEGENDARY: [
    'cards/primordial_earth_god.png',
    'cards/dragon_king_of_all_seas.png',
    'cards/heavenly_storm_god.png',
    'cards/apocalypse_flame_dragon.png',
    'cards/genesis_radiance.png',
    'cards/abyss_lord.png',
  ],
};

export const cardCatalogElements = elements;
export const cardCatalogGrades = grades;

export const cardCatalog: readonly CardCatalogEntry[] = grades.flatMap(
  (grade, gradeIndex) =>
    elements.map((element, elementIndex) => {
      const name = namesByGrade[grade][elementIndex];
      const imageKey = imageKeysByGrade[grade][elementIndex];
      if (!name || !imageKey) throw new Error('INVALID_CARD_CATALOG');
      return {
        templateId: String(gradeIndex * elements.length + elementIndex + 1),
        name,
        element,
        grade,
        imageKey,
      };
    }),
);
