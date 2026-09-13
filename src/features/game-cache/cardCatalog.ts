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
    'cards/webp/earth_guardian.webp',
    'cards/webp/wave_spirit.webp',
    'cards/webp/wind_archer.webp',
    'cards/webp/flame_knight.webp',
    'cards/webp/priest_of_light.webp',
    'cards/webp/shadow_rogue.webp',
  ],
  MAGIC: [
    'cards/webp/rock_shaman.webp',
    'cards/webp/deep_sea_wave.webp',
    'cards/webp/whirlwind_dancer.webp',
    'cards/webp/ember_mage.webp',
    'cards/webp/dawn_knight.webp',
    'cards/webp/night_mist_tracker.webp',
  ],
  RARE: [
    'cards/webp/steelroot_giant.webp',
    'cards/webp/frost_witch.webp',
    'cards/webp/gale_spirit.webp',
    'cards/webp/crimson_swordsman.webp',
    'cards/webp/radiant_paladin.webp',
    'cards/webp/pitch_black_assassin.webp',
  ],
  SUPER_RARE: [
    'cards/webp/earthquake_colossus.webp',
    'cards/webp/tidal_ruler.webp',
    'cards/webp/storm_griffin.webp',
    'cards/webp/flame_dragon.webp',
    'cards/webp/celestial_executor.webp',
    'cards/webp/spectral_commander.webp',
  ],
  UNIQUE: [
    'cards/webp/mountain_emperor.webp',
    'cards/webp/eternal_ice_dragon.webp',
    'cards/webp/sky_sovereign.webp',
    'cards/webp/immortal_phoenix.webp',
    'cards/webp/radiant_judgment.webp',
    'cards/webp/doom_reaper.webp',
  ],
  LEGENDARY: [
    'cards/webp/primordial_earth_god.webp',
    'cards/webp/dragon_king_of_all_seas.webp',
    'cards/webp/heavenly_storm_god.webp',
    'cards/webp/apocalypse_flame_dragon.webp',
    'cards/webp/genesis_radiance.webp',
    'cards/webp/abyss_lord.webp',
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
