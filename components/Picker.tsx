import { Platform } from 'react-native';
import { Picker as NativePicker } from '@react-native-picker/picker';
import Select from 'react-select';

interface PickerProps {
  selectedValue: string;
  onValueChange: (value: string) => void;
  items: Array<{ label: string; value: string }>;
}

export default function Picker({ selectedValue, onValueChange, items }: PickerProps) {
  if (Platform.OS === 'web') {
    return (
      <Select
        options={items}
        value={items.find(item => item.value === selectedValue)}
        onChange={(item) => item && onValueChange(item.value)}
        styles={{
          control: (base) => ({
            ...base,
            borderColor: '#d1d5db',
            borderWidth: 1,
            borderRadius: 4,
            padding: 4,
          }),
        }}
      />
    );
  }

  return (
    <NativePicker
      selectedValue={selectedValue}
      onValueChange={onValueChange}
    >
      {items.map((item) => (
        <NativePicker.Item key={item.value} label={item.label} value={item.value} />
      ))}
    </NativePicker>
  );
}