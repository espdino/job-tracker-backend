
# Job Tracker Backend


Backend API for the Job Tracker application.


Built with Node.js, Express, PostgreSQL, JWT authentication, and hosted PostgreSQL.


## Features


- REST API
- JWT authentication
- Password hashing with bcrypt
- PostgreSQL database
- Protected routes
- User-specific jobs
- Search, filtering & sorting


## Tech Stack


- Node.js
- Express
- PostgreSQL
- pg
- bcrypt
- jsonwebtoken
- dotenv
- cors


## Installation
```
npm install
```
### Run Locally

Development:

```
npm run dev
```
Production:
```
npm start
```
Server runs on:
```
http://localhost:3000
```


### Environment Variables

Create a .env file:
```
DATABASE_URL=your_database_url
JWT_SECRET=your_secret_key
```

## API Routes

### Authentication
| Method | Route| 
|----------|----------|
| POST   | /auth/register   | 
| POST   | /auth/login   |


### Jobs
| Method | Route      |
|--------|------------|
| GET    | /jobs      |
| POST   | /jobs      |
| PUT    | /jobs/:id  |
| DELETE | /jobs/:id  |

## Query Parameters
### Search
```
/jobs?search=frontend
```
### Filter by Status
```
/jobs?status=Interview
```
### Sort
```
/jobs?sort=date
```
### Example Authorization Header
#### Authorization: Bearer YOUR_TOKEN

## Deployment
Backend deployed with:


- Render

Database hosted with:


- Neon PostgreSQL

## Future Improvements


- Role-based auth
- Email verification
- Password reset
- Real-time updates
- File attachments
- Kanban board view

## Live API

https://job-tracker-backend-nxre.onrender.com
