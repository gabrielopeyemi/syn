const NodeCouchDb = require('node-couchdb');
const {Response}= require("./Response");

// node-couchdb instance with default options
const couch = new NodeCouchDb({
    auth: {
        user: 'admin',
        pass: 'admin'
    }
});

var dbName="synchlayer";

couch.listDatabases().then(dbs=>{
    if(dbs.includes("synchlayer")){
        console.log("DATABASE ALREADY EXISTS...")
    }
    else{
        console.log("CREATING SYNCHLAYER DATABASE....")
        couch.createDatabase(dbName);
        couch.createDatabase("posts");
        couch.createDatabase("messages");
    }
})
/*c*/
const DBController={
    insert:async (data,where)=>{
        try {
            dbName = "synchlayer";
            where ? dbName = where : dbName = "synchlayer"
            var req=couch.insert(dbName,data);
            req=await req;
            if (req.status==201){
                return Response.success("Inserted document successfully");
            }
            else return Response.error("Database error encountered",req.body);
        } catch (error) {
            console.log(error);
            return Response.error("Error encountered",req)
        }
    },
    process:(req)=>{
        if(req.data.docs){
            var res=req;
            req=req.data.docs;
            return Response.success(null,Object.keys(res).includes('data')?res.data.docs:res)
        }
        else return Response.error("Error encountered",req);
    },
    update:async (newUpdate)=>{
        try{
            var req=couch.update(dbName, newUpdate)
            req=await req;
            if(req.data.ok){
                return Response.success("Updated successfully");
            }
            else{
                console.error(req)
                return Response.error("An error was encountered",req.Error);
            }
        } catch (error) {
            console.log(error);
            return Response.error("Error encountered",req);
        }
    },
    query:async (query,par,dbName2,raw)=>{
        dbName2 ? dbName = dbName2 : dbName;
        par?par:par={};
        try {
            var req=couch.mango(dbName,query,par);
            req=await req;
            if (raw && raw == true){
                return req;
            }
            else return DBController.process(req);
        }
        catch(err){
            console.error(err);
            return {type:"error",msg:"Database controller error",error:err};
        }
    },
    posts:async ()=>{

    }
}



exports.DBController=DBController