# PDF Management & Collaboration System

A web application designed to facilitate the seamless management and collaboration of PDFs. The system enables users to sign up, upload PDFs, share them with other users, and collaborate through comments.

## Features

- User signup and authentication
- PDF file upload and management
- Dashboard to view and manage uploaded PDFs
- PDF file sharing via unique links
- Commenting system for collaboration
- User-friendly interface with responsive design

## Tech Stack

### Backend
- Node.js
- Express.js
- MongoDB (with Mongoose)
- JWT for authentication
- Multer for file uploads

### Frontend
- React
- TypeScript
- Material UI
- React Router
- React PDF for document viewing
- Axios for API requests

## Getting Started

### Prerequisites

- Node.js (v16 or later)
- MongoDB (local or MongoDB Atlas)

### Installation

1. Clone the repository
```
git clone https://github.com/yourusername/pdf-collaboration-system.git
cd pdf-collaboration-system
```

2. Setup Backend
```
cd backend
npm install
```

3. Create a `.env` file in the backend folder with the following variables:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/pdf-collab
JWT_SECRET=your-super-secret-key-change-this-in-production
FRONTEND_URL=http://localhost:3000
```

4. Setup Frontend
```
cd ../frontend
npm install
```

### Running the Application

1. Start MongoDB (if using local MongoDB)
```
mongod
```

2. Start the Backend
```
cd backend
npm run dev
```

3. Start the Frontend
```
cd frontend
npm start
```

4. Access the application at `http://localhost:3000`

## Usage

1. Register a new user account or login
2. Upload PDFs from the dashboard
3. View your PDFs in the document viewer
4. Share PDFs using the share button and generated link
5. Comment on PDFs for collaboration

## Future Enhancements

- Password reset and account recovery
- Email notifications for shared PDFs
- Text formatting options for comments
- Reply to existing comments
- Document annotation features
- User roles and permissions

## License

This project is licensed under the MIT License - see the LICENSE file for details. 
