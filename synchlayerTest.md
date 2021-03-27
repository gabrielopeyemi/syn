var data={
        username:"dannyma",
        firstName:"Danny",
        lastName:"Oma",
        group:"artiste",
        password:"test",
        dateOfBirth:"",
        emailAddress:"dannyma@yahoo.com",
        newFriend:"tiny",
        friend:"tiny"
    }
var options={
    method:"POST",
    body:JSON.stringify(data),
    headers:{
        "Content-Type":"application/json",
        apiKey:"ttitont04446"
    }
}
var ldata={
        username:"tiny",
        firstName:"Tiny",
        lastName:"Elvis",
        group:"listener",
        password:"test",
        dateOfBirth:"",
        emailAddress:"tinyelvis@gmail.com",
        newFriend:"dannyma",
        friend:"dannyma"
    }
var lOptions={
    method:"post",
    body:JSON.stringify(ldata),
    headers:{
        "Content-Type":"application/json",
        apiKey:"ttitont04446"
    }
}

var apiKey="8679796cc33fdf1cfe94854a0c97a178"
var lapiKey="f033dbb551803ea0c5afd46587959f21"
var lServ="localhost:4678"
var rServ="http://"
//CREATE ACCOUNT
//fetch(`http://${lServ}/createAccount`,options).then(res=>res.json()).then(res=>console.log(res))

//LOGIN
//fetch(`http://${lServ}/login`,options).then(res=>res.json()).then(res=>console.log(res))

//CHECK USER
//fetch(`http://${lServ}/checkUsername`,options).then(res=>res.json()).then(res=>console.log(res))

//CHECK EMAIL
//fetch(`http://${lServ}/checkEmail`,options).then(res=>res.json()).then(res=>console.log(res))

//ADD FRIEND
//fetch(`http://${lServ}/addAsFriend/${apiKey}`,options).then(res=>res.json()).then(res=>console.log(res))

//DELETE FRIEND
//fetch(`http://${lServ}/deleteFriend/${apiKey}`,options).then(res=>res.json()).then(res=>console.log(res))

//RETRIEVE FRIEND
//fetch(`http://${lServ}/getFriends/${apiKey}`,options).then(res=>res.json()).then(res=>console.log(res))





//////////////////////////////////////////////////
/////////////////LISTENER////////////////////////
/////////////////////////////////////////////////


//CREATE ACCOUNT
//fetch(`http://${lServ}/createAccount`,lOptions).then(res=>res.json()).then(res=>console.log(res))

//CHECK USER
//fetch(`http://${lServ}/checkUsername`,lOptions).then(res=>res.json()).then(res=>console.log(res))

//CHECK EMAIL
//fetch(`http://${lServ}/checkEmail`,lOptions).then(res=>res.json()).then(res=>console.log(res))

//ADD FRIEND
fetch(`http://${lServ}/addAsFriend/${lapiKey}`,lOptions).then(res=>res.json()).then(res=>console.log(res))

//DELETE FRIEND
//fetch(`http://${lServ}/deleteFriend/${lapiKey}`,lOptions).then(res=>res.json()).then(res=>console.log(res))

//RETRIEVE FRIEND
//fetch(`http://${lServ}/getFriends/${lapiKey}`,lOptions).then(res=>res.json()).then(res=>console.log(res))

//LOGIN
//fetch(`http://${lServ}/login`,options).then(res=>res.json()).then(res=>console.log(res))


---------------------------------------------------------------------------------------------------

,
    
    {
        "title":"",
        "url":"/ /[apiKey]",
        "method":"POST",
        "requestParameters":[
            [
                
            ]
        ],
        "response":[
            {
                "type":"success",
                "msg":[

                ]
            },
            {
                "type":"error",
                "msg":
                    [
                        
                    ]
            }
        ]
    }