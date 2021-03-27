const express=require('express');
const app=express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var session=require('express-session');
var dbprocess=require("./lib/dbprocess");
const PORT=4678;
const {Response}=require("./fing/Response");
const {SocketControl,AuthSocketControl,socketUsers}=require("./fing/SocketControl");
const {User}=require("./fing/User");
const {Auth}=require("./fing/Auth");
const {Access}=require("./fing/Access");
const { on } = require('process');

console.log("We are in "+process.env.NODE_ENV+ " mode")

app.use(require('body-parser')());
app.use(express.static(__dirname+"/public"));
app.set('views',__dirname+"/views");
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
  if(process.env.NODE_ENV=="production"){
    res.json({type:"dunno",msg:"la-la la la-la la la "})
  }
  else if(process.env.NODE_ENV=="development"){
    var docs=dbprocess.getDocs()
    docs=docs.sort((a,b)=>a.title.charCodeAt(0)-b.title.charCodeAt(0))
    console.log(docs)
    res.render("dev-api",{docs:docs})
  }
})

app.get('/synct', async (req, res,next)=> {
  res.sendFile(__dirname + '/public/sync.html');
});

/////SOCKET.IO///////////////////////////////////////////////////////

//io.use(AuthSocketControl);
//io.on('connection',SocketControl);
var onlineUsers={}
io.use(async(socket, next) => {
  let apiKey = socket.handshake.query.apiKey;
  console.log(`apiKey:   ${apiKey} trying to connect`)
  if(apiKey!==undefined){
    try {
      var decodedApiKey=await Auth.decode(apiKey)
      if (decodedApiKey.type) {
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

io.on('connection',async (client)=> {
  //console.log(client.handshake.headers)
  for (var i in onlineUsers){
    console.log(i);
    
    client.emit("user.online",{
      username:onlineUsers[i].username,
      id:onlineUsers[i].id
    })
  }
  
  client.on("join",async(data)=>{
    var decodedApiKey=await Auth.decode(data.apiKey);
    client.username=decodedApiKey.username;
    onlineUsers[client.id] = client;
    console.log(`${client.id} joining ...`);
    io.emit("user.online",{
      username:decodedApiKey.username,
      id:client.id
    })
    
  })

  client.on("attach", async (x)=>{
    console.log(x);
  })

  client.on('sync', (data)=> {
      console.log(data);
  });

  client.on('notify',async(data)=>{

  })
  client.on("play-music",async(data)=>{
    var apiKey=client.handshake.headers.apiKey
    var decodedApiKey=await Auth.decode(apiKey)
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
    console.log|(onlineUsers)
    var {message,apiKey,to,toId}=data;
    if (message&&apiKey&&to&&toId){
      var decodedApiKey=await Auth.decode(apiKey)
      var req=await User.messages.sendTo(decodedApiKey.username,data);
      if (req.type == "success"){
        console.log(`SENDING MESSAGE FROM ${decodedApiKey.username} to ${to}`);
        client.to(toId).emit("incomingMessage",{id:client.id,message:message,with:decodedApiKey.username,from:decodedApiKey.username,time:new Date()});
        client.emit('incomingMessage',{message:message,with:to,from:"You",time:new Date()})
      }
      else {
          client.emit("error","e",req);
      }  
    }
    else{
      client.emit("error",{type:"error",msg:"Required fields missing"})
    }
  });

  client.on("disconnect",()=>{
    console.log(`disconnecting ${client.id}`)
    if(Object.keys(onlineUsers).includes(client.id)){
      io.emit("user.offline",
        {
          username:onlineUsers[client.id].username,
          id:client.id
        }  
      )
      delete onlineUsers[client.id];
    }    
  })
  client.on("dsc",()=>{
    console.log("calling disonnect  ",client.id);
    if(Object.keys(onlineUsers).includes(client.id)){
      io.emit("user.offline",
        {
          username:onlineUsers[client.id].username,
          id:client.id
        }  
      )
      delete onlineUsers[client.id];
    }    
  })

});
///////////////////////////////////////////////////////////////////////

//ACCESS
//login
app.post("/api/login",async(req,res)=>{
  var {username,password}=req.body;
  res.json(await Access.login(username,password));
})

app.post("/api/createAccount",async(req,res)=>{
  res.json(await User.createAccount(req.body));
})

app.post("/api/checkUsername",async (req,res)=>{
  var {username}=req.body;
  res.json(await User.exists(username))
})

app.post("/api/checkEmail",async (req,res)=>{
  var {emailAddress}=req.body
  res.json(await User.exists(null,emailAddress));
})

//SOCIAL RELATION
app.post("/api/addAsFriend/:apiKey",async (req,res)=>{
  var {newFriend}=req.body, apiKey=req.params.apiKey, decodedApiKey=await Auth.decode(apiKey);
  if(decodedApiKey.type){
    res.json(await User.friend.add(apiKey,newFriend));
  }
  else {
    res.json(Response.error("Apikey is invalid"))
  }
})

app.post("/api/deleteFriend/:apiKey",async (req,res)=>{
  var {friend}=req.body, apiKey=req.params.apiKey, decodedApiKey=await Auth.decode(apiKey);
  if(decodedApiKey.type){
    res.json(await User.friend.delete(apiKey,friend));
  }
  else {
    res.json(Response.error("Apikey is invalid"))
  }
})

app.post("/api/getFriends/:apiKey",async (req,res)=>{
  var {username}=req.body//if a username is specified,its friend data woould be retrieved instead of the user
  var apiKey=req.params.apiKey;
  var decodedApiKey=await Auth.decode(apiKey);
  if(decodedApiKey.type){
    res.json(await User.friend.get(apiKey,username));
  }
  else {
    res.json(Response.error("Apikey is invalid"))
  }
})

app.post("/api/getMessages/:apiKey",async(req,res)=>{
  var {username}=req.body//if a username is specified,its friend data woould be retrieved instead of the user
  var apiKey=req.params.apiKey;
  var decodedApiKey=await Auth.decode(apiKey);
  if(decodedApiKey.type){
    res.json(await User.messages.get(decodedApiKey.username));
  }
  else {
    res.json(Response.error("Apikey is invalid"))
  }
})

app.post("/api/getMessagesTo/:apiKey",async(req,res)=>{
  var {username}=req.body;
  var apiKey=req.params.apiKey;
  var decodedApiKey=await Auth.decode(apiKey);
  if(decodedApiKey.type){
    res.json(await User.messages.to(decodedApiKey.username,username));
  }
  else {
    res.json(Response.error("Apikey is invalid"))
  }
})

app.post("/api/getMessagesFrom/:apiKey",async(req,res)=>{
  var {username}=req.body//if a username is specified,its friend data woould be retrieved instead of the user
  var apiKey=req.params.apiKey;
  var decodedApiKey=await Auth.decode(apiKey);
  if(decodedApiKey.type){
    res.json(await User.messages.from(decodedApiKey.username,username));
  }
  else {
    res.json(Response.error("Apikey is invalid"))
  }
})

app.post("/api/getMessagesFor/:apiKey",async(req,res)=>{
  var {username}=req.body;
  var apiKey=req.params.apiKey;
  console.log(`=> GETTING MESSAGES FOR ${username} BY ${apiKey}`)
  var decodedApiKey=await Auth.decode(apiKey);
  if(decodedApiKey.type){
    res.json(await User.messages.for(decodedApiKey.username,username));
  }
  else {
    res.json(Response.error("Apikey is invalid"))
  }
})

//AUTHENTICATE
app.post("/api/authenticate/:apiKey",async (req,res)=>{
  var apiKey = req.params.apiKey;
  res.json(await Auth.decode(apiKey));
});

//PERSONIFY
app.post("/api/createPost/:apiKey",async(req,res)=>{
  var apiKey=req.params.apiKey;
  var decodedApiKey=await Auth.decode(apiKey);
  if(decodedApiKey.type){
    res.json(await User.posts.create(apiKey,req.body));
  }
  else {
    res.json(Response.error("Apikey is invalid"))
  }
})

app.post("/api/getPosts/:apiKey",async (req,res)=>{
  var {username}=req.body//if a username is specified,its friend data woould be retrieved instead of the user
  var apiKey=req.params.apiKey;
  var decodedApiKey=await Auth.decode(apiKey);
  if(decodedApiKey.type){
    res.json(await User.posts.get(decodedApiKey.username,username));
  }
  else {
    res.json(Response.error("Apikey is invalid"))
  }
})

app.post("/api/getProfile/:apiKey",async (req,res)=>{
  var {username}=req.body//if a username is specified,its friend data woould be retrieved instead of the user
  var apiKey=req.params.apiKey;
  var decodedApiKey=await Auth.decode(apiKey);
  if(decodedApiKey.type){
    res.json(await User.profile.get(apiKey,username));
  }
  else {
    res.json(Response.error("Apikey is invalid"))
  }
})

app.post("/api/updateProfile/:apiKey",(req,res)=>{
  var updProfile=req.body
  var decodedApiKey=await (Auth.decode(req.params.apiKey))
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
    console.log("synchlayer running")
});