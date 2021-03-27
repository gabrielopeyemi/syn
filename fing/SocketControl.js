//var onlineUsers={};
const {Response}=require("./Response");
const {Auth} = require("./Auth");
const {User} = require("./User");
const Client = require("socket.io/lib/client");
var socketIO={
    io:null
};
const SocketControl=async (socket)=>{
    var apiKey = socket.handshake.query.apiKey;
    var dApiKey=await Auth.decode(apiKey);
    var online = socketUsers.isOnline(dApiKey.username);
    if (!online){
        console.log(`${apiKey} now online`)
        var newOnlineUser={username:dApiKey.username,socketId:socket.id};
        await socketUsers.add(newOnlineUser);
        socket.broadcast.emit("updateOnlineUsers",{user:newOnlineUser,all:socketUsers.users})
    }
    else {
        console.log("already online");
    }
    const sendMessage = async (data)=>{
        console.log("SOCKET REQUSETING: ",socket.id);
        var {message,apiKey,to}=data
        var decodedApiKey=await Auth.decode(apiKey);
        var req=await User.messages.sendTo(decodedApiKey.username,data);
        if (req.type == "success"){
            console.log(`SENDING MESSAGE FROM ${decodedApiKey.username} to ${to}`);
            var receiverOnline = socketUsers.isOnline(to);
            console.log(receiverOnline)
            if (!!receiverOnline){
                var toId = receiverOnline.socketId;
                console.log(toId);
                socketIO.io.to(toId).emit("test","recieving message");
                socketIO.io.to(socket.id).emit("test", "message sending initiated");
            }
            else socket.emit("test","sent - user not online");
        }
        else {
            socket.emit("error","e",req);
        }  
    }
    const sync = (data)=>{

    }
    const playMusic = (data)=>{

    }
    const disconnect = async (data)=>{
        var dApiKey = await Auth.decode(apiKey);
        socketUsers.remove(dApiKey.username)
    }
    socket.on("sendMessage",sendMessage);
    socket.on("sync",sync);
    socket.on("playMusic",playMusic);
    socket.on("disconnect",disconnect)
}
var onUsers={};
const socketUsers={
    users:()=>{return onUsers},
    add:async (user)=>{
        if (!Object.keys(socketUsers.users).includes(user.username)){
            socketUsers.users[user.username]=user;
            return Response.success("Added")
        }
        else return false;
    },
    remove: async(username)=>{
        if (!Object.keys(socketUsers.users).includes(username)){
            delete socketUsers.users[username];
            console.log("disconnecting/\/\--  ",username);
            return socketUsers.users;
        }
        else return false;
    },
    get:async (x)=>{
        console.log(socketUsers.users);
        console.log(x);
        if (Object.keys(socketUsers.users).includes(x)){
            return socketUsers.users[x];
        }
        else return false;
    },
    isOnline:(x)=>{
        if (Object.keys(socketUsers.users).includes(x)){
            return socketUsers.users[x];
        }
        else return false;
    }
}

const AuthSocketControl=async (socket,next)=>{
    let apiKey = socket.handshake.query.apiKey;
    console.log(`apiKey:   ${apiKey} trying to connect`)
    if(apiKey!==undefined){
        try {
            var decodedApiKey=await Auth.decode(apiKey);
            if (decodedApiKey.type) {
                return next();
            }
            else return next(new Error('authentication error'));
        } catch (error) {
            console.error(error)
            return next(new Error('authentication error'));
        }
    }
    else{
        return next(new Error('authentication error'));
    }
};

exports.socketUsers=socketUsers;
exports.AuthSocketControl=AuthSocketControl;
exports.SocketControl=SocketControl;