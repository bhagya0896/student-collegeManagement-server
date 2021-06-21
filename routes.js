// import packages
require('dotenv').config();

var express = require('express');
var router = express.Router();

const bcrypt = require('bcrypt');
const auth = require('./auth.js');

var nodemailer = require('nodemailer')
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0;
const transporter=nodemailer.createTransport({
  service:'gmail',
  auth:{
      user:'bhagyalakshmi96.k@gmail.com',
      pass:process.env.PASSWORD
  }
});

const JWT = require("jsonwebtoken");
const JWT_SECRET= process.env.JWT_KEY;

//mongodb
const mongodb = require('mongodb')
const mongoClient = mongodb.MongoClient;
const objectId = mongodb.ObjectID

const stu_dbUrl = process.env.DB_URL_STUDENT ;
const clg_dbUrl = process.env.DB_URL_COLLEGE ;


// intial route
router.get('/',(req,res)=>{
    res.send("Welcome to My App")
  });



// student register
router.post ('/register',async(req,res)=>
{
  const client = await mongoClient.connect(stu_dbUrl);
  if(client)
  {
    try{
  
      let {firstname,lastname,email,password,cpassword}= req.body;
     
         //validation 
       
         if ( !firstname||!lastname||!email || !password || !cpassword )
           return res.send({ message: "Please enter all required fields." });
          
         if (password.length < 6)
           return res.send({
             message: " Password should be of maximum 6 characters.",
           });

           if(password != cpassword)
           return res.send({message : "Password & confirmpassword should match."})
  
           let db = client.db('studentdb');
           let existingStudent = await db.collection('students_credentials').findOne({"email" : email});
        
         if(existingStudent)
         {
             return res.send({
              message: "Student with this mail id already exists.Login to know the application status.",
               })
         }
     
         else{
     
             // Hash the password
     
                let salt = await bcrypt.genSalt();
                let hashedpassword  = await bcrypt.hash(req.body.password,salt);
                req.body.password=hashedpassword;

                let hashedcpassword  = await bcrypt.hash(req.body.cpassword,salt);
                req.body.cpassword=hashedcpassword;
     
                // Insert  new student data to db
     
                req.body.role=0;
                let newStudent = await db.collection('students_credentials').insertOne(req.body);
                 
                if(newStudent){ 
                console.log(" Registered successfully.")
                res.send({message:' Registered successfully!Kindly login.'});
              
                 }
         }
         client.close();
         }catch(error)
         {
             console.log(error);
             client.close();
         }
  }
  
});

// student additional details register
router.post ('/details-register',auth,async(req,res)=>
{
  const client = await mongoClient.connect(stu_dbUrl);
  if(client)
  {
    try{
           let {studentId} = req.body;
           let db = client.db('studentdb');
           
           let existingStudent = await db.collection('students_credentials').findOne({"_id" : objectId(studentId)});
        
        
         if(existingStudent)
         {
          await db.collection('students_details').insertOne(req.body);
          res.send({message:"Details added successfuly."})
         }
         client.close();
         }catch(error)
         {
             console.log(error);
             client.close();
         }
  }
  
});

//student login route
router.post('/login',   async (req, res) => {
  const client = await mongoClient.connect(stu_dbUrl);
  if(client)
  { try 
    {
     
    let { email, password } = req.body;
    // validate
    if (!email || !password)
      return res
       .send({ message: "Please enter all required fields." });

    let db = client.db('studentdb');
    let student = await db.collection('students_credentials').findOne({ "email": email });
    if (student) { 
      // password validation

      let Isvalid = await bcrypt.compare(password, student.password)
      let id  = student._id;
      let role = student.role;

      if (Isvalid) {
 // signin the token 

 let token = await JWT.sign({ email,role },JWT_SECRET );
 req.header("auth-token",token)
   console.log(`login :::: ${token}`)
 return res.send({message:'Login successful!!',token : token, id:id, role:role});

      }

      else {
        res.send({ message: 'Password doesnot match. !!' })
      }
    }
    else{
        res.send({message:"Email Does Not Exist, kindly register."});// 401 unauthorized
    }
      client.close();
    }catch (error) {
      res.send({ message: 'Login successful !!' })
      console.log(error);
      client.close();
    };}
 
  });

  
//student forgetpassword route
router.post('/forgetpassword',async(req,res)=>{
  const client = await mongoClient.connect(stu_dbUrl);

  if(client){
      const {email}=req.body 
      try{
          let db=client.db("studentdb");
          let data=await db.collection("students_credentials").findOne({email:req.body.email});
          if(data)
          {
          const resetToken =  await JWT.sign({email},JWT_SECRET,)
          let student_fname = data.firstname;
          let student_lname = data.lastname;
          let username = student_fname.concat(student_lname);
                      let info = await transporter.sendMail({
                          from: 'bhagyalakshmi96.k@gmail.com', // sender address
                          to: req.body.email, // list of receivers
                          subject: "EduCo ::: Reset your password", // Subject line
                          html: 
                          `<h3> Hi ${username}, </h3>
                          <p>We are sending you this email because you requested a password reset.</p>
                          <p>Click on the link to create a new password : <a target="_" href="http://localhost:3000/reset-password/${ resetToken}">http://localhost:3000/reset-password </a></p>
                          
                          <p> If you didn't request a password reset, you can ignore this email.Your password would not be changed.</p>
                          <p><b> Regards <br> EduCo team</b></p>`
                        })
                      if(resetToken)
                      {
                         res.send({message:"An email is sent, check your inbox for reseting your password.",resetToken});
                      }
          }else{
              res.send({message:"Email does not exist, kindly register."});
          }

      }
      catch(error)
      {
          console.log(error);
          client.close();
      }
  }else{

      res.sendStatus(500);
  }
})


