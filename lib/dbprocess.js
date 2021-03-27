const fs=require("fs")
const path=require("path")

const readFile=(f,e)=>{
    var rf=fs.readFileSync(path.join(__dirname,`${f}.${e}`),"utf-8")
    if(e=="json") rf=JSON.parse(rf)
    else return rf
    //console.log(rf)
    return rf
    
}
exports.getDocs=()=>{
    var a=readFile("endpoints","json")
    //console.log(a)
    return a
}