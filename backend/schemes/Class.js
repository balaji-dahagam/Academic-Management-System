const mongoose = require("mongoose");

const classSchema = new mongoose.Schema({
  subject_code: { type: String, required: true, trim: true },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: "Faculty", required: true },
  batch: { type: String, required: true, enum: ["BTech", "MTech"], trim: true },
  semester: { type: Number, required: true },
  section: { type: String, required: true },
  students: [{ type: mongoose.Schema.Types.ObjectId, ref: "Student" }],
  date: { type: Date, required: true },
  day: { type: String, required: true },
  timeFrame: {
    type: String,
    required: true,
    enum: [
      "9:00-9:55", "10:00-10:55", "11:00-11:55", "12:00-12:55",
      "13:00-13:55", "14:00-14:55", "15:00-15:55", "16:00-16:55","9:00-11:55","14:00-16:55"
    ]
  },
  attendance: [
    {
      subject_code: { type: String, required: true },
      day: { type: String, required: true },
      date: { type: Date, required: true },
      presentStudents: [{ type: String, required: true }]
    }
  ],
  isElective: { type: Boolean, default: false },
  electiveType: { 
    type: String,
    enum: ["hs", "cs", "ec"],
    required: function() { return this.isElective; }
  }
}, { timestamps: true });

module.exports = mongoose.model("Class", classSchema);
