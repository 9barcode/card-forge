import React from 'react';
import { Image, type ImageProps } from 'react-native';
import { getCardImage } from '../features/game-cache/gamePresentation';

interface CardArtworkProps extends Omit<ImageProps, 'source'> {
  imageKey: string;
  thumbnail?: boolean;
}

/** 앱인토스 요구사항에 맞춰 모든 카드 이미지를 공개 URL로 렌더링합니다. */
export function CardArtwork({
  imageKey,
  thumbnail: _thumbnail = false,
  ...imageProps
}: CardArtworkProps) {
  return <Image {...imageProps} source={getCardImage(imageKey)} />;
}
