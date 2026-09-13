import React, { useState } from 'react';
import { Image, type ImageProps } from 'react-native';
import {
  getCardImage,
  getCardThumbnail,
} from '../features/game-cache/gamePresentation';

interface CardArtworkProps extends Omit<ImageProps, 'source'> {
  imageKey: string;
  thumbnail?: boolean;
}

/** 목록 썸네일이 아직 업로드되지 않았으면 기존 원본 이미지로 자동 전환합니다. */
export function CardArtwork({
  imageKey,
  thumbnail = false,
  onError,
  ...imageProps
}: CardArtworkProps) {
  const [failedThumbnailKey, setFailedThumbnailKey] = useState<string | null>(
    null,
  );
  const thumbnailFailed = failedThumbnailKey === imageKey;

  return (
    <Image
      {...imageProps}
      source={
        thumbnail && !thumbnailFailed
          ? getCardThumbnail(imageKey)
          : getCardImage(imageKey)
      }
      onError={(event) => {
        if (thumbnail) setFailedThumbnailKey(imageKey);
        onError?.(event);
      }}
    />
  );
}
