const API_BASE_URL = "http://10.1.3.142:3000/api"; 
import AsyncStorage from "@react-native-async-storage/async-storage";


const getAuthToken = async () => {
  try {
    return await AsyncStorage.getItem("authToken");
  } catch (error) {
    console.error("Error retrieving token:", error);
    return null;
  }
};


export const signupStudent = async ({ 
  name, 
  email, 
  rollno, 
  password, 
  batch, 
  semester, 
  section 
}) => {
  try {
    const response = await fetch(`${API_BASE_URL}/createstudent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        name, 
        email, 
        rollno, 
        password, 
        batch,
        semester: Number(semester), // Ensure semester is sent as number
        section 
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      // Handle validation errors (they come as array)
      const errorMsg = data.error?.message || 
                      data.error?.[0]?.msg || 
                      data.error || 
                      "Signup failed";
      throw new Error(errorMsg);
    }

    return data; // { success: true, authToken }
  } catch (error) {
    console.error("Signup Error (Student):", error);
    throw error;
  }
};
  
  /** 📌 Faculty Signup */
  export const signupFaculty = async ({ name, email, password }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/createfaculty`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
  
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Signup failed");
  
      return data; // { success: true, authToken }
    } catch (error) {
      console.error("Signup Error (Faculty):", error);
      throw error;
    }
  };

  export const loginStudent = async ({ email, password }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/studentlogin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
  
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Login failed");
  
      // ✅ Store token locally
      await AsyncStorage.setItem("authToken", data.authToken);
      return data;
    } catch (error) {
      console.error("Login Error (Student):", error);
      throw error;
    }
  };
  
  /** 📌 Faculty Login */
  export const loginFaculty = async ({ email, password }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/facultylogin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
  
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Login failed");
  
      // ✅ Store token locally
      await AsyncStorage.setItem("authToken", data.authToken);
      return data;
    } catch (error) {
      console.error("Login Error (Faculty):", error);
      throw error;
    }
  };
  
  /** 📌 Create Class */
  export const createClass = async (classData) => {
    try {
      const authToken = await getAuthToken();
      const response = await fetch(`${API_BASE_URL}/createClass`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "authToken": authToken,
        },
        body: JSON.stringify({
          subject_code: classData.subject_code,
          batch: classData.batch,
          semester: Number(classData.semester),
          section: classData.section,
          subject: classData.subject,
          date: classData.date,
          day: classData.day,
          timeFrame: classData.timeFrame,
          isRegular: classData.isRegular
        }),
      });
  
      const data = await response.json();
      
      if (!response.ok) {
        // Handle no-instruction day conflicts
        if (data.error?.includes("Cannot create class") || 
            data.error?.includes("Cannot create regular classes")) {
          throw new Error(data.error);
        }
        throw new Error(data.error || "Class creation failed");
      }
  
      // Handle success with potential skipped dates
      if (data.skippedDates) {
        console.warn("Some classes were skipped:", data.message);
      }
      
      return data;
    } catch (error) {
      console.error("Create Class API Error:", error);
      throw error; // Re-throw to let the calling component handle it
    }
  };
  
  //student time table 
 
  export const fetchStudentTimetable = async () => {
    try {
      const authToken = await getAuthToken();
      const response = await fetch(`${API_BASE_URL}/stimetable`, {
        method: "GET",
        headers:{
        
        "authToken": authToken,
        } // Ensures cookies (if using authentication)
      });
  
      const data = await response.json();
      if (!data.success) throw new Error(data.error || "Failed to fetch timetable");
  
      return data.timetable; // Returns array of { classId, subjectCode }
    } catch (error) {
      console.error("Error fetching timetable:", error);
      return [];
    }
  };


  //faculty timetable
  export const fetchFacultyTimetable = async () => {
    try {
      const authToken = await getAuthToken();
      const response = await fetch(`${API_BASE_URL}/ftimetable`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "authToken":authToken,
        },
        
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch faculty timetable");
      }
  
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || "Invalid timetable data received");
      }
  
      // Convert date strings to Date objects
      const timetable = data.timetable.map(entry => ({
        ...entry,
        date: new Date(entry.date),
      }));
  
      return timetable;
  
    } catch (error) {
      console.error("Error fetching faculty timetable:", error);
      throw error;
    }
  };

  //delete a class
  export const deleteClass = async (classId) => {
    try {
      const authToken=await getAuthToken();
      const response = await fetch(
        `${API_BASE_URL}/deleteclass/${classId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            "authToken":authToken, // Assuming token-based authentication
          },
        }
      );
  
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to delete class");
      }
  
      return data; // Returns success message if deletion is successful
    } catch (error) {
      console.error("Error deleting class:", error.message);
      return { success: false, error: error.message };
    }
  };

  //fetch students according to their section
  export const fetchStudentsBySection = async (batch, semester, section) => {
    try {
      const authToken=await getAuthToken();
      const response = await fetch(
        `${API_BASE_URL}/students-by-section?batch=${batch}&semester=${semester}&section=${section}`,
        {
          method : "GET",
          headers : {
            "Content-Type" : "application/json",
            "authToken" : authToken
          }
        }
      );
  
      if (!response.ok) {
        throw new Error(`Error fetching students: ${response.statusText}`);
      }
  
      const data = await response.json();
      return data.students;  // Returns an array of students
    } catch (error) {
      console.error("Error:", error);
      return [];
    }
  };

  //mark attendance for a class
  export const markAttendance = async (classId, presentStudents) => {
    try {
      const authToken=await getAuthToken();
      const response = await fetch(`${API_BASE_URL}/mark-attendance/${classId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "authToken" : authToken
        },
         // Ensure authentication is handled if needed
        body: JSON.stringify({ presentStudents }),
      });
  
      if (!response.ok) {
        console.log(response);
      }
  
      return await response.json();
    } catch (error) {
      console.error("Error marking attendance:", error);
      throw error;
    }
  };

  // Function to Fetch Attendance for a Class
