const mongoose = require("mongoose");

const facultySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true },
    password : {type : String,required : true},
    classes: [{ type: mongoose.Schema.Types.ObjectId, ref: "Class" }],
    timetable: [
      {
        subject: String,
        subject_code : String,
        day: String,
        date : Date,
        timeFrame : String,
        classId: { type: mongoose.Schema.Types.ObjectId, ref: "Class" },
      },
    ],
  },
  { timestamps: true }
);

const Faculty = mongoose.model("Faculty", facultySchema);
module.exports = Faculty;
