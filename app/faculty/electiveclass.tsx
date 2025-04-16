import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ElectiveType = 'hs' | 'cs' | 'ec';
type DayType = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday';
type TimeFrameType = 
  '9:00-9:55' | '10:00-10:55' | '11:00-11:55' | '12:00-12:55' |
  '13:00-13:55' | '14:00-14:55' | '15:00-15:55' | '16:00-16:55' |
  '9:00-11:55' | '14:00-16:55';

const CreateElectiveClassScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [electiveType, setElectiveType] = useState<ElectiveType>('hs');
  const [subjectCode, setSubjectCode] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [date, setDate] = useState('');
  const [day, setDay] = useState<DayType>('Monday');
  const [timeFrame, setTimeFrame] = useState<TimeFrameType>('9:00-9:55');
  const [isRegular, setIsRegular] = useState(false);
  const [batch, setBatch] = useState<'BTech' | 'MTech'>('BTech');
  const [semester, setSemester] = useState('1');
  const [availableSubjects, setAvailableSubjects] = useState<{code: string, name: string}[]>([]);

  // Fetch available subjects based on elective type
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        // In a real app, you would fetch these from your backend
        const subjects = {
          hs: [
            { code: 'HS101', name: 'Introduction to Psychology' },
            { code: 'HS102', name: 'Principles of Economics' },
          ],
          cs: [
            { code: 'CS501', name: 'Machine Learning' },
            { code: 'CS502', name: 'Cloud Computing' },
          ],
          ec: [
            { code: 'EC501', name: 'VLSI Design' },
            { code: 'EC502', name: 'Wireless Communication' },
          ]
        };
        setAvailableSubjects(subjects[electiveType]);
      } catch (error) {
        console.error('Error fetching subjects:', error);
      }
    };
    
    fetchSubjects();
  }, [electiveType]);

  const handleSubmit = async () => {
    if (!subjectCode || !subjectName || !date) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      const authToken = await AsyncStorage.getItem('auth-token');
      if (!authToken) {
        throw new Error('Authentication token not found');
      }

      const response = await fetch('http://localhost:3000/api/createElectiveLecture', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'auth-token': authToken,
        },
        body: JSON.stringify({
          electiveType,
          subjectCode,
          subjectName,
          date,
          day,
          timeFrame,
          isRegular,
          batch,
          semester: parseInt(semester),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create elective class');
      }

      Alert.alert('Success', 'Elective class created successfully!');
      navigation.goBack();
    } catch (error) {
      console.error('Error creating elective:', error);
      Alert.alert('Error','Failed to create elective class');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Create Elective Class</Text>

      {/* Elective Type Picker */}
      <Text style={styles.label}>Elective Type</Text>
      <Picker
        selectedValue={electiveType}
        onValueChange={(itemValue) => setElectiveType(itemValue)}
        style={styles.picker}
      >
        <Picker.Item label="Humanities/Social Science (HS)" value="hs" />
        <Picker.Item label="Computer Science (CS)" value="cs" />
        <Picker.Item label="Electronics (EC)" value="ec" />
      </Picker>

      {/* Subject Selection */}
      <Text style={styles.label}>Subject</Text>
      <Picker
        selectedValue={subjectCode}
        onValueChange={(itemValue) => {
          setSubjectCode(itemValue);
          const selectedSubject = availableSubjects.find(sub => sub.code === itemValue);
          if (selectedSubject) setSubjectName(selectedSubject.name);
        }}
        style={styles.picker}
      >
        <Picker.Item label="Select a subject" value="" />
        {availableSubjects.map((subject) => (
          <Picker.Item key={subject.code} label={`${subject.code} - ${subject.name}`} value={subject.code} />
        ))}
      </Picker>

      {/* Date Input */}
      <Text style={styles.label}>Date</Text>
      <TextInput
        style={styles.input}
        value={date}
        onChangeText={setDate}
        placeholder="YYYY-MM-DD"
        keyboardType="numeric"
      />

      {/* Day Picker */}
      <Text style={styles.label}>Day</Text>
      <Picker
        selectedValue={day}
        onValueChange={(itemValue) => setDay(itemValue)}
        style={styles.picker}
      >
        <Picker.Item label="Monday" value="Monday" />
        <Picker.Item label="Tuesday" value="Tuesday" />
        <Picker.Item label="Wednesday" value="Wednesday" />
        <Picker.Item label="Thursday" value="Thursday" />
        <Picker.Item label="Friday" value="Friday" />
      </Picker>

      {/* Time Frame Picker */}
      <Text style={styles.label}>Time Frame</Text>
      <Picker
        selectedValue={timeFrame}
        onValueChange={(itemValue) => setTimeFrame(itemValue)}
        style={styles.picker}
      >
        <Picker.Item label="9:00 - 9:55" value="9:00-9:55" />
        <Picker.Item label="10:00 - 10:55" value="10:00-10:55" />
        <Picker.Item label="11:00 - 11:55" value="11:00-11:55" />
        <Picker.Item label="12:00 - 12:55" value="12:00-12:55" />
        <Picker.Item label="13:00 - 13:55" value="13:00-13:55" />
        <Picker.Item label="14:00 - 14:55" value="14:00-14:55" />
        <Picker.Item label="15:00 - 15:55" value="15:00-15:55" />
        <Picker.Item label="16:00 - 16:55" value="16:00-16:55" />
        <Picker.Item label="9:00 - 11:55 (Long)" value="9:00-11:55" />
        <Picker.Item label="14:00 - 16:55 (Long)" value="14:00-16:55" />
      </Picker>

      {/* Batch Picker */}
      <Text style={styles.label}>Batch</Text>
      <Picker
        selectedValue={batch}
        onValueChange={(itemValue) => setBatch(itemValue)}
        style={styles.picker}
      >
        <Picker.Item label="BTech" value="BTech" />
        <Picker.Item label="MTech" value="MTech" />
      </Picker>

      {/* Semester Picker */}
      <Text style={styles.label}>Semester</Text>
      <Picker
        selectedValue={semester}
        onValueChange={(itemValue) => setSemester(itemValue)}
        style={styles.picker}
      >
        {batch === 'BTech' ? (
          Array.from({ length: 8 }, (_, i) => (
            <Picker.Item key={i+1} label={`Semester ${i+1}`} value={`${i+1}`} />
          ))
        ) : (
          Array.from({ length: 4 }, (_, i) => (
            <Picker.Item key={i+1} label={`Semester ${i+1}`} value={`${i+1}`} />
          ))
        )}
      </Picker>

      {/* Regular Class Toggle */}
      <View style={styles.toggleContainer}>
        <Text style={styles.label}>Regular Class (Weekly for 16 weeks)</Text>
        <TouchableOpacity
          style={[styles.toggleButton, isRegular && styles.toggleButtonActive]}
          onPress={() => setIsRegular(!isRegular)}
        >
          <Text style={styles.toggleText}>{isRegular ? 'YES' : 'NO'}</Text>
        </TouchableOpacity>
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        style={styles.submitButton}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <Text style={styles.submitButtonText}>Creating...</Text>
        ) : (
          <Text style={styles.submitButtonText}>Create Elective Class</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 5,
  },
  picker: {
    backgroundColor: 'white',
    borderRadius: 5,
    marginBottom: 15,
  },
  input: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 5,
    marginBottom: 15,
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  toggleButton: {
    padding: 10,
    backgroundColor: '#e0e0e0',
    borderRadius: 5,
    width: 60,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#4CAF50',
  },
  toggleText: {
    fontWeight: 'bold',
    color: 'black',
  },
  submitButton: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default CreateElectiveClassScreen;