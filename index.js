const express=require('express')
const app=express()
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var session=require('express-session')
var dbprocess=require("./lib/dbprocess")
const PORT=4678;
const crypt=require("crypto")
var request=require('request')
var mongoose=require("mongoose")
var Schema=mongoose.Schema
var multer=require("multer")
console.log("We are in "+process.env.NODE_ENV+ " mode")

if (process.env.NODE_ENV == 'production') {
  var mongodbURL=process.env.MONGODB_URL || 'mongodb+srv://railosapp:mongo@railos-vkklb.mongodb.net/synchlayer'
}
else if (process.env.NODE_ENV == 'development'){
  var mongodbURL='mongodb://localhost:27017/synchlayer'
}
else mongodbURL=process.env.MONGODB_URL || 'mongodb+srv://railosapp:mongo@railos-vkklb.mongodb.net/synchlayer'
console.log(mongodbURL)
try {
  mongoose.connect(mongodbURL)
} catch (error) {
  throw err
}
require("./models/User")
var User=mongoose.model("User")
require("./models/Post")

var Post=mongoose.model("Post")

app.use(require('body-parser')());
app.use(express.static(__dirname+"/public"))
var upload= multer()
app.set('views',__dirname+"/views")
app.set('view engine', 'pug');
app.use(session({
  maxAge:600000,
  secret: 'synchlayer',
  resave: true,
  saveUninitialized: false
}));
app.use((req, res, next)=> {
  res.header("Access-Control-Allow-Origin", "*"); // update to match the domain you will make the request from
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept,synchlayerAPP,apiKey");
  res.header("Access-Control-Allow-Methods","PUT,DELETE,POST,GET")
  next();
});
app.get("/",(req,res)=>{
  res.json({type:"success",msg:"This is synchlayer"})
})
app.get("/dev-api",(req,res)=>{
  
    var docs=dbprocess.getDocs()
    docs=docs.sort((a,b)=>a.title.charCodeAt(0)-b.title.charCodeAt(0))
    console.log(docs)
    res.render("dev-api",{docs:docs})
  
})

app.get('/synct', async (req, res,next)=> {
  res.sendFile(__dirname + '/public/sync.html');
});
var onlineUsers={}


/////SOCKET.IO///////////////////////////////////////////////////////

io.use(async(socket, next) => {
  let apiKey = socket.handshake.query.apiKey;
  console.log(`apiKey:   ${apiKey} trying to connect`)
  if(apiKey!==undefined){
    try {
      var decodedApiKey=await decodeApiKey(apiKey)
      if (decodedApiKey.type) {
        console.log(`${apiKey} now online`)
        var newOnlineUser={username:decodedApiKey.username,socketId:socket.id}
        onlineUsers[decodedApiKey.username]=newOnlineUser
        console.log(onlineUsers)
        socket.broadcast.emit("updateOnlineUsers",newOnlineUser)
        return next();
      }
      return next(new Error('authentication error'));
    } catch (error) {
      console.error(error)
      return next(new Error('authentication error'));
    }
  }
  else{
    return next(new Error('authentication error'));
  }
});

