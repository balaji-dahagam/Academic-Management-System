import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from "@react-native-picker/picker";
import { saveElectives, removeElective } from "@/services/api";

// Type Definitions
type Elective = {
  subjectCode: string;
  subjectName: string;
  type?: "hs" | "cs" | "ec";
};

type Electives = {
  hs: Elective[];
  branch: Elective[];
};

type Branch = "CSE" | "ECE" | "";

type Semester = "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "";

type SelectionOption =
  | "project"
  | "elective"
  | "twoElectives"
  | "project+elective"
  | "project+twoElectives"
  | "internship+twoElectives"
  | "fourElectives"
  | "internship+elective"
  | "";

type ElectiveOptions = {
  [key in "CSE" | "ECE"]: {
    [key in "6" | "7" | "8"]: SelectionOption[];
  };
};

const electiveOptionsByBranchAndSemester: ElectiveOptions = {
  CSE: {
    "6": ["project", "elective"],
    "7": ["project+elective", "twoElectives"],
    "8": ["project+twoElectives", "internship+twoElectives", "fourElectives"],
  },
  ECE: {
    "6": ["project"],
    "7": ["project+elective"],
    "8": ["project+elective", "internship+elective"],
  },
};

const StudentHome: React.FC = () => {
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);
  const [branch, setBranch] = useState<Branch>("");
  const [semester, setSemester] = useState<Semester>("");
  const [selectionOption, setSelectionOption] = useState<SelectionOption>("");
  const [availableOptions, setAvailableOptions] = useState<SelectionOption[]>(
    []
  );
  const [electives, setElectives] = useState<Electives>({
    hs: [],
    branch: [],
  });
  const [project, setProject] = useState("");
  const [internship, setInternship] = useState("");
  const [newHsElective, setNewHsElective] = useState<Elective>({
    subjectCode: "",
    subjectName: "",
  });
  const [newBranchElective, setNewBranchElective] = useState<Elective>({
    subjectCode: "",
    subjectName: "",
  });

  useEffect(() => {
    if (branch && semester) {
      const branchOptions = electiveOptionsByBranchAndSemester[branch];
      const semesterKey = semester as "6" | "7" | "8";
      const options = branchOptions[semesterKey] || [];
      setAvailableOptions(options);

      // Reset selections when branch/semester changes
      if (!options.includes(selectionOption)) {
        setSelectionOption("");
        setElectives({ hs: [], branch: [] });
        setProject("");
        setInternship("");
      }
    }
  }, [branch, semester]);

  const handleLogout = async () => {
    await AsyncStorage.clear();
    router.replace("/login");
  };

  const addHsElective = () => {
    if (newHsElective.subjectCode && newHsElective.subjectName) {
      setElectives((prev) => ({
        ...prev,
        hs: [...prev.hs, { ...newHsElective, type: "hs" }],
      }));
      setNewHsElective({ subjectCode: "", subjectName: "" });
    }
  };

  const addBranchElective = () => {
    if (newBranchElective.subjectCode && newBranchElective.subjectName) {
      setElectives((prev) => ({
        ...prev,
        branch: [
          ...prev.branch,
          {
            ...newBranchElective,
            type: branch === "CSE" ? "cs" : "ec",
          },
        ],
      }));
      setNewBranchElective({ subjectCode: "", subjectName: "" });
    }
  };

  const remove = async (type: "hs" | "branch", index: number) => {
    try {
      const electiveToRemove = electives[type][index];

      // Call API to remove from backend
      await removeElective({
        subjectCode: electiveToRemove.subjectCode,
        subjectName: electiveToRemove.subjectName,
        type:
          electiveToRemove.type ||
          (type === "hs" ? "hs" : branch === "CSE" ? "cs" : "ec"),
      });

      // Update local state if API call succeeds
      setElectives((prev) => {
        const updated = [...prev[type]];
        updated.splice(index, 1);
        return { ...prev, [type]: updated };
      });

      Alert.alert(
        "Success",
        `${electiveToRemove.subjectCode} removed successfully`
      );
    } catch (error) {
      console.error("Failed to remove elective:", error);
      Alert.alert("Error", "Failed to remove elective");
    }
  };

  const getMaxBranchElectives = (): number => {
    if (!selectionOption) return 0;

    switch (selectionOption) {
      case "elective":
        return 1;
      case "twoElectives":
        return 2;
      case "project+elective":
        return 1;
      case "project+twoElectives":
        return 2;
      case "internship+twoElectives":
        return 2;
      case "fourElectives":
        return 4;
      case "internship+elective":
        return 1;
      default:
        return 0;
    }
  };

  const handleSave = async () => {
    try {
      // Basic validation
      if (!branch || !semester) {
        Alert.alert("Error", "Please select your branch and semester");
        return;
      }

      // For semesters 6-8, validate selection option
      const currentSemester = parseInt(semester);
      if (currentSemester >= 6 && !selectionOption) {
        Alert.alert("Error", "Please select an option for your semester");
        return;
      }

      // Validate HS elective (only one allowed)
      if (electives.hs.length > 1) {
        Alert.alert("Error", "You can select only one HS elective");
        return;
      }

      // Validate branch electives based on selection option
      const maxBranchElectives = getMaxBranchElectives();
      if (electives.branch.length > maxBranchElectives) {
        Alert.alert(
          "Error",
          `You can select maximum ${maxBranchElectives} branch electives for ${selectionOption}`
        );
        return;
      }

      // Prepare the data for API call
      const selections = {
        hs: electives.hs[0] || null, // Only send the first HS elective if exists
        branch: electives.branch,
      };

      // Call the API
      console.log(selections);
      const response = await saveElectives(selections);

      // Handle successful response
      Alert.alert(
        "Success",
        response.message || "Electives saved successfully"
      );

      // Optional: Reset form or navigate
      // setElectives({ hs: [], branch: [] });
      // setSelectionOption('');
    } catch (error) {
      console.error("Save failed:", error);

      // Show user-friendly error message
      const errorMessage = "Failed to save electives. Please try again.";
      Alert.alert("Error", errorMessage);

      // You might want to handle specific error cases differently
      // if (error.message.includes("authentication")) {
      //   // Handle auth errors (e.g., redirect to login)
      //   router.replace("/login");
      // }
    }
  };

  return (
    <ScrollView className="flex-1 bg-gray-100 px-6 py-8">
      {/* Dropdown Menu Toggle */}
      <TouchableOpacity
        onPress={() => setShowMenu(!showMenu)}
        className="absolute right-6 top-6"
      >
        <MaterialIcons name="more-vert" size={30} color="black" />
      </TouchableOpacity>

      {showMenu && (
        <View
          className="absolute right-6 top-14 bg-white shadow-lg rounded-lg"
          style={{ zIndex: 10, elevation: 10 }}
        >
          <TouchableOpacity
            onPress={handleLogout}
            className="px-4 py-2 bg-red-500 rounded-lg"
          >
            <Text className="text-white text-lg">Log Out</Text>
          </TouchableOpacity>
        </View>
      )}

      <Text className="text-3xl font-bold text-gray-800 mt-16">
        Welcome, Student 👨‍🎓
      </Text>

      {/* Navigation */}
      <View className="mt-6 space-y-4">
        <TouchableOpacity
          className="bg-blue-500 p-4 rounded-lg"
          onPress={() => router.push("./timetable")}
        >
          <Text className="text-white text-center text-lg font-semibold">
            📅 View Time Table
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="bg-green-500 p-4 rounded-lg"
          onPress={() => router.push("./attendance")}
        >
          <Text className="text-white text-center text-lg font-semibold">
            📊 Attendance Statistics
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="bg-yellow-500 p-4 rounded-lg"
          onPress={() => router.push("../notifications")}
        >
          <Text className="text-white text-center text-lg font-semibold">
            🔔 View Notifications
          </Text>
        </TouchableOpacity>
      </View>

      {/* Elective Selection Section */}
      <View className="mt-8">
        <Text className="text-2xl font-bold mb-4">🎓 Elective Enrollment</Text>

        <View className="mb-4">
          <Text className="text-base font-medium mb-1">Select Branch</Text>
          <Picker
            selectedValue={branch}
            onValueChange={(itemValue) => setBranch(itemValue as Branch)}
          >
            <Picker.Item label="Select Branch" value="" />
            <Picker.Item label="CSE" value="CSE" />
            <Picker.Item label="ECE" value="ECE" />
          </Picker>
        </View>

        <View className="mb-4">
          <Text className="text-base font-medium mb-1">Select Semester</Text>
          <Picker
            selectedValue={semester}
            onValueChange={(itemValue) => setSemester(itemValue as Semester)}
          >
            <Picker.Item label="Select Semester" value="" />
            {[...Array(8)].map((_, i) => (
              <Picker.Item
                key={i + 1}
                label={`Semester ${i + 1}`}
                value={`${i + 1}`}
              />
            ))}
          </Picker>
        </View>

        {/* Show options only for semesters 6-8 */}
        {branch && semester && parseInt(semester) >= 6 && (
          <View className="mb-4">
            <Text className="text-base font-medium mb-1">Select Option</Text>
            <Picker
              selectedValue={selectionOption}
              onValueChange={(itemValue) => {
                setSelectionOption(itemValue as SelectionOption);
                setElectives((prev) => ({ ...prev, branch: [] }));
              }}
            >
              <Picker.Item label="Select an option" value="" />
              {availableOptions.map((option, index) => (
                <Picker.Item key={index} label={option} value={option} />
              ))}
            </Picker>
          </View>
        )}

        {/* HS Electives Section */}
        <View className="mb-4">
          <Text className="text-xl font-semibold mb-2">HS Electives</Text>
          <View className="flex-row mb-2">
            <TextInput
              className="border p-2 flex-1 mr-2"
              placeholder="Subject Code"
              value={newHsElective.subjectCode}
              onChangeText={(val) =>
                setNewHsElective({ ...newHsElective, subjectCode: val })
              }
            />
            <TextInput
              className="border p-2 flex-1"
              placeholder="Subject Name"
              value={newHsElective.subjectName}
              onChangeText={(val) =>
                setNewHsElective({ ...newHsElective, subjectName: val })
              }
            />
          </View>
          <TouchableOpacity
            className="bg-blue-400 p-2 rounded-lg"
            onPress={addHsElective}
          >
            <Text className="text-white text-center">Add HS Elective</Text>
          </TouchableOpacity>

          {/* Display added HS electives */}
          {electives.hs.map((elective, index) => (
            <View key={index} className="flex-row items-center mt-2">
              <Text className="flex-1">
                {elective.subjectCode} - {elective.subjectName}
              </Text>
              <TouchableOpacity
                onPress={() => remove("hs", index)}
                className="p-2"
              >
                <MaterialIcons name="delete" size={24} color="red" />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Branch Electives Section */}
        {selectionOption && parseInt(semester) >= 6 && (
          <View className="mb-4">
            <Text className="text-xl font-semibold mb-2">
              {branch} Electives ({electives.branch.length}/
              {getMaxBranchElectives()})
            </Text>

            {electives.branch.length < getMaxBranchElectives() && (
              <>
                <View className="flex-row mb-2">
                  <TextInput
                    className="border p-2 flex-1 mr-2"
                    placeholder="Subject Code"
                    value={newBranchElective.subjectCode}
                    onChangeText={(val) =>
                      setNewBranchElective({
                        ...newBranchElective,
                        subjectCode: val,
                      })
                    }
                  />
                  <TextInput
                    className="border p-2 flex-1"
                    placeholder="Subject Name"
                    value={newBranchElective.subjectName}
                    onChangeText={(val) =>
                      setNewBranchElective({
                        ...newBranchElective,
                        subjectName: val,
                      })
                    }
                  />
                </View>
                <TouchableOpacity
                  className="bg-green-400 p-2 rounded-lg mb-2"
                  onPress={addBranchElective}
                >
                  <Text className="text-white text-center">
                    Add {branch} Elective
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {/* Display added branch electives */}
            {electives.branch.map((elective, index) => (
              <View key={index} className="flex-row items-center mt-2">
                <Text className="flex-1">
                  {elective.subjectCode} - {elective.subjectName}
                </Text>
                <TouchableOpacity
                  onPress={() => remove("branch", index)}
                  className="p-2"
                >
                  <MaterialIcons name="delete" size={24} color="red" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Project/Internship Section */}
        {selectionOption &&
          (selectionOption.includes("project") ||
            selectionOption.includes("internship")) && (
            <View className="mb-4">
              {selectionOption.includes("project") && (
                <View className="mb-4">
                  <Text className="text-xl font-semibold mb-2">
                    Project Details
                  </Text>
                  <TextInput
                    className="border p-2"
                    placeholder="Enter project details"
                    value={project}
                    onChangeText={setProject}
                    multiline
                  />
                </View>
              )}

              {selectionOption.includes("internship") && (
                <View className="mb-4">
                  <Text className="text-xl font-semibold mb-2">
                    Internship Details
                  </Text>
                  <TextInput
                    className="border p-2"
                    placeholder="Enter internship details"
                    value={internship}
                    onChangeText={setInternship}
                    multiline
                  />
                </View>
              )}
            </View>
          )}

        {/* Save Button */}
        <TouchableOpacity
          className="bg-black p-4 rounded-lg mt-4 mb-8"
          onPress={handleSave}
        >
          <Text className="text-white text-center text-lg font-semibold">
            💾 Submit Electives
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

// API Function

export default StudentHome;
