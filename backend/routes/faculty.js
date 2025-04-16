const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
var jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const Faculty = require("../schemes/Faculty");
const fetchUser = require("../middleware/fetchUser");
const Student = require("../schemes/Student");
const Class = require("../schemes/Class");
const Notification = require("../schemes/Notification");
const io = require("../socket").getIO();
const NoInstructionDay=require("../schemes/NoInst");
const mongoose = require('mongoose');
const Elective = require('../schemes/Elective');

const JWT_SECRET = "classapp";
const SECTION_MAPPING = {
  BTech: {
    1: ["S11", "S12", "S13","G11","G12","G13","G14"],  // Odd semesters (1,3,5,7)
    2: ["S11", "S12", "S13","G11","G12","G13","G14"],  // Even semesters (2,4,6,8)
    3: ["CS21", "CS22", "S21","S22","S23","G21","G22","G23","G24"],
    4: ["CS21", "CS22", "EC21","EC22"],
    5: ["CS31", "CS32", "EC31","EC32","S31","S32","S33","LCS31","LCS32","LCS33"],
    6: ["CS31", "CS32", "EC31","EC32","S31","S32","S33"],
    7: ["CS41","CS42"],
  }
};

const isIIITGEmail = (email) => {
  // console.log("Validating email:", email); // Log email input to track the flow
  return email.toLowerCase().endsWith("@iiitg.ac.in");
};

