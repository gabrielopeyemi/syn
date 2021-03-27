var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var userSchema = new Schema({
  username:  { type: String },
  lastName:{type:String},
  firstName:{type:String},
  location:{type:String},
  emailAddress: { type: String },
  password:{type:String},
  dateOfBirth:{type:Date},
  group:{type:String},
  posts:{type:Array},
  messages:{type:Array},
  friends:{type:Array},
  apiKey:{type:String},
  dateCreated:{type:Date},
  lastOnline:{type:Date}
  });
module.exports=mongoose.model("User",userSchema)