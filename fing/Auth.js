const {DBController}=require("./DBController");
const crypt=require("crypto");
const Auth={
    decode:async (apiKey)=>{
        /* var mykey=crypt.createDecipher('aes-128-cbc',"sayanacahala1ya2ra")
        try {
            var mystr=mykey.update(apiKey,'hex','utf8')
            try{
                mystr+=mykey.final('utf-8')
                var query={
                    selector:{
                        "apiKey":apiKey
                    }
                }
                //console.log(apiKey)
                //console.log("mystr:  ",mystr)
                var find=await DBController.query(query);
                
                //console.log("find: ", find);
                if(find.type=="success") return {type:true,username:mystr}
                else return {type:false,msg:"User doesnt match key"}
            }
            catch(error){
                console.log(error)
                return {type:false}
            }
        } catch (error) {
            console.log(error)
            return {type:false}
        }*/
        var query={
            selector:{
                "apiKey":apiKey
            }
        }
        var find=await DBController.query(query,null,"synchlayer");
        if(find.type=="success") {
            if ( find.data.length == 1) return { type:true,username:find.data[0].username};
            else return {type:false,msg:"User does not exist"};
        }
        else return {type:false,msg:"User doesnt match key"}
    },
    generate:async (username)=>{
        var mykey=crypt.createCipher('aes-128-cbc',"sayanacahala1ya2ra")
        var mystr=mykey.update(username,'utf-8','hex')
        mystr+=mykey.final('hex')
        return mystr
    }
}

exports.Auth=Auth;