io.on('connection', (client)=> {
  console.log(client.handshake.headers)
  client.on("join",async(data)=>{
    console.log(".........here")
    console.log( data)
    var decodedApiKey=await decodeApiKey(data.apiKey)
    
    if(decodedApiKey.type){
      console.log(`${data.apiKey} now online`)
      var newOnlineUser={username:decodedApiKey.username,socketId:client.id}
      onlineUsers[decodedApiKey.username]=newOnlineUser
      console.log(onlineUsers)
      client.broadcast.emit("updateOnlineUsers",newOnlineUser)
    }
    else{
      client.emit("error",{type:"error",msg:"Invalid ApiKey"})
      client.disconnect(true)
    }
  })
  client.on('sync', (data)=> {
      console.log(data);
  });

  client.on('notify',async(data)=>{

  })
  client.on("play-music",async(data)=>{
    var apiKey=client.handshake.headers.apiKey
    var decodedApiKey=await decodeApiKey(apiKey)
    if(decodedApiKey.type){
      var req=await User.findOne({username:decodedApiKey(user)})
      console.log(data) 
      req.playingNow=data.music
      try{
        req.save()
        var similarPlay=User.find({"playingNow.name":data.music.name})
        client.emit("similarPlay",similarPlay)
      }
      catch(e){
        client.emit("error")
      }
    }
    else{
      client.close(true)
    }
  })
  client.on('sendMessage',async (data)=> {
    console.log("sendMsgData:::   ",data)
    var {message,apiKey,to}=data
    if (message&&apiKey&&to){
      var decodedApiKey=await decodeApiKey(apiKey)
      var senderMsg={
        message:message,
        to:to,
        time:new Date()
      }
      var receiverMsg={
        message:message,
        from:decodedApiKey.username,
        time:new Date()
      }
      if(decodedApiKey.type){
        if((await userExistence(to)).exists){//check users existence
          var sender=await (User.findOne({apiKey}))
          sender.messages.push(senderMsg)
          var receiver=await (User.findOne({username:to}))
          receiver.messages.push(receiverMsg)
          try{
            sender.save()
            receiver.save()
            client.to(`${onlineUsers[to].socketId}`).emit('incomingMsg', {message:message,with:decodedApiKey.username,from:decodedApiKey.username,time:new Date()});
            client.to(`${onlineUsers[to].socketId}`).emit('notify',{type:"message",message:message,with:decodedApiKey.username,from:decodedApiKey.username,time:new Date()}) 
            client.emit('incomingMsg',{message:message,with:to,from:"You",time:new Date()})
          }
          catch(err){
            console.log(err)
            client.emit("error",{type:"error",msg:"Error enocuntered while saving message"})
          }
        }
        else{
          client.emit("error",{type:"error",msg:"Invalid username"})
        }
      }
      else{
        client.emit("error",{type:"error",msg:"Invalid ApiKey"})
      }
    }
    else{
      client.emit("error",{type:"error",msg:"Required fields missing"})
    }
        
  });

});


///////////////////////////////////////////////////////////////////////
app.get("/up",(req,res)=>{
  res.render("tpost")
})
app.post("/up",upload.array("file"),(req,res)=>{
  var {message,listeningTo}=req.body
  if(req.files.length>0){
    console.log(req.files[0])
    console.log("files to upload")
  }
  else{
    console.log("no file to upload")
  }
  console.log(req.body.des)
  res.json({type:"success",msg:"success"})
})
//ACCESS
//login
app.post("/api/login",async(req,res)=>{
  var{username,password}=req.body
  User.find({username:username,password:hashPassword(username,password)},(err,user)=>{
    if(err){
      console.log(err)
    } 
    else{
      user=user.filter(o=>o.username==username)[0]
      if(user.username!==username){
        res.json({msg:"Invalid username or password",type:"error"})
      }
      else{
        console.log(user)
        res.json({type:"success",msg:"success",apiKey:user.apiKey,group:user.group})
      }
    }
  })
})

app.post("/api/createAccount",async(req,res)=>{
  var {username,emailAddress,password,group}=req.body
  console.log(await userExistence(username))
  if(username&&emailAddress&&password&&group){
    if(await (await userExistence(username)).exists==false){
      req.body.dateCreated=new Date()
      req.body.apiKey=generateApiKey(username)
      req.body.dateOfBirth?dateOfBirth:dateOfBirth=new Date("1/1/1970")
      req.body.password=hashPassword(username,password)
      var newUser=new User(req.body)
      newUser.save((err)=>{
        if(err){
          console.log(err)
          res.json({type:"error",msg:"Error encountered while creating account"})
        }
        else{
          res.json({type:"success",msg:"Account created successfully",apiKey:req.body.apiKey})
        }
      })
    }
    else{
      res.json({type:"error",msg:"Username taken"})
    }
  }
  else{
    res.json({type:"error",msg:"Certain fields are empty"})
  }
})

app.post("/api/checkUsername",(req,res)=>{
  var user=req.body.username
  User.find({username:user},(err,data)=>{
    if(err){
      console.log(err)
    }
    else{
      if(data.length<1){
       res.json({type:"error",msg:"Username not found"})
      }
      else{
        res.json({type:"success",msg:"Username found"})
      }
    }
  })
})

