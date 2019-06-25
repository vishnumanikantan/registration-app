var mongoose = require("mongoose");
var passportLocalMongoose = require("passport-local-mongoose");

var UserSchema = new mongoose.Schema({
    username: String,
    firstName: String,
    lastName: String,
    email: String,
    phone: Number,
    password: String,
    isAdmin: {type: Boolean, default: false},
    isApplied: {type: Boolean, default: false},
    application: {
        id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Student"
        }
    }
});

UserSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User", UserSchema);