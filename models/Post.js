var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var postSchema = new Schema({
  by:{type:String},
  postDate:{type: Date},
  imageExist:{type:Boolean},
  videoExist:{type:Boolean},
  location:{type:String},
  postId:{type:String},
  likes:{type:Number},
  dislikes:{type:Number},
  views:{type:Number},
  comments:{type:Array},
  image:{data:Buffer,contentType:String},
  listeningTo:{type:String}
  });
module.exports=mongoose.model("Post",postSchema)