app.post("/api/checkEmail",(req,res)=>{
  var {emailAddress}=req.body
  User.find({emailAddress:emailAddress},(err,data)=>{
    if(err){
      console.log(err)
    }
    else{
      if(data.length<1){
       res.json({type:"error",msg:"Email not found"})
      }
      else{
        res.json({type:"success",msg:"Email found",data:data})
      }
    }
  })
})

//SOCIAL RELATION
app.post("/api/addAsFriend/:apiKey",async (req,res)=>{
  var {newFriend}=req.body
  var decodedApiKey=await decodeApiKey(req.params.apiKey)
  if(decodedApiKey.type){
    var {username}=decodedApiKey
    var x=await userExistence(newFriend)
    if(x.exists==true){
      User.findOne({apiKey:req.params.apiKey,username:username},(err,data)=>{
        if(err){
          console.log(err)
        }
        else{
          var find=data.friends.filter(o=>o.username==newFriend)
          console.log(find)
          if(find.length==0){
            try{
              data.friends.push({username:newFriend})
              data.save(data,(err)=>{
                if(err){
                  console.log(err)
                }
                else{ 
                  User.findOne({username:newFriend},(err,data)=>{
                    data.friends.push({username:username})
                    data.save()
                  })
                  res.json({type:"success",msg:`${newFriend} is now in your friend list`})
                }
              })
            }
            catch(error){
              console.log(error)
              throw error
            }
          }
          else{
            res.json({type:"error",msg:`${newFriend} already friends with you`})
          }
        }
      })
    }
    else {
      res.json({type:"error",msg:`Username ${newFriend} not found`})
    }
  }
  else {
    res.json({type:"error",msg:"Apikey is invalid"})
  }
  
})

app.post("/api/deleteFriend/:apiKey",async (req,res)=>{
  var {friend}=req.body
  var decodedApiKey=await decodeApiKey(req.params.apiKey)
  console.log(decodeApiKey)
  if(decodedApiKey.type){
    var user=decodedApiKey.username
    if((await userExistence(user)).exists==true){
      if((await userExistence(friend)).exists==true){
        User.findOne({apiKey:req.params.apiKey,username:user},(err,data)=>{
          if(err){
            console.log(err)
          }
          else{
            var find=data.friends.filter(o=>o.username==friend)
            console.log(find)
            if(find.length>0){
              try{
                var nf=data.friends.filter(o=>o.username!==friend)
                data.friends=nf
                data.save(data,(err)=>{
                  if(err){
                    console.log(err)
                  }
                  else{
                    User.findOne({username:friend},(err,data)=>{
                      var nf=data.friends.filter(o=>o.username!==user)
                      data.friends=nf
                      data.save()
                    })
                    res.json({type:"success",msg:`${friend} has been removed from your friend list`})
                  }
                })
              }
              catch(error){
                console.log(error)
                throw error
              }
            }
            else{
              res.json({type:"error",msg:`${friend} not friends with you`})
            }
          }
        })
      }
      else {
        res.json({type:"error",msg:`Invalid user`})
      }
    }
  }
  else {
    res.json({type:"error",msg:"Invalid ApiKey"})
  }
})

app.post("/api/getFriends/:apiKey",async (req,res)=>{
  var {username}=req.body//if a username is specified,its friend data woould be retrieved instead of the user
  var decodedApiKey=await decodeApiKey(req.params.apiKey)
  if(decodedApiKey.type){
    var user=decodedApiKey.username
    if((await userExistence(user)).exists==true){
      if(username){
        
        if((await userExistence(username)).exists==true){
          User.find({username:username},(err,data)=>{
            data=data.filter(o=>o.username==username)[0]
            res.json({type:"success",msg:"Friends retrieved successfully",data:data.friends})
          })
        }
        else{
          res.json({type:"error",msg:`Invalid usernname`})
        }
      }
      else{
        User.find({username:user},(err,data)=>{
          data=data.filter(o=>o.username==username)[0]
          res.json({type:"success",msg:"Friends retrieved successfully",data:data.friends})
        })
      }
    }
    else{
      res.json({type:"error",msg:"Invalid username"})
    }
  }
  else{
    res.json({type:"error",msg:"Invalid ApiKey"})
  }
  
})

