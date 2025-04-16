const mongoose = require("mongoose");

const ALLOWED_BATCHES = ["BTech", "MTech"];
const BTECH_SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];
const MTECH_SEMESTERS = [1, 2, 3, 4];
const SECTION_MAPPING = {
  BTech: {
    1: ["S11", "S12", "S13", "G11", "G12", "G13", "G14"],
    2: ["S11", "S12", "S13", "G11", "G12", "G13", "G14"],
    3: ["CS21", "CS22", "S21", "S22", "S23", "G21", "G22", "G23", "G24"],
    4: ["CS21", "CS22", "EC21", "EC22"],
    5: ["CS31", "CS32", "EC31", "EC32", "S31", "S32", "S33", "LCS31", "LCS32", "LCS33"],
    6: ["CS31", "CS32", "EC31", "EC32", "S31", "S32", "S33"],
    7: ["CS41", "CS42"],
  },
  MTech: {
    3: ["CS41", "CS42"],
  }
};

const StudentSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, trim: true },
  rollno: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true },
  batch: { type: String, required: true, enum: ALLOWED_BATCHES, trim: true },
  branch : {type :String,required : true,enum :["CSE","ECE"]},
  semester: {
    type: Number,
    required: true,
    validate: {
      validator: function (value) {
        if (this.batch === "BTech") return BTECH_SEMESTERS.includes(value);
        if (this.batch === "MTech") return MTECH_SEMESTERS.includes(value);
        return false;
      },
      message: props => `Invalid semester for ${props.value}. BTech: 1-8, MTech: 1-4`
    }
  },
  section: {
    type: String,
    required: true,
    validate: {
      validator: function (value) {
        return SECTION_MAPPING[this.batch][this.semester].includes(value);
      },
      message: "Invalid section for selected batch and semester"
    }
  },
  classes: [{ type: mongoose.Schema.Types.ObjectId, ref: "Class" }],
  attendance: [{
    subject_code: { type: String, required: true },
    attendedClasses: { type: Number, default: 0 },
    totalClasses: { type: Number, default: 0 }
  }],
  timetable: [{
    classId: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true },
    subject_code: { type: String, required: true },
    date: { type: String, required: true },
    day: { type: String, required: true },
    timeFrame: { type: String, required: true },
    marked: { type: Boolean, default: false } 
  }],
  electiveSelection: {
    hs: {
      subjectCode: { type: String },
      subjectName: { type: String },
    },
    branch: [
      {
        subjectCode: { type: String },
        subjectName: { type: String},
        type: {
          type: String,
          enum: ['cs', 'ec'],
          
        }
      }
    ]
  }
  
});

StudentSchema.virtual("attendancePercentage").get(function () {
  if (!this.attendance || this.attendance.length === 0) return {};

  let percentages = {};
  this.attendance.forEach(subject => {
    if (subject.totalClasses > 0) {
      percentages[subject.subject_code] = ((subject.attendedClasses / subject.totalClasses) * 100).toFixed(2) + "%";
    } else {
      percentages[subject.subject_code] = "0%";
    }
  });

  return percentages;
});

module.exports = mongoose.model("Student", StudentSchema);
