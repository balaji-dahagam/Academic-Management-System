const jwt = require("jsonwebtoken");
const JWT_SECRET = "classapp";

const fetchUser = (req, res, next) => {
  const token = req.header("authToken"); 
  console.log(token);
  if (!token) {
    return res.status(401).json({ error: "Unauthorized access. No token provided." });
  }

  try {
    const data = jwt.verify(token, JWT_SECRET);
    
    req.user = data.id;
    console.log(req.user);
    next();
  } catch (error) {
    console.log(error);
    res.status(401).json({ error: "Invalid or expired token." });
  }
};

module.exports = fetchUser;