// Define the expected response structure
export const fetchAttendance = async (classId) => {
  try {
    const authToken=await getAuthToken();
    const response = await fetch(`${API_BASE_URL}/fetch-attendance/${classId}`,{
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "authToken": authToken, // Ensure token is included
      },
    });
    if (!response.ok) throw new Error("Failed to fetch attendance");

    const data = await response.json();
    return data; // Ensure data contains { presentStudents: [...] }
  } catch (error) {
    console.error("Error fetching attendance:", error);
    return null; // Return null if there's an error
  }
};

export const fetchStudentAttendance =async()=>{
  try{
    const authToken=await getAuthToken();
    const response = await fetch(`${API_BASE_URL}/attendance`,{
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "authToken": authToken, // Ensure token is included
      },
    });
    if (!response.ok) throw new Error("Failed to fetch attendance");

    const data = await response.json();
    return data; // Ensure data contains { presentStudents: [...] }
  } catch (error) {
    console.error("Error fetching attendance:", error);
    return null; // Return null if there's an error
  }
}


//notification
// Add these to your existing API service file
export const notificationService = {
  getNotifications: async () => {
    try {
      const authToken=await getAuthToken();
      console.log(authToken);
      const response = await fetch(`${API_BASE_URL
      }/notifications`,{
        method : "GET",
        headers : {
          "Content-Type" : "application/json",
          "authToken" : authToken
        }
      });
      
      const data = await response.json();
      console.log(data);
      return data;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  },

  markAsSeen: async (notificationId) => {
    try {
      const authToken=await getAuthToken();
      const response = await fetch(`${API_BASE_URL}/${notificationId}/seen`,{
        method : "PATCH",
        headers : {
          "Content-Type" : "application/json",
          "authToken" : authToken
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error marking notification as seen:', error);
      throw error;
    }
  },

  markAllAsSeen: async () => {
    try {
      const authToken=await getAuthToken();
      const response = await api.patch(`${API_BASE_URL}/mark-all-seen`,{
        method : "PATCH",
        headers : {
          "Content-Type" : "application/json",
          "authToken" : authToken
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error marking all notifications as seen:', error);
      throw error;
    }
  }
};

// Inside your useEffect
export const fetchSectionTimetable = async (batch, semester, section) => {
  try {
    const authToken = await getAuthToken();
    const res = await fetch(
      `${API_BASE_URL}/sectiontimetable?batch=${batch}&semester=${semester}&section=${section}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "authToken": authToken
        }
      }
    );
    const data = await res.json();
    if (data.success) {
      return data.timetable;
    }
    throw new Error(data.error || "Failed to fetch section timetable");
  } catch (err) {
    console.error("Failed to fetch section timetable:", err);
    throw err;
  }
};

//electives selection
// api.js


// export const saveElectives = async (studentId, payload) => {
//   try {
//     const authToken=await getAuthToken();
//     const response = await fetch('http://localhost:3000/select', {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//         "authToken":authToken,
//       },
//       body: JSON.stringify({
//         studentId,
//         hs: payload.hs,
//         branch: payload.branchElectives
//       }),
//     });

//     const data = await response.json();

//     if (!response.ok) {
//       return {
//         success: false,
//         message: data.error || 'Failed to save electives',
//       };
//     }

//     return {
//       success: true,
//       message: data.message || 'Elective selection updated successfully',
//       data: data.data
//     };
//   } catch (err) {
//     console.error('Error saving electives:', err);
//     return {
//       success: false,
//       message: 'Network error occurred while saving electives'
//     };
//   }
// };
export const saveElectives=async (selections) =>{
  try {
    const authToken=await getAuthToken();
     // Assuming you store JWT token here
    
    const response = await fetch(`${API_BASE_URL}/select`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        "authToken" : authToken,
      },
      body: JSON.stringify({
        hs: selections.hs || null,
        branch: selections.branch || []
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to submit elective selections');
    }

    return data;
  } catch (error) {
    console.error('Error submitting electives:', error);
    throw error; // Re-throw to allow handling in the calling component
  }
}

export const removeElective = async ({ subjectCode, subjectName, type }) => {
  try {
    const authToken = await getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/remove`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'authToken': authToken,
      },
      body: JSON.stringify({
        subjectCode,
        subjectName,
        type
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to remove elective');
    }

    return data;
  } catch (error) {
    console.error('Error removing elective:', error);
    throw error;
  }
};






  
  