//route 1  : create a faculty
router.post(
  "/createfaculty",
  [
    body("name", "Name should be of atleast 3 characters").isLength({ min: 3 }),
    body("email", "Enter a valid email domain").custom((value) => {
      if (!isIIITGEmail(value)) {
        throw new Error("Invalid email domain");
      }
      return true;
    }),
    body("password", "Password should be of atleast 4 characters").isLength({
      min: 4,
    }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array() });
    }

    try {
      const faculty = await Faculty.findOne({ email: req.body.email });
      if (faculty) {
        return res
          .status(400)
          .json({ error: "Already a faculty with this email exists" });
      }
      const salt = await bcrypt.genSalt(10);
      const hashedP = await bcrypt.hash(req.body.password, salt);
      const newFaculty = await Faculty.create({
        name: req.body.name,
        email: req.body.email,
        password: hashedP,
        classes: [],
        timetable: [],
      });

      const data = {
        id: newFaculty.id,
      };
      const authToken = jwt.sign(data, JWT_SECRET);
      res.json({ success: true, authToken });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

router.post(
  "/facultylogin",
  [
    body("email", "Enter a valid email domain").custom((value) => {
      if (!isIIITGEmail(value)) {
        throw new Error("Invalid email domain");
      }
      return true;
    }),
    body("password", "Enter a password of atleast 4 characters").isLength({
      min: 4,
    }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array() });
    }
    const { email, password } = req.body;
    try {
      let faculty = await Faculty.findOne({ email });
      if (!faculty) {
        return res
          .status(404)
          .json({ error: "No faculty exists with this email" });
      }
      let passCompare = await bcrypt.compare(password, faculty.password);
      if (!passCompare) {
        return res.status(400).json({ error: "Password is incorrect" });
      }
      const data = { id: faculty.id };
      const authToken = jwt.sign(data, JWT_SECRET, { expiresIn: "1h" });
      res.status(201).json({ success: true, authToken });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

//route 2 : get all faculties :GET
router.get("/faculties", async (req, res) => {
  try {
    const allFaculties = await Faculty.find();
    res.status(200).json({ success: true, allFaculties });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});
const allowedTimeFrames = [
  "9:00-9:55",
  "10:00-10:55",
  "11:00-11:55",
  "12:00-12:55",
  "13:00-13:55",
  "14:00-14:55",
  "15:00-15:55",
  "16:00-16:55",
  "9:00-11:55",
  "14:00-16:55"
];
//route to create a class : login required
router.post(
  "/createClass",
  [
    fetchUser,
    body("subject_code", "Class name is required").notEmpty().trim(),
    body("subject", "Subject is required").notEmpty().trim(),
    body(
      "timeFrame",
      "The time frame will not fall under instruction timings"
    ).isIn([
      "9:00-9:55", "10:00-10:55", "11:00-11:55", "12:00-12:55",
      "13:00-13:55", "14:00-14:55", "15:00-15:55", "16:00-16:55",
      "9:00-11:55", "14:00-16:55"
    ]),
    body("day", "Day is required").notEmpty().isIn(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]),
    body("isRegular", "isRegular field is required").isBoolean(),
    body("batch", "Invalid batch").isIn(["BTech", "MTech"]),
    body("semester", "Invalid semester").custom((value, { req }) => {
      const validSemesters = req.body.batch === "BTech" ? [1, 2, 3, 4, 5, 6, 7, 8] : [1, 2, 3, 4];
      return validSemesters.includes(Number(value));
    }),
    body("section", "Invalid section").custom((value, { req }) => {
      if (!req.body.batch || !req.body.semester) return false;
      const validSections = SECTION_MAPPING[req.body.batch][req.body.semester] || [];
      return validSections.includes(value);
    }),
    body("date", "Invalid date").isISO8601().toDate()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      // Verify faculty
      const faculty = await Faculty.findById(req.user);
      if (!faculty) {
        return res.status(403).json({ error: "Access denied. Only faculty can create classes." });
      }

      const { subject_code, section, date, day, timeFrame, isRegular, batch, semester, subject } = req.body;

      // Format dates
      const initialDate = new Date(date);
      const dateStr = initialDate.toISOString().split('T')[0]; // YYYY-MM-DD format
      console.log(dateStr);

      // Check for no-instruction day
      const noInstructionDay = await NoInstructionDay.findOne({ date: dateStr });
      console.log(noInstructionDay);
      if (noInstructionDay) {
        return res.status(400).json({
          error: `Cannot schedule class on ${dateStr}`,
          reason: noInstructionDay.reason,
          description: noInstructionDay.description || ''
        });
      }

      // Fetch students
      const students = await Student.find({ section }).select("_id");
      let createdClasses = [];
      let skippedDates = [];

      if (isRegular) {
        // Create weekly classes for 16 weeks
        for (let i = 0; i < 16; i++) {
          const classDate = new Date(initialDate);
          classDate.setDate(classDate.getDate() + i * 7);
          const classDateStr = classDate.toISOString().split('T')[0];

          // Skip no-instruction days
          const conflictDay = await NoInstructionDay.findOne({ date: classDateStr });
          if (conflictDay) {
            skippedDates.push({
              date: classDateStr,
              reason: conflictDay.reason,
              description: conflictDay.description
            });
            continue;
          }

          // Create class
          const newClass = await Class.create({
            subject_code,
            subject,
            teacher: faculty._id,
            batch,
            semester,
            section,
            students: students.map(s => s._id),
            date: classDate, // Stored as Date object
            day,
            timeFrame,
            isRegular: true
          });

          createdClasses.push({
            _id: newClass._id,
            date: classDateStr,
            day,
            timeFrame
          });

          // Update student timetables (using string date)
          await Student.updateMany(
            { section },
            {
              $push: {
                timetable: {
                  subject_code,
                  subject,
                  day,
                  date: classDateStr,
                  timeFrame,
                  classId: newClass._id,
                  isRegular: true
                }
              }
            }
          );

          // Update faculty timetable
          await Faculty.findByIdAndUpdate(faculty._id, {
            $push: {
              classes: newClass._id,
              timetable: {
                subject_code,
                subject,
                day,
                date: classDateStr,
                timeFrame,
                classId: newClass._id,
                isRegular: true
              }
            }
          });
        }
      } else {
        // Create single class
        const newClass = await Class.create({
          subject_code,
          subject,
          teacher: faculty._id,
          batch,
          semester,
          section,
          students: students.map(s => s._id),
          date: initialDate, // Stored as Date object
          day,
          timeFrame,
          isRegular: false
        });

        createdClasses.push({
          _id: newClass._id,
          date: dateStr,
          day,
          timeFrame
        });

        // Update timetables
        await Student.updateMany(
          { section },
          {
            $push: {
              timetable: {
                subject_code,
                subject,
                day,
                date: dateStr,
                timeFrame,
                classId: newClass._id,
                isRegular: false
              }
            }
          }
        );

        await Faculty.findByIdAndUpdate(faculty._id, {
          $push: {
            classes: newClass._id,
            timetable: {
              subject_code,
              subject,
              day,
              date: dateStr,
              timeFrame,
              classId: newClass._id,
              isRegular: false
            }
          }
        });
      }

      // Prepare response
      const response = {
        success: true,
        createdClasses,
        message: `${createdClasses.length} class(es) created successfully`
      };

      if (skippedDates.length > 0) {
        response.warning = `${skippedDates.length} date(s) skipped due to conflicts`;
        response.skippedDates = skippedDates;
      }

      res.status(201).json(response);

    } catch (error) {
      console.error("Class creation failed:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        ...(process.env.NODE_ENV === 'development' && { details: error.message })
      });
    }
  }
);

