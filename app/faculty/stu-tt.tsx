import React, { useState, useEffect } from 'react';
import { View, Text, Button, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { router } from 'expo-router';

const sectionData: Record<string, Record<string, string[]>> = {
  BTech: {
    "1": ["S11", "S12", "S13", "G11", "G12", "G13", "G14"],
    "2": ["S11", "S12", "S13", "G11", "G12", "G13", "G14"],
    "3": ["CS21", "CS22", "S21", "S22", "S23", "G21", "G22", "G23", "G24"],
    "4": ["CS21", "CS22", "EC21", "EC22"],
    "5": ["CS31", "CS32", "EC31", "EC32", "S31", "S32", "S33", "LCS31", "LCS32", "LCS33"],
    "6": ["CS31", "CS32", "EC31", "EC32", "S31", "S32", "S33"],
    "7": ["CS41", "CS42"],
    // 8th semester has no sections
  },
  MTech: {
    "3": ["CS41", "CS42"],
    // 1, 2, 4 have no sections
  }
};

const SelectBatchSemesterSection: React.FC = () => {
  const [batch, setBatch] = useState('');
  const [semester, setSemester] = useState('');
  const [section, setSection] = useState('');
  const [availableSemesters, setAvailableSemesters] = useState<string[]>([]);
  const [availableSections, setAvailableSections] = useState<string[]>([]);
  const [needsSection, setNeedsSection] = useState(true);

  useEffect(() => {
    setSemester('');
    setSection('');
    if (batch) {
      const semesters = Object.keys(sectionData[batch]);
      setAvailableSemesters(semesters);
    } else {
      setAvailableSemesters([]);
    }
  }, [batch]);

  useEffect(() => {
    if (batch && semester) {
      const sections = sectionData[batch][semester];
      if (sections) {
        setAvailableSections(sections);
        setNeedsSection(true);
      } else {
        setAvailableSections([]);
        setNeedsSection(false);
      }
    } else {
      setAvailableSections([]);
      setNeedsSection(true);
    }
    setSection('');
  }, [semester]);

  const handleNavigate = () => {
    if (!batch || !semester) {
      Alert.alert('Incomplete', 'Please select Batch and Semester.');
      return;
    }
    if (needsSection && !section) {
      Alert.alert('Incomplete', 'Please select Section.');
      return;
    }

    router.push({
        pathname: '/faculty/sectiontt',
        params: { batch, semester, section },
      });
      
  };

  return (
    <View className="flex-1 bg-white px-6 justify-center">
      <Text className="text-2xl font-bold text-center mb-6">
        Select Batch, Semester, and Section
      </Text>

      {/* Batch Picker */}
      <Text className="text-base font-medium mt-4">Batch</Text>
      <View className="border border-gray-300 rounded-md mb-2">
        <Picker selectedValue={batch} onValueChange={value => setBatch(value)}>
          <Picker.Item label="Select Batch" value="" />
          <Picker.Item label="BTech" value="BTech" />
          <Picker.Item label="MTech" value="MTech" />
        </Picker>
      </View>

      {/* Semester Picker */}
      <Text className="text-base font-medium mt-4">Semester</Text>
      <View className="border border-gray-300 rounded-md mb-2">
        <Picker selectedValue={semester} onValueChange={value => setSemester(value)}>
          <Picker.Item label="Select Semester" value="" />
          {availableSemesters.map((sem) => (
            <Picker.Item key={sem} label={sem} value={sem} />
          ))}
        </Picker>
      </View>

      {/* Section Picker (conditionally rendered) */}
      {needsSection && (
        <>
          <Text className="text-base font-medium mt-4">Section</Text>
          <View className="border border-gray-300 rounded-md mb-4">
            <Picker selectedValue={section} onValueChange={value => setSection(value)}>
              <Picker.Item label="Select Section" value="" />
              {availableSections.map((sec) => (
                <Picker.Item key={sec} label={sec} value={sec} />
              ))}
            </Picker>
          </View>
        </>
      )}

      <Button title="Go to Timetable" onPress={handleNavigate} />
    </View>
  );
};

export default SelectBatchSemesterSection;
