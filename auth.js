  require('dotenv').config();
  const JWT = require("jsonwebtoken");
  const JWT_SECRET = process.env.JWT_KEY;


  //middleware function-authentication
  function auth (req,res,next)
  {
  
      const token = req.header('auth-token');
      console.log('token',token);
     
      if(token!==undefined)
      {
          console.log(token)
       const verified=   JWT.verify(token,
              JWT_SECRET);
              req.user = verified;
              req.body.email = verified.email;
              next();
      }else{
          res.send("No token")
      }  
  }

  module.exports = auth;