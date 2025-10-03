# PSA Card Scanner - Inventory System

A professional Node.js application for scanning PSA graded trading cards and automatically adding them to Google Sheets inventory tracking.

## 🚀 Features

- **Barcode Scanner Integration**: Compatible with USB barcode scanners
- **PSA API Integration**: Real-time certificate lookup and validation
- **Google Sheets Automation**: Automatic inventory tracking with formula-based numbering
- **Modern Web Interface**: Clean, responsive design for easy operation
- **Error Handling**: Comprehensive error handling and user feedback
- **Secure Configuration**: Environment-based API key management

## 📁 Project Structure

```
PSA-Card-Scanner/
├── backend-example/              # Main application directory
│   ├── services/                 # Business logic services
│   │   ├── psaService.js        # PSA API integration
│   │   └── googleSheetsService.js # Google Sheets integration
│   ├── server.js                # Express server and API routes
│   ├── package.json             # Dependencies and scripts
│   ├── .env                     # Environment configuration
│   ├── google-service-account.json # Google Sheets credentials
│   ├── start-server.bat         # Windows server startup script
│   ├── stop-server.bat          # Windows server stop script
│   └── restart-server.bat       # Windows server restart script
├── scanner-interface.html       # Web-based scanner interface
└── README.md                    # This file
```

## 🛠️ Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- PSA API key
- Google Cloud service account with Sheets API access

### Quick Start

1. **Install Dependencies**
   ```bash
   cd backend-example
   npm install
   ```

2. **Configure Environment**
   - Edit `.env` file with your PSA API key
   - Place Google service account JSON file in the backend directory

3. **Start the Server**
   - **Windows**: Double-click `start-server.bat`
   - **Command Line**: `npm start`

4. **Access the Interface**
   - Open your browser to `http://localhost:3000`
   - Or open `scanner-interface.html` directly

## 📊 Google Sheets Setup

1. **Create a Google Spreadsheet** with the following column structure:
   - Column A: # (Row numbers)
   - Column B: Card Name
   - Column C: Card Number
   - Column D: Condition
   - Column E: Graded?
   - Column F: Company
   - Column G: Grade
   - Column H: Certification Number

2. **Share the spreadsheet** with your service account email (found in the JSON file)

3. **Paste the spreadsheet URL** into the scanner interface when prompted

## 🔧 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/cert/:certNumber` | Lookup PSA certificate |
| POST | `/api/add-to-sheets` | Add card data to Google Sheets |
| GET | `/api/update-spreadsheet-config` | Update spreadsheet configuration |
| GET | `/api/status` | Check service status |
| GET | `/health` | Health check |

## 💻 Usage

1. **Start the application** using one of the startup methods
2. **Configure your spreadsheet** by pasting the Google Sheets URL
3. **Scan or enter** a PSA certificate number
4. **Review the card details** displayed
5. **Click "Add to Google Sheets"** to save to your inventory

## 🔒 Security Features

- API keys stored in environment variables
- HTTPS agent configuration for secure connections
- Input validation and sanitization
- Error handling without exposing sensitive information

## 🎯 Key Components

### PSAService
Handles all PSA API interactions including:
- Certificate number validation
- API authentication and requests
- Data processing and grade extraction
- Network error handling

### GoogleSheetsService  
Manages Google Sheets integration including:
- Authentication with service accounts
- Dynamic row insertion with formula-based numbering
- Spreadsheet configuration management
- Data mapping and formatting

### Scanner Interface
Modern web interface featuring:
- Responsive design for desktop and mobile
- Real-time feedback and status updates
- Scan history tracking
- Configuration management

## 🔧 Configuration

### Environment Variables (.env)
```env
PSA_API_KEY=your_psa_api_key_here
GOOGLE_SPREADSHEET_ID=your_spreadsheet_id
GOOGLE_SHEET_NAME=Input Sheet
GOOGLE_SERVICE_ACCOUNT_KEY=./google-service-account.json
PORT=3000
```

### Google Sheets Automation
- Automatic row numbering using Excel formulas
- Data insertion starting at row 4 (after headers and examples)
- Dynamic spreadsheet configuration without server restart

## 📱 Browser Compatibility

- Chrome/Chromium (recommended)
- Firefox
- Safari
- Edge

## 🚀 Production Deployment

For production use, consider:
- Using HTTPS with proper SSL certificates
- Implementing rate limiting
- Adding authentication and authorization
- Using a process manager like PM2
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