const express = require('express');

const app = express();

app.get('/HealthCheck',(req,res)=>{
    res.send("Server is running successfully!");
})

app.listen(3000,()=>{
    console.log("Server is running on port 3000");
})