// MongoDB configuration utility
// This file provides a helper function to connect to MongoDB

// Note: This connection string would typically be stored in environment variables
// Rather than directly in the code. For development purposes only.
const MONGODB_URI = "mongodb+srv://joseporozocaicedo:<db_password>@joseporozo.r7bfl.mongodb.net/?retryWrites=true&w=majority&appName=joseporozo";

// This would be used in the backend to configure MongoDB connection
// For the React frontend, we'll interact with MongoDB through our API
const getMongoDBConnectionString = () => {
  // In production, replace <db_password> with the actual password from environment variables
  return MONGODB_URI.replace("<db_password>", process.env.MONGODB_PASSWORD || "");
};

export { getMongoDBConnectionString };
