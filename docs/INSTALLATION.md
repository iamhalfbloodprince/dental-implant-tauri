# Dental Implant Case Management - Installation Guide

## System Requirements

### Windows
- Windows 10 or later (64-bit)
- 2GB RAM minimum
- 100MB disk space for application
- Additional space for patient data

### macOS
- macOS 10.15 (Catalina) or later
- 2GB RAM minimum
- 100MB disk space for application
- Additional space for patient data

## Installation Instructions

### Windows Installation

1. **Download the Application**
   - Download `DentalImplant-Setup.exe` from the official website
   - Ensure download is from trusted source

2. **Run the Installer**
   - Double-click the downloaded `.exe` file
   - Click "Yes" if Windows asks for permission
   - Follow the installation wizard
   - Choose installation location (default recommended)

3. **Complete Installation**
   - Click "Install" to begin
   - Wait for installation to complete
   - Click "Finish" to launch the application

### macOS Installation

1. **Download the Application**
   - Download `DentalImplant.dmg` from the official website
   - Ensure download is from trusted source

2. **Open the DMG File**
   - Double-click the downloaded `.dmg` file
   - Drag "Dental Implant" icon to Applications folder
   - Wait for copy to complete

3. **Launch the Application**
   - Open Applications folder
   - Double-click "Dental Implant"
   - If warned about unidentified developer:
     - Go to System Preferences → Security & Privacy
     - Click "Open Anyway" for Dental Implant

## First-Time Setup

### Initial Account Setup

1. **Launch Application**
   - Open the application after installation
   - You'll see the setup screen

2. **Create Password**
   - Choose a strong password (minimum 12 characters)
   - Must include: uppercase, lowercase, number, special character
   - Example: `MyDental@pp2024!`
   - Store password securely - there's no password recovery by email

3. **Set Security Question**
   - Choose a security question from the list
   - Provide an answer you'll remember
   - This is used for password recovery if you forget your password

4. **Create Your Clinic Profile**
   - Enter your clinic name
   - Add contact information
   - Set up your doctor profile

## Data Storage Location

### Windows
```
C:\Users\YourName\AppData\Roaming\dental-implant\
├── database\ (app.sqlite)
├── files\ (patient documents)
├── backups\ (backup files)
└── exports\ (data exports)
```

### macOS
```
~/Library/Application Support/dental-implant/
├── database/ (app.sqlite)
├── files/ (patient documents)
├── backups/ (backup files)
└── exports/ (data exports)
```

## Troubleshooting Installation

### Windows Issues

**"Windows protected your PC" warning**
- Click "More info"
- Click "Run anyway"
- This is a standard security message for unsigned apps

**Installation fails**
- Ensure you have administrator rights
- Disable antivirus temporarily
- Check Windows Defender settings

### macOS Issues

**"App is damaged and can't be opened"**
- Open Terminal and run: `xattr -cr /Applications/Dental\ Implant.app`
- Try launching again

**"Unidentified developer" warning**
- Go to System Preferences → Security & Privacy
- Click "Open Anyway"

## Updating the Application

### Windows
- Download the new version installer
- Run the installer
- Your data will be preserved automatically

### macOS
- Download the new `.dmg` file
- Replace the existing application in Applications folder
- Your data will be preserved automatically

## Uninstallation

### Windows
1. Go to Settings → Apps
2. Find "Dental Implant Case Management"
3. Click "Uninstall"
4. Your data folder will remain intact

### macOS
1. Drag application to Trash
2. Empty Trash
3. Your data folder will remain intact

## Security Notes

- Your data is stored locally on your device only
- No data is sent to external servers
- Regular backups are recommended
- Keep your password secure
- Enable device security (Windows Hello, Touch ID) for additional protection

## Support

If you encounter installation issues:
- Check our troubleshooting guide
- Contact support at: support@dentalimplant.com
- Include your OS version and error message