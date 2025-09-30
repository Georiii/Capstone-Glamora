# Glamora Admin Dashboard

A comprehensive administrative interface for the Glamora sustainable wardrobe management platform.

## Features

### 🔐 Authentication
- Secure admin login system
- JWT-based authentication
- Session management

### 📊 Dashboard Analytics
- Real-time metrics and KPIs
- Interactive charts and data visualization
- User engagement tracking
- Outfit generation statistics

### 👥 User Account Management
- View and manage user accounts
- User role management (Admin/User)
- Account activation/deactivation
- User search and filtering
- Detailed user profiles and statistics

### 🛡️ Content Moderation
- Monitor user-generated content
- Review and approve/reject marketplace listings
- Handle user reports and complaints
- Community guidelines management
- Automated and manual moderation tools

### 📈 Analytics & Reporting
- User registration trends
- Marketplace activity metrics
- Content moderation statistics
- Custom report generation
- Data export functionality

### 🏪 Marketplace Management
- Product category management
- Listing approval workflow
- Transaction monitoring
- Fraud prevention tools

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- MongoDB database
- Glamora backend server running

### Installation

1. **Clone the repository** (if not already done)
   ```bash
   git clone <repository-url>
   cd glamora/admin-side
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure the backend**
   - Ensure the Glamora backend server is running
   - Update API endpoints in `js/common.js` if needed
   - Configure database connection in backend

4. **Start the admin dashboard**
   ```bash
   # Option 1: Use startup scripts
   # Windows:
   start-admin.bat
   
   # Linux/macOS:
   ./start-admin.sh
   
   # Option 2: Manual start
   npx http-server . -p 8080
   # Then navigate to http://localhost:8080/login.html
   
   # Option 3: Direct page access
   npm run login      # Opens login page
   npm run analytics  # Opens analytics page
   npm run users      # Opens user management page
   npm run moderation # Opens content moderation page
   ```

### Default Login Credentials
- **Username:** `admin`
- **Password:** `admin123`

## File Structure

```
admin-side/
├── index.html                    # Redirects to login page
├── login.html                    # Login page
├── analytics.html                # Analytics dashboard
├── user-management.html          # User management page
├── content-moderation.html       # Content moderation page
├── css/
│   ├── common.css               # Shared styles
│   ├── login.css                # Login page styles
│   ├── dashboard.css            # Dashboard layout styles
│   ├── analytics.css            # Analytics page styles
│   ├── user-management.css      # User management styles
│   └── content-moderation.css   # Content moderation styles
├── js/
│   ├── common.js                # Shared functionality
│   ├── login.js                 # Login functionality
│   ├── analytics.js             # Analytics functionality
│   ├── user-management.js       # User management functionality
│   └── content-moderation.js    # Content moderation functionality
├── admin-api.js                 # Backend API routes
├── package.json                 # Package configuration
├── start-admin.bat              # Windows startup script
├── start-admin.sh               # Linux/macOS startup script
└── README.md                    # This file
```

## API Integration

The admin dashboard connects to the Glamora backend through RESTful APIs:

### Authentication
- `POST /api/admin/login` - Admin login
- `GET /api/admin/metrics` - Dashboard metrics

### User Management
- `GET /api/admin/users` - Get users list
- `GET /api/admin/users/:id` - Get user details
- `PUT /api/admin/users/:id` - Update user
- `DELETE /api/admin/users/:id` - Deactivate user

### Content Moderation
- `GET /api/admin/reports` - Get reports
- `PUT /api/admin/reports/:id` - Update report status
- `GET /api/admin/marketplace/pending` - Get pending items
- `PUT /api/admin/marketplace/:id/approve` - Approve item
- `PUT /api/admin/marketplace/:id/reject` - Reject item

### Analytics
- `GET /api/admin/analytics` - Get analytics data

## Features in Detail

### User Account Management
- **User List:** View all users with search and filter capabilities
- **User Details:** Comprehensive user profiles with statistics
- **Role Management:** Assign admin or user roles
- **Account Status:** Activate or deactivate user accounts
- **User Statistics:** View user activity, wardrobe items, and marketplace listings

### Content Moderation
- **Pending Posts:** Review and approve/reject marketplace listings
- **Reports Management:** Handle user reports and complaints
- **Community Guidelines:** Manage and update platform rules
- **Moderation Actions:** Take appropriate actions on reported content

### Analytics Dashboard
- **User Metrics:** Registration trends, active users, engagement
- **Content Metrics:** Marketplace activity, outfit generation
- **Moderation Metrics:** Reports, resolved issues, content quality
- **Custom Reports:** Generate and download detailed reports

## Security Features

- JWT-based authentication
- Role-based access control
- Secure API endpoints
- Input validation and sanitization
- XSS and CSRF protection

## Browser Compatibility

- Chrome (recommended)
- Firefox
- Safari
- Edge

## Development

### Adding New Features
1. Update HTML structure in `index.html`
2. Add styling in `styles.css`
3. Implement functionality in `script.js`
4. Add backend routes in `admin-api.js`

### Mock Data
The dashboard includes mock data for development and testing. In production, replace mock data with real API calls.

### Customization
- Modify colors and styling in `styles.css`
- Update navigation and layout in `index.html`
- Extend functionality in `script.js`

## Deployment

### Production Setup
1. Configure production database
2. Set up proper authentication
3. Enable HTTPS
4. Configure CORS settings
5. Set up monitoring and logging

### Environment Variables
```bash
JWT_SECRET=your-secret-key
MONGODB_URI=your-mongodb-connection-string
NODE_ENV=production
```

## Troubleshooting

### Common Issues
1. **Login not working:** Check credentials (admin/admin123)
2. **API errors:** Ensure backend server is running
3. **Charts not loading:** Check Chart.js CDN connection
4. **Styling issues:** Clear browser cache

### Support
For technical support or feature requests, please contact the development team.

## License

This project is part of the Glamora platform. All rights reserved.

---

**Note:** This admin dashboard is designed to work with the Glamora mobile app backend. Ensure the backend server is running and properly configured before using the admin interface.
