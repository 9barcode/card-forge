import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

type DevRewardedAdToggleProps = {
  value: boolean;
  disabled?: boolean;
  onChange(value: boolean): void;
};

/**
 * 실제 광고 뒤의 성공/실패 흐름을 확인하기 위한 임시 개발 위젯입니다.
 * 리워드 SDK 연동 검증이 끝나면 화면과 함께 제거합니다.
 */
export function DevRewardedAdToggle({
  value,
  disabled = false,
  onChange,
}: DevRewardedAdToggleProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>DEV · userEarnedReward</Text>
      <View style={styles.options}>
        {([true, false] as const).map((option) => {
          const selected = value === option;
          return (
            <TouchableOpacity
              key={String(option)}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected, disabled }}
              disabled={disabled}
              onPress={() => onChange(option)}
              style={[
                styles.option,
                selected &&
                  (option ? styles.trueOption : styles.falseOption),
                disabled && styles.disabled,
              ]}
            >
              <Text
                style={[
                  styles.optionText,
                  selected && styles.selectedOptionText,
                ]}
              >
                {String(option)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={styles.caption}>
        광고 종료 후 선택한 값으로 후속 동작을 테스트해요.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(213, 184, 127, 0.55)',
    borderRadius: 12,
    backgroundColor: 'rgba(20, 27, 38, 0.92)',
  },
  title: {
    marginBottom: 9,
    color: '#E8D4A7',
    fontSize: 13,
    fontWeight: '700',
  },
  options: {
    flexDirection: 'row',
    gap: 8,
  },
  option: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 38,
    borderWidth: 1,
    borderColor: '#586274',
    borderRadius: 9,
    backgroundColor: '#222C3A',
  },
  trueOption: {
    borderColor: '#65C18C',
    backgroundColor: '#256342',
  },
  falseOption: {
    borderColor: '#E98383',
    backgroundColor: '#7A3232',
  },
  optionText: {
    color: '#AEB7C4',
    fontSize: 14,
    fontWeight: '700',
  },
  selectedOptionText: {
    color: '#FFFFFF',
  },
  caption: {
    marginTop: 8,
    color: '#919BA9',
    fontSize: 11,
  },
  disabled: {
    opacity: 0.55,
  },
});