// student resetpassword route
router.post('/resetpassword',async(req,res)=>{
  const client = await mongoClient.connect(stu_dbUrl);
  if(client){ 
      try{
        let token = req.query.token;
        console.log(token);
        console.log(req.body.password,req.body.cpassword);
        if(req.body.password && req.body.cpassword)
        {
          if(token)
          {
              const db = client.db("studentdb");
          let salt=await bcrypt.genSalt(10);//key to encrypt password
                      console.log(salt);
          let hash=await bcrypt.hash(req.body.password,salt);
                      req.body.password=hash;
          JWT.verify(token,
              JWT_SECRET,
              async(err,decode)=>{
                  if(decode!==undefined){
                      document=await db.collection("students_credentials").findOneAndUpdate({email:decode.email},{$set:{password:req.body.password}}); 
                      if(document)
                      {
                          res.send({message:"Password updated, login now."});
                        //  res.redirect(baseurl+"/password");
                      
                      }          
                  }else{
                      res.send({message:"Error occured in reseting password."});
                  }
              });
          
          client.close();
        }else{
          res.send({message:"No token for Authorization"});
        }
       
        } else{
          res.send({message:"Enter password & confirm password to proceed."});
        }
          
      }
      catch(error)
      {
          console.log(error);
          client.close();
      }
  }else{

      res.sendStatus(500);
  }

})

//Adding colleges- admin route
router.post ('/add-college',auth,async(req,res)=>
{
  const client = await mongoClient.connect(clg_dbUrl);
  if(client)
  {
    try{
  
      let {logo,courseName,desp,clgName,modeOfStudy,location,courseDuration,rating}= req.body;
      console.log(req.body)
      req.body.applied = false;
      let db = client.db('collegedb');
           let existingCollegeData = await db.collection('college_details').findOne({"clgName" : clgName});
           req.body.collegeId = Math.random().toString(36).slice(2);
         if(existingCollegeData)
         {
             return res.send({
              message: "Details already exists.",
               })
         }
     
         else{
                // Insert  new college data to db
     
                let newCollegeDetail = await db.collection('college_details').insertOne(req.body);
                 
                if(newCollegeDetail){ 
         
               res.send({message:'College details added successfully.'});
              
                 }
         }
         client.close();
         }catch(error)
         {
             console.log(error);
             client.close();
         }
  }
  
});


 // getting colleges  route

router.get('/collegelist' , async (req,res)=>
{
   const client = await mongoClient.connect(clg_dbUrl)
   if(client){
       try{
        const db = client.db('collegedb');
        const clgData=  await db.collection('college_details').find().toArray();
        if(clgData)
        {
          res.send(clgData);
       
        }
 
        client.close();
       
       }catch(error)
       {
           console.log(error)
           res.send({message : "Error occured while fetching college details."});
           client.close();
       }
   }
 
});


// Adding colleges to student route
router.put('/assign-college/:studentId' ,auth,async (req,res)=>
{
   const client = await mongoClient.connect(stu_dbUrl)
   const client1 = await mongoClient.connect(clg_dbUrl)
   if(client && client1){
       try{
        const {studentId} = req.params;
        const {_id} = req.body ;
        const {college} = req.body ;
        const db = client.db('studentdb');
        let addCollege = await db.collection('students_details').updateOne({"studentId" : studentId},{$push:{"AppliedColleges" : {
          'CollegeId':objectId(_id)
        }}});
        const db1 = client1.db('collegedb');
        let College = await db1.collection('college_details').updateOne({"_id" :objectId(_id)},{$set:{"applied":college.applied},$push:{"StudentsApplied" : {
          'StudentId':objectId(studentId)
        }}});
        if(addCollege && College)
        {
          
          res.send({message:" Applied Sucessfully!!"});
         
        }
        
        client.close();
        client1.close();
       
       }
       catch(error)
       {
           console.log(error)
           res.send({message : "error "});
           client.close();
           client1.close();
       }
   }
  
   
});

