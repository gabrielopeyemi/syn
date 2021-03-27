const {DBController}=require("./fing/DBController");
const {User}=require("./fing/User");
const {Auth}=require("./fing/Auth");
const {Access}=require("./fing/Access")

c=async()=>{
    var ch=await User.verify({username:null,emailAddress:"dannyoma75@gmail.com",lastName:"",firstName:"Akin"});
    console.log(ch);
}
c()