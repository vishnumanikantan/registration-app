var mongoose = require("mongoose");

var studentSchema = new mongoose.Schema({
    firstName: String,
    lastName: String,
    applicationnum: Number,
    email: String,
    phone: Number,
    dob: Date,
    addressP: String,
    addressC: String,
    aadhar: Number,
    photo: String,
    religion: String,
    board: String,
    institution: String,
    qualification: String,
    register: String,
    yearPass: Number,
    guardFirstName: String,
    guardLastName: String,
    guardEmail: String,
    guardPhone: Number,
    percentage: Number,
    certificate: String,
    author: {
        id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }
    },
    isApplied: {type: Boolean, default: false}
});

module.exports = mongoose.model("Student", studentSchema);