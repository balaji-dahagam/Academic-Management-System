import { 
  View, Text, TextInput, TouchableOpacity, ScrollView, Alert, 
  KeyboardAvoidingView, Platform, Switch, ActivityIndicator 
} from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { createClass } from "../../services/api";
import { Picker } from "@react-native-picker/picker";
import DateTimePicker from "@react-native-community/datetimepicker";

type BatchType = "BTech" | "MTech";
type BTechSemester = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
type MTechSemester = 1 | 2 | 3 | 4;
type SemesterNumber = BTechSemester | MTechSemester;

interface SectionMapping {
  BTech: Record<BTechSemester, string[] | null>;
  MTech: Record<MTechSemester, string[] | null>;
}

const SECTION_MAPPING: SectionMapping = {
  BTech: {
    1: ["S11", "S12", "S13", "G11", "G12", "G13", "G14"],
    2: ["S11", "S12", "S13", "G11", "G12", "G13", "G14"],
    3: ["CS21", "CS22", "S21", "S22", "S23", "G21", "G22", "G23", "G24"],
    4: ["CS21", "CS22", "EC21", "EC22"],
    5: ["CS31", "CS32", "EC31", "EC32", "S31", "S32", "S33", "LCS31", "LCS32", "LCS33"],
    6: ["CS31", "CS32", "EC31", "EC32", "S31", "S32", "S33"],
    7: ["CS41","CS42"],
    8: null
  },
  MTech: {
    1: null,
    2: null,
    3: ["CS41","CS42"],
    4: null
  }
};

