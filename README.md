# PSA Card Scanner - Inventory System

A professional Node.js application for scanning PSA graded Pokemon cards and automatically adding them to Google Sheets inventory tracking. **Live at: https://quickslab-production.up.railway.app**

## 🚀 Features

- **Barcode Scanner Integration**: Compatible with USB barcode scanners
- **PSA API Integration**: Real-time certificate lookup and validation  
- **Google Sheets Automation**: Automatic inventory tracking with streamlined column layout
- **Modern Web Interface**: Clean, responsive design with gradient styling
- **Batch Operations**: Recent scans table with multi-select and batch add functionality
- **Railway Deployment**: Cloud-hosted for reliable 24/7 access
- **Mobile Responsive**: Works perfectly on phones, tablets, and desktops
- **Error Handling**: Comprehensive error handling and user feedback
- **Secure Configuration**: Environment-based API key management

## 📁 Project Structure

```
QuickSlab/
├── services/                    # Business logic services
│   ├── psaService.js           # PSA API integration
│   └── googleSheetsService.js  # Google Sheets integration
├── server.js                   # Express server and API routes
├── scanner-interface.html      # Web-based scanner interface
├── package.json                # Dependencies and scripts
├── .env                        # Environment configuration (local only)
├── google-service-account.json # Google Sheets credentials (local only)
└── README.md                   # This file
```

## 🛠️ Installation & Setup

### Prerequisites
- Node.js (v18 or higher)
- PSA API key
- Google Cloud service account with Sheets API access

### Local Development

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment**
   - Edit `.env` file with your PSA API key and Google Sheets config
   - Place Google service account JSON file in the project directory

3. **Start the Server**
   ```bash
   npm start
   ```

4. **Access the Interface**
   - Open your browser to `http://localhost:3000`

### Production Deployment (Railway)
The application is deployed on Railway at: **https://quickslab-production.up.railway.app**

Environment variables configured in Railway:
- `PSA_API_KEY`: Your PSA API key
- `GOOGLE_SPREADSHEET_ID`: Target spreadsheet ID
- `GOOGLE_SHEET_NAME`: Sheet tab name (e.g., "Input Sheet")
- `GOOGLE_SERVICE_ACCOUNT_JSON`: Service account credentials as JSON string

## 📊 Google Sheets Setup

1. **Create a Google Spreadsheet** with the following column structure:
   - Column A: Card Name
   - Column B: Card Number  
   - Column C: Condition
   - Column D: Graded? (Y/N)
   - Column E: Company
   - Column F: Grade (Numeric)
   - Column G: Certification Number

2. **Share the spreadsheet** with your service account email (found in the JSON file)

3. **Configure the spreadsheet** by updating the environment variables or using the web interface

## 🔧 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/cert/:certNumber` | Lookup PSA certificate |
| POST | `/api/add-to-sheets` | Add card data to Google Sheets |
| GET | `/api/update-spreadsheet-config` | Update spreadsheet configuration |
| GET | `/api/status` | Check service status and configuration |
| POST | `/api/scan-history` | Save scan history entry |
| GET | `/api/scan-history` | Load scan history |
| GET | `/health` | Health check |
| GET | `/` | Scanner web interface |

## 💻 Usage

1. **Access the web application** at https://quickslab-production.up.railway.app
2. **Scan or enter** a PSA certificate number in the input field
3. **Review the card details** displayed automatically
4. **Choose your action:**
   - Click "Add to Google Sheets" to immediately add the card
   - Or review multiple scans in the "Recent Scans" table
   - Select multiple cards and use "Add Selected to Sheets" for batch operations
5. **Monitor your Google Sheets** for automatic inventory updates

## ✨ New Features

### Recent Scans Table
- **Table format** showing all scanned card details
- **Batch selection** with checkboxes
- **"Select All"** for easy multi-selection  
- **"Add Selected to Sheets"** for batch processing
- **Real-time status updates** during batch operations

### Modern Interface
- **Gradient design** with professional styling
- **Responsive layout** works on all devices
- **Centered table data** for better readability
- **Real-time feedback** with status messages

## 🔒 Security Features

- Environment variables for sensitive configuration
- HTTPS secure connections to all APIs
- Input validation and sanitization
- Railway deployment with automatic SSL certificates
- Error handling without exposing sensitive information

## 🎯 Key Components

### PSAService
Handles all PSA API interactions including:
- Certificate number validation and lookup
- Data processing with numeric grade extraction
- Network error handling and retry logic
- Secure authentication for production environment

### GoogleSheetsService  
Manages Google Sheets integration including:
- Dual authentication (local files + Railway environment variables)
- Automatic row insertion with proper column mapping
- Dynamic spreadsheet configuration management
- Streamlined data format (no row numbering)

### Scanner Interface
Modern production-ready web interface featuring:
- Professional gradient design optimized for card shows
- Responsive layout for desktop, tablet, and mobile
- Real-time batch operations with progress feedback
- Recent Scans table with multi-select capabilities
- Clean interface without development/test elements

## 🔧 Configuration

### Production Environment (Railway)
Environment variables are managed through the Railway dashboard:
- `GOOGLE_SPREADSHEET_ID` - Your Google Sheets document ID
- `GOOGLE_SERVICE_ACCOUNT_JSON` - Complete service account JSON as string
- `PORT` - Automatically managed by Railway

### Local Development (.env)
```env
GOOGLE_SPREADSHEET_ID=your_spreadsheet_id_here
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
PORT=3000
```

### Google Sheets Column Structure
The application writes to these columns (no row numbering):
- Column A: Card Name
- Column B: Card Number
- Column C: Condition  
- Column D: Graded? (Y/N)
- Column E: Company (PSA)
- Column F: Grade (Numeric: 1-10)
- Column G: Certification Number

## 📱 Browser Compatibility

- Chrome/Chromium (recommended for best performance)
- Firefox (full compatibility)
- Safari (iOS and macOS support)
- Edge (Windows compatibility)

## 🚀 Production Status

**Live Application:** https://quickslab-production.up.railway.app

This application is production-ready and deployed on Railway with:
- Automatic HTTPS and SSL certificate management
- 24/7 uptime monitoring and automatic restarts
- GitHub integration for seamless updates
- Professional interface optimized for card show environments
- Setting up proper logging and monitoring

## 🐛 Troubleshooting

### Common Issues
1. **"Network error"**: Check internet connection and PSA API status
2. **"Authentication failed"**: Verify PSA API key in .env file
3. **"Spreadsheet not found"**: Ensure service account has access to the sheet
4. **"CORS errors"**: Access via `http://localhost:3000` instead of file:// URLs

### Debug Mode
Set `NODE_ENV=development` for additional logging information.

## 📄 License

MIT License - See LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For issues and questions:
- Check the troubleshooting section
- Review the error messages in the browser console
- Ensure all prerequisites are properly installed

---

**Built with ❤️ for the trading card community**