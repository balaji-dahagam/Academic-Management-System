import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { Picker } from "@react-native-picker/picker";
import { signupStudent, signupFaculty } from "../services/api";

type RoleType = "student" | "faculty";
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

export default function Signup() {
  const router = useRouter();
  
  const [role, setRole] = useState<RoleType>("student");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [rollno, setRollno] = useState("");
  const [batch, setBatch] = useState<BatchType>("BTech");
  const [semester, setSemester] = useState<SemesterNumber>(1);
  const [section, setSection] = useState("");

  const availableSemesters = batch === "BTech" 
    ? [1, 2, 3, 4, 5, 6, 7, 8] 
    : [1, 2, 3, 4];

  const availableSections = batch === "BTech" 
    ? SECTION_MAPPING.BTech[semester as BTechSemester]
    : SECTION_MAPPING.MTech[semester as MTechSemester];

  const handleBatchChange = (selectedBatch: BatchType) => {
    setBatch(selectedBatch);
    setSemester(1);
    setSection("");
  };

  const handleSemesterChange = (selectedSemester: SemesterNumber) => {
    setSemester(selectedSemester);
    setSection("");
  };

  const handleSignup = async () => {
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match!");
      return;
    }

    if (role === "student") {
      if (!rollno) {
        Alert.alert("Error", "Please enter roll number");
        return;
      }
      if (availableSections && availableSections.length > 0 && !section) {
        Alert.alert("Error", "Please select a section");
        return;
      }
    }

    try {
      const response = role === "student"
        ? await signupStudent({ 
            name, 
            email, 
            rollno, 
            password, 
            batch,
            semester,
            section 
          })
        : await signupFaculty({ name, email, password });

      Alert.alert("Success", "Signup successful!");
      router.push("/login");
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "Signup failed");
    }
  };

  return (
    <ScrollView 
      contentContainerStyle={{ flexGrow: 1 }}
      keyboardShouldPersistTaps="handled"
      className="bg-white"
    >
      <View className="flex-1 justify-center items-center px-6 py-8">
        <Text className="text-3xl font-bold mb-6">Sign Up</Text>

        <Text className="text-lg text-gray-600 mb-2">Select Your Role</Text>
        <View className="w-full border border-gray-400 bg-gray-100 rounded-lg p-2 mb-4">
          <Picker
            selectedValue={role}
            onValueChange={(itemValue) => setRole(itemValue as RoleType)}
            style={{ width: "100%", height: 55, color: "black" }}
          >
            <Picker.Item label="👨‍🎓 Student" value="student" />
            <Picker.Item label="👨‍🏫 Faculty" value="faculty" />
          </Picker>
        </View>

        <TextInput 
          className="w-full bg-gray-100 p-3 rounded-lg mt-4" 
          placeholder="Full Name" 
          value={name} 
          onChangeText={setName} 
        />
        <TextInput 
          className="w-full bg-gray-100 p-3 rounded-lg mt-4" 
          placeholder="IIITG Email" 
          value={email} 
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput 
          className="w-full bg-gray-100 p-3 rounded-lg mt-4" 
          placeholder="Password" 
          secureTextEntry 
          value={password} 
          onChangeText={setPassword} 
        />
        <TextInput 
          className="w-full bg-gray-100 p-3 rounded-lg mt-4" 
          placeholder="Confirm Password" 
          secureTextEntry 
          value={confirmPassword} 
          onChangeText={setConfirmPassword} 
        />

        {role === "student" && (
          <>
            <TextInput 
              className="w-full bg-gray-100 p-3 rounded-lg mt-4" 
              placeholder="Roll Number" 
              value={rollno} 
              onChangeText={setRollno}
            />

            <Text className="text-lg text-gray-600 mt-4">Select Batch</Text>
            <View className="w-full border border-gray-400 bg-gray-100 rounded-lg p-2 mt-2">
              <Picker
                selectedValue={batch}
                onValueChange={(itemValue) => handleBatchChange(itemValue as BatchType)}
                style={{ width: "100%", height: 55, color: "black" }}
              >
                <Picker.Item label="BTech" value="BTech" />
                <Picker.Item label="MTech" value="MTech" />
              </Picker>
            </View>

            <Text className="text-lg text-gray-600 mt-4">Select Semester</Text>
            <View className="w-full border border-gray-400 bg-gray-100 rounded-lg p-2 mt-2">
              <Picker
                selectedValue={semester}
                onValueChange={(itemValue) => handleSemesterChange(Number(itemValue) as SemesterNumber)}
                style={{ width: "100%", height: 55, color: "black" }}
              >
                {availableSemesters.map((sem) => (
                  <Picker.Item key={sem} label={`Semester ${sem}`} value={sem} />
                ))}
              </Picker>
            </View>

            <Text className="text-lg text-gray-600 mt-4">Select Section</Text>
            {availableSections && availableSections.length > 0 ? (
              <View className="w-full border border-gray-400 bg-gray-100 rounded-lg p-2 mt-2">
                <Picker
                  selectedValue={section}
                  onValueChange={(itemValue) => setSection(itemValue as string)}
                  style={{ width: "100%", height: 55, color: "black" }}
                >
                  <Picker.Item label="Select Section" value="" />
                  {availableSections.map((sec) => (
                    <Picker.Item key={sec} label={`Section ${sec}`} value={sec} />
                  ))}
                </Picker>
              </View>
            ) : (
              <View className="w-full bg-gray-100 p-3 rounded-lg mt-2">
                <Text className="text-gray-500">No sections available for this semester</Text>
              </View>
            )}
          </>
        )}

        <TouchableOpacity 
          onPress={handleSignup} 
          className="w-full bg-green-500 p-3 rounded-lg mt-6"
        >
          <Text className="text-white text-center text-lg font-semibold">Sign Up</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push("/login")} className="mt-4 mb-8">
          <Text className="text-gray-500">Already have an account? Login</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}