export default function CreateClass() {
  const router = useRouter();
  const [batch, setBatch] = useState<BatchType>("BTech");
  const [semester, setSemester] = useState<SemesterNumber>(1);
  const [section, setSection] = useState("");
  const [subject_code, setSubjectCode] = useState("");
  const [subject, setSubjectName] = useState("");
  const [day, setDay] = useState("Monday");
  const [startDate, setStartDate] = useState(new Date());
  const [timeFrame, setTimeFrame] = useState("9:00-9:55");
  const [loading, setLoading] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [isNotRegular, setIsNotRegular] = useState(false);
  const [conflictDates, setConflictDates] = useState<string[]>([]);

  const availableSemesters = batch === "BTech" 
    ? [1, 2, 3, 4, 5, 6, 7, 8] 
    : [1, 2, 3, 4];

  const availableSections = batch === "BTech" 
    ? SECTION_MAPPING.BTech[semester as BTechSemester]
    : SECTION_MAPPING.MTech[semester as MTechSemester];

  const allowedTimeFrames = [
    "9:00-9:55", "10:00-10:55", "11:00-11:55",
    "12:00-12:55", "13:00-13:55", "14:00-14:55",
    "15:00-15:55", "16:00-16:55","9:00-11:55","14:00-16:55"
  ];

  const handleBatchChange = (selectedBatch: BatchType) => {
    setBatch(selectedBatch);
    setSemester(1);
    setSection("");
    setConflictDates([]);
  };

  const handleSemesterChange = (selectedSemester: SemesterNumber) => {
    setSemester(selectedSemester);
    setSection("");
    setConflictDates([]);
  };

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setStartDate(date);
      setConflictDates([]); // Reset conflicts when date changes
    }
    setShowStartDatePicker(false);
  };

  const handleCreateClass = async () => {
    if (!subject_code || !section || !subject) {
      Alert.alert("Error", "Please fill all required fields.");
      return;
    }

    setLoading(true);
    const classData = {
      subject_code: subject_code,
      batch,
      semester,
      section,
      date: startDate.toISOString().split("T")[0],
      subject,
      day,
      timeFrame, 
      isRegular: !isNotRegular
    };

    try {
      await createClass(classData);
      Alert.alert("Success", "Class created successfully!");
      router.back();
    } catch (error: any) {
      console.error("Create Class Error:", error);
      
      // Parse error message for conflicts
      if (error.message.includes("Cannot create class") || error.message.includes("Cannot create regular classes")) {
        const conflictMessage = error.message;
        setConflictDates([conflictMessage]); // Store conflict for display
        
        Alert.alert(
          "Scheduling Conflict",
          conflictMessage,
          [
            { text: "Cancel", style: "cancel" },
            { 
              text: "Create Anyway", 
              onPress: () => createClassAnyway(classData) 
            }
          ]
        );
      } else {
        Alert.alert("Error", error.message || "Failed to create class.");
      }
    } finally {
      setLoading(false);
    }
  };

  const createClassAnyway = async (classData: any) => {
    setLoading(true);
    try {
      // Add force flag to bypass conflicts
      const response = await createClass({ ...classData, forceCreate: true });
      Alert.alert("Success", "Class created successfully!");
      router.back();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to create class.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-white"
    >
      <ScrollView 
        contentContainerStyle={{ paddingBottom: 100 }}
        className="px-5 pt-4"
        keyboardShouldPersistTaps="handled"
      >
        <Text className="text-xl font-bold mb-4">Create New Class</Text>
        
        <TextInput 
          className="w-full bg-gray-100 p-4 rounded-lg mt-2 text-gray-800 border border-gray-300"
          placeholder="Subject Code *" 
          value={subject_code} 
          onChangeText={setSubjectCode} 
        />
        
        <TextInput 
          className="w-full bg-gray-100 p-4 rounded-lg mt-4 text-gray-800 border border-gray-300"
          placeholder="Subject Name *" 
          value={subject} 
          onChangeText={setSubjectName}
        />
        
        <Text className="text-gray-700 mt-6 mb-1 font-medium">Select Day *</Text>
        <View className="border border-gray-300 rounded-lg bg-gray-100 overflow-hidden">
          <Picker selectedValue={day} onValueChange={setDay}>
            {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map((d) => (
              <Picker.Item key={d} label={d} value={d} />
            ))}
          </Picker>
        </View>
        
        <Text className="text-gray-700 mt-6 mb-1 font-medium">Start Date *</Text>
        <TouchableOpacity 
          onPress={() => setShowStartDatePicker(true)} 
          className="w-full bg-white p-4 rounded-lg border border-gray-300 flex-row justify-between items-center"
        >
          <Text className="text-gray-800">
            {startDate.toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'short', 
              day: 'numeric' 
            })}
          </Text>
          <Text className="text-gray-500">📅</Text>
        </TouchableOpacity>

        {showStartDatePicker && (
          <DateTimePicker 
            value={startDate} 
            mode="date" 
            display="default" 
            minimumDate={new Date()}
            onChange={(_, date) => handleDateChange(date)} 
          />
        )}

        {conflictDates.length > 0 && (
          <View className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <Text className="text-yellow-800 font-medium">⚠️ Scheduling Conflict:</Text>
            {conflictDates.map((conflict, index) => (
              <Text key={index} className="text-yellow-700 mt-1">{conflict}</Text>
            ))}
          </View>
        )}

        <Text className="text-gray-700 mt-6 mb-1 font-medium">Time Frame *</Text>
        <View className="border border-gray-300 rounded-lg bg-gray-100 overflow-hidden">
          <Picker selectedValue={timeFrame} onValueChange={setTimeFrame}>
            {allowedTimeFrames.map((frame) => (
              <Picker.Item key={frame} label={frame} value={frame} />
            ))}
          </Picker>
        </View>
        
        <Text className="text-gray-700 mt-6 mb-1 font-medium">Batch *</Text>
        <View className="border border-gray-300 rounded-lg bg-gray-100 overflow-hidden">
          <Picker
            selectedValue={batch}
            onValueChange={handleBatchChange}
          >
            <Picker.Item label="BTech" value="BTech" />
            <Picker.Item label="MTech" value="MTech" />
          </Picker>
        </View>
        
        <Text className="text-gray-700 mt-6 mb-1 font-medium">Semester *</Text>
        <View className="border border-gray-300 rounded-lg bg-gray-100 overflow-hidden">
          <Picker
            selectedValue={semester}
            onValueChange={handleSemesterChange}
          >
            {availableSemesters.map((sem) => (
              <Picker.Item key={sem} label={`Semester ${sem}`} value={sem} />
            ))}
          </Picker>
        </View>
        
        <Text className="text-gray-700 mt-6 mb-1 font-medium">Section *</Text>
        {availableSections && availableSections.length > 0 ? (
          <View className="border border-gray-300 rounded-lg bg-gray-100 overflow-hidden">
            <Picker
              selectedValue={section}
              onValueChange={setSection}
            >
              <Picker.Item label="Select Section" value="" />
              {availableSections.map((sec) => (
                <Picker.Item key={sec} label={`Section ${sec}`} value={sec} />
              ))}
            </Picker>
          </View>
        ) : (
          <View className="w-full bg-gray-100 p-4 rounded-lg mt-2 border border-gray-200">
            <Text className="text-gray-500">No sections available for this semester</Text>
          </View>
        )}

        <View className="flex-row items-center justify-between mt-6 p-3 bg-gray-50 rounded-lg">
          <View>
            <Text className="text-gray-700 font-medium">Regular Weekly Class</Text>
            <Text className="text-gray-500 text-sm">
              {isNotRegular ? "One-time class" : "Recurring every week"}
            </Text>
          </View>
          <Switch
            value={!isNotRegular}
            onValueChange={(val) => setIsNotRegular(!val)}
            trackColor={{ false: "#d1d5db", true: "#3b82f6" }}
            thumbColor="#ffffff"
          />
        </View>
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200">
        <TouchableOpacity 
          onPress={handleCreateClass} 
          className={`w-full p-4 rounded-lg flex-row justify-center items-center ${
            loading ? "bg-blue-400" : "bg-blue-500"
          }`}
          disabled={loading}
        >
          {loading && <ActivityIndicator color="white" className="mr-2" />}
          <Text className="text-white text-center font-medium text-lg">
            {loading ? "Creating..." : "Create Class"}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}