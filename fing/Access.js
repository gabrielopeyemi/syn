const {DBController}=require("./DBController");
const User=require("./User");
const Auth=require("./Auth");
const crypt=require("crypto");
const {Response}=require("./Response");
const Access={
    login:async (username,password)=>{
        password=this.Access.hashPassword(password);
        var query={
            selector:{
                "username":`${username}`,
                "password":`${password}`
            }
        }
        var req=await DBController.query(query);
        if(req.type=="success") Response.success("Login successful");
        else return Response.error("Invalid login details");
    },
    hashPassword:async (username,password)=>{
        var mykey=crypt.createCipher('aes-128-cbc',username)
        var mystr=mykey.update(password,'utf-8','hex')
        mystr+=mykey.final('hex')
        return mystr
    }
}

exports.Access=Access;