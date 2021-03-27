const { DBController } = require("./DBController");
const {Access}=require("./Access")
const {Auth}=require("./Auth");
const {Response}=require("./Response")
const User={
    createAccount:async (fields)=>{
        var {lastName,firstName,emailAddress,password,dateOfBirth,group,username}=fields;
        group=="artist"||group=="user"?group:group=="user";
        var verify=await User.verify(fields);
        var exists=await User.exists(username,emailAddress);
        if(!exists.exists){
            if(verify.passed){
                fields.dateCreated=new Date();
                fields.apiKey=await Auth.generate(username);
                fields.dateOfBirth?dateOfBirth:dateOfBirth=new Date(1,1,1970);
                fields.password=await Access.hashPassword(username,password);
                Object.keys(userScheme).forEach(key=>{
                    userScheme[key]=fields[key]?fields[key]:userScheme[key];
                })
                //console.log(userScheme);
                var create=await DBController.insert(userScheme);
                var msg = await DBController.insert(await msgScheme(userScheme.username),"messages");
                var post = await DBController.insert(await postScheme(userScheme.username),"posts");
                
                console.log(create);

                if (create.type=="success" && msg.type=="success" && post.type == "success"){
                    return Response.success("Account created successfully", {apiKey:userScheme.apiKey});
                }
                else return Response.error("Error creating account",[create,msg,post]);
            }
            else return Response.error("Invalid fields", verify.errors)
        }
        else return Response.error(`${exists.which} already exists`,"Field value in use")
    },
    verify:async (fields)=>{
        var totalMark=Object.keys(fields).length;
        var result={
            passed:false,
            overallScore:totalMark,
            score:0,
            errors:[]
        };
        Object.keys(fields).forEach(field=>{
            if(fields[field]==""||fields[field]==null){
                result.errors.push(`${field}'s field is invalid`);
                result.score+=0;
            }
            else result.score+=1;
        })
        result.score==result.overallScore?result.passed=true:result.passed=false;
        return result;
    },
    exists:async (username,emailAddress)=>{
        var query={
            "selector":{
                $or:[
                    {"username":username},
                    {"emailAddress":emailAddress}
                ]
            }
        }
        var req=await DBController.query(query,null,"synchlayer");
        if(req.type=="success"){
            if(req.data.length==0) return {exists:false};
            else {
                var data=req.data[0];
                if(data.emailAddress==emailAddress) return {exists:true,which:"emailAddress",data:data};
                else return {exists:true,which:"username",data:data};
            }
        }
        else {
            console.error(req);
            return false;
        }
        
    },
    friend:{
        get:async (apiKey,username)=>{
            var qs={};
            apiKey?qs.apiKey=apiKey:username?qs.username=username:qs.apiKey=apiKey;
            var query={
                "selector":qs,
                "fields":["friends"]
            }
            var req=await DBController.query(query,null,"synchlayer");
            if(req.type=="success") return Response.success("Retrieved friends successfully",req.data[0]);
            else return Response.error("Error encountered while retrieving documents",req.errors);
        },
        delete:async (apiKey,friend)=>{
            var exists=await User.exists(friend);
            if(exists.exists){
                var query={
                    "selector":{
                        "apiKey":apiKey,
                    }
                };
                var query2={
                    "selector":{
                        "username":friend,
                    }
                }
                var apiKeyFriends = (await DBController.query(query,null,"synchlayer")).data[0];
                var friendFriends = (await DBController.query(query2,null,"synchlayer")).data[0];
                if (!apiKeyFriends.friends.includes(friend)) return Response.error(`${friend} not friends with you`);
                else{
                    apiKeyFriends.friends=apiKeyFriends.friends.filter(o=>o!==friend);
                    friendFriends.friends=friendFriends.friends.filter(o=>o!==apiKeyFriends.username);
                    var req = await DBController.update(apiKeyFriends);
                    var req2 = await DBController.update(friendFriends);
                    if (req.type == "success" && req2.type == "success"){
                        return Response.success(`${friend} has been deleted from your friend list`);
                    }
                    else return Response.error(req.type == "error" ? req.msg : req2.type == "error"? req2.msg : "An error was encountered",[req2.msg,req1.msg]);
                }
            }
            else return Response.error(`Username ${friend} not found` ,"User Non_Existence");
        },
        add:async (apiKey,friend)=>{
            var exists=await User.exists(friend);
            if(exists.exists){
                var query={
                    "selector":{
                        "apiKey":apiKey,
                    }
                };
                var query2={
                    "selector":{
                        "username":friend,
                    }
                }
                var apiKeyFriends = (await DBController.query(query,null,"synchlayer")).data[0];
                var friendFriends = (await DBController.query(query2,null,"synchlayer")).data[0];
                if (apiKeyFriends.friends.includes(friend)) return Response.error(`${friend} already friends with you`);
                else{
                    apiKeyFriends.friends.push(friend);
                    friendFriends.friends.push(apiKeyFriends.username);
                    var req = await DBController.update(apiKeyFriends);
                    var req2 = await DBController.update(friendFriends);
                    if (req.type == "success" && req2.type == "success"){
                        return Response.success(`${friend} is now in your friend list`);
                    }
                    else return Response.error(req.type == "error" ? req.msg : req2.type == "error"? req2.msg : "An error was encountered",[req2.msg,req1.msg]);
                }
            }
            else return Response.error(`Username ${friend} not found` ,"User Non_Existence")
        },
        isFriend: async (apiKey,friend)=>{
            var query = {
                "selector":{
                    "apiKey":apiKey
                },
                "fields":["friends"]
            }
            var req = await DBController.query(query,null,"synchlayer");
            if (req.type == "success"){
                var friendQuery = req.data[0].friends;
                if (friendQuery.includes(friend)){
                    return Response.success(true);
                }
                else return Response.error(false,`Not friends with ${friend}`);
            }
            else return req;
        }
    },
    messages:{
        get:async (user)=>{
            var query={
                "selector":{
                    "username":user,
                },
                "fields":["messages"]
            }
            var req=await DBController.query(query,null,"messages");
            if(req.type=="success") return Response.success("Retrieved messages successfully",req.data[0]);
            else return Response.error("Error encountered while retrieving documents",req.errors);
        },
        to:async (user,username)=>{
            var query={
                "selector":{
                    "username":user,
                    "messages":{
                        "$elemMatch":{
                            "to":{
                                "$eq":username
                            }
                        }
                    }
                },
                "fields":["messages"]
            }
            var req=await DBController.query(query,null,"messages");
            if(req.type=="success") return Response.success("Retrieved messages to  successfully",req.data[0]);
            else return Response.error("Error encountered while retrieving documents",req.errors);
        },
        from:async (user,username)=>{
            var query={
                "selector":{
                    "username":user,
                    "messages":{
                        "$elemMatch":{
                            "from":{
                                "$eq":username
                            }
                        }
                    }
                },
                "fields":["messages"]
            }
            var req=await DBController.query(query,null,"messages");
            if(req.type=="success") return Response.success("Retrieved messages successfully",req.data[0]);
            else return Response.error("Error encountered while retrieving documents",req.errors);
        },
        sendTo:async (sender,msgObject)=>{
            var verify=await User.verify(msgObject);
            if(verify.passed){
                var {message,to}=msgObject;
                var exists=await User.exists(to);
                if(exists.exists){
                    var senderMsg={
                        message:message,
                        to:to,
                        time:new Date()
                      }
                      var receiverMsg={
                        message:message,
                        from:sender,
                        time:new Date()
                      }
                    var query={
                        "selector":{
                            "username":sender,
                        }
                    };
                    var query2={
                        "selector":{
                            "username":to,
                        }
                    }
                    var userMessages = (await DBController.query(query,null,"messages")).data[0];
                    var toMessages = (await DBController.query(query2,null,"messages")).data[0];

                    userMessages.messages.push(senderMsg);
                    toMessages.messages.push(receiverMsg);
                    var req = await DBController.update(userMessages);
                    var req2 = await DBController.update(toMessages);
                    if (req.type == "success" && req2.type == "success"){
                        return Response.success(`Message sent to ${to}`);
                    }
                    else return Response.error(req.type == "error" ? req.msg : req2.type == "error"? req2.msg : "An error was encountered",[req2.msg,req.msg]);
                    
                }
                else return Response.error(`Username ${to} not found` ,"User Non_Existence")
            }
            else return Response.error("Invalid fields",verify.errors)
        },
        for:async (user,username)=>{
            var query={
                "selector":{
                    "username":user,
                    "messages":{
                        "$elemMatch":{
                            "$or":[
                                {
                                    "to":{
                                        "$eq":username
                                    }
                                },
                                {
                                    "from":{
                                        "$eq":username
                                    }
                                }
                            ]
                        }
                    }
                },
                "fields":["messages"]
            }
            var req=await DBController.query(query,null,"messages");
            if(req.type=="success") return Response.success("Retrieved messages successfully",req.data[0]);
            else return Response.error("Error encountered while retrieving documents",req.errors);
        }
    },
    profile:{
        get:async (apiKey,username)=>{
            var qs={};
            apiKey?qs.apiKey=apiKey:username?qs.username=username:qs.apiKey=apiKey;
            var query={
                "selector":qs,
                "fields":["friends","lastName","firstName","username","emailAddress","group","dateOfBirth","lastOnline"]
            }
            var req=await DBController.query(query,null,"synchlayer");
            if(req.type=="success") return Response.success("Retrieved profile successfully",req.data[0]);
            else return Response.error("Error encountered while retrieving documents",req.errors);
        },
        update:async (apiKey)=>{
            var userEdit={

            }
        }
    },
    posts:{
        create:async (apiKey,data)=>{

        },
        get:async (apiKey,username)=>{
            var qs={};
            apiKey?qs.postedBy=apiKey:username?qs.postedBy=username:qs.postedBy=apiKey;
            var query={
                "selector":qs
            }
            var req=await DBController.query(query,null,"posts");
            if(req.type=="success") return Response.success("Retrieved posts successfully",req.data);
            else return Response.error("Error encountered while retrieving documents",req.errors);
        }
    }

}
const msgScheme=async (username)=>{
    return {
        username:username,
        messages:[

        ]
    }
};

const postScheme=async (username)=>{
    return {
        username:username,
        posts:[

        ]
    }
}

const userScheme={
    username:  "",
    lastName:"",
    firstName:"",
    location:"",
    emailAddress: "",
    password:"",
    dateOfBirth:new Date(),
    group:"user",
    posts:[],
    messages:[],
    friends:[],
    apiKey:"",
    dateCreated:new Date(),
    lastOnline:new Date()
}
exports.User=User;