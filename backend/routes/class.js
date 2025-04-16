

const express = require("express");
const router = express.Router();
// const Student = require("../models/Student");
// const Class = require("../models/Class");
const NoInstructionDay=require("../schemes/NoInst");

// router.get("/student/:studentId/attendance/:subject_code", async (req, res) => {
//   try {
//     const { studentId, subject_code } = req.params;

//     // Find the student
//     const student = await Student.findById(studentId);
//     if (!student) {
//       return res.status(404).json({ error: "Student not found" });
//     }

//     // Find all classes with the given subject_code
//     const classes = await Class.find({ subject_code });

//     if (!classes.length) {
//       return res.status(404).json({ error: "No classes found for this subject" });
//     }

//     let totalClasses = 0;
//     let attendedClasses = 0;

//     // Loop through each class to calculate attendance
//     for (const cl of classes) {
//       // Find student's attendance record for this class
//       const studentAttendance = student.attendance.find((att) => att.classId.equals(cl._id));

//       if (studentAttendance) {
//         totalClasses += studentAttendance.totalClasses;
//         attendedClasses += studentAttendance.attendedClasses;
//       }
//     }

//     // Calculate attendance percentage
//     const attendancePercentage = totalClasses > 0 
//       ? ((attendedClasses / totalClasses) * 100).toFixed(2) 
//       : 0;

//     res.status(200).json({
//       success: true,
//       subject_code,
//       totalClasses,
//       attendedClasses,
//       attendancePercentage: `${attendancePercentage}%`,
//     });

//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ success: false, error: error.message });
//   }
// });

// Admin can add no-instruction days
router.post('/no-instruction-days', async (req, res) => {
  try {
    const { date, reason, description, academicYear } = req.body;

    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Date must be in YYYY-MM-DD format' });
    }

    // Validate it's a valid date
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      return res.status(400).json({ error: 'Invalid date' });
    }

    // Optionally validate academicYear format (YYYY-YYYY)
    if (!/^\d{4}-\d{4}$/.test(academicYear)) {
      return res.status(400).json({ error: 'Academic year must be in YYYY-YYYY format' });
    }

    const noInstructionDay = await NoInstructionDay.create({ 
      date, // Store as YYYY-MM-DD string
      reason,
      description,
      academicYear
    });

    res.status(201).json(noInstructionDay);
  } catch (error) {
    if (error.code === 11000) { // MongoDB duplicate key error
      res.status(400).json({ error: 'This date already exists in the system' });
    } else {
      res.status(400).json({ error: error.message });
    }
  }
});

// Get all no-instruction days for an academic year
router.get('/no-instruction-days/:academicYear', async (req, res) => {
  try {
    const days = await NoInstructionDay.find({ 
      academicYear: req.params.academicYear 
    });
    res.json(days);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

