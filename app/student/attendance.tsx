import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { fetchStudentAttendance } from '../../services/api';

type AttendanceRecord = {
  subject_code: string;
  attendedClasses: number;
  totalClasses: number;
  percentage: string;
};

const Attendance = () => {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadAttendance = async () => {
      try {
        setLoading(true);
        const data = await fetchStudentAttendance();
        setAttendance(data);
      } catch (err) {
        setError('Failed to load attendance data');
        console.error('Attendance error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadAttendance();
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading attendance...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Your Attendance</Text>
      
      {attendance.length === 0 ? (
        <Text style={styles.empty}>No attendance records found</Text>
      ) : (
        attendance.map((record, index) => (
          <View key={index} style={styles.card}>
            <Text style={styles.subject}>{record.subject_code}</Text>
            <Text style={styles.details}>
              {record.attendedClasses} / {record.totalClasses} classes attended
            </Text>
            <Text style={[
              styles.percentage,
              parseFloat(record.percentage) < 75 ? styles.lowPercentage : styles.goodPercentage
            ]}>
              {record.percentage}
            </Text>
          </View>
        ))
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  subject: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
    color: '#2c3e50',
  },
  details: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  percentage: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  goodPercentage: {
    color: '#27ae60', // Green for good attendance
  },
  lowPercentage: {
    color: '#e74c3c', // Red for low attendance
  },
  empty: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    marginTop: 20,
  },
  error: {
    fontSize: 16,
    color: '#e74c3c',
    textAlign: 'center',
    marginTop: 20,
  },
});

export default Attendance;