//route : view time table : login needed
router.get("/ftimetable", fetchUser, async (req, res) => {
  try {
    // Find the faculty using their ID from the authentication middleware
    const faculty = await Faculty.findById(req.user).lean();
    
    if (!faculty) {
      return res.status(403).json({ error: "Access denied. Authenticate to view timetable." });
    }

    // Extract classIds from the faculty's timetable
    const timetableEntries = faculty.timetable;
    const classIds = timetableEntries.map(entry => entry.classId);

    // Fetch all class details in a single query
    const classes = await Class.find({ _id: { $in: classIds } })
      .select("subject_code day date timeFrame batch semester section");

      const noInstructionDays = await NoInstructionDay.find({});

    // Create a mapping of classId -> class details
    const classMap = classes.reduce((map, classItem) => {
      map[classItem._id.toString()] = {
        subject_code: classItem.subject_code,
        day: classItem.day,
        date: classItem.date,
        timeFrame: classItem.timeFrame,
        batch : classItem.batch,
        semester : classItem.semester,
        section: classItem.section
      };
      return map;
    }, {});

    const noInstructionDates = new Set(
      noInstructionDays.map(day => new Date(day.date).toISOString().split('T')[0])
    );

    const noInstructionInfo = noInstructionDays.reduce((map, day) => {
      const dateStr = new Date(day.date).toISOString().split('T')[0];
      map[dateStr] = {
        reason: day.reason,
        description: day.description
      };
      return map;
    }, {});

    // Attach class details to timetable entries
    const enrichedTimetable = timetableEntries.map(entry => {
      const classDate = classMap[entry.classId]?.date;
      const isNoInstructionDay = classDate && noInstructionDates.has(classDate);
      
      return {
        classId: entry.classId,
        subject_code: classMap[entry.classId]?.subject_code || "N/A",
        subject_name: entry.subject_name, // Preserve faculty-specific field
        day: classMap[entry.classId]?.day || "N/A",
        date: classDate || "N/A",
        timeFrame: classMap[entry.classId]?.timeFrame || "N/A",
        batch: classMap[entry.classId]?.batch || "N/A",
        semester: classMap[entry.classId]?.semester || "N/A",
        section: classMap[entry.classId]?.section || "N/A",
        isNoInstructionDay: isNoInstructionDay || false,
        noInstructionReason: isNoInstructionDay ? noInstructionInfo[classDate]?.reason : null,
        noInstructionDescription: isNoInstructionDay ? noInstructionInfo[classDate]?.description : null
      };
    });

    res.json({ success: true, timetable: enrichedTimetable });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
});

//route to delete a class

router.delete("/deleteclass/:classId", fetchUser, async (req, res) => {
  try {
    const io = req.io;
    const { classId } = req.params;

    const faculty = await Faculty.findById(req.user);
    if (!faculty) {
      return res.status(403).json({ error: "Access denied. Authenticate to delete class." });
    }

    const existingClass = await Class.findById(classId)
      .populate('subject_code', 'code')
      .populate('teacher', 'name');
    
    if (!existingClass) {
      return res.status(404).json({ error: "Class not found" });
    }

    if (existingClass.teacher._id.toString() !== faculty._id.toString()) {
      return res.status(403).json({ error: "Not authorized to delete this class" });
    }

    const students = await Student.find({
      section: existingClass.section,
      semester: existingClass.semester,
      batch: existingClass.batch
    }).select('_id');

    await Student.updateMany(
      { section: existingClass.section },
      { $pull: { timetable: { classId }}}
    );

    await Faculty.findByIdAndUpdate(
      faculty._id,
      { $pull: { classes: classId, timetable: { classId } } }
    );

    const notifications = students.map(student => ({
      userId: student._id,
      userType: "Student",
      title: "Class Cancellation",
      message: `Your ${existingClass.subject_code} class on ${existingClass.day} scheduled from ${existingClass.timeFrame} was cancelled by ${faculty.name}`,
      type: "Alert",
      relatedId: classId,
      seen: false
    }));

    let insertedNotifications = [];
    if (notifications.length > 0) {
      insertedNotifications = await Notification.create(notifications);

      students.forEach(student => {
        io.to(student._id.toString()).emit("newNotification", {
          title: "Class Cancelled",
          message: `Your ${existingClass.subject_code.code} class was cancelled`,
          classId
        });
      });
    }

    await Class.findByIdAndDelete(classId);

    res.json({
      success: true,
      message: "Class deleted and students notified",
      notificationsCount: insertedNotifications.length
    });

  } catch (error) {
    console.error("Delete Class Error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete class",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

//route to view timetable of every section
router.get("/timetable/:section", fetchUser, async (req, res) => {
  try {
    const faculty = await Faculty.findById(req.user);
    if (!faculty) {
      return res
        .status(403)
        .json({ error: "Access denied. Only faculty can view timetables." });
    }

    const { section } = req.params;

    // Fetch students from the given section
    const students = await Student.find({ section }).select("timetable");

    if (students.length === 0) {
      return res
        .status(404)
        .json({ error: "No students found in this section." });
    }

    // Extract and merge timetables from all students (removing duplicates)
    const timetableSet = new Map();

    students.forEach((student) => {
      student.timetable.forEach((entry) => {
        const key = `${entry.subject}-${entry.day}-${entry.startTime}-${entry.endTime}`;
        if (!timetableSet.has(key)) {
          timetableSet.set(key, entry);
        }
      });
    });

    const sectionTimetable = Array.from(timetableSet.values());

    res.json({ success: true, timetable: sectionTimetable });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

//route to mark attendance : login of faculty needed

// router.post("/mark-attendance/:classId", fetchUser,async (req, res) => {
//   try {
//     const {classId}=req.params
//     const { presentStudents } = req.body;

//     // if (!classId || !subject_code) {
//     //   return res.status(400).json({ message: "Class ID and subject code are required." });
//     // }

//     if (!Array.isArray(presentStudents)) {
//       return res.status(400).json({ message: "presentStudents must be an array." });
//     }

//     // Fetch the class details
//     const cl = await Class.findById(classId);
//     if (!cl) return res.status(404).json({ message: "Class not found." });
//     const subject_code=cl.subject_code;
//     if (cl.teacher.toString() !== req.user.toString()) {
//       return res.status(403).json({ error: "You are not the teacher of this class" });
//     }

//     if (!cl.attendance) cl.attendance = [];

//     // Get today's date
//     const today = new Date().toISOString().split("T")[0];

//     // Check if attendance already exists for this class today
//     let attendanceRecord = cl.attendance.find(record => record.date.toISOString().split("T")[0] === today);

//     if (attendanceRecord) {
//       // Update existing attendance record
//       attendanceRecord.presentStudents = presentStudents;
//     } else {
//       // Create a new attendance record
//       attendanceRecord = {
//         classId: cl._id,
//         subject_code: cl.subject_code,
//         date: new Date(),
//         day: cl.day,
//         presentStudents: presentStudents,
//       };
//       cl.attendance.push(attendanceRecord);
//     }

//     await cl.save(); // Save the updated class attendance


//     const students = await Student.find({ _id: { $in: cl.students } });

//     for (let student of students) {
//       let attendanceRecord = student.attendance.find(att => att.subject_code === subject_code && att.classId?.toString() === classId);

//       // Find the corresponding timetable object for this class
//       let timetableEntry = student.timetable.find(tt => tt.classId.toString() === classId);

//       if (!attendanceRecord) {
//         // If no record exists for this subject & class, create a new one
//         attendanceRecord = {
//           subject_code: subject_code,
//           attendedClasses: presentStudents.includes(student.rollno) ? 1 : 0,
//           totalClasses: 1,
//           classId: classId, // Store the class ID
//           marked: true // First-time marking
//         };
//         student.attendance.push(attendanceRecord);

//         // Update the timetable to mark attendance as recorded
//         if (timetableEntry) timetableEntry.marked = true;
//       } else {
//         if (!attendanceRecord.marked) {
//           // First time marking for this class, increase totalClasses
//           attendanceRecord.totalClasses += 1;
//           if (presentStudents.includes(student.rollno)) {
//             attendanceRecord.attendedClasses += 1;
//           }
//           attendanceRecord.marked = true;

//           // Update timetable entry
//           if (timetableEntry) timetableEntry.marked = true;
//         } else {
//           // If already marked, just update attendedClasses if present
//           if (presentStudents.includes(student.rollno)) {
//             attendanceRecord.attendedClasses += 1;
//           }
//         }
//       }

//       await student.save();
//     }

//     return res.status(200).json({ message: "Attendance updated successfully" });

//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({ message: "Server error", error: error.message });
//   }
// });



router.post("/mark-attendance/:classId", fetchUser, async (req, res) => {
  try {
    const { presentStudents } = req.body;
    const { classId } = req.params;

    if (!Array.isArray(presentStudents)) {
      return res.status(400).json({ message: "presentStudents must be an array." });
    }

    // Fetch the class
    const cl = await Class.findById(classId);
    if (!cl) return res.status(404).json({ message: "Class not found." });

    if (cl.teacher.toString() !== req.user.toString()) {
      return res.status(403).json({ error: "You are not the teacher of this class" });
    }

    const subject_code = cl.subject_code;
    const today = new Date().toISOString().split("T")[0];

    // Check if attendance already exists for this class today
    let isNewAttendance = false;
    let attendanceRecord = cl.attendance.find(record => 
      record.date.toISOString().split("T")[0] === today
    );

    // Get the previous present students if updating existing record
    const previousPresentStudents = attendanceRecord ? [...attendanceRecord.presentStudents] : [];

    if (attendanceRecord) {
      // Update existing attendance record
      attendanceRecord.presentStudents = presentStudents;
    } else {
      // Create a new attendance record
      isNewAttendance = true;
      attendanceRecord = {
        classId: cl._id,
        subject_code,
        date: new Date(),
        day: cl.day,
        presentStudents,
      };
      cl.attendance.push(attendanceRecord);
    }

    await cl.save(); // Save the updated class attendance

    // Fetch students from class
    const students = await Student.find({ _id: { $in: cl.students } });

    for (let student of students) {
      // Find timetable entry for this student & class
      let timetableEntry = student.timetable.find(tt => 
        tt.classId.toString() === classId
      );

      if (!student.attendance) student.attendance = [];

      // Find attendance record for this subject
      let studentAttendance = student.attendance.find(att => 
        att.subject_code === subject_code
      );

      const isPresent = presentStudents.includes(student.rollno);
      const wasPresent = previousPresentStudents.includes(student.rollno);

      if (!studentAttendance) {
        // First time attendance for this subject
        studentAttendance = {
          subject_code,
          attendedClasses: isPresent ? 1 : 0,
          totalClasses: 1
        };
        student.attendance.push(studentAttendance);
        if (timetableEntry) timetableEntry.marked = true;
      } else {
        if (!isNewAttendance) {
          // Updating existing attendance record
          if (!wasPresent && isPresent) {
            studentAttendance.attendedClasses += 1;
          } else if (wasPresent && !isPresent) {
            studentAttendance.attendedClasses = Math.max(0, studentAttendance.attendedClasses - 1);
          }
        } else {
          // New attendance record for existing subject
          studentAttendance.totalClasses += 1;
          if (isPresent) {
            studentAttendance.attendedClasses += 1;
          }
          if (timetableEntry) timetableEntry.marked = true;
        }
      }

      await student.save();
    }

    return res.status(200).json({ message: "Attendance updated successfully." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
});


// Backend Route to Fetch Attendance for a Class on a Specific Day
router.get("/fetch-attendance/:classId", fetchUser, async (req, res) => {
  try {
    const { classId } = req.params;

    // Find class
    const cl = await Class.findById(classId);
    if (!cl) return res.status(400).json({ error: "This class doesn't exist" });

    // Check if the user is the teacher of this class
    if (cl.teacher.toString() !== req.user.toString()) {
      return res.status(403).json({ error: "You are not the teacher of this class" });
    }

    // Get today's date
    const today = new Date().toISOString().split("T")[0];

    // Find attendance for today
    const attendanceRecord = cl.attendance.find(
      (record) => record.date.toISOString().split("T")[0] === today
    );
    const students=cl.students;

    if (!attendanceRecord) {
      return res.status(200).json({ message: "No attendance marked for today", presentStudents: [] });

    }
    const absStudents = students.filter(item => !attendanceRecord.presentStudents.includes(item));
    const absRolls=[];
    if(!absStudents){
    for(each in absStudents){
      let roll=await each.rollno;
      absRolls.push(roll);
    }
  }

    res.status(200).json({ presentStudents: attendanceRecord.presentStudents,absentStudents : absRolls });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: error.message });
  }
});



router.get("/students-by-section", fetchUser,async (req, res) => {
  try {
    const { batch, semester, section } = req.query;

    // Validate input parameters
    if (!batch || !semester || !section) {
      return res.status(400).json({ error: "Batch, semester, and section are required." });
    }

    // Convert semester to integer
    const semesterInt = parseInt(semester);

    // Check if the section exists for the batch and semester
    if (!SECTION_MAPPING[batch] || !SECTION_MAPPING[batch][semesterInt]?.includes(section)) {
      return res.status(400).json({ error: "Invalid section for the selected batch and semester." });
    }

    // Fetch students in the specified section
    const students = await Student.find({ batch, semester: semesterInt, section })
                                  .select("name rollno");

    // Return the student data
    res.json({ students });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

//timetable of a section
router.get("/sectiontimetable", fetchUser, async (req, res) => {
  const { batch, semester, section } = req.query;

  if (!batch || !semester || !section) {
    return res.status(400).json({ error: "Batch, semester, and section are required" });
  }

  try {
    const students = await Student.find({ batch, semester, section }).select("timetable").lean();

    const allClassIds = new Set();
    students.forEach((s) => {
      (s.timetable || []).forEach((entry) => allClassIds.add(entry.classId));
    });

    const classIdArray = Array.from(allClassIds);
    const classes = await Class.find({ _id: { $in: classIdArray } }).lean();

    const noInstructionDays = await NoInstructionDay.find({}).lean();
    const noInstructionDates = new Set(noInstructionDays.map(day => new Date(day.date).toISOString().split('T')[0]));
    const noInstructionInfo = noInstructionDays.reduce((acc, day) => {
      const date = new Date(day.date).toISOString().split('T')[0];
      acc[date] = { reason: day.reason, description: day.description };
      return acc;
    }, {});

    const enrichedTimetable = classes.map(cls => {
      const dateStr = new Date(cls.date).toISOString().split("T")[0];
      const isNoInstructionDay = noInstructionDates.has(dateStr);
      return {
        classId: cls._id,
        subject_code: cls.subject_code,
        day: cls.day,
        date: dateStr,
        timeFrame: cls.timeFrame,
        batch: cls.batch,
        semester: cls.semester,
        section: cls.section,
        isNoInstructionDay,
        noInstructionReason: isNoInstructionDay ? noInstructionInfo[dateStr]?.reason : null,
        noInstructionDescription: isNoInstructionDay ? noInstructionInfo[dateStr]?.description : null
      };
    });

    res.json({ success: true, timetable: enrichedTimetable });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/createElective', fetchUser, async (req, res) => {
  try {
    const { subjectCode, subjectName, type } = req.body;
    const facultyId = req.user;
    console.log(facultyId);

    // Check if subject code already exists
    const existing = await Elective.findOne({ subjectCode });
    if (existing) {
      return res.status(400).json({ error: 'Elective with this subject code already exists.' });
    }

    const elective = new Elective({
      subjectCode,
      subjectName,
      type,
      faculty: facultyId,
    });

    await elective.save();
    res.status(201).json({ message: 'Elective created successfully', elective });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post(
  "/createElectiveClass",
  [
    fetchUser,
    body("subject_code", "Subject code is required").notEmpty().trim(),
    body("subject", "Subject name is required").notEmpty().trim(),
    body(
      "timeFrame",
      "The time frame will not fall under instruction timings"
    ).isIn([
      "9:00-9:55", "10:00-10:55", "11:00-11:55", "12:00-12:55",
      "13:00-13:55", "14:00-14:55", "15:00-15:55", "16:00-16:55",
      "9:00-11:55", "14:00-16:55"
    ]),
    body("day", "Day is required").notEmpty().isIn(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]),
    body("isRegular", "isRegular field is required").isBoolean(),
    body("batch", "Invalid batch").isIn(["BTech", "MTech"]),
    body("semester", "Invalid semester").custom((value, { req }) => {
      const validSemesters = req.body.batch === "BTech" ? [1, 2, 3, 4, 5, 6, 7, 8] : [1, 2, 3, 4];
      return validSemesters.includes(Number(value));
    }),
    body("date", "Invalid date").isISO8601().toDate()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const faculty = await Faculty.findById(req.user);
      if (!faculty) {
        return res.status(403).json({ error: "Access denied. Only faculty can create elective classes." });
      }

      const { subject_code, subject, date, day, timeFrame, isRegular, batch, semester } = req.body;

      const elective = await Elective.findOne({ subjectCode : subject_code });
      console.log(elective);
      console.log(elective.students);
      if (!elective || !elective.students || elective.students.length === 0) {
        return res.status(404).json({ error: "No elective found for the given subject code or no students enrolled." });
      }

      const studentIds = elective.students;
      const initialDate = new Date(date);
      const dateStr = initialDate.toISOString().split('T')[0];

      const noInstructionDay = await NoInstructionDay.findOne({ date: dateStr });
      if (noInstructionDay) {
        return res.status(400).json({
          error: `Cannot schedule class on ${dateStr}`,
          reason: noInstructionDay.reason,
          description: noInstructionDay.description || ''
        });
      }

      let createdClasses = [];
      let skippedDates = [];

      if (isRegular) {
        for (let i = 0; i < 16; i++) {
          const classDate = new Date(initialDate);
          classDate.setDate(classDate.getDate() + i * 7);
          const classDateStr = classDate.toISOString().split('T')[0];

          const conflictDay = await NoInstructionDay.findOne({ date: classDateStr });
          if (conflictDay) {
            skippedDates.push({
              date: classDateStr,
              reason: conflictDay.reason,
              description: conflictDay.description
            });
            continue;
          }

          const newClass = await Class.create({
            subject_code,
            subject,
            teacher: faculty._id,
            batch,
            semester,
            section: "Elective", // Optional or replace as needed
            students: studentIds,
            date: classDate,
            day,
            timeFrame,
            isRegular: true
          });

          createdClasses.push({
            _id: newClass._id,
            date: classDateStr,
            day,
            timeFrame
          });

          await Student.updateMany(
            { _id: { $in: studentIds } },
            {
              $push: {
                timetable: {
                  subject_code,
                  subject,
                  day,
                  date: classDateStr,
                  timeFrame,
                  classId: newClass._id,
                  isRegular: true
                }
              }
            }
          );

          await Faculty.findByIdAndUpdate(faculty._id, {
            $push: {
              classes: newClass._id,
              timetable: {
                subject_code,
                subject,
                day,
                date: classDateStr,
                timeFrame,
                classId: newClass._id,
                isRegular: true
              }
            }
          });
        }
      } else {
        const newClass = await Class.create({
          subject_code,
          subject,
          teacher: faculty._id,
          batch,
          semester,
          section: "Elective", // Optional or replace as needed
          students: studentIds,
          date: initialDate,
          day,
          timeFrame,
          isRegular: false
        });

        createdClasses.push({
          _id: newClass._id,
          date: dateStr,
          day,
          timeFrame
        });

        await Student.updateMany(
          { _id: { $in: studentIds } },
          {
            $push: {
              timetable: {
                subject_code,
                subject,
                day,
                date: dateStr,
                timeFrame,
                classId: newClass._id,
                isRegular: false
              }
            }
          }
        );

        await Faculty.findByIdAndUpdate(faculty._id, {
          $push: {
            classes: newClass._id,
            timetable: {
              subject_code,
              subject,
              day,
              date: dateStr,
              timeFrame,
              classId: newClass._id,
              isRegular: false
            }
          }
        });
      }

      const response = {
        success: true,
        createdClasses,
        message: `${createdClasses.length} elective class(es) created successfully`
      };

      if (skippedDates.length > 0) {
        response.warning = `${skippedDates.length} date(s) skipped due to conflicts`;
        response.skippedDates = skippedDates;
      }

      res.status(201).json(response);
    } catch (error) {
      console.error("Elective class creation failed:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        ...(process.env.NODE_ENV === 'development' && { details: error.message })
      });
    }
  }
);




module.exports = router;
