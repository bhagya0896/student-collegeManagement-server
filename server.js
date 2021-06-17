const express = require('express');
const app = express();

const cors = require('cors');

// Routes
const getRoute = require('./routes.js');
const studentregisterRoute = require('./routes.js');
const studentDetailsregisterRoute = require('./routes.js');
const studentloginRoute = require('./routes.js');
const forgetPasswordRoute = require('./routes.js');
const resetPasswordRoute = require('./routes.js');
const addCollegeDetailsRoute = require('./routes.js');
const getcollegeDetailsRoute = require('./routes.js');
const getcollegesRoute = require('./routes.js');
const adminRegisterRoute = require('./routes.js');
const adminloginRoute = require('./routes.js');


const port = process.env.PORT|| 5000

//Middleware
app.use(express.json());
app.use(cors());

app.use('/', getRoute);
app.use('/student', studentregisterRoute);
app.use('/student', studentDetailsregisterRoute);
app.use('/student', studentloginRoute);
app.use('/user', forgetPasswordRoute);
app.use('/user', resetPasswordRoute);
app.use('/admin', addCollegeDetailsRoute);
app.use('/admin', getcollegeDetailsRoute);
app.use('/', getcollegesRoute);
app.use('/admin', adminRegisterRoute);
app.use('/admin', adminloginRoute);





// setting up of port

    app.listen(port,()=>
    {
        console.log(`Connection is established and app started running on port : ${port}!!!`)
  
    })