/*
app.post("/api/sendMessage/:apiKey",async(req,res)=>{
  var {message,username}=req.body
  var decodedApiKey=await decodeApiKey(req.params.apiKey)
  var senderMsg={
    message:message,
    to:username,
    time:new Date()
  }
  var receiverMsg={
    message:message,
    from:decodedApiKey.username,
    time:new Date()
  }
  if(decodedApiKey.type){
    if((await userExistence(username)).exists){//check users existence
      var sender=await (User.findOne({apiKey:req.params.apiKey}))
      sender.messages.push(senderMsg)
      
      var receiver=await (User.findOne({username:username}))
      receiver.messages.push(receiverMsg)
      try{
        sender.save()
        receiver.save()
        res.json({type:"success",msg:"Message sent successfully"})
      }
      catch(err){
        console.log(err)
        res.json({type:"error",msg:"Error enocuntered while saving message"})
      }
    }
    else{
      res.json({type:"error",msg:"Invalid username"})
    }
  }
  else{
    res.json({type:"error",msg:"Invalid ApiKey"})
  }
})
*/
app.post("/api/getMessages/:apiKey",async(req,res)=>{
  var decodedApiKey=await decodeApiKey(req.params.apiKey)
  if(decodedApiKey.type){
    var user=await(await User.findOne({apiKey:req.params.apiKey}))
    var messages=user.messages
    res.json({type:"success",msg:"Messages retrieved successfully",data:messages})
  }
  else{
    res.json({type:"error",msg:"Invalid ApiKey"})
  }
})

app.post("/api/getMessagesTo/:apiKey",async(req,res)=>{
  var {username}=req.body
  var decodedApiKey=await decodeApiKey(req.params.apiKey)
  if(decodedApiKey.type){
    var user=await(await User.findOne({apiKey:req.params.apiKey}))
    var messages=user.messages
    messages=messages.filter(o=>o.to==username)
    res.json({type:"success",msg:"Messages retrieved successfully",data:messages})
  }
  else{
    res.json({type:"error",msg:"Invalid ApiKey"})
  }
})
app.post("/api/getMessagesFrom/:apiKey",async(req,res)=>{
  var {username}=req.body
  var decodedApiKey=await decodeApiKey(req.params.apiKey)
  if(decodedApiKey.type){
    var user=await(await User.findOne({apiKey:req.params.apiKey}))
    var messages=user.messages
    messages=messages.filter(o=>o.from==username)
    res.json({type:"success",msg:"Messages retrieved successfully",data:messages})
  }
  else{
    res.json({type:"error",msg:"Invalid ApiKey"})
  }
})

app.post("/api/getMessagesFor/:apiKey",async(req,res)=>{
  var {username}=req.body
  var decodedApiKey=await decodeApiKey(req.params.apiKey)
  if(decodedApiKey.type){
    var user=await(await User.findOne({apiKey:req.params.apiKey}))
    var messages=user.messages
    messages=messages.filter(o=>o.to==username||o.from==username)
    res.json({type:"success",msg:"Messages retrieved successfully",data:messages})
  }
  else{
    res.json({type:"error",msg:"Invalid ApiKey"})
  }
})
//PERSONIFY
app.post("/api/createPost/:apiKey",async(req,res)=>{
  var decodedApiKey=await decodeApiKey(req.params.apiKey)
  if(decodedApiKey.type){
    var{user}=decodedApiKey.username
  }
  else{
    res.json({type:"error",msg:"Invalid ApiKey"})
  }
})

