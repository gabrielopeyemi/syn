
var chatAs = H.id("chatAs");
var usersList = H.id("usersList");
const server = `http://localhost:4678`;
var user;
var userApi={
    "dannyma":"8679796cc33fdf1cfe94854a0c97a178",
    "toryelis":"46cfffba655c80f203857f35e5b2cbd1",
    "tiny":"f033dbb551803ea0c5afd46587959f21",
    "fake":"f033dbb5599803ea0c5afd46587959f21"
}

var options={
    method:"post",
    headers:{
        "Content-Type":"application/json",
    }
}
chatAs.addEventListener("keyup",(ev)=>{
    var targetValue = ev.target.value;
    if (Object.keys(userApi).includes(targetValue)){
        user ? user.reset() : "";
        usersList.innerHTML = "";
        let apiKey = userApi[targetValue];
        user =  new syncUser({apiKey:apiKey,username:targetValue});
        user.initiate();
        return user;
    }
})

const _addUser = ({username,id}=x) =>{
    console.log(id);
    if(username != user.username){
        (H.id(`${username}`) !== null) ? H.id(`${username}`).remove() : " "
        usersList.innerHTML+=`
                            <div id="${username}" onclick="user.chatPop('${username}','${id}')" class="h-text-lightblue h-card-sm h-button h-outline-multi h-text-bold">
                                &nbsp;
                                &nbsp;
                                <span id="${username}Status" style="display:inline-block;height:10px;width:10px" class=" h-circle h-bg-lightgreen"></span>
                                &nbsp;&nbsp;
                                <span style="display:inline-block;" class="">${username}</span>
                            </div>
        `
    }
    

}

const _rmUser = ({username,id}=x) =>{
    console.log("User offline ",username);
    (username !== user.username) ? (H.id(`${username}`) == null) ? "" : H.id(`${username}Status`).classList.replace("h-bg-lightgreen","h-bg-grey") : "";
}

const incomingMsg = (data) =>{
    console.log(`Incoming Message ${JSON.stringify(data)}`);
    var {to,message,time,id} = data;
    var toM = H.id(`${data.with}Messages`);
    if (toM){
        if (data.from == "You"){
            toM.innerHTML+=`
                            <p class="msgSelf h-text"> ${message} <i class="h-text h-text-black h-font-tiny-2">${new Date(time).toTimeString().substring(0,7)}</i>  </p>
                            <br>
                            `
        }
        else{
            toM.innerHTML+=`
                            <p class="msgOthers h-text"> ${message} <i class="h-text h-text-black h-font-tiny-2">${new Date(time).toTimeString().substring(0,7)}</i></p>
                            <br>
                            `
        }
        toM.scrollTo(0, toM.scrollHeight);
    }
    else user.chatPop(data.with,id);
}

class syncUser {
    constructor({apiKey,username}=x){
        this.username = username;
        this.apiKey= apiKey;
        this.socket = null;
    }
    initiate = async ()=>{
        var a = await this.connect();
        a ? (
            this.socket.emit("join",{apiKey:this.apiKey}),
            this.socket.on("user.online",_addUser),
            this.socket.on("user.offline",_rmUser),
            this.socket.on("incomingMessage",incomingMsg)
         ) : "";
    }
    binary = async ()=>{

        this.socket.binary(true).emit("attach",new ArrayBuffer(19));
    }
    connect=async ()=>{
        this.socket = io.connect(`${server}/?apiKey=${this.apiKey}`)
        return this.socket;
    }
    disconnect = async ()=>{
        (this.socket != null) ? (this.socket.emit("dsc"), this.socket = null) : console.log("not online.. please connect");
        return this.socket;
    }
    reset = async ()=>{
        console.log("Resetting.... ")
        this.disconnect();

    }
    chatPop= async (username,id) =>{
        var pop =`<div id="${username}chatPop" class="chatPop h-anim-rollin-left">
                    <div class="h-bg-blight h-card-1">
                        <p class="h-text-bold h-font-tiny-1 h-text-white ">${username}</p>
                    </div>
                    <div id="${username}Messages" class="h-bg-white msgBox h-card" >
                    
                    </div>
                    <div  class="h-bg-white h-row">
                            <input style="margin:2px" id="${username}MsgInput" class="h-col-8 h-input h-text h-outline-blight" type="text" placeholder="enter message ...">
                            <button class="h-button h-bg-pinkish h-text-white" onclick="user.sendMessage('${username}','${id}')">Send</button>
                    </div>
                </div>`
        var cpop = document.createElement("cpop");
        cpop.innerHTML=pop;
        document.body.append(cpop);
        options.body=JSON.stringify({username:username})
        var req=await fetch(`${server}/api/getMessagesFor/${this.apiKey}`,options);
        req=await req.json();
        if(req.type=="success"){
            if (req.data){
                if (req.data.messages.constructor.name == "Array"){
                    req.data.messages.forEach(msg => {
                        var m=H.id(`${username}Messages`);
                        if(msg.to){
                            m.innerHTML+=`
                                <p class="msgSelf h-text"> ${msg.message} <i class="h-text h-text-black h-font-tiny-2">${new Date(msg.time).toTimeString().substring(0,7)}</i>  </p>
                                <br>
                            `
                        }
                        else{
                            m.innerHTML+=`
                                <p class="msgOthers h-text"> ${msg.message} <i class="h-text h-text-black h-font-tiny-2">${new Date(msg.time).toTimeString().substring(0,7)}</i>  </p>
                                <br>
                            `
                        }
                        m.scrollTo(0, m.scrollHeight);
                    });
                }
                else console.log(req.data);
            }
        }
    }
    sendMessage = (username,id,message) =>{
        message ? message = message : message = H.id(`${username}MsgInput`).value;
        
        var msg={
            message:message,
            apiKey:this.apiKey,
            to:username,
            toId:id
        }
        console.log(msg)
        H.id(`${username}MsgInput`).value="";
        this.socket.emit("sendMessage",msg)
    }
}