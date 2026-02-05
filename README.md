# Express MongoDB Authentication Backend

A robust authentication backend built with Express.js and MongoDB for React Native applications.

## Features

- **User Authentication**: Register, login, logout functionality
- **JWT Tokens**: Access and refresh token implementation
- **Password Security**: Bcrypt hashing with salt rounds
- **Input Validation**: Express-validator for request validation
- **Error Handling**: Centralized error handling with custom error classes
- **Security**: Helmet, CORS, rate limiting
- **Database**: MongoDB with Mongoose ODM
- **User Management**: Profile updates, password changes, account deletion

## Quick Start

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (local installation or MongoDB Atlas)

### Installation

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Update the `.env` file with your configuration:
```env
MONGODB_URI=mongodb://localhost:27017/expo-auth-app
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key
PORT=3000
FRONTEND_URL=http://localhost:8081
```

5. Start the server:
```bash
# Development mode with auto-restart
npm run dev

# Production mode
npm start
```

## API Endpoints

### Authentication Routes (`/api/auth`)

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh-token` - Refresh access token
- `POST /api/auth/logout` - Logout (remove refresh token)
- `POST /api/auth/logout-all` - Logout from all devices

### User Routes (`/api/user`)

- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update user profile
- `PUT /api/user/change-password` - Change password
- `DELETE /api/user/account` - Delete/deactivate account

### Health Check

- `GET /api/health` - Server health status

## Request/Response Examples

### Register User
```bash
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

Response:
```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "_id": "...",
    "name": "John Doe",
    "email": "john@example.com",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

### Login User
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

### Get Profile (Protected Route)
```bash
GET /api/user/profile
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

## Database Schema

### User Model
```javascript
{
  name: String (required, 2-50 chars),
  email: String (required, unique, valid email),
  password: String (required, min 6 chars, hashed),
  phone: String (optional),
  location: String (optional),
  avatar: String (optional),
  isActive: Boolean (default: true),
  lastLogin: Date,
  refreshTokens: [{ token: String, createdAt: Date }],
  createdAt: Date,
  updatedAt: Date
}
```

## Security Features

- **Password Hashing**: Bcrypt with 12 salt rounds
- **JWT Tokens**: Separate access and refresh tokens
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **CORS**: Configured for frontend origin
- **Helmet**: Security headers
- **Input Validation**: Server-side validation for all inputs
- **Error Handling**: No sensitive data leaked in production

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/expo-auth-app` |
| `JWT_SECRET` | JWT access token secret | Required |
| `JWT_REFRESH_SECRET` | JWT refresh token secret | Required |
| `JWT_EXPIRE` | Access token expiration | `24h` |
| `JWT_REFRESH_EXPIRE` | Refresh token expiration | `7d` |
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment mode | `development` |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:8081` |

## Development

### Running in Development Mode
```bash
npm run dev
```

This uses nodemon for automatic server restarts on file changes.

### MongoDB Setup

#### Local MongoDB
1. Install MongoDB locally
2. Start MongoDB service
3. Use connection string: `mongodb://localhost:27017/expo-auth-app`

#### MongoDB Atlas (Cloud)
1. Create account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create cluster and database
3. Get connection string: `mongodb+srv://username:password@cluster.mongodb.net/expo-auth-app`

## Production Deployment

1. Set `NODE_ENV=production`
2. Use strong JWT secrets
3. Configure MongoDB Atlas or secure MongoDB instance
4. Set up proper CORS origins
5. Consider using PM2 for process management
6. Set up SSL/HTTPS
7. Configure proper logging

## Error Handling

The API returns consistent error responses:

```json
{
  "success": false,
  "message": "Error description"
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (authentication required)
- `404` - Not Found
- `500` - Internal Server Error

## Testing

You can test the API using tools like:
- Postman
- curl
- Thunder Client (VS Code extension)
- Insomnia

Example curl request:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"password123"}'
```