app.post("/api/getPosts/:apiKey",(req,res)=>{
  var {username}=req.body
  var decodedApiKey=decodeApiKey(req.params.apiKey)
  if(decodedApiKey.type){
    var{user}=decodedApiKey.username
    if(userExistence(user).exists){
      if(username){
        if(userExistence(username).exists){
          User.find({username:username},(err,data)=>{
            data=data.filter(o=>o.username==username)[0]
            res.json({type:"success",msg:"Posts retrieved successfully",data:data.friends})
          })
        }
        else{
          res.json({type:"error",msg:`Invalid usernname`})
        }
      }
      else{
        User.find({username:user},(err,data)=>{
          data=data.filter(o=>o.username==username)[0]
          res.json({type:"success",msg:"Posts retrieved successfully",data:data.friends})
        })
      }
    }
    else{
      res.json({type:"error",msg:"Invalid username"})
    }
  }
  else{
    res.json({type:"error",msg:"Invalid ApiKey"})
  }
  
})

app.post("/api/getProfile/:apiKey",async (req,res)=>{
  var {username}=req.body
  var decodedApiKey=await (decodeApiKey(req.params.apiKey))
  if(decodedApiKey.type){
    var user=decodedApiKey.username
    if((await userExistence(user)).exists==true){
      if(username){
        if((await userExistence(username)).exists==true){
          User.findOne({username:username},async(err,data)=>{
            data.password=""
            data.apiKey=""
            data.messages=""
            res.json({type:"success",msg:"Profile retrieved successfully",data:data})
          })
        }
        else{
          res.json({type:"error",msg:`Invalid usernname`})
        }
      }
      else{
        User.findOne({apiKey:req.params.apiKey},async(err,data)=>{
          res.json({type:"success",msg:"Profile retrieved successfully",data:data})
        })
      }
    }
    else{
      res.json({type:"error",msg:"Invalid username"})
    }
  }
  else{
    res.json({type:"error",msg:"Invalid ApiKey"})
  }
})

app.post("/api/updateProfile/:apiKey",(req,res)=>{
  var updProfile=req.body
  var decodedApiKey=await (decodeApiKey(req.params.apiKey))
  if(decodedApiKey.type){
    var profile=await (User.findOne({apiKey:req.params.apiKey}))
    Object.keys(updProfile).forEach(o=>{
      if(profile[o]!==undefined){
        profile[o]=updProfile[o]
      }
    })
    try{
      profile.save()
      res.json({type:"success",msg:"Profile updated successfully"})
    }
    catch(err){
      console.log(err)
      res.json({type:"error",msg:"Error encountered while updating user profile"})
    }
  }
  else{
    res.json({type:"error",msg:"Invalid ApiKey"})
  }
})

server.listen(process.env.PORT||PORT,(err)=>{
    console.log("ore said synchlayer running on "+process.env.PORT)
}) 
notificate=(user,type,msg,postId,userId)=>{
  var newNotification={
    type:type,
    msg:msg,
  }
  postId?newNotification.postId=postId:newNotification.userId=userId
  User.find({username:user},(err,data)=>{
    data.notifications.push(newNotification)
    data.save()
  })
}
hashPassword=(u,p)=>{
 
  var mykey=crypt.createCipher('aes-128-cbc',u)
  var mystr=mykey.update(p,'utf-8','hex')
  mystr+=mykey.final('hex')
  return mystr
}
generateApiKey=(u)=>{
  console.log(u)
  var mykey=crypt.createCipher('aes-128-cbc',"sayanacahala1ya2ra")
  var mystr=mykey.update(u,'utf-8','hex')
  mystr+=mykey.final('hex')
  return mystr
}
findUser=async (u)=>{
  var find= await User.findOne({username:u})
  var findResult=await find
  return findResult
}
userExistence=async(u)=>{
  var find=await findUser(u)
  if(find==null){
    return {exists:false}
  }
  else if(find.username ==u){
    return {exists:true}
  }
  else{
    return {exists:"error"}
  }
}
decodeApiKey=async (api)=>{
  console.log(api)
  var mykey=crypt.createDecipher('aes-128-cbc',"sayanacahala1ya2ra")
  try {
    var mystr=mykey.update(api,'hex','utf8')
    try{
      mystr+=mykey.final('utf-8')
      var find=await(User.findOne({apiKey:api}))
      if(find!=null&&find.username==mystr) return {type:true,username:mystr}
      else return {type:false,msg:"User doesnt match key"}
    }
    catch(error){
     //console.error(error)
      return {type:false}
    }
  } catch (error) {
    return {type:false}
  }
  
}