// sending email to student
router.post('/final-college-list/:studentId' , async (req,res)=>
{
   const client = await mongoClient.connect(stu_dbUrl)
   if(client){
       try{
         let {colleges} = req.body;
         let {studentId} = req.params;
         console.log(studentId)
        const db = client.db('studentdb');
        let studentFound = await db.collection('students_details').findOne({"studentId" : studentId});
        console.log(studentFound)  
          if(studentFound)
          {
                  let username = studentFound.firstname;
                  console.log(username)
                  let email = studentFound.email;
                 console.log(email)
                   //sending confirmation mail
                  var mailOptions = {
                    from: 'bhagyalakshmi96.k@gmail.com', // sender address
                    to: email, // list of receivers
                    subject: "Welcome to EduCo - Fly2Masters  :::: Hii,there !", // Subject line
                    html:

                    `<h3> Hello ${username} </h3>
                    <h5> Here are the details of colleges you applied. Check it out.<h5>
                    <p> Your Application for ${colleges.length} colleges is successfull.</p>
                    <p> Stay updated with our app for more details and further process.</p>
                   
                    <p>Your Application Team</p>`
                     
                  };
                  transporter.sendMail(mailOptions, function(error, info){
                    if (error) {
                      console.log(error);
                    } else {
                      console.log('Email sent: ' + info.response);}
                      res.send({message : "Check your inbox!!"});
                  });
                 }  
       
        client.close();
       
       }catch(error)
       {
           console.log(error)
           res.send({message : "Error occured while sending email."});
           client.close();
       }
   }
 
});


// searching colleges by coursename route
router.get('/colleges/:courseName' ,auth,async (req,res)=>
{
   const client = await mongoClient.connect(clg_dbUrl)
   if(client){
       try{
        const{courseName}=req.params;
        console.log(courseName)
        const db = client.db('collegedb');
        let Colleges = await db.collection('college_details').find({"courseName":courseName}).toArray();
        if(Colleges)
        {
          res.send(Colleges);
         
        }
        else{
          res.send({message : "No colleges available!! "});
        }
        
        client.close();
       
       }catch(error)
       {
           console.log(error)
           res.send({message : "error occured while fetching colleges list"});
           client.close();
       }
   }
 
});


// Adding colleges to student route
router.get('/college-list/:studentId' ,auth,async (req,res)=>
{
  const client = await mongoClient.connect(clg_dbUrl)
  if(client){
      try{
        let {studentId} = req.params;
       const db = client.db('collegedb');
       const clgData=  await db.collection('college_details').find({"StudentsApplied.StudentId":objectId(studentId)}).toArray();
       if(clgData)
       {
         res.send(clgData);
      
       }

       client.close();
      
      }catch(error)
      {
          console.log(error)
          res.send({message : "Error occured while fetching college details."});
          client.close();
      }
  }
   
});
// admin register
router.post ('/signup',async(req,res)=>
{
  const client = await mongoClient.connect(clg_dbUrl);
  if(client)
  {
    try{
  
      let {firstname,lastname,email,password,cpassword}= req.body;
     
         //validation 
       
         if ( !firstname||!lastname||!email || !password || !cpassword )
           return res.send({ message: "Please enter all required fields." });
          
         if (password.length < 6)
           return res.send({
             message: " Password should be of maximum 6 characters.",
           });

           if(password != cpassword)
           return res.send({message : "Password & confirmpassword should match."})
  
           let db = client.db('collegedb');
           let existingAdmin= await db.collection('admin_credentials').findOne({"email" : email});
        
         if(existingAdmin)
         {
             return res.send({
              message: "Email already exists.",
               })
         }
     
         else{
     
             // Hash the password
     
                let salt = await bcrypt.genSalt();
                let hashedpassword  = await bcrypt.hash(req.body.password,salt);
                req.body.password=hashedpassword;

                let hashedcpassword  = await bcrypt.hash(req.body.cpassword,salt);
                req.body.cpassword=hashedcpassword;
     
                req.body.role=1;
                // Insert  new admin data to db
     
                let newAdmin = await db.collection('admin_credentials').insertOne(req.body);
                 
                if(newAdmin){ 
               console.log(" Registered successfully.")
               res.send({message:' Registered successfully!Kindly login.'});
              
                 }
         }
         client.close();
         }catch(error)
         {
             console.log(error);
             client.close();
         }
  }
  
});

//admin-login route
router.post('/signin',   async (req, res) => {
  const client = await mongoClient.connect(clg_dbUrl);
  if(client)
  { try 
    {
     
    let { email, password } = req.body;
    console.log(email,password)
    // validate
    if (!email || !password)
      return res
       .send({ message: "Please enter all required fields." });

    let db = client.db('collegedb');
    let admin = await db.collection('admin_credentials').findOne({ "email": email });
    console.log(admin)
    if (admin) { 
      // password validation

      let Isvalid = await bcrypt.compare(password, admin.password)
      let id  = admin._id;
      let role = admin.role;

      if (Isvalid) {
 // signin the token 

 let token = await JWT.sign({ email,role },JWT_SECRET );
   console.log(`login :::: ${token}`)
 return res.send({message:'Login successful!!',token : token,id:id,role:role});

      }

      else {
        res.send({ message: 'Password doesnot match.' })
      }
    }
    else{
        res.send({message:"Admin Does Not Exist"});// 401 unauthorized
    }
      client.close();
    }catch (error) {
      res.send({ message: 'Login unsuccessful.'})
      console.log(error);
      client.close();
    };}
 
  });

  

module.exports = router;
