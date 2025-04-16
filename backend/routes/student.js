const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const Student = require("../schemes/Student");
const bcrypt = require("bcryptjs");
var jwt = require("jsonwebtoken");
const fetchUser=require("../middleware/fetchUser");
const Class = require("../schemes/Class");
const NoInstructionDay=require("../schemes/NoInst");
const ElectiveSelection=require("../schemes/Elective");
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
  console.log("Validating email:", email); // Log email input to track the flow
  return email.toLowerCase().endsWith("@iiitg.ac.in");
};


//route 1 : create a student
router.post(
  "/createstudent",
  [
    body("name", "Name should be at least 3 characters").isLength({ min: 3 }),
    body("email", "Enter a valid email domain").custom((value) => {
      if (!isIIITGEmail(value)) {
        throw new Error("Invalid email domain");
      }
      return true;
    }),
    body("rollno", "Enter a number containing at least 7 characters").isLength({
      min: 7,
    }),
    body("password", "Enter a password of at least 4 characters").isLength({
      min: 4,
    }),
    body("batch", "Invalid batch").isIn(["BTech", "MTech"]),
    body("semester", "Invalid semester").custom((value, { req }) => {
      const validSemesters = req.body.batch === "BTech" ? [1, 2, 3, 4, 5, 6, 7, 8] : [1, 2, 3, 4];
      return validSemesters.includes(Number(value));
    }),
    body("section", "Invalid section").custom((value, { req }) => {
      if (!req.body.batch || !req.body.semester) return false;
      const validSections = SECTION_MAPPING[req.body.batch][req.body.semester] || [];
      return validSections.includes(value);
    })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array() });
    }

    try {
      let student = await Student.findOne({
        $or: [{ email: req.body.email }, { rollno: req.body.rollno }],
      });
      if (student) {
        return res
          .status(400)
          .json({ error: "A student with this email or roll number already exists" });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedP = await bcrypt.hash(req.body.password, salt);

      let newStudent = await Student.create({
        name: req.body.name,
        rollno: req.body.rollno,
        email: req.body.email,
        password: hashedP,
        batch: req.body.batch,
        semester: req.body.semester,
        section: req.body.section,
        classes: [],
        attendance: [],
        timetable: [],
      });

      const data = {
        id: newStudent.id,
      };
      const authToken = jwt.sign(data, JWT_SECRET);
      res.json({ success: true, authToken });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

//route : Login for students
router.post("/studentlogin",[
  body("email", "Enter a valid email domain").custom((value) => {
    if (!isIIITGEmail(value)) {
      throw new Error("Invalid email domain");
    }
    return true;
  }),
  body("password","Enter a password of atleast 4 characters").isLength({min:4})
],async (req,res)=>{
  const errors=validationResult(req);
  if(!errors.isEmpty()){
    return res.status(400).json({error : errors.array()});
  }
  const {email,password}=req.body;
  try {
    let student=await Student.findOne({email});
    if(!student){
      return res.status(404).json({error : "No student exists with this email"});
    }
    let passCompare=await bcrypt.compare(password,student.password);
    if(!passCompare){
      return res.status(400).json({error : "Password is incorrect"});
    }
    const data = { id: student.id };
    const authToken = jwt.sign(data, JWT_SECRET, { expiresIn: "1h" });
    res.status(201).json({success : true,authToken});
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
})

//route 2 : GET all students
router.get("/students",async (req,res)=>{
  try {
    const allStudents=await Student.find();
    res.status(200).json({success : true,allStudents})
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/stimetable", fetchUser, async (req, res) => {
  try {
    // Find the student using their ID from the authentication middleware
    const student = await Student.findById(req.user).lean();

    if (!student) {
      return res.status(403).json({ error: "Access denied. Authenticate to view timetable." });
    }

    // Ensure timetable is always an array
    const timetableEntries = Array.isArray(student.timetable) ? student.timetable : [];

    // If the student has no timetable, return an empty response
    if (timetableEntries.length === 0) {
      return res.json({ success: true, timetable: [] });
    }

    // Extract classIds from the student's timetable
    const classIds = timetableEntries.map(entry => entry.classId);

    // Fetch all class details in a single query
    const classes = await Class.find({ _id: { $in: classIds } })
      .select("subject_code day date timeFrame");

      const noInstructionDays = await NoInstructionDay.find({});

    // Create a mapping of classId -> class details
    const classMap = classes.reduce((map, classItem) => {
      map[classItem._id.toString()] = {
        subject_code: classItem.subject_code,
        day: classItem.day,
        date: classItem.date,
        timeFrame: classItem.timeFrame
      };
      return map;
    }, {});

    const noInstructionDates = new Set(
      noInstructionDays.map(day => new Date(day.date).toISOString().split('T')[0])
    );

    // Create a mapping of dates to no-instruction reasons
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



// Get student attendance
router.get('/attendance',fetchUser, async (req, res) => {
  try {
    const student = await Student.findById(req.user).lean();
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Calculate attendance percentages
    const attendanceData = student.attendance.map(subject => {
      const percentage = subject.totalClasses > 0 
        ? ((subject.attendedClasses / subject.totalClasses) * 100).toFixed(2)
        : 0;
      
      return {
        subject_code: subject.subject_code,
        attendedClasses: subject.attendedClasses,
        totalClasses: subject.totalClasses,
        percentage: percentage + '%'
      };
    });

    res.json(attendanceData);
  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

const HS = [
  { subjectCode: "HS301", subjectName: "Introduction to Philosophy" },
  { subjectCode: "HS302", subjectName: "Psychology for Engineers" },
  { subjectCode: "HS303", subjectName: "Sociology and Society" },
  { subjectCode: "HS304", subjectName: "Principles of Economics" },
  { subjectCode: "HS305", subjectName: "Creative Writing" },
  { subjectCode: "HS306", subjectName: "Environmental Ethics" },
  { subjectCode: "HS307", subjectName: "Public Policy and Governance" },
  { subjectCode: "HS308", subjectName: "Indian Constitution and Society" }
];
const hsMap = new Map(HS.map(course => [course.subjectCode, course.subjectName]));
router.post('/select', fetchUser, async (req, res) => {
  try {
    const studentId = req.user;
    const { hs, branch } = req.body;

    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    // Get current semester
    const currentSemester = student.currentSemester;
    const isCSE = student.branch.code === 'CSE';
    const isECE = student.branch.code === 'ECE';

    // Validate HS elective (only for semesters 1-5)
    if (branch) {
      if (currentSemester < 5) {
        return res.status(400).json({ error: 'Branch electives are only allowed after 5th semester.' });
      }

      const hsElective = await Elective.findOne({ subjectCode: hs.subjectCode, type: 'hs' });
      if (!hsElective) return res.status(400).json({ error: 'Invalid HS elective selected.' });

      // Only update if different from current
      if (!student.electiveSelection.hs || student.electiveSelection.hs.subjectCode !== hs.subjectCode) {
        student.electiveSelection.hs = {
          subjectCode: hs.subjectCode,
          subjectName: hs.subjectName,
        };

        if (!hsElective.students.includes(student._id)) {
          hsElective.students.push(student._id);
          await hsElective.save();
        }
      }
    }

    // Process Branch electives based on semester and branch rules
    if (Array.isArray(branch)) {
      // Clear previous branch electives if needed (or handle based on your requirements)
      student.electiveSelection.branch = [];

      // Validate based on semester and branch
      let maxAllowed = 0;
      let errorMessage = '';

      if (isCSE) {
        if (currentSemester === 6) {
          maxAllowed = 1; // Project OR 1 elective
          errorMessage = 'For CSE 6th sem, you can select either a project or one branch elective.';
        } else if (currentSemester === 7) {
          maxAllowed = 2; // Project + 1E OR 2 electives
          errorMessage = 'For CSE 7th sem, you can select either project + one elective or two electives.';
        } else if (currentSemester === 8) {
          maxAllowed = 4; // Project+2E or intern+2E or 4E
          errorMessage = 'For CSE 8th sem, you can select project + 2 electives, internship + 2 electives, or 4 electives.';
        }
      } else if (isECE) {
        if (currentSemester === 6) {
          maxAllowed = 0; // Only project, no electives
          errorMessage = 'For ECE 6th sem, only project is allowed (no electives).';
        } else if (currentSemester === 7) {
          maxAllowed = 1; // Project + 1E
          errorMessage = 'For ECE 7th sem, you can select project + one elective.';
        } else if (currentSemester === 8) {
          maxAllowed = 1; // Project+1E or intern+1E
          errorMessage = 'For ECE 8th sem, you can select project + one elective or internship + one elective.';
        }
      }

      // Check if selection exceeds maximum allowed
      if (branch.length > maxAllowed) {
        return res.status(400).json({ error: errorMessage });
      }

      // Validate and add each elective
      const existingBranchCodes = new Set();
      for (let elec of branch) {
        if (existingBranchCodes.has(elec.subjectCode)) {
          return res.status(400).json({ error: `Duplicate elective: ${elec.subjectCode}` });
        }

        const found = await Elective.findOne({ 
          subjectCode: elec.subjectCode, 
          type: isCSE ? 'cs' : 'ec' // CSE students can only select CS electives, ECE students EC electives
        });

        if (!found) {
          return res.status(400).json({ error: `Invalid branch elective: ${elec.subjectCode}` });
        }

        student.electiveSelection.branch.push({
          subjectCode: elec.subjectCode,
          subjectName: elec.subjectName,
          type: elec.type
        });

        if (!found.students.includes(student._id)) {
          found.students.push(student._id);
          await found.save();
        }

        existingBranchCodes.add(elec.subjectCode);
      }
    }

    await student.save();
    res.status(200).json({ message: 'Elective selection updated successfully.' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.delete('/remove', fetchUser, async (req, res) => {
  try {
    const studentId = req.user;
    const { subjectCode,subjectName, type } = req.body;

    if (!subjectCode || !type) {
      return res.status(400).json({ error: 'subjectCode and type are required.' });
    }

    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ error: 'Student not found.' });

    const elective = await Elective.findOne({ subjectCode, type });
    if (!elective) return res.status(404).json({ error: 'Elective not found.' });

    // Remove student from elective's list
    elective.students = elective.students.filter(sId => sId.toString() !== studentId);
    await elective.save();

    // Remove elective from student's data
    if (type === 'hs') {
      if (student.electiveSelection.hs && student.electiveSelection.hs.subjectCode === subjectCode) {
        student.electiveSelection.hs = undefined;
      }
    } else {
      student.electiveSelection.branch = (student.electiveSelection.branch || []).filter(
        elec => elec.subjectCode !== subjectCode
      );
    }

    await student.save();

    res.status(200).json({ message: `Successfully removed ${subjectCode} from elective selection.` });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});








module.exports = router;
