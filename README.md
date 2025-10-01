# Audit Tracker Backend

Audit Tracker Backend is a Node.js/Express REST API for managing audit sessions, findings, corrective actions, approvals, reports, and related entities. It supports role-based access, file uploads (Cloudinary), and robust data modeling with MongoDB.

---

## Features

- **Audit Management**: Create, update, and track audit sessions.
- **Findings & Observations**: Record problems, observations, and corrective actions.
- **Reporting**: Generate and manage audit reports with metrics.
- **Approval Workflow**: Request and track approvals for key actions.
- **Role-Based Access**: Secure endpoints for different user roles.
- **File Uploads**: Store and manage proof documents/images via Cloudinary.
- **Extensible Data Models**: Companies, Sites, Teams, Templates, Rules, and more.

---

## Technology Stack

- **Node.js** & **Express**
- **MongoDB** & **Mongoose**
- **JWT Authentication**
- **Cloudinary** (file uploads)
- **Multer** (upload middleware)

---

## Getting Started

### Prerequisites

- Node.js (v16+)
- MongoDB instance
- Cloudinary account (for file uploads)

### Installation

1. **Clone the repository**
   ```sh
   git clone https://github.com/your-org/audit-tracker-backend.git
   cd audit-tracker-backend
   ```

2. **Install dependencies**
   ```sh
   npm install
   ```

3. **Configure environment variables**

   Copy `.env.example` to `.env` and fill in your values:
   ```
   PORT=5000
   MONGODB_URI=your_mongodb_uri
   JWT_SECRET=your_jwt_secret
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```

4. **Start the server**
   ```sh
   npm start
   ```

   The API will run at `http://localhost:5000/`

---

## API Usage

- All endpoints are prefixed with `/api/`
- Use JWT tokens for authentication (see `/api/users/login`)
- See [src/routes/index.js](src/routes/index.js) for all available routes

---

## File Structure

```
audit-backend/
├── .env
├── package.json
├── README.md
├── src/
│   ├── server.js                # Entry point
│   ├── config/                  # Configuration files
│   ├── controllers/             # Route handlers (business logic)
│   ├── middleware/              # Auth, upload, role checks
│   ├── models/                  # Mongoose schemas
│   ├── routes/                  # Express route definitions
│   └── utils/                   # Helper functions
```

### Key Directories

- **controllers/**: Business logic for each entity (e.g., auditSessionController.js, reportController.js)
- **models/**: Mongoose schemas (e.g., AuditSession.js, Problem.js, User.js)
- **routes/**: API route definitions (e.g., auditSessionRoutes.js, reportRoutes.js)
- **middleware/**: Authentication, authorization, file upload logic
- **config/**: Database and Cloudinary configuration
- **utils/**: Helper functions (e.g., createdBy, updatedBy)

---

## Example API Endpoints

- `POST /api/users/register` — Register a new user (admin only)
- `POST /api/users/login` — Login and receive JWT token
- `GET /api/audit-sessions` — List all audit sessions
- `POST /api/problems` — Create a new problem/finding
- `POST /api/fix-actions` — Add a corrective action
- `POST /api/reports/generate` — Auto-generate a report from an audit session
- `POST /api/proofs` — Upload proof (file/image) for a problem

---

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

---

## License

This project is licensed under the MIT License.

---

## Contact

For questions or support, contact [rakibulislamemon@gmail.com](mailto:rakibulislamemon@gmail.com).
