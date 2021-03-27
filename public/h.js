(H={
    id:(x)=>{
        document.getElementById(x)!=null?document.getElementById(x):console.log(`element with id: ${x} does not exist`)
        return document.getElementById(x)
     },
     class:(x)=>{
         document.getElementsByClassName(x)!=null?document.getElementsByClassName(x):console.log(`elements with class: ${x} does not exist`)
         return document.getElementsByClassName(x)
     },
    progress:{
        set:(x)=>{
            typeof x=="number"?document.getElementsByClassName("h-progress-hr-bar")[0].style.width=`${x}%`:console.log("Invalid value")
        }
    },
    pop:(type,msg,time)=>{
        var bgColor
        type=="error"?bgColor="red":bgColor="gold"
        H.class("h-pop")[0].classList.add(`h-bg-${bgColor}`)
        H.class("h-pop")[0].classList.replace("h-hide","h-show")
        H.class("h-pop")[0].innerText=msg
        setTimeout(() => {
            H.class("h-pop")[0].innerText=""
            H.class("h-pop")[0].classList.replace("h-show","h-hide")
        }, time);
    },
    hide:(x)=>{
        
    }
})