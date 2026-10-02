import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { countryMatchesSearch, countries } from '@/constants/countries';
import { useColors } from '@/hooks/useColors';
import { TextField } from '@/components/ui';

type CountryPickerFieldProps = {
  value: string;
  onChange: (country: string) => void;
  testID?: string;
};

export function CountryPickerField({
  value,
  onChange,
  testID = 'country-picker',
}: CountryPickerFieldProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [search, setSearch] = useState('');

  const filteredCountries = useMemo(
    () => countries.filter((country) => countryMatchesSearch(country, search)),
    [search],
  );

  const closePicker = () => {
    setVisible(false);
    setSearch('');
  };

  const selectCountry = (country: string) => {
    onChange(country);
    closePicker();
  };

  return (
    <>
      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.foreground }]}>Country</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={value ? `Country: ${value}` : 'Select a country'}
          accessibilityState={{ expanded: visible }}
          testID={testID}
          onPress={() => setVisible(true)}
          style={({ pressed }) => [
            styles.input,
            {
              backgroundColor: colors.card,
              borderColor: colors.input,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <Text
            numberOfLines={1}
            style={[
              styles.value,
              { color: value ? colors.foreground : colors.mutedForeground },
            ]}
          >
            {value || 'Select a country'}
          </Text>
          <Feather name="chevron-down" size={18} color={colors.mutedForeground} />
        </Pressable>
      </View>

      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={closePicker}
      >
        <View style={styles.modalRoot}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close country picker"
            onPress={closePicker}
            style={styles.backdrop}
          />
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: colors.background,
                paddingBottom: Math.max(insets.bottom, 16),
              },
            ]}
          >
            <View style={styles.sheetHeader}>
              <Text style={[styles.title, { color: colors.foreground }]}>
                Choose your country
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close country picker"
                onPress={closePicker}
                style={[styles.closeButton, { backgroundColor: colors.muted }]}
              >
                <Feather name="x" size={18} color={colors.foreground} />
              </Pressable>
            </View>

            <TextField
              icon="search"
              accessibilityLabel="Search countries"
              placeholder="Search countries"
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
              testID={`${testID}-search`}
            />

            <FlatList
              data={filteredCountries}
              keyExtractor={(country) => country}
              keyboardShouldPersistTaps="handled"
              style={styles.list}
              renderItem={({ item }) => {
                const selected = item === value;
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    testID={`${testID}-option-${item}`}
                    onPress={() => selectCountry(item)}
                    style={[
                      styles.option,
                      { borderBottomColor: colors.border },
                    ]}
                  >
                    <Text style={[styles.optionText, { color: colors.foreground }]}>
                      {item}
                    </Text>
                    {selected ? (
                      <Feather name="check" size={18} color={colors.primary} />
                    ) : null}
                  </Pressable>
                );
              }}
              ListEmptyComponent={
                <Text style={[styles.empty, { color: colors.mutedForeground }]}>
                  No countries match that search.
                </Text>
              }
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  field: { gap: 8 },
  label: { fontFamily: 'Manrope_700Bold', fontSize: 13, marginLeft: 2 },
  input: {
    minHeight: 54,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  value: { flex: 1, fontFamily: 'Manrope_500Medium', fontSize: 15 },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(4, 10, 18, 0.52)',
  },
  sheet: {
    height: '82%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 18,
    paddingHorizontal: 20,
    gap: 14,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 21 },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { flex: 1 },
  option: {
    minHeight: 54,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  optionText: { fontFamily: 'Manrope_500Medium', fontSize: 15 },
  empty: {
    paddingVertical: 24,
    textAlign: 'center',
    fontFamily: 'Manrope_500Medium',
    fontSize: 14,
  },
});